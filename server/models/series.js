const mongoose = require("mongoose");
const { SERIES_STATUSES, GENRES } = require("../constants/library");

const seriesSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    author: String,
    status: { type: String, enum: SERIES_STATUSES, default: "unknown" },
    note: String,
    totalBooks: { type: Number, min: 1 },
    genres: { type: [{ type: String, enum: GENRES }], default: [] },
    tropes: { type: [String], default: [] },
    annotation: String,
    tagsMerged: { type: Boolean, default: false },
  },
  { timestamps: true },
);

seriesSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Series", seriesSchema);
