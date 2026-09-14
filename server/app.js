const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRouter = require("./routes/auth");
const booksRouter = require("./routes/books");

// Split out of index.js so a test can start the app on a random port without
// opening a connection to the development database. Mongo connection and
// listen() stay in index.js.
const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/books", booksRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

module.exports = app;
