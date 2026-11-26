const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { format } = require("node:util");
const Anthropic = require("@anthropic-ai/sdk");

const {
  createAnthropicAdapter,
  createAnthropicLookup,
  SeriesLookupUnavailableError,
} = require("../services/seriesLookup/anthropicAdapter");
const {
  SOURCE,
  OTHER_SOURCE,
  SIX_OF_CROWS,
  STANDALONE,
  searchBlocks,
  searchErrorBlocks,
  modelReply,
  fakeClient,
} = require("./helpers/seriesLookup");

const MODEL = "claude-haiku-5-5";
const QUERY = { title: "Шестерка воронов", authors: ["Ли Бардуго"] };
const TODAY = new Date("2026-11-26T10:00:00Z");

function adapterWith(replies) {
  const client = fakeClient(replies);
  return { client, adapter: createAnthropicAdapter({ model: MODEL, client }) };
}

describe("the Anthropic series lookup adapter", () => {
  it("asks the configured model with web search called directly, five searches at most", async () => {
    const { client, adapter } = adapterWith([modelReply()]);

    await adapter.lookUp(QUERY, TODAY);

    assert.equal(client.calls.length, 1);
    const params = client.calls[0];
    assert.equal(params.model, MODEL);
    assert.deepEqual(params.tools, [
      {
        type: "web_search_20260318",
        name: "web_search",
        max_uses: 5,
        allowed_callers: ["direct"],
      },
    ]);
    assert.deepEqual(params.output_config, { effort: "medium" });
    assert.equal(params.output_config.format, undefined);
    assert.match(params.system, /The current date is 2026-11-26\./);
  });

  it("sends the book as JSON data, hints included, and nothing else", async () => {
    const { client, adapter } = adapterWith([modelReply()]);

    await adapter.lookUp(
      { ...QUERY, subtitle: "Book 1", isbn: "9785171123512", language: "ru" },
      TODAY,
    );

    const [message] = client.calls[0].messages;
    assert.equal(message.role, "user");
    const json = message.content.slice(message.content.indexOf("{"));
    assert.deepEqual(JSON.parse(json), {
      title: "Шестерка воронов",
      authors: ["Ли Бардуго"],
      subtitle: "Book 1",
      isbn: "9785171123512",
      language: "ru",
    });
  });

  it("returns the series with its books in order and the usage of the call", async () => {
    const { adapter } = adapterWith([modelReply()]);

    const outcome = await adapter.lookUp(QUERY, TODAY);

    assert.equal(outcome.reason, null);
    assert.equal(outcome.answer.series, "Шестерка воронов");
    assert.equal(outcome.answer.number, 1);
    assert.deepEqual(
      outcome.answer.books.map((book) => book.number),
      [1, 2],
    );
    assert.deepEqual(outcome.answer.sources, [SOURCE, OTHER_SOURCE]);
    assert.equal(outcome.answer.confidence, "high");
    assert.deepEqual(outcome.usage, {
      requests: 1,
      inputTokens: 1000,
      outputTokens: 200,
      searches: 1,
    });
  });

  it("keeps only the sources a search returned and marks an answer with none left low", async () => {
    const made = "https://made-up.example/series";
    const { adapter } = adapterWith([
      modelReply({ answer: { ...SIX_OF_CROWS, sources: [made, SOURCE] }, urls: [SOURCE] }),
    ]);

    const kept = await adapter.lookUp(QUERY, TODAY);
    assert.deepEqual(kept.answer.sources, [SOURCE]);
    assert.equal(kept.answer.confidence, "high");

    const { adapter: unsourced } = adapterWith([
      modelReply({ answer: { ...SIX_OF_CROWS, sources: [made] }, urls: [SOURCE] }),
    ]);
    const lowered = await unsourced.lookUp(QUERY, TODAY);
    assert.deepEqual(lowered.answer.sources, []);
    assert.equal(lowered.answer.confidence, "low");
  });

  it("reads a standalone answer", async () => {
    const { adapter } = adapterWith([modelReply({ answer: STANDALONE })]);

    const outcome = await adapter.lookUp(QUERY, TODAY);

    assert.equal(outcome.answer.series, null);
    assert.deepEqual(outcome.answer.books, []);
  });

  it("reads the JSON written after the last search, not text before it", async () => {
    const { adapter } = adapterWith([
      modelReply({
        before: [{ type: "text", text: "Searching for {the series}" }],
        text: `Here it is: ${JSON.stringify(SIX_OF_CROWS)}`,
      }),
    ]);

    const outcome = await adapter.lookUp(QUERY, TODAY);

    assert.equal(outcome.answer?.series, "Шестерка воронов");
  });

  for (const [name, text] of [
    ["text that is not JSON", "I could not find this book."],
    ["JSON with a field the schema does not know", JSON.stringify({ ...SIX_OF_CROWS, isbn: "1" })],
    ["JSON missing a field", JSON.stringify({ ...SIX_OF_CROWS, status: undefined })],
    [
      "a standalone that still lists books",
      JSON.stringify({ ...STANDALONE, books: SIX_OF_CROWS.books }),
    ],
    [
      "two books with one number",
      JSON.stringify({
        ...SIX_OF_CROWS,
        books: [SIX_OF_CROWS.books[0], { ...SIX_OF_CROWS.books[1], number: 2 }],
      }),
    ],
  ]) {
    it(`gives no answer for ${name}`, async () => {
      const { adapter } = adapterWith([modelReply({ text })]);

      const outcome = await adapter.lookUp(QUERY, TODAY);

      assert.equal(outcome.answer, null);
      assert.equal(outcome.reason, "invalid_answer");
    });
  }

  it("gives no answer when the model refuses, even with a valid JSON text", async () => {
    const { adapter } = adapterWith([modelReply({ stop: "refusal" })]);

    const outcome = await adapter.lookUp(QUERY, TODAY);

    assert.equal(outcome.answer, null);
    assert.equal(outcome.reason, "refusal");
  });

  it("gives no answer when the reply was cut at the token limit", async () => {
    const { adapter } = adapterWith([modelReply({ stop: "max_tokens" })]);

    const outcome = await adapter.lookUp(QUERY, TODAY);

    assert.equal(outcome.reason, "max_tokens");
  });

  it("gives no answer when a search failed on the server", async () => {
    const { adapter } = adapterWith([modelReply({ before: searchErrorBlocks("unavailable") })]);

    const outcome = await adapter.lookUp(QUERY, TODAY);

    assert.equal(outcome.answer, null);
    assert.equal(outcome.reason, "search_error");
  });

  it("still answers when the model only ran out of searches", async () => {
    const { adapter } = adapterWith([
      modelReply({ before: searchErrorBlocks("max_uses_exceeded") }),
    ]);

    const outcome = await adapter.lookUp(QUERY, TODAY);

    assert.equal(outcome.answer?.series, "Шестерка воронов");
  });

  it("continues a paused turn once by sending the paused content back", async () => {
    const paused = { stop_reason: "pause_turn", content: searchBlocks([SOURCE], "srvtoolu_p") };
    const { client, adapter } = adapterWith([paused, modelReply({ urls: [OTHER_SOURCE] })]);

    const outcome = await adapter.lookUp(QUERY, TODAY);

    assert.equal(client.calls.length, 2);
    assert.deepEqual(client.calls[1].messages.at(-1), {
      role: "assistant",
      content: paused.content,
    });
    assert.deepEqual(outcome.answer.sources, [SOURCE, OTHER_SOURCE]);
    assert.equal(outcome.usage.requests, 2);
  });

  it("gives up on a turn that is still paused after one continuation", async () => {
    const paused = { stop_reason: "pause_turn", content: searchBlocks([SOURCE]) };
    const { client, adapter } = adapterWith([paused, paused]);

    const outcome = await adapter.lookUp(QUERY, TODAY);

    assert.equal(client.calls.length, 2);
    assert.equal(outcome.answer, null);
    assert.equal(outcome.reason, "paused");
  });

  it("keeps the same five-search tool on a continued turn, which the API counts as a whole", async () => {
    const paused = { stop_reason: "pause_turn", content: searchBlocks([SOURCE], "srvtoolu_p") };
    const { client, adapter } = adapterWith([paused, modelReply()]);

    await adapter.lookUp(QUERY, TODAY);

    assert.deepEqual(client.calls[1].tools, client.calls[0].tools);
    assert.equal(client.calls[1].tools[0].max_uses, 5);
  });

  it("gives no answer when a search failed in the paused part of the turn", async () => {
    const paused = {
      stop_reason: "pause_turn",
      content: [...searchBlocks([SOURCE], "srvtoolu_p"), ...searchErrorBlocks("unavailable")],
    };
    const { adapter } = adapterWith([paused, modelReply()]);

    const outcome = await adapter.lookUp(QUERY, TODAY);

    assert.equal(outcome.answer, null);
    assert.equal(outcome.reason, "search_error");
  });

  it("does not let one lookup's search results vouch for the next lookup's sources", async () => {
    const { adapter } = adapterWith([
      modelReply({ urls: [SOURCE, OTHER_SOURCE] }),
      modelReply({ urls: [SOURCE] }),
    ]);

    await adapter.lookUp(QUERY, TODAY);
    const second = await adapter.lookUp(QUERY, TODAY);

    assert.deepEqual(second.answer.sources, [SOURCE]);
  });

  it("matches a source to a search result across http, a fragment and a trailing slash", async () => {
    const { adapter } = adapterWith([
      modelReply({
        answer: { ...SIX_OF_CROWS, sources: ["http://en.wikipedia.org/wiki/Six_of_Crows/#Plot"] },
        urls: [SOURCE],
      }),
    ]);

    const outcome = await adapter.lookUp(QUERY, TODAY);

    assert.deepEqual(outcome.answer.sources, ["http://en.wikipedia.org/wiki/Six_of_Crows/#Plot"]);
  });

  it("keeps at most five sources", async () => {
    const urls = Array.from({ length: 7 }, (_, index) => `https://example.org/page-${index}`);
    const { adapter } = adapterWith([
      modelReply({ answer: { ...SIX_OF_CROWS, sources: urls }, urls }),
    ]);

    const outcome = await adapter.lookUp(QUERY, TODAY);

    assert.deepEqual(outcome.answer.sources, urls.slice(0, 5));
  });

  for (const [name, answer] of [
    [
      "more than a hundred books",
      {
        ...SIX_OF_CROWS,
        books: Array.from({ length: 101 }, (_, index) => ({
          number: index + 1,
          title: `Book ${index + 1}`,
          released: true,
          expectedYear: null,
        })),
      },
    ],
    [
      "a title over 200 characters",
      {
        ...SIX_OF_CROWS,
        books: [{ number: 1, title: "x".repeat(201), released: true, expectedYear: null }],
      },
    ],
    ["a series name over 200 characters", { ...SIX_OF_CROWS, series: "x".repeat(201) }],
  ]) {
    it(`gives no answer for ${name}, so the endpoint cannot relay long text`, async () => {
      const { adapter } = adapterWith([modelReply({ answer })]);

      const outcome = await adapter.lookUp(QUERY, TODAY);

      assert.equal(outcome.reason, "invalid_answer");
    });
  }

  describe("when the API call itself fails", () => {
    let logged;
    let originalError;

    beforeEach(() => {
      logged = [];
      originalError = console.error;
      console.error = (...args) => logged.push(format(...args));
    });

    afterEach(() => {
      console.error = originalError;
    });

    it("answers 502 with a generic text and logs the status", async () => {
      const failure = new Anthropic.InternalServerError(
        529,
        { type: "error", error: { type: "overloaded_error" } },
        "Overloaded",
        new Headers(),
      );
      const { adapter } = adapterWith([failure]);

      await assert.rejects(adapter.lookUp(QUERY, TODAY), (err) => {
        assert.ok(err instanceof SeriesLookupUnavailableError);
        assert.equal(err.status, 502);
        assert.equal(err.message, "Series lookup is unavailable right now");
        return true;
      });
      assert.equal(logged.length, 1);
      assert.match(logged[0], /529/);
    });

    it("answers 502 when the network fails", async () => {
      const { adapter } = adapterWith([new Anthropic.APIConnectionError({ message: "down" })]);

      await assert.rejects(adapter.lookUp(QUERY, TODAY), SeriesLookupUnavailableError);
    });

    it("lets a programming error through to the central handler", async () => {
      const { adapter } = adapterWith([new TypeError("broken")]);

      await assert.rejects(adapter.lookUp(QUERY, TODAY), TypeError);
      assert.equal(logged.length, 0);
    });
  });

  describe("the real client", () => {
    const saved = {};
    const realFetch = globalThis.fetch;

    beforeEach(() => {
      for (const name of ["ANTHROPIC_API_KEY", "ANTHROPIC_BASE_URL"])
        saved[name] = process.env[name];
      process.env.ANTHROPIC_API_KEY = "sk-ant-test-key";
      process.env.ANTHROPIC_BASE_URL = "https://proxy.example";
    });

    afterEach(() => {
      globalThis.fetch = realFetch;
      for (const [name, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    });

    it("sends the key only to the Anthropic API, whatever ANTHROPIC_BASE_URL says", async (t) => {
      t.mock.method(console, "error", () => {});
      const requested = [];
      globalThis.fetch = async (input) => {
        requested.push(String(input instanceof Request ? input.url : input));
        return new Response(
          JSON.stringify({ type: "error", error: { type: "overloaded_error" } }),
          {
            status: 529,
            headers: { "Content-Type": "application/json" },
          },
        );
      };

      const lookup = createAnthropicLookup({ model: MODEL });
      await assert.rejects(lookup.lookUp(QUERY, TODAY), SeriesLookupUnavailableError);

      assert.equal(requested.length, 1);
      assert.ok(requested[0].startsWith("https://api.anthropic.com/v1/messages"), requested[0]);
    });
  });

  describe("without an API key", () => {
    let previousKey;

    beforeEach(() => {
      previousKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
    });

    afterEach(() => {
      if (previousKey !== undefined) process.env.ANTHROPIC_API_KEY = previousKey;
    });

    it("answers 503 before any call", () => {
      assert.throws(
        () => createAnthropicLookup({ model: MODEL }),
        (err) => err.status === 503 && err.message === "Series lookup is not configured",
      );
    });
  });
});
