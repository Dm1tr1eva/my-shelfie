const { z } = require("zod");

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Not a valid id");

module.exports = { objectId };
