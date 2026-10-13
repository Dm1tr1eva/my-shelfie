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
});
