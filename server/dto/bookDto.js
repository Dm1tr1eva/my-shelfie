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

function toBookDto(book) {
  const dto = {
    id: book._id.toString(),
    userId: book.userId.toString(),
    title: book.title,
    author: book.author,
    status: book.status,
    ownership: book.ownership ?? "owned",
    priority: Boolean(book.priority),
    genres: book.genres ?? [],
    tropes: book.tropes ?? [],
    links: (book.links ?? []).map((link) => ({ language: link.language, url: link.url })),
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
  };

  if (book.seriesId) {
    dto.seriesId = book.seriesId.toString();
  }

  for (const field of OPTIONAL_FIELDS) {
    if (book[field] !== undefined && book[field] !== null) {
      dto[field] = book[field];
    }
  }

  return dto;
}

module.exports = { toBookDto };
