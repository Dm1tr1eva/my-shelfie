function toSourceDto(url) {
  return { url, domain: new URL(url).hostname.replace(/^www\./, "") };
}

function toLookupBookDto(book) {
  return {
    number: book.number,
    title: book.title,
    released: book.released,
    ...(book.expectedYear != null && { expectedYear: book.expectedYear }),
  };
}

function toSeriesLookupDto(outcome) {
  if (outcome.result === "unknown") {
    return { result: "unknown" };
  }

  const shared = {
    confidence: outcome.confidence,
    sources: outcome.sources.map(toSourceDto),
  };

  if (outcome.result === "standalone") {
    return { result: "standalone", ...shared };
  }

  const { series } = outcome;
  return {
    result: "series",
    series: {
      name: series.name,
      ...(series.originalName && { originalName: series.originalName }),
      status: series.status,
      books: series.books.map(toLookupBookDto),
    },
    ...(outcome.number != null && { number: outcome.number }),
    ...shared,
  };
}

module.exports = { toSeriesLookupDto };
