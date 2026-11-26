const libraryService = require("../services/libraryService");
const { nextToBuyQuerySchema, wishlistQuerySchema } = require("../validation/librarySchemas");
const { validate } = require("../validation/validate");

async function nextToBuy(req, res) {
  const filters = validate(nextToBuyQuerySchema, req.query);

  const items = await libraryService.nextToBuy(req.userId, filters);
  res.json({ items });
}

async function wishlist(req, res) {
  validate(wishlistQuerySchema, req.query, "query");

  const groups = await libraryService.wishlist(req.userId);
  res.json({ groups });
}

async function listTropes(req, res) {
  const tropes = await libraryService.listTropes(req.userId);
  res.json({ tropes });
}

module.exports = { nextToBuy, wishlist, listTropes };
