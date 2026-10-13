import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { book, booksResponse, choose, mockApi, renderApp, series } from "@/test/helpers";
import { BookPage } from "./book-page";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

const saga = series({ id: "saga", title: "Saga of Ash" });
const OWNED = book({
  id: "b1",
  title: "Ash One",
  seriesId: "saga",
  seriesNumber: 1,
  notes: "gift from Mum",
});

function serve() {
  return mockApi(({ method, path }) => {
    if (method === "PATCH" && path === "/api/books/b1") {
      return { body: { ...OWNED, updatedAt: "now" } };
    }
    if (method === "DELETE" && path === "/api/books/b1") return { status: 204 };
    if (path === "/api/books/b1") return { body: OWNED };
    if (path.startsWith("/api/books")) return booksResponse([OWNED]);
    if (path === "/api/series") return { body: { series: [saga] } };
  });
}

describe("BookPage", () => {
  beforeEach(() => {
    router.push.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows the book with its series and no save bar until something changes", async () => {
    serve();
    renderApp(<BookPage id="b1" />);

    expect(await screen.findByRole("heading", { name: "Ash One" })).toBeInTheDocument();
    expect(await screen.findByText(/Book 1 of 1/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Unsaved changes" })).not.toBeInTheDocument();
  });

  it("shows the book as standalone and offers to save when you take it out of its series", async () => {
    const calls = serve();
    renderApp(<BookPage id="b1" />);
    await screen.findByRole("heading", { name: "Ash One" });

    fireEvent.click(await screen.findByRole("button", { name: "Change series" }));
    fireEvent.click(screen.getByRole("button", { name: "Mark as standalone" }));

    expect(screen.queryByText(/Book 1 of 1/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Standalone")[0]).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByRole("region", { name: "Unsaved changes" })).getByRole("button", {
        name: "Save changes",
      }),
    );

    await waitFor(() =>
      expect(calls).toContainEqual({
        method: "PATCH",
        path: "/api/books/b1",
        body: { seriesId: null, seriesNumber: null },
      }),
    );
  });

  it("saves only the fields you changed", async () => {
    const calls = serve();
    renderApp(<BookPage id="b1" />);
    await screen.findByRole("heading", { name: "Ash One" });

    fireEvent.click(screen.getByRole("radio", { name: "Wishlist" }));
    fireEvent.click(screen.getByRole("button", { name: "Rate 4 out of 5" }));
    fireEvent.click(
      within(screen.getByRole("region", { name: "Unsaved changes" })).getByRole("button", {
        name: "Save changes",
      }),
    );

    await waitFor(() =>
      expect(calls).toContainEqual({
        method: "PATCH",
        path: "/api/books/b1",
        body: { ownership: "wanted", rating: 4 },
      }),
    );
  });

  it("puts everything back when you discard", async () => {
    const calls = serve();
    renderApp(<BookPage id="b1" />);
    await screen.findByRole("heading", { name: "Ash One" });

    fireEvent.click(screen.getByRole("radio", { name: "Wishlist" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));

    expect(screen.queryByRole("region", { name: "Unsaved changes" })).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "In my library" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(calls.some((call) => call.method === "PATCH")).toBe(false);
  });

  it("refuses a shop link that is not a web address", async () => {
    serve();
    renderApp(<BookPage id="b1" />);
    await screen.findByRole("heading", { name: "Ash One" });

    fireEvent.change(screen.getByLabelText("Shop URL"), { target: { value: "yakaboo.ua/ash" } });
    fireEvent.click(screen.getByRole("button", { name: "Add link" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Start the link with https://");
    expect(screen.queryByRole("region", { name: "Unsaved changes" })).not.toBeInTheDocument();
  });

  it("adds a shop link to the draft and saves it with its language", async () => {
    const calls = serve();
    renderApp(<BookPage id="b1" />);
    await screen.findByRole("heading", { name: "Ash One" });

    choose(screen.getByRole("combobox", { name: "Link language" }), /RU/);
    fireEvent.change(screen.getByLabelText("Shop URL"), {
      target: { value: "https://www.labirint.ru/books/1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add link" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(calls).toContainEqual({
        method: "PATCH",
        path: "/api/books/b1",
        body: { links: [{ language: "ru", url: "https://www.labirint.ru/books/1" }] },
      }),
    );
  });

  it("deletes the book after you confirm and returns to the library", async () => {
    const calls = serve();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderApp(<BookPage id="b1" />);
    await screen.findByRole("heading", { name: "Ash One" });

    fireEvent.click(screen.getByRole("button", { name: "Delete book" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/library"));
    expect(calls).toContainEqual({ method: "DELETE", path: "/api/books/b1", body: undefined });
  });

  it("keeps the book when you decline the confirmation", async () => {
    const calls = serve();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderApp(<BookPage id="b1" />);
    await screen.findByRole("heading", { name: "Ash One" });

    fireEvent.click(screen.getByRole("button", { name: "Delete book" }));

    expect(calls.some((call) => call.method === "DELETE")).toBe(false);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("says so when the book does not exist", async () => {
    mockApi(({ path }) => {
      if (path === "/api/books/missing") return { status: 404, body: { error: "Not found" } };
      if (path.startsWith("/api/books")) return booksResponse([]);
      if (path === "/api/series") return { body: { series: [] } };
    });
    renderApp(<BookPage id="missing" />);

    expect(await screen.findByText("Book not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the library" })).toHaveAttribute(
      "href",
      "/library",
    );
  });

  it("treats a number left on a book with no series as nothing: no 'Book 1', no unsaved bar", async () => {
    const LEGACY = book({ id: "legacy", title: "Жнець без коси", seriesNumber: 1 });
    mockApi(({ path }) => {
      if (path === "/api/books/legacy") return { body: LEGACY };
      if (path.startsWith("/api/books")) return booksResponse([LEGACY]);
      if (path === "/api/series") return { body: { series: [] } };
    });
    renderApp(<BookPage id="legacy" />);

    await screen.findByRole("heading", { name: "Жнець без коси" });

    expect(screen.getByText("Standalone")).toBeInTheDocument();
    expect(screen.queryByText("Book 1")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Unsaved changes" })).not.toBeInTheDocument();
  });
});
