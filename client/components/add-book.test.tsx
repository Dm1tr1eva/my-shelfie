import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { book, booksResponse, mockApi, renderApp, series } from "@/test/helpers";
import { AddBook } from "./add-book";

const route = vi.hoisted(() => ({ params: new URLSearchParams() }));
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => route.params,
}));

const RESULT = {
  volumeId: "vol1",
  title: "A Court of Thorns and Roses",
  authors: ["Sarah J. Maas"],
  year: 2015,
  coverUrl: "https://books.google.com/cover?id=vol1",
  link: "https://books.google.com/books?id=vol1",
};

function serve(options: { existing?: ReturnType<typeof book>[]; searchFails?: boolean } = {}) {
  return mockApi(({ method, path }) => {
    if (path.startsWith("/api/books/search")) {
      if (options.searchFails) return { status: 502, body: { error: "upstream" } };
      return { body: { results: [RESULT] } };
    }
    if (method === "POST" && path === "/api/books") {
      return { status: 201, body: book({ id: "created", title: RESULT.title }) };
    }
    if (method === "PATCH") return { body: book({ id: "wish" }) };
    if (path.startsWith("/api/books")) return booksResponse(options.existing ?? []);
    if (path === "/api/series") {
      return { body: { series: [series({ id: "acotar", title: "ACOTAR" })] } };
    }
  });
}

async function searchFor(text: string) {
  fireEvent.change(await screen.findByPlaceholderText(/Search Google Books|…/), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
}

describe("AddBook", () => {
  beforeEach(() => {
    route.params = new URLSearchParams();
    router.push.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not search for fewer than three characters", async () => {
    const calls = serve();
    renderApp(<AddBook />);

    await searchFor("ab");

    expect(calls.some((call) => call.path.startsWith("/api/books/search"))).toBe(false);
  });

  it("adds a search result to the library and opens the details step at once", async () => {
    const calls = serve();
    renderApp(<AddBook />);

    await searchFor("thorns");
    const row = (await screen.findByText(RESULT.title)).closest("li") as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: "Add to library" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/add/created/details"));
    expect(calls).toContainEqual({
      method: "POST",
      path: "/api/books",
      body: {
        title: RESULT.title,
        author: "Sarah J. Maas",
        ownership: "owned",
        coverUrl: RESULT.coverUrl,
        googleVolumeId: "vol1",
      },
    });
  });

  it("puts the book into the series and number it was opened for", async () => {
    route.params = new URLSearchParams("series=acotar&number=2");
    const calls = serve();
    renderApp(<AddBook />);

    await searchFor("clash of thorns");
    const row = (await screen.findByText(RESULT.title)).closest("li") as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: "Add to wishlist" }));

    await waitFor(() =>
      expect(calls).toContainEqual(
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            ownership: "wanted",
            seriesId: "acotar",
            seriesNumber: 2,
          }),
        }),
      ),
    );
    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/add/created/details?series=acotar&number=2"),
    );
  });

  it("offers to move a book that is already on the wishlist instead of adding it twice", async () => {
    const calls = serve({
      existing: [book({ id: "wish", googleVolumeId: "vol1", ownership: "wanted" })],
    });
    renderApp(<AddBook />);

    await searchFor("thorns");
    expect(await screen.findByText("Already on your wishlist")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add to library" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Move to library" }));

    await waitFor(() =>
      expect(calls).toContainEqual({
        method: "PATCH",
        path: "/api/books/wish",
        body: { ownership: "owned" },
      }),
    );
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });

  it("does not offer to add a book that is already in the library", async () => {
    serve({ existing: [book({ googleVolumeId: "vol1", ownership: "owned" })] });
    renderApp(<AddBook />);

    await searchFor("thorns");

    expect(await screen.findByText("Already in your library")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Move to library" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add to library" })).not.toBeInTheDocument();
  });

  it("falls back to adding by hand when Google Books does not answer", async () => {
    const calls = serve({ searchFails: true });
    renderApp(<AddBook />);

    await searchFor("thorns");
    expect(await screen.findByText("Google Books isn't answering")).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByRole("alert")).getByRole("button", { name: "Add it without search" }),
    );

    const form = screen.getByRole("form", { name: "Add a book by hand" });
    fireEvent.change(within(form).getByLabelText("Title"), { target: { value: "My Own Book" } });
    fireEvent.change(within(form).getByLabelText("Author"), { target: { value: "Me" } });
    fireEvent.click(within(form).getByLabelText("Wishlist"));
    fireEvent.click(within(form).getByRole("button", { name: "Add book" }));

    await waitFor(() =>
      expect(calls).toContainEqual({
        method: "POST",
        path: "/api/books",
        body: { title: "My Own Book", author: "Me", ownership: "wanted" },
      }),
    );
  });

  describe("more results", () => {
    const FIRST = { ...RESULT, volumeId: "p1", title: "First Page Book" };
    const SECOND = { ...RESULT, volumeId: "p2", title: "Second Page Book" };
    const NEWER = { ...RESULT, volumeId: "n1", title: "Newer Search Book" };

    function servePages(
      options: { secondFails?: boolean; secondHasMore?: boolean; repeatsFirst?: boolean } = {},
    ) {
      return mockApi(({ path }) => {
        if (path.startsWith("/api/books/search")) {
          if (path.includes("q=roses")) return { body: { results: [NEWER] } };
          if (path.includes("startIndex=10")) {
            if (options.secondFails) return { status: 502, body: { error: "upstream" } };
            return {
              body: {
                results: options.repeatsFirst ? [FIRST, SECOND] : [SECOND],
                ...(options.secondHasMore && { nextStartIndex: 20 }),
              },
            };
          }
          return { body: { results: [FIRST], nextStartIndex: 10 } };
        }
        if (path.startsWith("/api/books")) return booksResponse([]);
        if (path === "/api/series") return { body: { series: [] } };
      });
    }

    it("leaves out a book that the next page lists again", async () => {
      servePages({ repeatsFirst: true });
      renderApp(<AddBook />);

      await searchFor("thorns");
      await screen.findByText("First Page Book");
      fireEvent.click(screen.getByRole("button", { name: "Show more results" }));

      expect(await screen.findByText("Second Page Book")).toBeInTheDocument();
      expect(screen.getAllByText("First Page Book")).toHaveLength(1);
    });

    it("shows the next page below the first", async () => {
      const calls = servePages();
      renderApp(<AddBook />);

      await searchFor("thorns");
      await screen.findByText("First Page Book");
      fireEvent.click(screen.getByRole("button", { name: "Show more results" }));

      expect(await screen.findByText("Second Page Book")).toBeInTheDocument();
      expect(screen.getByText("First Page Book")).toBeInTheDocument();
      expect(calls.map((call) => call.path)).toContain("/api/books/search?q=thorns&startIndex=10");
      expect(screen.queryByRole("button", { name: "Show more results" })).not.toBeInTheDocument();
    });

    it("hides the more button at once when the text changes, and swaps the results when the new ones arrive", async () => {
      servePages();
      renderApp(<AddBook />);

      await searchFor("thorns");
      await screen.findByText("First Page Book");
      fireEvent.change(screen.getByRole("searchbox"), { target: { value: "roses" } });

      expect(screen.queryByRole("button", { name: "Show more results" })).not.toBeInTheDocument();
      expect(screen.getByText("First Page Book")).toBeInTheDocument();
      expect(
        await screen.findByText("Newer Search Book", {}, { timeout: 3000 }),
      ).toBeInTheDocument();
      expect(screen.queryByText("First Page Book")).not.toBeInTheDocument();
    });

    it("searches the new text from the first page when you press Search again", async () => {
      const calls = servePages();
      renderApp(<AddBook />);

      await searchFor("thorns");
      await screen.findByText("First Page Book");
      await searchFor("roses");

      await waitFor(() =>
        expect(calls.map((call) => call.path)).toContain("/api/books/search?q=roses"),
      );
      expect(await screen.findByText("Newer Search Book")).toBeInTheDocument();
    });

    it("ignores a first search that answers after the text was changed", async () => {
      let release: () => void = () => {};
      const slow = new Promise<void>((resolve) => {
        release = resolve;
      });
      mockApi(({ path }) => {
        if (path.includes("q=thorns")) return { body: { results: [FIRST] }, wait: slow };
        if (path.startsWith("/api/books/search")) return { body: { results: [NEWER] } };
        if (path.startsWith("/api/books")) return booksResponse([]);
        if (path === "/api/series") return { body: { series: [] } };
      });
      renderApp(<AddBook />);

      await searchFor("thorns");
      fireEvent.change(screen.getByRole("searchbox"), { target: { value: "roses" } });
      await screen.findByText("Newer Search Book", {}, { timeout: 3000 });
      release();
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(screen.queryByText("First Page Book")).not.toBeInTheDocument();
      expect(screen.getByText("Newer Search Book")).toBeInTheDocument();
    });

    it("ignores a page that arrives after the text was changed", async () => {
      let release: () => void = () => {};
      const slow = new Promise<void>((resolve) => {
        release = resolve;
      });
      mockApi(({ path }) => {
        if (path.includes("startIndex=10")) return { body: { results: [SECOND] }, wait: slow };
        if (path.includes("q=roses")) return { body: { results: [NEWER] } };
        if (path.startsWith("/api/books/search")) {
          return { body: { results: [FIRST], nextStartIndex: 10 } };
        }
        if (path.startsWith("/api/books")) return booksResponse([]);
        if (path === "/api/series") return { body: { series: [] } };
      });
      renderApp(<AddBook />);

      await searchFor("thorns");
      await screen.findByText("First Page Book");
      fireEvent.click(screen.getByRole("button", { name: "Show more results" }));
      fireEvent.change(screen.getByRole("searchbox"), { target: { value: "roses" } });
      await screen.findByText("Newer Search Book", {}, { timeout: 3000 });
      release();
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(screen.queryByText("Second Page Book")).not.toBeInTheDocument();
      expect(screen.getByText("Newer Search Book")).toBeInTheDocument();
    });

    it("does not add an old page to the results of a newer search", async () => {
      let release: () => void = () => {};
      const slow = new Promise<void>((resolve) => {
        release = resolve;
      });
      mockApi(({ path }) => {
        if (path.includes("startIndex=10")) return { body: { results: [SECOND] }, wait: slow };
        if (path.startsWith("/api/books/search?q=roses")) return { body: { results: [NEWER] } };
        if (path.startsWith("/api/books/search")) {
          return { body: { results: [FIRST], nextStartIndex: 10 } };
        }
        if (path.startsWith("/api/books")) return booksResponse([]);
        if (path === "/api/series") return { body: { series: [] } };
      });
      renderApp(<AddBook />);

      await searchFor("thorns");
      await screen.findByText("First Page Book");
      fireEvent.click(screen.getByRole("button", { name: "Show more results" }));
      await searchFor("roses");
      await screen.findByText("Newer Search Book");
      release();
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(screen.queryByText("Second Page Book")).not.toBeInTheDocument();
      expect(screen.getByText("Newer Search Book")).toBeInTheDocument();
    });

    it("offers another page while the server says there is one", async () => {
      servePages({ secondHasMore: true });
      renderApp(<AddBook />);

      await searchFor("thorns");
      await screen.findByText("First Page Book");
      fireEvent.click(screen.getByRole("button", { name: "Show more results" }));
      await screen.findByText("Second Page Book");

      expect(screen.getByRole("button", { name: "Show more results" })).toBeInTheDocument();
    });

    it("keeps the results you have and lets you retry when the next page fails", async () => {
      servePages({ secondFails: true });
      renderApp(<AddBook />);

      await searchFor("thorns");
      await screen.findByText("First Page Book");
      fireEvent.click(screen.getByRole("button", { name: "Show more results" }));

      expect(await screen.findByText("Could not load more results.")).toBeInTheDocument();
      expect(screen.getByText("First Page Book")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Show more results" })).toBeInTheDocument();
      expect(screen.queryByText("Google Books isn't answering")).not.toBeInTheDocument();
    });
  });

  describe("search as you type", () => {
    const FOUND = { ...RESULT, volumeId: "t1", title: "Typed Search Book" };

    function serveTyping() {
      return mockApi(({ path }) => {
        if (path.startsWith("/api/books/search")) return { body: { results: [FOUND] } };
        if (path.startsWith("/api/books")) return booksResponse([]);
        if (path === "/api/series") return { body: { series: [] } };
      });
    }

    const searches = (calls: { path: string }[]) =>
      calls.filter((call) => call.path.startsWith("/api/books/search")).map((call) => call.path);

    it("searches by itself once typing pauses, without pressing Search", async () => {
      const calls = serveTyping();
      renderApp(<AddBook />);

      fireEvent.change(await screen.findByRole("searchbox"), { target: { value: "thorns" } });

      expect(
        await screen.findByText("Typed Search Book", {}, { timeout: 3000 }),
      ).toBeInTheDocument();
      expect(searches(calls)).toEqual(["/api/books/search?q=thorns"]);
    });

    it("sends one request for a burst of keystrokes, not one per key", async () => {
      const calls = serveTyping();
      renderApp(<AddBook />);
      const box = await screen.findByRole("searchbox");

      for (const text of ["tho", "thor", "thorn", "thorns"]) {
        fireEvent.change(box, { target: { value: text } });
      }

      await screen.findByText("Typed Search Book", {}, { timeout: 3000 });
      expect(searches(calls)).toEqual(["/api/books/search?q=thorns"]);
    });

    it("does not search while the text is shorter than three characters", async () => {
      const calls = serveTyping();
      renderApp(<AddBook />);

      fireEvent.change(await screen.findByRole("searchbox"), { target: { value: "th" } });
      await new Promise((resolve) => setTimeout(resolve, 700));

      expect(searches(calls)).toEqual([]);
    });

    it("clears the list when the text is cut down below three characters", async () => {
      serveTyping();
      renderApp(<AddBook />);
      const box = await screen.findByRole("searchbox");

      fireEvent.change(box, { target: { value: "thorns" } });
      await screen.findByText("Typed Search Book", {}, { timeout: 3000 });
      fireEvent.change(box, { target: { value: "th" } });

      expect(screen.queryByText("Typed Search Book")).not.toBeInTheDocument();
    });

    it("does not search a second time after Search was pressed for the same text", async () => {
      const calls = serveTyping();
      renderApp(<AddBook />);

      await searchFor("thorns");
      await screen.findByText("Typed Search Book");
      await new Promise((resolve) => setTimeout(resolve, 700));

      expect(searches(calls)).toEqual(["/api/books/search?q=thorns"]);
    });
  });

  it("opens the details step after a book is added by hand", async () => {
    serve({ searchFails: true });
    renderApp(<AddBook />);

    await searchFor("thorns");
    await screen.findByText("Google Books isn't answering");
    fireEvent.click(
      within(screen.getByRole("alert")).getByRole("button", { name: "Add it without search" }),
    );
    const form = screen.getByRole("form", { name: "Add a book by hand" });
    fireEvent.change(within(form).getByLabelText("Title"), { target: { value: "My Own Book" } });
    fireEvent.change(within(form).getByLabelText("Author"), { target: { value: "Me" } });
    fireEvent.click(within(form).getByRole("button", { name: "Add book" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/add/created/details"));
  });

  it("stays on the results and says so when a wishlist book is moved to the library", async () => {
    serve({ existing: [book({ id: "wish", googleVolumeId: "vol1", ownership: "wanted" })] });
    renderApp(<AddBook />);

    await searchFor("thorns");
    fireEvent.click(await screen.findByRole("button", { name: "Move to library" }));

    expect(await screen.findByRole("status")).toHaveTextContent("moved to your library");
    expect(router.push).not.toHaveBeenCalled();
  });
});
