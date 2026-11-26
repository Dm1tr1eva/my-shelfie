require("dotenv").config();

const mongoose = require("mongoose");
const app = require("./app");
const { readSeriesLookupConfig } = require("./config/seriesLookup");

const seriesLookup = readSeriesLookupConfig();
if (seriesLookup.provider === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
  console.warn("ANTHROPIC_API_KEY is not set: series lookup answers 503");
}

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
