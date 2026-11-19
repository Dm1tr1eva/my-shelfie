const progressService = require("../services/progressService");
const { ProgressPageError } = progressService;
const { createProgressSchema } = require("../validation/progressSchemas");
const { toProgressDto } = require("../dto/progressDto");

function formatZodError(error) {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
    .join("; ");
}

async function recordProgress(req, res) {
  const parsed = createProgressSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: formatZodError(parsed.error) });
  }

  try {
    const entry = await progressService.recordProgress(req.userId, parsed.data);

    if (!entry) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.status(201).json(toProgressDto(entry));
  } catch (err) {
    if (err instanceof ProgressPageError) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Failed to save progress" });
  }
}

async function listLatest(req, res) {
  try {
    const entries = await progressService.listLatest(req.userId);
    res.json({ entries: entries.map(toProgressDto) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch progress" });
  }
}

module.exports = { recordProgress, listLatest };
