function byNumberThenAge(a, b) {
  const aNumber = a.seriesNumber ?? Infinity;
  const bNumber = b.seriesNumber ?? Infinity;
  if (aNumber !== bNumber) return aNumber - bNumber;
  return new Date(a.createdAt) - new Date(b.createdAt);
}

function matchesBookFilters(book, { language, genre, trope }) {
  if (language && !book.links.some((link) => link.language === language)) return false;
  if (genre && !book.genres.includes(genre)) return false;
  if (trope && !book.tropes.includes(trope)) return false;
  return true;
}

function pickNextToBuy({ series, wantedBooks, filters = {} }) {
  const seriesById = new Map(series.map((item) => [item.id, item]));
  const wantedBySeries = new Map();
  const items = [];

  for (const book of wantedBooks) {
    const owner = book.seriesId ? seriesById.get(book.seriesId) : undefined;

    if (!owner) {
      items.push({
        type: "standalone",
        book,
        addedAt: book.createdAt,
        priority: book.priority,
      });
      continue;
    }

    const group = wantedBySeries.get(owner.id) ?? [];
    group.push(book);
    wantedBySeries.set(owner.id, group);
  }

  for (const [seriesId, books] of wantedBySeries) {
    const owner = seriesById.get(seriesId);
    const [next] = [...books].sort(byNumberThenAge);

    items.push({
      type: "series",
      series: owner,
      book: next,
      wantedCount: books.length,
      addedAt: owner.createdAt,
      priority: owner.priority,
    });
  }

  return items
    .filter((item) => {
      if (filters.seriesStatus && item.series?.status !== filters.seriesStatus) return false;
      return matchesBookFilters(item.book, filters);
    })
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority ? -1 : 1;
      return new Date(b.addedAt) - new Date(a.addedAt);
    })
    .map(({ addedAt, priority, ...item }) => item);
}

module.exports = { pickNextToBuy };
