import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { book, booksResponse, mockApi, renderApp, series, type Call } from "@/test/helpers";
import type { Series } from "@/lib/series";
import { SeriesPage } from "./series-page";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

const SAGA = series({
  id: "saga",
  title: "Roots of Ash",
  author: "A. Writer",
  status: "ongoing",
  ageRating: "16",
  totalBooks: 5,
  genres: ["Fantasy"],
  tropes: ["dragons", "slow burn"],
  annotation: "A schism and a waking dragon.",
  note: "Book 4 not before 2027.",
  expected: [{ number: 4, expectedYear: 2027, source: "manual" }],
});
const BOOKS = [
  book({
    id: "one",
    title: "Ash One",
    seriesId: "saga",
    seriesNumber: 1,
    status: "reading",
    format: "ebook",
  }),
  book({ id: "two", title: "Ash Two", seriesId: "saga", seriesNumber: 2, ownership: "wanted" }),
  book({ id: "three", title: "Ash Three", seriesId: "saga", seriesNumber: 3, status: "read" }),
  book({ id: "extra", title: "Ash Stories", seriesId: "saga", status: "want" }),
];

type Reply = { status?: number; body?: unknown; wait?: Promise<unknown> };

function later(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function serve(
  initial: Series = SAGA,
  {
    books = BOOKS,
    onPatch,
    onDelete,
  }: {
    books?: typeof BOOKS;
    onPatch?: (call: Call) => Reply | undefined;
    onDelete?: () => Reply;
  } = {},
) {
  let current = initial;
  return mockApi((call) => {
    const { method, path, body } = call;
    if (method === "PATCH" && path === "/api/series/saga") {
      const reply = onPatch?.(call);
      if (reply) return reply;
      const next: Record<string, unknown> = { ...current };
      for (const [key, value] of Object.entries(body as object)) {
        if (value === null) delete next[key];
        else next[key] = value;
      }
      current = next as Series;
      return { body: current, wait: later(30) };
    }
    if (method === "DELETE" && path === "/api/series/saga") return onDelete?.() ?? { status: 204 };
    if (path === "/api/series/saga") return { body: { series: current, books } };
    if (path === "/api/series/gone") return { status: 404, body: { error: "Series not found" } };
    if (path === "/api/series") return { body: { series: [current] } };
    if (path.startsWith("/api/books?")) return booksResponse(books);
    if (path === "/api/progress") {
      return { body: { entries: [{ id: "p", bookId: "one", date: "2026-11-01", percent: 40 }] } };
    }
  });
}

function patches(calls: Call[]) {
  return calls.filter((call) => call.method === "PATCH").map((call) => call.body);
}

async function open(initial?: Series, options?: Parameters<typeof serve>[1]) {
  const calls = serve(initial, options);
  renderApp(<SeriesPage id="saga" />);
  await screen.findByRole("heading", { level: 1 });
  return calls;
}

function wide(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe("SeriesPage", () => {
  beforeEach(() => {
    router.push.mockReset();
    wide(false);
  });

  afterEach(async () => {
    await act(() => later(60));
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("header", () => {
    it("shows the title with its age, the author, the status and the series' own details", async () => {
      await open();

      const title = screen.getByRole("heading", { level: 1 });
      expect(title).toHaveTextContent("Roots of Ash");
      expect(within(title).getByText("Age 16+")).toBeInTheDocument();
      expect(screen.getByText("A. Writer")).toBeInTheDocument();
      expect(screen.getByText("Ongoing")).toBeInTheDocument();
      expect(screen.getByText("Fantasy")).toBeInTheDocument();
      expect(screen.getByText("slow burn")).toBeInTheDocument();
      expect(screen.getByText("A schism and a waking dragon.")).toBeInTheDocument();
      expect(screen.getByText("Book 4 not before 2027.")).toBeInTheDocument();
    });

    it("glues the age to the last word of the title", async () => {
      await open();

      const glued = within(screen.getByRole("heading", { level: 1 })).getByText("Ash", {
        exact: false,
        selector: ".whitespace-nowrap",
      });
      expect(within(glued).getByText("Age 16+")).toBeInTheDocument();
    });

    it("leaves the age out when the series has none", async () => {
      await open({ ...SAGA, ageRating: "none" });

      expect(screen.queryByText(/Age/)).not.toBeInTheDocument();
    });

    it("counts what you own against every book and missing number, as the library does", async () => {
      await open();

      expect(screen.getByText("of 6 owned").parentElement).toHaveTextContent(/^3 of 6 owned$/);
      expect(screen.getByRole("img", { name: "Own 3 of 6" })).toBeInTheDocument();
    });

    it("folds the details on a phone behind a button that says whether they are open", async () => {
      await open();
      const more = screen.getByRole("button", { name: "Show more" });
      const details = document.getElementById(more.getAttribute("aria-controls") ?? "");

      expect(more).toHaveAttribute("aria-expanded", "false");
      expect(details).toHaveClass("hidden");
      expect(details).toContainElement(screen.getByText("A schism and a waking dragon."));

      fireEvent.click(more);

      expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
      expect(details).not.toHaveClass("hidden");
    });

    it("has nothing to fold when the series has no genre, tropes or annotation", async () => {
      await open({ ...SAGA, genres: [], tropes: [], annotation: undefined });

      expect(screen.queryByRole("button", { name: "Show more" })).not.toBeInTheDocument();
    });
  });

  describe("books", () => {
    it("lists the books by number, each one link to its panel, with status and format", async () => {
      await open();
      const rows = within(screen.getByRole("region", { name: "Books" })).getAllByRole("listitem");

      expect(rows.map((row) => row.textContent)).toEqual([
        expect.stringMatching(/^#1.*Ash One.*Reading.*E-book/),
        expect.stringMatching(/^#2.*Ash Two.*In wishlist$/),
        expect.stringMatching(/^#3.*Ash Three.*Read.*Paper/),
        expect.stringMatching(/^#4–5.*Not in the catalogue yet/),
        expect.stringMatching(/Ash Stories.*To read/),
      ]);
      expect(within(rows[0]).getByRole("link")).toHaveAttribute("href", "/books/one");
      expect(within(rows[1]).queryByText("Paper")).not.toBeInTheDocument();
    });

    it("shows the progress of a book being read, from the log", async () => {
      await open();
      const row = screen.getByRole("link", { name: /Ash One/ });

      expect(await within(row).findByRole("progressbar")).toHaveAttribute(
        "aria-valuetext",
        "40% read",
      );
      expect(
        within(screen.getByRole("link", { name: /Ash Three/ })).queryByRole("progressbar"),
      ).toBeNull();
    });

    it("says when missing numbers are expected and leads to adding them", async () => {
      await open();

      expect(screen.getByText("From your note: not before 2027")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Add #4–5 to the series" })).toHaveAttribute(
        "href",
        "/add?series=saga&number=4",
      );
    });

    it("offers the first book when the series has none yet", async () => {
      await open({ ...SAGA, totalBooks: undefined, expected: [] }, { books: [] });

      expect(screen.getByText("No books in this series yet.")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Add a book" })).toHaveAttribute(
        "href",
        "/add?series=saga&number=1",
      );
    });
  });

  describe("note", () => {
    it("is edited in place, saved on leaving it, and can be undone", async () => {
      const calls = await open();

      fireEvent.click(screen.getByRole("button", { name: "Edit the note" }));
      const note = screen.getByRole("textbox", { name: "My note" });
      expect(note).toHaveFocus();
      fireEvent.change(note, { target: { value: "Book 4 moved to 2028." } });
      fireEvent.blur(note);

      expect(await screen.findByText("Saved")).toBeInTheDocument();
      expect(patches(calls)).toEqual([{ note: "Book 4 moved to 2028." }]);
      expect(await screen.findByText("Book 4 moved to 2028.")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Undo" }));
      await waitFor(() =>
        expect(patches(calls)).toEqual([
          { note: "Book 4 moved to 2028." },
          { note: "Book 4 not before 2027." },
        ]),
      );
      expect(await screen.findByText("Change undone")).toBeInTheDocument();
    });

    it("cancels with Escape", async () => {
      const calls = await open();

      fireEvent.click(screen.getByRole("button", { name: "Edit the note" }));
      const note = screen.getByRole("textbox", { name: "My note" });
      fireEvent.change(note, { target: { value: "Gone" } });
      fireEvent.keyDown(note, { key: "Escape" });

      expect(screen.getByText("Book 4 not before 2027.")).toBeInTheDocument();
      await later(60);
      expect(patches(calls)).toEqual([]);

      fireEvent.click(screen.getByRole("button", { name: "Edit the note" }));
      expect(screen.getByRole("textbox", { name: "My note" })).toHaveValue(
        "Book 4 not before 2027.",
      );
    });

    it("keeps the typed note and offers Retry when saving fails", async () => {
      await open(SAGA, { onPatch: () => ({ status: 500, body: { error: "Failed" } }) });

      fireEvent.click(screen.getByRole("button", { name: "Edit the note" }));
      const note = screen.getByRole("textbox", { name: "My note" });
      fireEvent.change(note, { target: { value: "Lent to Olena" } });
      fireEvent.blur(note);

      expect(await screen.findByRole("alert")).toHaveTextContent("Could not save the note");
      expect(screen.getByRole("textbox", { name: "My note" })).toHaveValue("Lent to Olena");
      expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    });

    it("offers to add a note when there is none", async () => {
      await open({ ...SAGA, note: undefined });

      fireEvent.click(screen.getByRole("button", { name: "Add a note" }));

      expect(screen.getByRole("textbox", { name: "My note" })).toHaveFocus();
    });
  });

  describe("edit mode", () => {
    async function startEditing() {
      fireEvent.click(screen.getByRole("button", { name: "Edit the series" }));
      return screen.findByRole("form", { name: "Editing the series" });
    }

    it("saves every field with Done and goes back to the header", async () => {
      const calls = await open();
      const form = await startEditing();

      fireEvent.change(within(form).getByLabelText("Title"), {
        target: { value: "Roots of Chaos" },
      });
      fireEvent.change(within(form).getByLabelText("Author"), { target: { value: "" } });
      fireEvent.click(within(form).getByRole("radio", { name: "Complete" }));
      fireEvent.change(within(form).getByLabelText("Books in the series"), {
        target: { value: "6" },
      });
      fireEvent.click(within(form).getByRole("radio", { name: "12+" }));
      fireEvent.change(within(form).getByLabelText("Annotation"), { target: { value: " " } });
      fireEvent.click(within(form).getByRole("button", { name: "Done" }));

      await waitFor(() =>
        expect(patches(calls)).toEqual([
          {
            title: "Roots of Chaos",
            author: null,
            status: "complete",
            totalBooks: 6,
            ageRating: "12",
            genres: ["Fantasy"],
            tropes: ["dragons", "slow burn"],
            annotation: null,
          },
        ]),
      );
      await waitFor(() =>
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Roots of Chaos"),
      );
      expect(screen.queryByRole("form")).not.toBeInTheDocument();
    });

    it("sends nothing while the title is blank", async () => {
      const calls = await open();
      const form = await startEditing();

      fireEvent.change(within(form).getByLabelText("Title"), { target: { value: "  " } });
      fireEvent.click(within(form).getByRole("button", { name: "Done" }));

      expect(within(form).getByRole("alert")).toHaveTextContent("The series needs a title.");
      await later(60);
      expect(patches(calls)).toEqual([]);
    });

    it("sends nothing while the count is not a whole number from 1 to 200, and clears it when empty", async () => {
      const calls = await open();
      const form = await startEditing();
      const count = within(form).getByLabelText("Books in the series");

      for (const wrong of ["0", "201", "2.5"]) {
        fireEvent.change(count, { target: { value: wrong } });
        fireEvent.click(within(form).getByRole("button", { name: "Done" }));
        expect(within(form).getByRole("alert")).toHaveTextContent("A whole number from 1 to 200.");
      }
      await later(60);
      expect(patches(calls)).toEqual([]);

      fireEvent.change(count, { target: { value: "" } });
      fireEvent.click(within(form).getByRole("button", { name: "Done" }));
      await waitFor(() => expect(patches(calls)[0]).toMatchObject({ totalBooks: null }));
    });

    it("keeps the form and says so when the server refuses", async () => {
      await open(SAGA, { onPatch: () => ({ status: 500, body: { error: "Failed" } }) });
      const form = await startEditing();

      fireEvent.click(within(form).getByRole("button", { name: "Done" }));

      expect(await within(form).findByRole("alert")).toHaveTextContent("Could not save the series");
      expect(screen.getByRole("form", { name: "Editing the series" })).toBeInTheDocument();
    });

    it("drops the changes with Cancel", async () => {
      const calls = await open();
      const form = await startEditing();

      fireEvent.change(within(form).getByLabelText("Title"), { target: { value: "Changed" } });
      fireEvent.click(within(form).getByRole("button", { name: "Cancel" }));

      expect(screen.queryByRole("form")).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Roots of Ash");
      await later(60);
      expect(patches(calls)).toEqual([]);
    });

    it("is a sheet on a phone that Escape closes, and a card in the page from 768px", async () => {
      await open();
      await startEditing();
      expect(screen.getByRole("dialog", { name: "Editing the series" })).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("form")).not.toBeInTheDocument();

      wide(true);
      await startEditing();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByRole("form", { name: "Editing the series" })).toBeInTheDocument();
    });

    it("asks before deleting, Cancel first, and leaves for the library after", async () => {
      const calls = await open();
      const form = await startEditing();

      fireEvent.click(within(form).getByRole("button", { name: "Delete series" }));
      const dialog = screen.getByRole("alertdialog", { name: "Delete the series “Roots of Ash”?" });
      expect(dialog).toHaveAccessibleDescription(/Its books stay in your library/);
      expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();

      fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
      expect(calls.some((call) => call.method === "DELETE")).toBe(false);

      fireEvent.click(within(form).getByRole("button", { name: "Delete series" }));
      fireEvent.click(
        within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }),
      );

      await waitFor(() => expect(router.push).toHaveBeenCalledWith("/library"));
      expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(1);
    });

    it("stays when the series could not be deleted", async () => {
      await open(SAGA, { onDelete: () => ({ status: 500, body: { error: "Failed" } }) });
      const form = await startEditing();

      fireEvent.click(within(form).getByRole("button", { name: "Delete series" }));
      fireEvent.click(
        within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }),
      );

      expect(await within(form).findByRole("alert")).toHaveTextContent(
        "Could not delete the series",
      );
      expect(router.push).not.toHaveBeenCalled();
    });
  });

  describe("states", () => {
    it("says so when the series does not exist", async () => {
      serve();
      renderApp(<SeriesPage id="gone" />);

      expect(await screen.findByRole("heading", { name: "Series not found" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Back to the library" })).toHaveAttribute(
        "href",
        "/library",
      );
    });

    it("offers to try again when the series cannot be loaded", async () => {
      let down = true;
      mockApi(({ path }) => {
        if (path === "/api/series/saga") {
          return down
            ? { status: 500, body: { error: "Failed to fetch series" } }
            : { body: { series: SAGA, books: [] } };
        }
        if (path === "/api/progress") return { body: { entries: [] } };
      });
      renderApp(<SeriesPage id="saga" />);

      expect(await screen.findByText("Could not load this series")).toBeInTheDocument();
      down = false;
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent("Roots of Ash");
    });
  });
});
