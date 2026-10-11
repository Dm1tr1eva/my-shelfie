const libraryService = require("../services/libraryService");
const { nextToBuyQuerySchema } = require("../validation/librarySchemas");

async function nextToBuy(req, res) {
  const parsed = nextToBuyQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    return res.status(400).json({ error: message });
  }

  try {
    const items = await libraryService.nextToBuy(req.userId, parsed.data);
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: "Failed to build the list" });
  }
}

async function listTropes(req, res) {
  try {
    const tropes = await libraryService.listTropes(req.userId);
    res.json({ tropes });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tropes" });
  }
}

module.exports = { nextToBuy, listTropes };
