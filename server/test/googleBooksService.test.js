const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const { searchVolumes, UpstreamError } = require("../services/googleBooksService");
const { stubGoogleBooks, restoreFetch, googleResponse } = require("./helpers/googleBooks");

const KEY = "test-key";

const DRACULA = {
  id: "vol1",
  volumeInfo: {
    title: "Dracula",
    authors: ["Bram Stoker"],
    publishedDate: "1897-05-26",
    imageLinks: { thumbnail: "http://books.google.com/cover?id=vol1" },
    canonicalVolumeLink: "https://books.google.com/books/about/Dracula.html?id=vol1",
  },
};

function fullPage() {
  return Array.from({ length: 10 }, (_, index) => ({
    id: `vol${index}`,
    volumeInfo: { title: `Book ${index}` },
  }));
}

let previousKey;

beforeEach(() => {
  previousKey = process.env.GOOGLE_BOOKS_API_KEY;
  process.env.GOOGLE_BOOKS_API_KEY = KEY;
});

afterEach(() => {
  restoreFetch();
  if (previousKey === undefined) delete process.env.GOOGLE_BOOKS_API_KEY;
  else process.env.GOOGLE_BOOKS_API_KEY = previousKey;
});

describe("Google Books search", () => {
  it("asks Google for ten books matching the text, with the key", async () => {
    const calls = stubGoogleBooks(() => googleResponse({ items: [] }));

    await searchVolumes("Інтернат Сергій Жадан");

    assert.equal(calls.length, 1);
    assert.equal(calls[0].searchParams.get("q"), "Інтернат Сергій Жадан");
    assert.equal(calls[0].searchParams.get("maxResults"), "10");
    assert.equal(calls[0].searchParams.get("key"), KEY);
  });

  it("asks for the page that starts where it is told to", async () => {
    const calls = stubGoogleBooks(() => googleResponse({ items: [] }));

    await searchVolumes("dracula");
    await searchVolumes("dracula", 20);

    assert.equal(calls[0].searchParams.get("startIndex"), "0");
    assert.equal(calls[1].searchParams.get("startIndex"), "20");
  });

  it("says where the next page starts when Google filled this one", async () => {
    stubGoogleBooks(() => googleResponse({ items: fullPage() }));

    const first = await searchVolumes("dracula");
    const second = await searchVolumes("dracula", 10);

    assert.equal(first.nextStartIndex, 10);
    assert.equal(second.nextStartIndex, 20);
  });

  it("still offers the next page when a title-less volume was dropped from a full page", async () => {
    const items = fullPage();
    items[3] = { id: "untitled", volumeInfo: {} };
    stubGoogleBooks(() => googleResponse({ items }));

    const page = await searchVolumes("dracula");

    assert.equal(page.results.length, 9);
    assert.equal(page.nextStartIndex, 10);
  });

  it("offers no next page when Google gave fewer than a full page", async () => {
    stubGoogleBooks(() => googleResponse({ items: fullPage().slice(0, 4) }));

    const page = await searchVolumes("dracula");

    assert.equal("nextStartIndex" in page, false);
  });

  it("stops offering more after fifty results", async () => {
    stubGoogleBooks(() => googleResponse({ items: fullPage() }));

    const page = await searchVolumes("dracula", 40);

    assert.equal("nextStartIndex" in page, false);
  });

  it("maps a volume to a result with its year, an https cover and a link", async () => {
    stubGoogleBooks(() => googleResponse({ items: [DRACULA] }));

    const { results } = await searchVolumes("dracula");

    assert.deepEqual(results, [
      {
        volumeId: "vol1",
        title: "Dracula",
        authors: ["Bram Stoker"],
        year: 1897,
        coverUrl: "https://books.google.com/cover?id=vol1",
        link: "https://books.google.com/books/about/Dracula.html?id=vol1",
      },
    ]);
  });

  it("falls back to the info link and leaves out what Google does not know", async () => {
    stubGoogleBooks(() =>
      googleResponse({
        items: [
          {
            id: "vol2",
            volumeInfo: { title: "Unknown", infoLink: "http://books.google.com/info?id=vol2" },
          },
        ],
      }),
    );

    const { results } = await searchVolumes("unknown");

    assert.deepEqual(results, [
      {
        volumeId: "vol2",
        title: "Unknown",
        authors: [],
        link: "https://books.google.com/info?id=vol2",
      },
    ]);
  });

  it("skips volumes that have no title", async () => {
    stubGoogleBooks(() =>
      googleResponse({ items: [{ id: "vol3", volumeInfo: { authors: ["Nobody"] } }, DRACULA] }),
    );

    const { results } = await searchVolumes("anything");

    assert.deepEqual(
      results.map((result) => result.volumeId),
      ["vol1"],
    );
  });

  it("answers an empty list when Google finds nothing", async () => {
    stubGoogleBooks(() => googleResponse({}));

    assert.deepEqual(await searchVolumes("zzzzzz"), { results: [] });
  });

  it("reports an error status from Google as an upstream failure", async () => {
    stubGoogleBooks(() => googleResponse({ error: { message: "quota" } }, 429));

    await assert.rejects(searchVolumes("dracula"), UpstreamError);
  });

  it("reports an unreachable Google as an upstream failure", async () => {
    stubGoogleBooks(() => Promise.reject(new TypeError("fetch failed")));

    await assert.rejects(searchVolumes("dracula"), UpstreamError);
  });

  it("does not call Google at all when there is no key", async () => {
    delete process.env.GOOGLE_BOOKS_API_KEY;
    const calls = stubGoogleBooks(() => googleResponse({ items: [] }));

    await assert.rejects(searchVolumes("dracula"), (err) => !(err instanceof UpstreamError));
    assert.equal(calls.length, 0);
  });
});
