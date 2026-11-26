const { z } = require("zod");
const wishlistQuerySchema = z.object({}).strict();

module.exports = { wishlistQuerySchema };
