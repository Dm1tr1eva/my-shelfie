const GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes";
const MAX_RESULTS = 10;
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

async function searchVolumes(query) {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_BOOKS_API_KEY is not set");
  }

  const params = new URLSearchParams({
    q: query,
    maxResults: String(MAX_RESULTS),
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

  return (body.items ?? []).filter((item) => item.id && item.volumeInfo?.title).map(toSearchResult);
}

module.exports = { searchVolumes, UpstreamError, GOOGLE_BOOKS_URL };
