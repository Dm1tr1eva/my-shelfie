const seriesService = require("../services/seriesService");
const { createSeriesSchema, updateSeriesSchema } = require("../validation/seriesSchemas");
const { validate } = require("../validation/validate");
const { toSeriesDto } = require("../dto/seriesDto");
const { toBookDto } = require("../dto/bookDto");

async function createSeries(req, res) {
  const data = validate(createSeriesSchema, req.body);

  const series = await seriesService.createSeries(req.userId, data);
  res.status(201).json(toSeriesDto(series));
}

async function listSeries(req, res) {
  const entries = await seriesService.listSeries(req.userId);
  res.json({ series: entries.map(({ series, counts }) => toSeriesDto(series, counts)) });
}

async function getSeries(req, res) {
  const found = await seriesService.getSeries(req.userId, req.params.id);

  if (!found) {
    return res.status(404).json({ error: "Series not found" });
  }

  res.json({
    series: toSeriesDto(found.series, found.counts),
    books: found.books.map((book) => toBookDto(book, found.series)),
  });
}

async function updateSeries(req, res) {
  const updates = validate(updateSeriesSchema, req.body);

  const series = await seriesService.updateSeries(req.userId, req.params.id, updates);

  if (!series) {
    return res.status(404).json({ error: "Series not found" });
  }

  res.json(toSeriesDto(series));
}

async function deleteSeries(req, res) {
  const series = await seriesService.deleteSeries(req.userId, req.params.id);

  if (!series) {
    return res.status(404).json({ error: "Series not found" });
  }

  res.status(204).end();
}

module.exports = { createSeries, listSeries, getSeries, updateSeries, deleteSeries };
