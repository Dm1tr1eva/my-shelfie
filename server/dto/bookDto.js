const OPTIONAL_FIELDS = [
  "coverUrl",
  "googleVolumeId",
  "description",
  "seriesNumber",
  "notes",
  "annotation",
  "rating",
  "pages",
  "durationMinutes",
  "recommend",
  "startedAt",
  "finishedAt",
];

function isSet(value) {
  return value !== undefined && value !== null && value !== "";
}

function languagesOf(link) {
  if (link.languages?.length > 0) return [...link.languages];
  return link.language ? [link.language] : [];
}

function sourceOf(field, book, shared) {
  if (field === "annotation" && shared) return shared.annotation;
  if (field === "notes" && !isSet(book.notes)) return book.review;
  return book[field];
}

function toBookDto(book, series) {
  const shared = book.seriesId && series ? series : null;

  const dto = {
    id: book._id.toString(),
    userId: book.userId.toString(),
    title: book.title,
    author: book.author,
    status: book.status,
    ownership: book.ownership ?? "owned",
    format: book.format,
    desire: book.desire,
    ageRating: shared ? shared.ageRating : book.ageRating,
    genres: shared ? (shared.genres ?? []) : (book.genres ?? []),
    tropes: shared ? (shared.tropes ?? []) : (book.tropes ?? []),
    moods: book.moods ?? [],
    quotes: (book.quotes ?? []).map((quote) => ({
      text: quote.text,
      ...(quote.page !== undefined && quote.page !== null && { page: quote.page }),
    })),
    links: (book.links ?? []).map((link) => ({
      kind: link.kind,
      languages: languagesOf(link),
      url: link.url,
    })),
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
  };

  if (book.seriesId) {
    dto.seriesId = book.seriesId.toString();
  }

  for (const field of OPTIONAL_FIELDS) {
    const value = sourceOf(field, book, shared);
    if (isSet(value)) {
      dto[field] = value;
    }
  }

  return dto;
}

module.exports = { toBookDto };
