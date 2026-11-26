require("dotenv").config({ quiet: true });

const fs = require("node:fs");
const { parseArgs } = require("node:util");

const seriesLookupProvider = require("../services/seriesLookup/provider");
const { readSeriesLookupConfig } = require("../config/seriesLookup");

const HAIKU_PRICE = { input: 0.1 / 1e6, output: 0.5 / 1e6, search: 10 / 1000 };
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const USAGE = `Replays reference books through the real series lookup adapter. Every book is a paid call.

  node scripts/series-lookup-eval.js --run --refs <file.json> [--only 1,5,9] [--limit 10]

The reference file is a JSON array of
  { "id": 1, "title": "...", "authors": ["..."], "aliases": ["six of crows"], "number": 1,
    "released": [1, 2], "announced": [3] }
or { "id": 4, "title": "...", "authors": ["..."], "standalone": true }.
"number": null skips the number check (the input names a whole series).`;

function normalize(value) {
  return (value ?? "").toLowerCase().replace(/ё/g, "е").replace(/[’ʼ`]/g, "'");
}

function score(ref, answer) {
  if (!answer) return { series: false };
  if (ref.standalone) return { series: answer.series === null };

  const names = `${normalize(answer.series)} | ${normalize(answer.seriesOriginal)}`;
  const series = ref.aliases.some((alias) => names.includes(normalize(alias)));
  const listed = new Set(answer.books.map((book) => book.number));
  const hits = ref.released.filter((number) => listed.has(number)).length;
  const lastReleased = Math.max(...ref.released);

  return {
    series,
    number: ref.number === null ? undefined : series && answer.number === ref.number,
    list: series && hits / ref.released.length >= 0.8,
    announced:
      ref.announced?.length > 0
        ? series &&
          answer.books.some(
            (book) =>
              !book.released && (ref.announced.includes(book.number) || book.number > lastReleased),
          )
        : undefined,
  };
}

function costOf(usage) {
  return (
    usage.inputTokens * HAIKU_PRICE.input +
    usage.outputTokens * HAIKU_PRICE.output +
    usage.searches * HAIKU_PRICE.search
  );
}

function tally(rows, key) {
  const applicable = rows.filter((row) => row.score[key] !== undefined);
  return `${applicable.filter((row) => row.score[key]).length}/${applicable.length}`;
}

async function main() {
  const { values } = parseArgs({
    options: {
      run: { type: "boolean", default: false },
      refs: { type: "string" },
      only: { type: "string" },
      limit: { type: "string", default: String(DEFAULT_LIMIT) },
    },
  });

  if (!values.run || !values.refs) {
    console.log(USAGE);
    process.exitCode = 1;
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set");
    process.exitCode = 1;
    return;
  }

  const limit = Math.min(Number.parseInt(values.limit, 10) || DEFAULT_LIMIT, MAX_LIMIT);
  const only = values.only ? new Set(values.only.split(",").map(Number)) : null;
  const refs = JSON.parse(fs.readFileSync(values.refs, "utf8"))
    .filter((ref) => !only || only.has(ref.id))
    .slice(0, limit);
  const { model } = readSeriesLookupConfig();

  console.log(`${refs.length} lookups with ${model}`);
  const rows = [];
  for (const ref of refs) {
    const started = Date.now();
    const outcome = await seriesLookupProvider.lookUpSeries({
      title: ref.title,
      authors: ref.authors,
    });
    const row = {
      ref,
      outcome,
      score: score(ref, outcome.answer),
      cost: costOf(outcome.usage),
      seconds: (Date.now() - started) / 1000,
    };
    rows.push(row);

    const answer = outcome.answer;
    const books = answer?.books
      .map((book) => `${book.number}${book.released ? "" : `*${book.expectedYear ?? "?"}`}`)
      .join(" ");
    console.log(
      `#${ref.id} ${ref.title}: ${answer ? (answer.series ?? "standalone") : `unknown (${outcome.reason})`}` +
        ` n=${answer?.number ?? "-"} [${books ?? ""}] ${answer?.status ?? ""} ${answer?.confidence ?? ""}` +
        ` | ${JSON.stringify(row.score)} | ${outcome.usage.searches} searches $${row.cost.toFixed(4)} ${row.seconds.toFixed(1)}s`,
    );
  }

  const total = rows.reduce((sum, row) => sum + row.cost, 0);
  console.log(
    [
      `series ${tally(rows, "series")}`,
      `number ${tally(rows, "number")}`,
      `books listed ${tally(rows, "list")}`,
      `announced ${tally(rows, "announced")}`,
      `requests ${rows.reduce((sum, row) => sum + row.outcome.usage.requests, 0)}`,
      `cost $${total.toFixed(4)} at Claude Haiku 5.5 list prices`,
    ].join(" | "),
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
