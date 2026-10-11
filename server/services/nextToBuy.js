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

function compareItems(a, b) {
  if (a.gap !== b.gap) return a.gap ? -1 : 1;
  if (a.type !== b.type) return a.type === "series" ? -1 : 1;

  if (a.type === "series") {
    const byTitle = a.series.title.localeCompare(b.series.title);
    if (byTitle !== 0) return byTitle;
    return byNumberThenAge(a.book, b.book);
  }

  return new Date(b.book.createdAt) - new Date(a.book.createdAt);
}

function pickNextToBuy({ series, books, filters = {} }) {
  const seriesById = new Map(series.map((item) => [item.id, item]));
  const booksBySeries = new Map();
  const items = [];

  for (const book of books) {
    const owner = book.seriesId ? seriesById.get(book.seriesId) : undefined;

    if (!owner) {
      if (book.ownership === "wanted") {
        items.push({ type: "standalone", book, gap: false });
      }
      continue;
    }

    const group = booksBySeries.get(owner.id) ?? [];
    group.push(book);
    booksBySeries.set(owner.id, group);
  }

  for (const [seriesId, group] of booksBySeries) {
    const owner = seriesById.get(seriesId);
    const owned = group.filter((book) => book.ownership !== "wanted");
    if (owned.length === 0) continue;

    const ownedNumbers = owned.flatMap((book) =>
      book.seriesNumber === undefined ? [] : [book.seriesNumber],
    );
    const highestOwned = ownedNumbers.length > 0 ? Math.max(...ownedNumbers) : -Infinity;

    for (const book of group.filter((item) => item.ownership === "wanted")) {
      items.push({
        type: "series",
        series: owner,
        book,
        gap: book.seriesNumber !== undefined && book.seriesNumber < highestOwned,
      });
    }
  }

  return items
    .filter((item) => {
      if (filters.seriesStatus && item.series?.status !== filters.seriesStatus) return false;
      return matchesBookFilters(item.book, filters);
    })
    .sort(compareItems);
}

module.exports = { pickNextToBuy };
