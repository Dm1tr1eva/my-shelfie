import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { book, booksResponse, choose, mockApi, renderApp, series } from "@/test/helpers";
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
  seriesId: "saga",
  seriesNumber: 2,
  ownership: "wanted",
  links: [{ language: "uk", url: "https://www.yakaboo.ua/ash-two" }],
});
const STANDALONE = book({ id: "wish", title: "Wished Alone", ownership: "wanted" });

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

  it("asks the server for the chosen filters", async () => {
    const calls = serve();
    renderApp(<NextToBuy />);
    await screen.findByRole("link", { name: "Ash Two" });

    choose(screen.getByRole("combobox", { name: "Shop language" }), "Ukrainian");
    choose(screen.getByRole("combobox", { name: "Series status" }), "Ongoing");

    await waitFor(() => {
      const requested = calls.map((call) => call.path);
      expect(requested).toContain("/api/next-to-buy?language=uk&seriesStatus=ongoing");
    });
  });
});
