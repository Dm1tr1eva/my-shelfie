function toProgressDto(entry) {
  return {
    id: entry._id.toString(),
    bookId: entry.bookId.toString(),
    date: entry.date,
    ...(entry.page !== undefined && entry.page !== null && { page: entry.page }),
    percent: entry.percent,
  };
}

module.exports = { toProgressDto };
