import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { book, booksResponse, mockApi, renderApp, series } from "@/test/helpers";
import type { Book } from "@/lib/books";
import type { Series } from "@/lib/series";
import { Library } from "./library";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const saga = series({ id: "saga", title: "Saga of Ash", author: "A. Writer", totalBooks: 6 });

const SHELF = [
  book({ id: "one", title: "Ash One", seriesId: "saga", seriesNumber: 1, rating: 4 }),
  book({
    id: "two",
    title: "Ash Two",
    seriesId: "saga",
    seriesNumber: 2,
    ownership: "wanted",
  }),
  book({ id: "alone", title: "Stand Alone", author: "Solo Person", status: "reading" }),
  book({ id: "wish", title: "Wished Alone", ownership: "wanted" }),
];

function serve(books: Book[] = SHELF, list: Series[] = [saga]) {
  mockApi(({ path }) => {
    if (path.startsWith("/api/books")) return booksResponse(books);
    if (path === "/api/series") return { body: { series: list } };
  });
}

function wideScreen() {
  vi.mocked(window.matchMedia).mockImplementation(
    (query: string) =>
      ({
        matches: query === "(min-width: 64rem)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList,
  );
}

function tileName(title: string) {
  return new RegExp(title);
}

function numberedBooks(count: number) {
  return Array.from({ length: count }, (_, index) =>
    book({
      id: `b${index + 1}`,
      title: `Ash ${index + 1}`,
      seriesId: "saga",
      seriesNumber: index + 1,
    }),
  );
}

describe("Library", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(window.matchMedia).mockImplementation(
      (query: string) =>
        ({
          matches: false,
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList,
    );
  });

  it("shows owned and wanted books together, each series on its own shelf and standalone books after", async () => {
    serve();
    renderApp(<Library />);

    const shelf = await screen.findByRole("region", { name: "Saga of Ash" });
    const standalone = screen.getByRole("region", { name: "Standalone books" });

    expect(within(shelf).getByRole("link", { name: /Ash One/ })).toHaveAttribute(
      "href",
      "/books/one",
    );
    expect(
      within(within(shelf).getByRole("link", { name: /Ash Two/ })).getByText("In wishlist"),
    ).toBeInTheDocument();
    expect(
      within(standalone).getByRole("link", { name: tileName("Stand Alone") }),
    ).toBeInTheDocument();
    expect(
      within(standalone).getByRole("link", { name: tileName("Wished Alone") }),
    ).toBeInTheDocument();
    expect(within(standalone).getByText("Reading")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Rated 4 out of 5" })).toBeInTheDocument();
    expect(
      shelf.compareDocumentPosition(standalone) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("links the whole series header to the series page and shows its segments", async () => {
    serve();
    renderApp(<Library />);

    const shelf = await screen.findByRole("region", { name: "Saga of Ash" });
    const header = within(shelf).getByRole("link", { name: /^Saga of Ash/ });

    expect(header).toHaveAttribute("href", "/series/saga");
    expect(within(header).getByText("A. Writer")).toBeInTheDocument();
    expect(within(header).getByRole("img", { name: "Own 1 of 6" })).toBeInTheDocument();
  });

  it("folds the missing numbers into one gap that opens the add flow for the first of them", async () => {
    serve();
    renderApp(<Library />);

    const shelf = await screen.findByRole("region", { name: "Saga of Ash" });
    const gap = within(shelf).getByRole("link", {
      name: "Add #3–6 to Saga of Ash, not in the catalogue",
    });

    expect(gap).toHaveAttribute("href", "/add?series=saga&number=3");
    expect(within(shelf).getAllByRole("link", { name: /^Add #/ })).toHaveLength(1);
  });

  it("on a narrow screen shows three slots and a more tile counting the rest of the series", async () => {
    serve(numberedBooks(6));
    renderApp(<Library />);

    const shelf = await screen.findByRole("region", { name: "Saga of Ash" });

    expect(within(shelf).getByRole("link", { name: tileName("Ash 3") })).toBeInTheDocument();
    expect(within(shelf).queryByRole("link", { name: tileName("Ash 4") })).not.toBeInTheDocument();
    expect(within(shelf).getByRole("link", { name: "3 more in Saga of Ash" })).toHaveAttribute(
      "href",
      "/series/saga",
    );
  });

  it("on a wide screen fits seven slots and needs no more tile for six books", async () => {
    wideScreen();
    serve(numberedBooks(6));
    renderApp(<Library />);

    const shelf = await screen.findByRole("region", { name: "Saga of Ash" });

    expect(within(shelf).getByRole("link", { name: tileName("Ash 6") })).toBeInTheDocument();
    expect(within(shelf).queryByRole("link", { name: /more in/ })).not.toBeInTheDocument();
  });

  it("puts standalone books on as many shelves as their rows need", async () => {
    serve(Array.from({ length: 9 }, (_, index) => book({ title: `Alone ${index + 1}` })));
    renderApp(<Library />);

    const standalone = await screen.findByRole("region", { name: "Standalone books" });

    expect(within(standalone).getAllByRole("list")).toHaveLength(3);
  });

  it("finds books by title, author or series and says when nothing matches", async () => {
    serve();
    renderApp(<Library />);
    await screen.findByRole("link", { name: tileName("Stand Alone") });
    const search = screen.getByRole("searchbox", { name: "Title, author or series" });

    fireEvent.change(search, { target: { value: "ash of" } });
    expect(screen.queryByRole("link", { name: tileName("Stand Alone") })).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "saga" } });
    expect(screen.getByRole("link", { name: tileName("Ash One") })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: tileName("Stand Alone") })).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "solo" } });
    expect(screen.getByRole("link", { name: tileName("Stand Alone") })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Saga of Ash" })).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "zzzz" } });
    expect(screen.getByText("No books match")).toBeInTheDocument();
  });

  it("invites you to add a first book when the library is empty", async () => {
    serve([]);
    renderApp(<Library />);

    expect(await screen.findByText("Your library is empty")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add a book" })).toHaveAttribute("href", "/add");
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("shows a loading state until both books and series have loaded", async () => {
    let release: () => void = () => {};
    const slow = new Promise<void>((resolve) => {
      release = resolve;
    });
    mockApi(({ path }) => {
      if (path.startsWith("/api/books")) return booksResponse(SHELF);
      if (path === "/api/series") return { body: { series: [saga] }, wait: slow };
    });
    renderApp(<Library />);

    expect(await screen.findByText("Loading your shelves…")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: tileName("Ash One") })).not.toBeInTheDocument();

    release();
    expect(await screen.findByRole("region", { name: "Saga of Ash" })).toBeInTheDocument();
  });

  it("offers a retry when the series cannot be loaded, and loads them on retry", async () => {
    let attempts = 0;
    mockApi(({ path }) => {
      if (path.startsWith("/api/books")) return booksResponse(SHELF);
      if (path === "/api/series") {
        attempts += 1;
        if (attempts === 1) return { status: 500, body: { error: "boom" } };
        return { body: { series: [saga] } };
      }
    });
    renderApp(<Library />);

    expect(await screen.findByText("Could not load your books")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("region", { name: "Saga of Ash" })).toBeInTheDocument();
  });

  describe("filter panel", () => {
    async function openPanel() {
      serve();
      renderApp(<Library />);
      await screen.findByRole("link", { name: tileName("Stand Alone") });
      const button = screen.getByRole("button", { name: "Filters" });
      button.focus();
      fireEvent.click(button);
      return { button, panel: screen.getByRole("dialog", { name: "Filters" }) };
    }

    it("counts the books a choice would show before applying it, then shows them with a removable pill", async () => {
      const { panel } = await openPanel();

      expect(within(panel).getByRole("button", { name: "Show 4 books" })).toBeInTheDocument();
      fireEvent.click(within(panel).getByRole("button", { name: "In wishlist" }));
      expect(within(panel).getByRole("button", { name: "Show 2 books" })).toBeInTheDocument();

      fireEvent.click(within(panel).getByRole("button", { name: "Show 2 books" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Filters · 1" })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: tileName("Stand Alone") })).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: tileName("Wished Alone") })).toBeInTheDocument();

      const pill = screen.getByRole("button", { name: "Remove filter In wishlist" });
      pill.focus();
      fireEvent.click(pill);

      expect(screen.getByRole("button", { name: "Filters" })).toHaveFocus();
      expect(screen.getByRole("link", { name: tileName("Stand Alone") })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument();
    });

    it("empties applied and new choices on Reset without applying anything until you ask", async () => {
      const { button, panel } = await openPanel();
      fireEvent.click(within(panel).getByRole("button", { name: "In wishlist" }));
      fireEvent.click(within(panel).getByRole("button", { name: "Show 2 books" }));

      fireEvent.click(button);
      const reopened = screen.getByRole("dialog", { name: "Filters" });
      fireEvent.click(within(reopened).getByRole("button", { name: "Reading" }));
      fireEvent.click(within(reopened).getByRole("button", { name: "Reset" }));

      expect(within(reopened).getByRole("button", { name: "In wishlist" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      expect(within(reopened).getByRole("button", { name: "Reading" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      expect(within(reopened).getByRole("button", { name: "Show 4 books" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Remove filter In wishlist" })).toBeInTheDocument();
    });

    it("drops unapplied choices when closed with Escape and gives the focus back to the button", async () => {
      const { button, panel } = await openPanel();

      fireEvent.click(within(panel).getByRole("button", { name: "Reading" }));
      fireEvent.keyDown(document, { key: "Escape" });

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(button).toHaveFocus();
      expect(screen.getByRole("link", { name: tileName("Wished Alone") })).toBeInTheDocument();

      fireEvent.click(button);
      expect(
        within(screen.getByRole("dialog")).getByRole("button", { name: "Reading" }),
      ).toHaveAttribute("aria-pressed", "false");
    });

    it("folds long groups behind a more button and searches tropes", async () => {
      const tropes = ["Dragons", "Heists", "Found family", "Enemies to lovers", "Magic school"];
      serve([book({ title: "Busy", tropes, genres: ["A", "B", "C", "D", "E", "F"] })]);
      renderApp(<Library />);
      await screen.findByRole("link", { name: tileName("Busy") });
      fireEvent.click(screen.getByRole("button", { name: "Filters" }));
      const panel = screen.getByRole("dialog", { name: "Filters" });
      const genres = within(panel).getByRole("region", { name: "Genre" });

      expect(within(genres).getAllByRole("button", { pressed: false })).toHaveLength(4);
      fireEvent.click(within(genres).getByRole("button", { name: "+2 more" }));
      expect(within(genres).getAllByRole("button", { pressed: false })).toHaveLength(6);

      const tropeGroup = within(panel).getByRole("region", { name: "Tropes" });
      fireEvent.change(within(tropeGroup).getByRole("searchbox", { name: "Find a trope" }), {
        target: { value: "school" },
      });
      expect(within(tropeGroup).getAllByRole("button")).toHaveLength(1);
      expect(within(tropeGroup).getByRole("button", { name: "Magic school" })).toBeInTheDocument();
    });
  });
});
