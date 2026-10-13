const seriesService = require("../services/seriesService");
const { createSeriesSchema, updateSeriesSchema } = require("../validation/seriesSchemas");
const { toSeriesDto } = require("../dto/seriesDto");
const { toBookDto } = require("../dto/bookDto");

function formatZodError(error) {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
    .join("; ");
}

async function createSeries(req, res) {
  const parsed = createSeriesSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: formatZodError(parsed.error) });
  }

  try {
    const series = await seriesService.createSeries(req.userId, parsed.data);
    res.status(201).json(toSeriesDto(series));
  } catch (err) {
    res.status(500).json({ error: "Failed to create series" });
  }
}

async function listSeries(req, res) {
  try {
    const entries = await seriesService.listSeries(req.userId);
    res.json({ series: entries.map(({ series, counts }) => toSeriesDto(series, counts)) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch series" });
  }
}

async function getSeries(req, res) {
  try {
    const found = await seriesService.getSeries(req.userId, req.params.id);

    if (!found) {
      return res.status(404).json({ error: "Series not found" });
    }

    res.json({
      series: toSeriesDto(found.series, found.counts),
      books: found.books.map((book) => toBookDto(book, found.series)),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch series" });
  }
}

async function updateSeries(req, res) {
  const parsed = updateSeriesSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: formatZodError(parsed.error) });
  }

  try {
    const series = await seriesService.updateSeries(req.userId, req.params.id, parsed.data);

    if (!series) {
      return res.status(404).json({ error: "Series not found" });
    }

    res.json(toSeriesDto(series));
  } catch (err) {
    res.status(500).json({ error: "Failed to update series" });
  }
}

async function deleteSeries(req, res) {
  try {
    const series = await seriesService.deleteSeries(req.userId, req.params.id);

    if (!series) {
      return res.status(404).json({ error: "Series not found" });
    }

    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete series" });
  }
}

module.exports = { createSeries, listSeries, getSeries, updateSeries, deleteSeries };
