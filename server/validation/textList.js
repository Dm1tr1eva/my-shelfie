const { z } = require("zod");

function uniqueIgnoringCase(values) {
  return new Set(values.map((value) => value.toLowerCase())).size === values.length;
}

function uniqueTextList(item, maxItems, message) {
  return z.array(item).max(maxItems).refine(uniqueIgnoringCase, message);
}

module.exports = { uniqueTextList };
