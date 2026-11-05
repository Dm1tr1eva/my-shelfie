const { z } = require("zod");
const { GENRE_NAME_MAX, GENRES_MAX } = require("../constants/library");

const genreName = z.string().trim().min(1).max(GENRE_NAME_MAX);

const genreList = z
  .array(genreName)
  .max(GENRES_MAX)
  .refine(
    (genres) => new Set(genres.map((genre) => genre.toLowerCase())).size === genres.length,
    "Genres must be unique",
  );

module.exports = { genreName, genreList };
