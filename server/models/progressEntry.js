const mongoose = require("mongoose");

const progressEntrySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
    date: { type: Date, required: true, default: Date.now },
    page: { type: Number, min: 0 },
    percent: { type: Number, required: true, min: 0, max: 100 },
  },
  { collection: "progress_log" },
);

progressEntrySchema.index({ userId: 1, date: -1 });
progressEntrySchema.index({ userId: 1, bookId: 1, date: -1 });

module.exports = mongoose.model("ProgressEntry", progressEntrySchema);
