import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { book, booksResponse, mockApi, renderApp, series } from "@/test/helpers";
import { Library } from "./library";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const saga = series({ id: "saga", title: "Saga of Ash", author: "A. Writer" });

const SHELF = [
  book({ id: "one", title: "Ash One", seriesId: "saga", seriesNumber: 1 }),
  book({ id: "three", title: "Ash Three", seriesId: "saga", seriesNumber: 3 }),
  book({
    id: "two",
    title: "Ash Two",
    seriesId: "saga",
    seriesNumber: 2,
    ownership: "wanted",
  }),
  book({ id: "alone", title: "Stand Alone", author: "Solo Person" }),
  book({ id: "wish", title: "Wished Alone", ownership: "wanted" }),
];

function serve(books = SHELF) {
  mockApi(({ path }) => {
    if (path.startsWith("/api/books")) return booksResponse(books);
    if (path === "/api/series") return { body: { series: [saga] } };
  });
}

describe("Library", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("groups owned books under their series and marks the book you skipped as a gap", async () => {
    serve();
    renderApp(<Library tab="library" />);

    const section = await screen.findByRole("region", { name: "Saga of Ash" });

    expect(within(section).getByText("Ash One")).toBeInTheDocument();
    expect(within(section).getByText("Ash Three")).toBeInTheDocument();
    expect(within(section).getByRole("link", { name: /#2.*Ash Two/ })).toHaveAttribute(
      "href",
      "/books/two",
    );
    expect(within(section).getByText("Own 2 of 3")).toBeInTheDocument();
    expect(screen.getByText("Stand Alone")).toBeInTheDocument();
    expect(screen.queryByText("Wished Alone")).not.toBeInTheDocument();
  });

  it("sends a gap with no book on record to the add page for that series and number", async () => {
    serve([
      book({ id: "one", title: "Ash One", seriesId: "saga", seriesNumber: 1 }),
      book({ id: "three", title: "Ash Three", seriesId: "saga", seriesNumber: 3 }),
    ]);
    renderApp(<Library tab="library" />);

    const section = await screen.findByRole("region", { name: "Saga of Ash" });

    expect(within(section).getByRole("link", { name: /#2/ })).toHaveAttribute(
      "href",
      "/add?series=saga&number=2",
    );
  });

  it("shows only wanted books on the wishlist tab", async () => {
    serve();
    renderApp(<Library tab="wishlist" />);

    expect(await screen.findByText("Wished Alone")).toBeInTheDocument();
    expect(screen.getByText("Ash Two")).toBeInTheDocument();
    expect(screen.queryByText("Ash One")).not.toBeInTheDocument();
    expect(screen.queryByText("Stand Alone")).not.toBeInTheDocument();
  });

  it("narrows the list by title or author while you type", async () => {
    serve();
    renderApp(<Library tab="library" />);
    await screen.findByText("Stand Alone");

    fireEvent.change(screen.getByRole("searchbox", { name: "Search my books" }), {
      target: { value: "solo" },
    });

    expect(screen.getByText("Stand Alone")).toBeInTheDocument();
    expect(screen.queryByText("Ash One")).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search my books" }), {
      target: { value: "zzzz" },
    });

    expect(screen.getByText("No books match")).toBeInTheDocument();
  });

  it("invites you to add a first book when the library is empty", async () => {
    serve([]);
    renderApp(<Library tab="library" />);

    expect(await screen.findByText("Your library is empty")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add a book" })).toHaveAttribute("href", "/add");
  });

  it("remembers the list or grid choice", async () => {
    serve();
    renderApp(<Library tab="library" />);
    await screen.findByText("Stand Alone");

    fireEvent.click(screen.getByRole("button", { name: /grid/i }));

    expect(localStorage.getItem("my-shelfie:view")).toBe("grid");
  });

  describe("filters and states", () => {
    const FANTASY = book({
      id: "f1",
      title: "Fantasy One",
      seriesId: "saga",
      seriesNumber: 1,
      genres: ["Fantasy"],
      links: [{ language: "uk", url: "https://a.example/1" }],
    });
    const FANTASY_THREE = book({
      id: "f3",
      title: "Fantasy Three",
      seriesId: "saga",
      seriesNumber: 3,
      genres: ["Fantasy"],
    });
    const ROMANCE = book({ id: "r1", title: "Romance Alone", genres: ["Romance"] });

    function serveFiltered() {
      mockApi(({ path }) => {
        if (path.startsWith("/api/books")) return booksResponse([FANTASY, FANTASY_THREE, ROMANCE]);
        if (path === "/api/series") return { body: { series: [saga] } };
      });
    }

    it("shows how many books there are in how many groups", async () => {
      serveFiltered();
      renderApp(<Library tab="library" />);

      expect(await screen.findByText("3 books in 2 groups")).toBeInTheDocument();
    });

    it("narrows to the chosen genre and counts what is left", async () => {
      serveFiltered();
      renderApp(<Library tab="library" />);
      await screen.findByText("Romance Alone");

      fireEvent.click(screen.getByRole("button", { name: /^Genre/ }));
      expect(screen.getByRole("checkbox", { name: /Romance/ })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("checkbox", { name: /Romance/ }));
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));

      expect(screen.getByText("Romance Alone")).toBeInTheDocument();
      expect(screen.queryByText("Fantasy One")).not.toBeInTheDocument();
      expect(screen.getByText("1 book in 1 group")).toBeInTheDocument();
    });

    it("draws no gap tile while a filter is on, because the gap would be a lie", async () => {
      serveFiltered();
      renderApp(<Library tab="library" />);
      const section = await screen.findByRole("region", { name: "Saga of Ash" });
      expect(within(section).getByRole("link", { name: /#2/ })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /^Genre/ }));
      fireEvent.click(screen.getByRole("checkbox", { name: /Fantasy/ }));
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));

      expect(within(section).queryByRole("link", { name: /#2/ })).not.toBeInTheDocument();
      expect(within(section).getByText("Fantasy One")).toBeInTheDocument();
    });

    it("says nothing matches when search and filters leave no book", async () => {
      serveFiltered();
      renderApp(<Library tab="library" />);
      await screen.findByText("Romance Alone");

      fireEvent.click(screen.getByRole("button", { name: /^Genre/ }));
      fireEvent.click(screen.getByRole("checkbox", { name: /Romance/ }));
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));
      fireEvent.change(screen.getByRole("searchbox", { name: "Search my books" }), {
        target: { value: "fantasy" },
      });

      expect(await screen.findByText("No books match")).toBeInTheDocument();
    });

    it("shows a loading state while the shelves load", async () => {
      let release: () => void = () => {};
      const slow = new Promise<void>((resolve) => {
        release = resolve;
      });
      mockApi(({ path }) => {
        if (path.startsWith("/api/books")) return { ...booksResponse([ROMANCE]), wait: slow };
        if (path === "/api/series") return { body: { series: [] } };
      });
      renderApp(<Library tab="library" />);

      const status = await screen.findByText("Loading your shelves…");
      expect(status.closest("[aria-busy='true']")).not.toBeNull();

      release();
      expect(await screen.findByText("Romance Alone")).toBeInTheDocument();
      expect(screen.queryByText("Loading your shelves…")).not.toBeInTheDocument();
    });

    it("shows a retry card when the shelves cannot be loaded, and loads them on retry", async () => {
      let attempts = 0;
      mockApi(({ path }) => {
        if (path.startsWith("/api/books")) {
          attempts += 1;
          if (attempts === 1) return { status: 500, body: { error: "boom" } };
          return booksResponse([ROMANCE]);
        }
        if (path === "/api/series") return { body: { series: [] } };
      });
      renderApp(<Library tab="library" />);

      expect(await screen.findByText("Could not load your books")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));

      expect(await screen.findByText("Romance Alone")).toBeInTheDocument();
    });
  });
});
