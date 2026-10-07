const OPTIONAL_FIELDS = ["coverUrl", "description", "rating", "review", "startedAt", "finishedAt"];

function toBookDto(book) {
  const dto = {
    id: book._id.toString(),
    userId: book.userId.toString(),
    title: book.title,
    author: book.author,
    status: book.status,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
  };

  for (const field of OPTIONAL_FIELDS) {
    if (book[field] !== undefined && book[field] !== null) {
      dto[field] = book[field];
    }
  }

  return dto;
}

module.exports = { toBookDto };
