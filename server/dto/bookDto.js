const OPTIONAL_FIELDS = [
  "coverUrl",
  "googleVolumeId",
  "description",
  "seriesNumber",
  "notes",
  "annotation",
  "rating",
  "review",
  "startedAt",
  "finishedAt",
];

function toBookDto(book, series) {
  const shared = book.seriesId && series ? series : null;

  const dto = {
    id: book._id.toString(),
    userId: book.userId.toString(),
    title: book.title,
    author: book.author,
    status: book.status,
    ownership: book.ownership ?? "owned",
    genres: shared ? (shared.genres ?? []) : (book.genres ?? []),
    tropes: shared ? (shared.tropes ?? []) : (book.tropes ?? []),
    links: (book.links ?? []).map((link) => ({ language: link.language, url: link.url })),
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
  };

  if (book.seriesId) {
    dto.seriesId = book.seriesId.toString();
  }

  for (const field of OPTIONAL_FIELDS) {
    const value = field === "annotation" && shared ? shared.annotation : book[field];
    if (value !== undefined && value !== null && value !== "") {
      dto[field] = value;
    }
  }

  return dto;
}

module.exports = { toBookDto };
