const OWNERSHIP = ["owned", "wanted"];
const FORMATS = ["paper", "ebook", "audio"];
const SERIES_STATUSES = ["ongoing", "readable", "complete", "unknown"];
const LINK_LANGUAGES = ["ru", "uk", "en", "other"];
const LINK_KINDS = ["paper", "ebook", "audio", "free", "online"];
const DESIRE_LEVELS = ["high", "normal", "someday"];
const AGE_RATINGS = ["none", "12", "16", "18"];
const RECOMMEND = ["yes", "maybe", "no"];
const EXPECTED_SOURCES = ["fantlab", "ai", "manual"];
const GENRE_NAME_MAX = 40;
const GENRES_MAX = 12;
const MOOD_NAME_MAX = 40;
const MOODS_MAX = 12;
const BOOK_LENGTH_MAX = 10000;

module.exports = {
  OWNERSHIP,
  FORMATS,
  SERIES_STATUSES,
  LINK_LANGUAGES,
  LINK_KINDS,
  DESIRE_LEVELS,
  AGE_RATINGS,
  RECOMMEND,
  EXPECTED_SOURCES,
  GENRE_NAME_MAX,
  GENRES_MAX,
  MOOD_NAME_MAX,
  MOODS_MAX,
  BOOK_LENGTH_MAX,
};
