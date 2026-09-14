const OPTIONAL_FIELDS = ["coverUrl", "description", "rating", "review", "startedAt", "finishedAt"];

// Never return a Mongoose document: __v and the document's internal shape
// have no business on the wire. An unset optional field is omitted, not
// sent as null — that already was the wire behaviour before this DTO
// existed (JSON.stringify drops undefined keys), and "absent" keeps
// meaning the same thing it meant then.
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
