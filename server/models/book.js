const mongoose = require("mongoose");
const { OWNERSHIP, LINK_LANGUAGES, GENRES } = require("../constants/library");

const linkSchema = new mongoose.Schema(
  {
    language: { type: String, enum: LINK_LANGUAGES, required: true },
    url: { type: String, required: true },
  },
  { _id: false },
);

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
    googleVolumeId: String,
    description: String,
    ownership: { type: String, enum: OWNERSHIP, default: "owned" },
    seriesId: { type: mongoose.Schema.Types.ObjectId, ref: "Series" },
    seriesNumber: { type: Number, min: 0 },
    genres: [{ type: String, enum: GENRES }],
    tropes: [String],
    links: [linkSchema],
    notes: String,
    annotation: String,
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

bookSchema.index({ userId: 1, createdAt: -1 });
bookSchema.index({ userId: 1, seriesId: 1, seriesNumber: 1 });

module.exports = mongoose.model("Book", bookSchema);
