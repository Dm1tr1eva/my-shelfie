const mongoose = require("mongoose");
const { SERIES_STATUSES } = require("../constants/library");

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
    priority: { type: Boolean, default: false },
  },
  { timestamps: true },
);

seriesSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Series", seriesSchema);
