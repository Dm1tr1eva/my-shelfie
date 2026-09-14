require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const authRouter = require("./routes/auth");
const booksRouter = require("./routes/books");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = process.env.PORT || 5000;

const cors = require("cors");

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/books", booksRouter);

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
