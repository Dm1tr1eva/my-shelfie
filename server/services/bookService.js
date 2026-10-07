const bookRepository = require("../repositories/bookRepository");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

async function createBook(userId, data) {
  return bookRepository.create(userId, data);
}

async function listBooks(userId, { status, page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = {}) {
  const { books, total } = await bookRepository.findManyForUser(userId, { status, page, limit });
  return { books, total, page, limit };
}

async function getBook(userId, id) {
  return bookRepository.findOneForUser(userId, id);
}

async function updateBook(userId, id, updates) {
  return bookRepository.updateOneForUser(userId, id, updates);
}

async function deleteBook(userId, id) {
  return bookRepository.deleteOneForUser(userId, id);
}

module.exports = { createBook, listBooks, getBook, updateBook, deleteBook };
