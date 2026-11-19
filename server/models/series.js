const mongoose = require("mongoose");
const {
  SERIES_STATUSES,
  DESIRE_LEVELS,
  AGE_RATINGS,
  EXPECTED_SOURCES,
} = require("../constants/library");

const expectedSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true, min: 0 },
    expectedYear: Number,
    source: { type: String, enum: EXPECTED_SOURCES, required: true },
  },
  { _id: false },
);

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
    genres: { type: [String], default: [] },
    tropes: { type: [String], default: [] },
    annotation: String,
    ageRating: { type: String, enum: AGE_RATINGS, default: "none" },
    desire: { type: String, enum: DESIRE_LEVELS, default: "normal" },
    expected: { type: [expectedSchema], default: [] },
    tagsMerged: { type: Boolean, default: false },
  },
  { timestamps: true },
);

seriesSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Series", seriesSchema);
