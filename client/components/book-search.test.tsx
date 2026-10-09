import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { BookSearch } from "./book-search";

const DRACULA = {
  volumeId: "vol1",
  title: "Dracula",
  authors: ["Bram Stoker"],
  year: 1897,
  coverUrl: "https://books.google.com/cover?id=vol1",
  link: "https://books.google.com/books/about/Dracula.html?id=vol1",
};

function jsonResponse(status: number, body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function type(text: string) {
  fireEvent.change(screen.getByLabelText("Find a book"), { target: { value: text } });
}

async function waitForSearch(ms = 400) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("BookSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("searches only once typing has paused and at least three characters are in", async () => {
    vi.mocked(fetch).mockImplementation(() => jsonResponse(200, { results: [] }));
    render(<BookSearch onPick={vi.fn()} />);

    type("dr");
    await waitForSearch();
    expect(fetch).not.toHaveBeenCalled();

    type("drac");
    await waitForSearch(399);
    expect(fetch).not.toHaveBeenCalled();

    await waitForSearch(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe("/api/books/search?q=drac");
  });

  it("lists each result with its details, a Google Books link and the Google attribution", async () => {
    vi.mocked(fetch).mockImplementation(() => jsonResponse(200, { results: [DRACULA] }));
    render(<BookSearch onPick={vi.fn()} />);

    type("dracula");
    await waitForSearch();

    expect(screen.getByText("Dracula")).toBeInTheDocument();
    expect(screen.getByText("Bram Stoker · 1897")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View on Google Books" })).toHaveAttribute(
      "href",
      DRACULA.link,
    );
    expect(screen.getByAltText("Powered by Google")).toBeInTheDocument();
  });

  it("hands the chosen result to the caller", async () => {
    vi.mocked(fetch).mockImplementation(() => jsonResponse(200, { results: [DRACULA] }));
    const onPick = vi.fn();
    render(<BookSearch onPick={onPick} />);

    type("dracula");
    await waitForSearch();
    fireEvent.click(screen.getByRole("button", { name: "Use Dracula" }));

    expect(onPick).toHaveBeenCalledWith(DRACULA);
  });

  it("says when nothing was found", async () => {
    vi.mocked(fetch).mockImplementation(() => jsonResponse(200, { results: [] }));
    render(<BookSearch onPick={vi.fn()} />);

    type("zzzzzz");
    await waitForSearch();

    expect(screen.getByRole("status")).toHaveTextContent("No books found.");
  });

  it("says search is unavailable, and offers manual entry, when the search fails", async () => {
    vi.mocked(fetch).mockImplementation(() =>
      jsonResponse(502, { error: "Book search is unavailable right now" }),
    );
    render(<BookSearch onPick={vi.fn()} />);

    type("dracula");
    await waitForSearch();

    expect(screen.getByRole("status")).toHaveTextContent(
      "Search is unavailable right now. You can still add the book by hand.",
    );
  });

  it("shows nothing, and no attribution, before anything is searched", () => {
    render(<BookSearch onPick={vi.fn()} />);

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.queryByAltText("Powered by Google")).not.toBeInTheDocument();
  });
});
