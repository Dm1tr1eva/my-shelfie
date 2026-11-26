const DESIRE_RANK = new Map([
  ["high", 0],
  ["normal", 1],
  ["someday", 2],
]);

function desireRank(desire) {
  return DESIRE_RANK.get(desire) ?? DESIRE_RANK.get("normal");
}

function isOwned(book) {
  return book.ownership !== "wanted";
}

function stateOf(book) {
  return isOwned(book) ? "owned" : "wanted";
}

function hasNumber(book) {
  return book.seriesNumber !== undefined && book.seriesNumber !== null;
}

function byAge(a, b) {
  return new Date(a.createdAt) - new Date(b.createdAt);
}

function byNumberThenAge(a, b) {
  return (a.seriesNumber ?? Infinity) - (b.seriesNumber ?? Infinity) || byAge(a, b);
}

function distinct(values) {
  return [...new Set(values)];
}

function linkFacets(books) {
  const links = books.flatMap((book) => book.links ?? []);
  return {
    linkLanguages: distinct(links.flatMap((link) => link.languages)),
    linkKinds: distinct(links.map((link) => link.kind)),
  };
}

function segmentsOf(series, books) {
  const states = new Map();
  for (const book of books.filter(hasNumber)) {
    if (isOwned(book) || !states.has(book.seriesNumber)) {
      states.set(book.seriesNumber, stateOf(book));
    }
  }

  const known = [...states.keys(), ...(series.expected ?? []).map((entry) => entry.number)];
  const last = Math.floor(Math.max(series.totalBooks ?? 0, ...known));
  const numbers = new Set(known);
  for (let number = 1; number <= last; number += 1) {
    numbers.add(number);
  }

  const numbered = [...numbers]
    .sort((a, b) => a - b)
    .map((number) => ({ number, state: states.get(number) ?? "missing" }));
  const unnumbered = books
    .filter((book) => !hasNumber(book))
    .sort(byAge)
    .map((book) => ({ number: null, state: stateOf(book) }));

  return [...numbered, ...unnumbered];
}

function seriesRow(series, books) {
  const cover = [...books].sort(byNumberThenAge).find((book) => book.coverUrl);

  return {
    type: "series",
    id: series.id,
    title: series.title,
    ...(series.author && { author: series.author }),
    status: series.status,
    desire: series.desire ?? "normal",
    ...(cover && { coverUrl: cover.coverUrl }),
    segments: segmentsOf(series, books),
    genres: series.genres ?? [],
    tropes: series.tropes ?? [],
    ...linkFacets(books.filter((book) => !isOwned(book))),
  };
}

function bookRow(book) {
  return {
    type: "book",
    id: book.id,
    title: book.title,
    author: book.author,
    desire: book.desire ?? "normal",
    ...(book.coverUrl && { coverUrl: book.coverUrl }),
    format: book.format,
    genres: book.genres ?? [],
    tropes: book.tropes ?? [],
    ...linkFacets([book]),
  };
}

function byId(a, b) {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function compareSeriesRows(a, b) {
  return (
    desireRank(a.desire) - desireRank(b.desire) || a.title.localeCompare(b.title) || byId(a, b)
  );
}

function compareBooks(a, b) {
  return (
    desireRank(a.desire) - desireRank(b.desire) ||
    new Date(b.createdAt) - new Date(a.createdAt) ||
    byId(a, b)
  );
}

function group(key, items) {
  return { key, count: items.length, items };
}

function buildWishlist({ series, books }) {
  const booksBySeries = new Map(series.map((item) => [item.id, []]));
  const standalone = [];

  for (const book of books) {
    const shelf = book.seriesId ? booksBySeries.get(book.seriesId) : undefined;
    if (shelf) shelf.push(book);
    else if (!isOwned(book)) standalone.push(book);
  }

  const continuing = [];
  const fresh = [];
  for (const item of series) {
    const shelf = booksBySeries.get(item.id);
    const row = seriesRow(item, shelf);

    if (!shelf.some(isOwned)) fresh.push(row);
    else if (row.segments.some((segment) => segment.state !== "owned")) continuing.push(row);
  }

  return [
    group("continue", continuing.sort(compareSeriesRows)),
    group("newSeries", fresh.sort(compareSeriesRows)),
    group("standalone", standalone.sort(compareBooks).map(bookRow)),
  ];
}

module.exports = { buildWishlist };
