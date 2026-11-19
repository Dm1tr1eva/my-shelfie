const { z } = require("zod");
const { GENRE_NAME_MAX, GENRES_MAX } = require("../constants/library");
const { uniqueTextList } = require("./textList");

const genreName = z.string().trim().min(1).max(GENRE_NAME_MAX);

const genreList = uniqueTextList(genreName, GENRES_MAX, "Genres must be unique");

module.exports = { genreName, genreList };
