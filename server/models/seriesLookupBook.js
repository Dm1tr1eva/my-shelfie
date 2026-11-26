const mongoose = require("mongoose");
const { LOOKUP_CONFIDENCE_LEVELS } = require("../constants/seriesLookup");

const seriesLookupBookSchema = new mongoose.Schema(
  {
    bookKey: { type: String, required: true },
    title: { type: String, required: true },
    authors: { type: [String], default: [] },
    seriesLookupId: { type: mongoose.Schema.Types.ObjectId, ref: "SeriesLookup", default: null },
    number: { type: Number, default: null },
    confidence: { type: String, enum: LOOKUP_CONFIDENCE_LEVELS, required: true },
    sources: { type: [String], default: [] },
    expiresAt: { type: Date, required: true },
  },
  { collection: "series_lookup_books", timestamps: true },
);

seriesLookupBookSchema.index({ bookKey: 1 }, { unique: true });
seriesLookupBookSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("SeriesLookupBook", seriesLookupBookSchema);
