const mongoose = require("mongoose");
const { LOOKUP_SERIES_STATUSES, LOOKUP_CONFIDENCE_LEVELS } = require("../constants/seriesLookup");

const lookupBookSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true },
    title: { type: String, required: true },
    released: { type: Boolean, required: true },
    expectedYear: { type: Number, default: null },
  },
  { _id: false },
);

const seriesLookupSchema = new mongoose.Schema(
  {
    seriesKey: { type: String, required: true },
    name: { type: String, required: true },
    originalName: { type: String, default: null },
    status: { type: String, enum: LOOKUP_SERIES_STATUSES, required: true },
    books: { type: [lookupBookSchema], default: [] },
    confidence: { type: String, enum: LOOKUP_CONFIDENCE_LEVELS, required: true },
    sources: { type: [String], default: [] },
    titleKeys: { type: [String], default: [] },
    authorKeys: { type: [String], default: [] },
    expiresAt: { type: Date, required: true },
  },
  { collection: "series_lookups", timestamps: true },
);

seriesLookupSchema.index({ seriesKey: 1 }, { unique: true });
seriesLookupSchema.index({ titleKeys: 1 });
seriesLookupSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("SeriesLookup", seriesLookupSchema);
