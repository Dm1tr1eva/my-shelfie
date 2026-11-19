const progressService = require("../services/progressService");
const { createProgressSchema } = require("../validation/progressSchemas");
const { validate } = require("../validation/validate");
const { toProgressDto } = require("../dto/progressDto");

async function recordProgress(req, res) {
  const data = validate(createProgressSchema, req.body);

  const entry = await progressService.recordProgress(req.userId, data);

  if (!entry) {
    return res.status(404).json({ error: "Book not found" });
  }

  res.status(201).json(toProgressDto(entry));
}

async function listLatest(req, res) {
  const entries = await progressService.listLatest(req.userId);
  res.json({ entries: entries.map(toProgressDto) });
}

module.exports = { recordProgress, listLatest };
