const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRouter = require("./routes/auth");
const booksRouter = require("./routes/books");

// Split out of index.js so a test can start the app on a random port without
// opening a connection to the development database. Mongo connection and
// listen() stay in index.js.
const app = express();

// A wildcard origin can't be combined with credentials: true — the browser
// refuses to expose the response to a fetch("...", { credentials: "include" })
// call, which is how the frontend sends the httpOnly auth cookie.
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/books", booksRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

module.exports = app;
