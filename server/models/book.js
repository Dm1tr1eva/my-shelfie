const mongoose = require("mongoose");
const {
  OWNERSHIP,
  FORMATS,
  LINK_KINDS,
  LINK_LANGUAGES,
  DESIRE_LEVELS,
  AGE_RATINGS,
  RECOMMEND,
} = require("../constants/library");

const linkSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: LINK_KINDS, default: "paper" },
    languages: [{ type: String, enum: LINK_LANGUAGES }],
    language: String,
    url: { type: String, required: true },
  },
  { _id: false },
);

const quoteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    page: { type: Number, min: 1 },
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
    format: { type: String, enum: FORMATS, default: "paper" },
    pages: { type: Number, min: 1 },
    durationMinutes: { type: Number, min: 1 },
    seriesId: { type: mongoose.Schema.Types.ObjectId, ref: "Series" },
    seriesNumber: { type: Number, min: 0 },
    genres: [String],
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
    moods: [String],
    recommend: { type: String, enum: RECOMMEND },
    quotes: [quoteSchema],
    desire: { type: String, enum: DESIRE_LEVELS, default: "normal" },
    ageRating: { type: String, enum: AGE_RATINGS, default: "none" },
    startedAt: Date,
    finishedAt: Date,
  },
  { timestamps: true },
);

bookSchema.index({ userId: 1, createdAt: -1 });
bookSchema.index({ userId: 1, seriesId: 1, seriesNumber: 1 });

module.exports = mongoose.model("Book", bookSchema);
