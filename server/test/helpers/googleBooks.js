const { GOOGLE_BOOKS_URL } = require("../../services/googleBooksService");

const realFetch = globalThis.fetch;

function stubGoogleBooks(handler) {
  const calls = [];

  globalThis.fetch = (input, init) => {
    const url = String(input);
    if (!url.startsWith(GOOGLE_BOOKS_URL)) {
      return realFetch(input, init);
    }

    calls.push(new URL(url));
    return handler(url, init);
  };

  return calls;
}

function restoreFetch() {
  globalThis.fetch = realFetch;
}

function googleResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

module.exports = { stubGoogleBooks, restoreFetch, googleResponse };
