const mongoose = require("mongoose");

const seriesLookupUsageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    day: { type: String, required: true },
    count: { type: Number, required: true, min: 0 },
    expiresAt: { type: Date, required: true },
  },
  { collection: "series_lookup_usage" },
);

seriesLookupUsageSchema.index({ userId: 1, day: 1 }, { unique: true });
seriesLookupUsageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("SeriesLookupUsage", seriesLookupUsageSchema);
