import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { book, booksResponse, mockApi, renderApp, series } from "@/test/helpers";
import { NextToBuy } from "./next-to-buy";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const saga = series({ id: "saga", title: "Saga of Ash", status: "ongoing" });

const OWNED_ONE = book({ id: "one", title: "Ash One", seriesId: "saga", seriesNumber: 1 });
const OWNED_THREE = book({ id: "three", title: "Ash Three", seriesId: "saga", seriesNumber: 3 });
const WANTED_TWO = book({
  id: "two",
  title: "Ash Two",
  genres: ["Fantasy"],
  seriesId: "saga",
  seriesNumber: 2,
  ownership: "wanted",
  links: [{ language: "uk", url: "https://www.yakaboo.ua/ash-two" }],
});
const STANDALONE = book({
  id: "wish",
  title: "Wished Alone",
  ownership: "wanted",
  format: "ebook",
  genres: ["Romance"],
});

function serve() {
  return mockApi(({ method, path }) => {
    if (path.startsWith("/api/next-to-buy")) {
      return {
        body: {
          items: [
            { type: "series", book: WANTED_TWO, gap: true, series: saga },
            { type: "standalone", book: STANDALONE, gap: false },
          ],
        },
      };
    }
    if (method === "PATCH") return { body: { ...WANTED_TWO, ownership: "owned" } };
    if (path.startsWith("/api/books")) {
      return booksResponse([OWNED_ONE, OWNED_THREE, WANTED_TWO, STANDALONE]);
    }
  });
}

describe("NextToBuy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists series books first with the gap named, then standalone wishlist books", async () => {
    serve();
    renderApp(<NextToBuy />);

    const fromSeries = await screen.findByRole("region", { name: /From your series/ });

    expect(within(fromSeries).getByRole("link", { name: "Ash Two" })).toBeInTheDocument();
    expect(within(fromSeries).getByText("Saga of Ash · #2")).toBeInTheDocument();
    expect(within(fromSeries).getByText("Gap: you own #1 and #3")).toBeInTheDocument();
    expect(within(fromSeries).getByRole("link", { name: /yakaboo\.ua/ })).toHaveAttribute(
      "href",
      "https://www.yakaboo.ua/ash-two",
    );

    const standalone = screen.getByRole("region", { name: /Standalone wishlist/ });
    expect(within(standalone).getByRole("link", { name: "Wished Alone" })).toBeInTheDocument();
    expect(within(standalone).getByText("No links yet · add one")).toBeInTheDocument();
  });

  it("marks the e-books you want, so you do not look for them in a shop for paper", async () => {
    serve();
    renderApp(<NextToBuy />);

    const fromSeries = await screen.findByRole("region", { name: /From your series/ });
    const standalone = screen.getByRole("region", { name: /Standalone wishlist/ });

    expect(within(fromSeries).getByRole("img", { name: "Paper book" })).toBeInTheDocument();
    expect(within(standalone).getByRole("img", { name: "E-book" })).toBeInTheDocument();
  });

  it("moves a book to the library when you say you bought it", async () => {
    const calls = serve();
    renderApp(<NextToBuy />);
    const row = (await screen.findByRole("link", { name: "Ash Two" })).closest("li") as HTMLElement;

    fireEvent.click(within(row).getByRole("button", { name: "I bought it" }));

    await waitFor(() =>
      expect(calls).toContainEqual({
        method: "PATCH",
        path: "/api/books/two",
        body: { ownership: "owned" },
      }),
    );
  });

  it("narrows the list in the browser when you apply a filter, without asking the server again", async () => {
    const calls = serve();
    renderApp(<NextToBuy />);
    await screen.findByRole("link", { name: "Ash Two" });
    expect(screen.getByRole("link", { name: "Wished Alone" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Shop language/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Ukrainian/ }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(screen.getByRole("link", { name: "Ash Two" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Wished Alone" })).not.toBeInTheDocument();
    expect(screen.getByText("1 book")).toBeInTheDocument();
    expect(
      calls.filter((call) => call.path.startsWith("/api/next-to-buy")).map((call) => call.path),
    ).toEqual(["/api/next-to-buy"]);
  });

  it("says nothing matches and offers to clear when the filters leave no book", async () => {
    serve();
    renderApp(<NextToBuy />);
    await screen.findByRole("link", { name: "Ash Two" });

    fireEvent.click(screen.getByRole("button", { name: /^Shop language/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Ukrainian/ }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    fireEvent.click(screen.getByRole("button", { name: /^Genre/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Romance/ }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(await screen.findByText("No books match these filters")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));

    expect(screen.getByRole("link", { name: "Wished Alone" })).toBeInTheDocument();
  });

  it("shows a loading state, then retries when the list fails to load", async () => {
    let attempts = 0;
    mockApi(({ path }) => {
      if (path.startsWith("/api/next-to-buy")) {
        attempts += 1;
        if (attempts === 1) return { status: 500, body: { error: "boom" } };
        return { body: { items: [{ type: "standalone", book: STANDALONE, gap: false }] } };
      }
      if (path.startsWith("/api/books")) return booksResponse([STANDALONE]);
    });
    renderApp(<NextToBuy />);

    expect(await screen.findByText("Could not load the list")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("link", { name: "Wished Alone" })).toBeInTheDocument();
    expect(screen.queryByText("Could not load the list")).not.toBeInTheDocument();
  });

  it("lists a number of a series with no book yet, with a link to add it", async () => {
    mockApi(({ path }) => {
      if (path.startsWith("/api/next-to-buy")) {
        return {
          body: {
            items: [
              { type: "missing", series: saga, number: 4, gap: false },
              { type: "missing", series: saga, number: 2, gap: true },
            ],
          },
        };
      }
      if (path.startsWith("/api/books")) return booksResponse([OWNED_ONE, OWNED_THREE]);
    });
    renderApp(<NextToBuy />);

    const fromSeries = await screen.findByRole("region", { name: /From your series/ });

    expect(within(fromSeries).getByText("Book 4")).toBeInTheDocument();
    expect(within(fromSeries).getAllByText("Saga of Ash · not in your list yet")).toHaveLength(2);
    expect(within(fromSeries).getAllByRole("link", { name: "Add this book" })[0]).toHaveAttribute(
      "href",
      "/add?series=saga&number=4",
    );
    expect(within(fromSeries).getByText("Gap: you own #1 and #3")).toBeInTheDocument();
    expect(
      within(fromSeries).queryByRole("button", { name: "I bought it" }),
    ).not.toBeInTheDocument();
  });
});
