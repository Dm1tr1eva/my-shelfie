const libraryService = require("../services/libraryService");
const { wishlistQuerySchema } = require("../validation/librarySchemas");
const { validate } = require("../validation/validate");

async function wishlist(req, res) {
  validate(wishlistQuerySchema, req.query, "query");

  const groups = await libraryService.wishlist(req.userId);
  res.json({ groups });
}

async function listTropes(req, res) {
  const tropes = await libraryService.listTropes(req.userId);
  res.json({ tropes });
}

module.exports = { wishlist, listTropes };
