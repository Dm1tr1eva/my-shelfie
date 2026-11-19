import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { book, booksResponse, mockApi, renderApp, series } from "@/test/helpers";
import { Wishlist } from "./wishlist";

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

describe("Wishlist", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows only wanted books", async () => {
    serve();
    renderApp(<Wishlist />);

    expect(await screen.findByText("Wished Alone")).toBeInTheDocument();
    expect(screen.getByText("Ash Two")).toBeInTheDocument();
    expect(screen.queryByText("Ash One")).not.toBeInTheDocument();
    expect(screen.queryByText("Stand Alone")).not.toBeInTheDocument();
  });

  it("marks each book as a paper book or an e-book, in the list and in the grid", async () => {
    serve([
      book({ id: "p", title: "On Paper", ownership: "wanted" }),
      book({ id: "e", title: "On a Screen", format: "ebook", ownership: "wanted" }),
    ]);
    renderApp(<Wishlist />);
    await screen.findByText("On Paper");

    const marked = () => ({
      paper: screen.getAllByRole("img", { name: "Paper book" }).length,
      ebook: screen.getAllByRole("img", { name: "E-book" }).length,
    });

    expect(marked()).toEqual({ paper: 1, ebook: 1 });

    fireEvent.click(screen.getByRole("button", { name: /grid/i }));

    expect(marked()).toEqual({ paper: 1, ebook: 1 });
  });

  it("announces a rating as an image with its meaning, in the list and in the grid", async () => {
    serve([book({ id: "r", title: "Rated Book", rating: 4, ownership: "wanted" })]);
    renderApp(<Wishlist />);
    await screen.findByText("Rated Book");

    expect(screen.getByRole("img", { name: "Rated 4 out of 5" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /grid/i }));

    expect(screen.getByRole("img", { name: "Rated 4 out of 5" })).toBeInTheDocument();
  });

  it("narrows the list by title or author while you type", async () => {
    serve();
    renderApp(<Wishlist />);
    await screen.findByText("Wished Alone");

    fireEvent.change(screen.getByRole("searchbox", { name: "Search my books" }), {
      target: { value: "wished" },
    });

    expect(screen.getByText("Wished Alone")).toBeInTheDocument();
    expect(screen.queryByText("Ash Two")).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search my books" }), {
      target: { value: "zzzz" },
    });

    expect(screen.getByText("No books match")).toBeInTheDocument();
  });

  it("invites you to add a first book when the wishlist is empty", async () => {
    serve([]);
    renderApp(<Wishlist />);

    expect(await screen.findByText("Your wishlist is empty")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add a book" })).toHaveAttribute("href", "/add");
  });

  it("remembers the list or grid choice", async () => {
    serve();
    renderApp(<Wishlist />);
    await screen.findByText("Wished Alone");

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
      ownership: "wanted",
      links: [{ kind: "paper", languages: ["uk"], url: "https://a.example/1" }],
    });
    const FANTASY_THREE = book({
      id: "f3",
      title: "Fantasy Three",
      seriesId: "saga",
      seriesNumber: 3,
      genres: ["Fantasy"],
      ownership: "wanted",
    });
    const ROMANCE = book({
      id: "r1",
      title: "Romance Alone",
      genres: ["Romance"],
      ownership: "wanted",
    });

    function serveFiltered() {
      mockApi(({ path }) => {
        if (path.startsWith("/api/books")) return booksResponse([FANTASY, FANTASY_THREE, ROMANCE]);
        if (path === "/api/series") return { body: { series: [saga] } };
      });
    }

    it("shows how many books there are in how many groups", async () => {
      serveFiltered();
      renderApp(<Wishlist />);

      expect(await screen.findByText("3 books in 2 groups")).toBeInTheDocument();
    });

    it("narrows to the chosen genre and counts what is left", async () => {
      serveFiltered();
      renderApp(<Wishlist />);
      await screen.findByText("Romance Alone");

      fireEvent.click(screen.getByRole("button", { name: /^Genre/ }));
      expect(screen.getByRole("checkbox", { name: /Romance/ })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("checkbox", { name: /Romance/ }));
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));

      expect(screen.getByText("Romance Alone")).toBeInTheDocument();
      expect(screen.queryByText("Fantasy One")).not.toBeInTheDocument();
      expect(screen.getByText("1 book in 1 group")).toBeInTheDocument();
    });

    it("says nothing matches when search and filters leave no book", async () => {
      serveFiltered();
      renderApp(<Wishlist />);
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
      renderApp(<Wishlist />);

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
      renderApp(<Wishlist />);

      expect(await screen.findByText("Could not load your books")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));

      expect(await screen.findByText("Romance Alone")).toBeInTheDocument();
    });
  });
});
