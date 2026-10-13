const { SEARCH_PAGE_SIZE, SEARCH_MAX_START_INDEX } = require("../constants/search");

const GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes";
const TIMEOUT_MS = 8000;
const FIELDS =
  "items(id,volumeInfo(title,authors,publishedDate,imageLinks/thumbnail,canonicalVolumeLink,infoLink))";

class UpstreamError extends Error {
  constructor(message) {
    super(message);
    this.name = "UpstreamError";
  }
}

function toHttps(url) {
  return url.replace(/^http:\/\//, "https://");
}

function toSearchResult(item) {
  const info = item.volumeInfo;
  const year = /^\d{4}/.exec(info.publishedDate ?? "")?.[0];
  const cover = info.imageLinks?.thumbnail;
  const link = info.canonicalVolumeLink ?? info.infoLink;

  return {
    volumeId: item.id,
    title: info.title,
    authors: info.authors ?? [],
    ...(year && { year: Number(year) }),
    ...(cover && { coverUrl: toHttps(cover) }),
    ...(link && { link: toHttps(link) }),
  };
}

async function searchVolumes(query, startIndex = 0) {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_BOOKS_API_KEY is not set");
  }

  const params = new URLSearchParams({
    q: query,
    maxResults: String(SEARCH_PAGE_SIZE),
    startIndex: String(startIndex),
    printType: "books",
    fields: FIELDS,
    key: apiKey,
  });

  let response;
  try {
    response = await fetch(`${GOOGLE_BOOKS_URL}?${params}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new UpstreamError("Google Books is unreachable");
  }

  if (!response.ok) {
    throw new UpstreamError(`Google Books answered ${response.status}`);
  }

  const body = await response.json();

  const items = body.items ?? [];
  const results = items.filter((item) => item.id && item.volumeInfo?.title).map(toSearchResult);
  const next = startIndex + SEARCH_PAGE_SIZE;
  const hasMore = items.length === SEARCH_PAGE_SIZE && next <= SEARCH_MAX_START_INDEX;

  return { results, ...(hasMore && { nextStartIndex: next }) };
}

module.exports = { searchVolumes, UpstreamError, GOOGLE_BOOKS_URL };
