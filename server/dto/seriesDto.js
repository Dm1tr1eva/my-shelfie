function toSeriesDto(series, counts = { owned: 0, wanted: 0 }) {
  const dto = {
    id: series._id.toString(),
    title: series.title,
    status: series.status ?? "unknown",
    ownedCount: counts.owned,
    wantedCount: counts.wanted,
    createdAt: series.createdAt,
    updatedAt: series.updatedAt,
  };

  if (series.author) dto.author = series.author;
  if (series.note) dto.note = series.note;

  return dto;
}

module.exports = { toSeriesDto };
