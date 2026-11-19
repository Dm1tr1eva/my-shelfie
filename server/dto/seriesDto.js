function toSeriesDto(series, counts = { owned: 0, wanted: 0 }) {
  const dto = {
    id: series._id.toString(),
    title: series.title,
    status: series.status ?? "unknown",
    genres: series.genres ?? [],
    tropes: series.tropes ?? [],
    ageRating: series.ageRating,
    desire: series.desire,
    expected: (series.expected ?? []).map((entry) => ({
      number: entry.number,
      ...(entry.expectedYear !== undefined &&
        entry.expectedYear !== null && { expectedYear: entry.expectedYear }),
      source: entry.source,
    })),
    ownedCount: counts.owned,
    wantedCount: counts.wanted,
    createdAt: series.createdAt,
    updatedAt: series.updatedAt,
  };

  if (series.author) dto.author = series.author;
  if (series.note) dto.note = series.note;
  if (series.totalBooks) dto.totalBooks = series.totalBooks;
  if (series.annotation) dto.annotation = series.annotation;

  return dto;
}

module.exports = { toSeriesDto };
