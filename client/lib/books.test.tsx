import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { AuthProvider, useAuth } from "./auth-context";
import { useBooks } from "./books";

const ME_URL = "http://localhost:5000/api/auth/me";
const ALICE = { id: "1", email: "alice@example.com", name: "Alice" };

function jsonResponse(status: number, body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

// useBooks only fetches once auth settles, and useSWR's own isLoading is
// false both before that (key is still null) and after real data has
// arrived — waiting on isLoading alone can't tell those apart. Rendering
// both hooks together lets a test wait on the unambiguous signal instead:
// auth.status.
//
// SWR caches by key in a module-level store by default, shared across every
// useSWR call in the process. Two tests here use the same key
// (/api/books?limit=100, the "all" filter) — without a fresh cache per
// test, the second one would see the first one's cached response instead of
// exercising its own mock.
function renderBooks(status: Parameters<typeof useBooks>[0] = "all") {
  return renderHook(
    () => ({ auth: useAuth(), books: useBooks(status) }),
    {
      wrapper: ({ children }) => (
        <SWRConfig value={{ provider: () => new Map() }}>
          <AuthProvider>{children}</AuthProvider>
        </SWRConfig>
      ),
    },
  );
}

describe("useBooks", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not call /api/books once the session check settles on anonymous", async () => {
    const calledUrls: string[] = [];
    vi.mocked(fetch).mockImplementation((url) => {
      calledUrls.push(String(url));
      if (url === ME_URL) return jsonResponse(401, { error: "Not authenticated" });
      throw new Error(`unexpected fetch: ${url}`);
    });

    const { result } = renderBooks();

    await waitFor(() => expect(result.current.auth.status).toBe("anonymous"));
    expect(calledUrls.some((u) => u.includes("/api/books"))).toBe(false);
    expect(result.current.books.books).toEqual([]);
  });

  it("fetches the list once authenticated", async () => {
    const books = [
      { id: "1", userId: "1", title: "Dune", author: "Frank Herbert", status: "want", createdAt: "", updatedAt: "" },
    ];

    vi.mocked(fetch).mockImplementation((url) => {
      if (url === ME_URL) return jsonResponse(200, ALICE);
      if (String(url).startsWith("http://localhost:5000/api/books")) {
        return jsonResponse(200, { books, total: 1, page: 1, limit: 100 });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });

    const { result } = renderBooks();

    await waitFor(() => expect(result.current.auth.status).toBe("authenticated"));
    await waitFor(() => expect(result.current.books.books).toEqual(books));
    expect(result.current.books.total).toBe(1);
  });

  it("includes the status filter in the request when it is not 'all'", async () => {
    const requestedUrls: string[] = [];
    vi.mocked(fetch).mockImplementation((url) => {
      requestedUrls.push(String(url));
      if (url === ME_URL) return jsonResponse(200, ALICE);
      return jsonResponse(200, { books: [], total: 0, page: 1, limit: 100 });
    });

    const { result } = renderBooks("reading");

    await waitFor(() => expect(result.current.auth.status).toBe("authenticated"));
    await waitFor(() =>
      expect(requestedUrls.some((u) => u.includes("status=reading"))).toBe(true),
    );
  });

  it("surfaces a fetch failure as an error instead of throwing", async () => {
    vi.mocked(fetch).mockImplementation((url) => {
      if (url === ME_URL) return jsonResponse(200, ALICE);
      return jsonResponse(500, { error: "Failed to fetch books" });
    });

    const { result } = renderBooks();

    await waitFor(() => expect(result.current.auth.status).toBe("authenticated"));
    await waitFor(() => expect(result.current.books.error).toBeTruthy());
    expect(result.current.books.books).toEqual([]);
  });
});
