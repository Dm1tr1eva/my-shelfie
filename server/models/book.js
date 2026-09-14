const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true },
    author: { type: String, required: true },
    coverUrl: String,
    description: String,
    status: {
      type: String,
      enum: ["want", "reading", "dropped", "read"],
      default: "want",
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    review: String,
    startedAt: Date,
    finishedAt: Date,
  },
  { timestamps: true },
);

// Every book query the app makes filters on userId, and the list endpoint
// sorts on createdAt — a compound index covers both without a second one.
bookSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Book", bookSchema);