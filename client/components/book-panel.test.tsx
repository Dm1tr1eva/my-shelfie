import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { SWRConfig } from "swr";
import { AuthProvider } from "@/lib/auth-context";
import { resetLocale, setLocale } from "@/lib/i18n";
import { book, booksResponse, choose, mockApi, renderApp, series, type Call } from "@/test/helpers";
import { useBooks, type Book } from "@/lib/books";
import { BookPanel } from "./book-panel";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }));
const location = vi.hoisted(() => ({ pathname: "/books/b1" }));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => location.pathname,
}));

const saga = series({ id: "saga", title: "Saga of Ash" });

type Reply = { status?: number; body?: unknown; wait?: Promise<unknown> };

function later(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type Options = {
  percent?: number;
  onPatch?: (call: Call) => Reply | undefined;
  onDelete?: (call: Call) => Reply | undefined;
  covers?: string[] | "down";
};

function serve(initial: Book, { percent, onPatch, onDelete, covers = [] }: Options = {}) {
  let current = initial;
  const calls = mockApi((call) => {
    const { method, path, body } = call;
    if (method === "PATCH" && path === `/api/books/${initial.id}`) {
      const reply = onPatch?.(call);
      if (reply) return reply;
      const next: Record<string, unknown> = { ...current };
      for (const [key, value] of Object.entries(body as object)) {
        if (value === null) delete next[key];
        else next[key] = value;
      }
      current = next as Book;
      return { body: current, wait: later(30) };
    }
    if (method === "DELETE" && path === `/api/books/${initial.id}`) {
      return onDelete?.(call) ?? { status: 204 };
    }
    if (path === `/api/books/${initial.id}`) return { body: current };
    if (path === "/api/series") return { body: { series: [saga] } };
    if (path === "/api/progress") {
      return {
        body: {
          entries:
            percent === undefined
              ? []
              : [{ id: "p1", bookId: initial.id, date: "2026-11-01", percent }],
        },
      };
    }
    if (path.startsWith("/api/books/search")) {
      if (covers === "down") return { status: 502, body: { error: "Book search is unavailable" } };
      return {
        body: {
          results: covers.map((coverUrl, index) => ({
            volumeId: `v${index}`,
            title: "Ash",
            authors: [],
            coverUrl,
          })),
        },
      };
    }
    if (path.startsWith("/api/books?")) return booksResponse([current]);
  });
  return calls;
}

function patches(calls: Call[]) {
  return calls.filter((call) => call.method === "PATCH").map((call) => call.body);
}

async function open(initial: Book, options?: Parameters<typeof serve>[1]) {
  const calls = serve(initial, options);
  renderApp(<BookPanel id={initial.id} closeBy="back" />);
  await screen.findByRole("heading", { name: initial.title });
  return calls;
}

function rowNames() {
  return [...document.querySelectorAll("dt")].map((term) => term.textContent);
}

describe("BookPanel", () => {
  beforeEach(() => {
    router.back.mockReset();
    router.replace.mockReset();
    location.pathname = "/books/b1";
  });

  afterEach(async () => {
    await act(() => later(80));
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("fields by status", () => {
    it("shows progress from the log and both dates while reading, and no rating", async () => {
      await open(book({ id: "b1", title: "Ash", status: "reading", pages: 830 }), {
        percent: 50,
      });

      expect(rowNames()).toEqual([
        "I have it",
        "Format",
        "Pages",
        "Status",
        "Progress",
        "Started",
        "Finished",
      ]);
      expect(await screen.findByRole("progressbar", { name: "Progress" })).toHaveAttribute(
        "aria-valuetext",
        "50% read",
      );
      expect(screen.getByRole("button", { name: "Finished: Pick a date" })).toBeInTheDocument();
    });

    it("shows nothing past the status for a book still to read", async () => {
      await open(book({ id: "b1", title: "Ash", status: "want" }));

      expect(rowNames()).toEqual(["I have it", "Format", "Pages", "Status"]);
    });

    it("shows where a dropped book stopped, its rating and dates", async () => {
      await open(
        book({
          id: "b1",
          title: "Ash",
          status: "dropped",
          rating: 2,
          startedAt: "2026-10-03T00:00:00.000Z",
        }),
        { percent: 31 },
      );

      expect(rowNames()).toEqual([
        "I have it",
        "Format",
        "Pages",
        "Status",
        "Progress",
        "Rating",
        "Started",
        "Finished",
      ]);
      expect(await screen.findByText("31%")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Started: Oct 3, 2026" })).toBeInTheDocument();
    });

    it("shows the rating and dates of a read book without progress", async () => {
      await open(book({ id: "b1", title: "Ash", status: "read", rating: 4 }));

      expect(rowNames()).toEqual([
        "I have it",
        "Format",
        "Pages",
        "Status",
        "Rating",
        "Started",
        "Finished",
      ]);
    });

    it("shows no reading status for a book on the wishlist", async () => {
      await open(book({ id: "b1", title: "Ash", ownership: "wanted", status: "read" }));

      expect(rowNames()).toEqual(["I have it", "Format", "Pages"]);
      expect(screen.getByRole("radio", { name: "Want" })).toBeChecked();
    });
  });

  describe("fields by format", () => {
    it("gives an audiobook a duration and says Listening", async () => {
      await open(
        book({
          id: "b1",
          title: "Ash",
          format: "audio",
          status: "reading",
          durationMinutes: 870,
        }),
      );

      expect(rowNames()).toContain("Duration");
      expect(rowNames()).not.toContain("Pages");
      expect(screen.getByRole("spinbutton", { name: "Hours" })).toHaveValue(14);
      expect(screen.getByRole("spinbutton", { name: "Minutes" })).toHaveValue(30);
      expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent("Listening");
    });

    it("lets an audiobook be chosen and saves the duration in minutes", async () => {
      const calls = await open(book({ id: "b1", title: "Ash", status: "read" }));

      choose(screen.getByRole("combobox", { name: "Format" }), "Audiobook");
      await waitFor(() => expect(patches(calls)).toEqual([{ format: "audio" }]));
      expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent("Listened");

      const hours = await screen.findByRole("spinbutton", { name: "Hours" });
      fireEvent.focus(hours);
      fireEvent.change(hours, { target: { value: "2" } });
      fireEvent.change(screen.getByRole("spinbutton", { name: "Minutes" }), {
        target: { value: "5" },
      });
      fireEvent.blur(hours, { relatedTarget: document.body });

      await waitFor(() =>
        expect(patches(calls)).toEqual([{ format: "audio" }, { durationMinutes: 125 }]),
      );
    });
  });

  describe("autosave", () => {
    it("saves a choice at once and undoes it from the toast", async () => {
      const calls = await open(book({ id: "b1", title: "Ash", status: "read", rating: 2 }));

      fireEvent.click(screen.getByRole("button", { name: "Rate 4 out of 5" }));

      expect(await screen.findByText("Saved")).toBeInTheDocument();
      expect(patches(calls)).toEqual([{ rating: 4 }]);

      fireEvent.click(screen.getByRole("button", { name: "Undo" }));

      await waitFor(() => expect(patches(calls)).toEqual([{ rating: 4 }, { rating: 2 }]));
      expect(await screen.findByText("Change undone")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Rate 2 out of 5" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    it("undoes a value that was empty by clearing it", async () => {
      const calls = await open(book({ id: "b1", title: "Ash", status: "read" }));

      fireEvent.click(screen.getByRole("button", { name: "Rate 5 out of 5" }));
      fireEvent.click(await screen.findByRole("button", { name: "Undo" }));

      await waitFor(() => expect(patches(calls)).toEqual([{ rating: 5 }, { rating: null }]));
    });

    it("clears the rating when the chosen star is pressed again", async () => {
      const calls = await open(book({ id: "b1", title: "Ash", status: "read", rating: 3 }));

      expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Rate 3 out of 5" }));

      await waitFor(() => expect(patches(calls)).toEqual([{ rating: null }]));
    });

    it("sends quick changes one after another, in the order they were made", async () => {
      let release: () => void = () => {};
      const first = new Promise<void>((resolve) => {
        release = resolve;
      });
      let held = false;
      const calls = await open(book({ id: "b1", title: "Ash", status: "read" }), {
        onPatch: () => {
          if (held) return undefined;
          held = true;
          return { body: book({ id: "b1", title: "Ash", status: "read", rating: 3 }), wait: first };
        },
      });

      fireEvent.click(screen.getByRole("button", { name: "Rate 3 out of 5" }));
      fireEvent.click(screen.getByRole("button", { name: "Rate 5 out of 5" }));

      await waitFor(() => expect(patches(calls)).toEqual([{ rating: 3 }]));
      release();
      await waitFor(() => expect(patches(calls)).toEqual([{ rating: 3 }, { rating: 5 }]));
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "Rate 5 out of 5" })).toHaveAttribute(
          "aria-pressed",
          "true",
        ),
      );
    });

    it("saves the note when the field is left", async () => {
      const calls = await open(book({ id: "b1", title: "Ash" }));
      const note = screen.getByRole("textbox", { name: "My note" });

      fireEvent.focus(note);
      fireEvent.change(note, { target: { value: "A gift from Mum" } });
      expect(patches(calls)).toEqual([]);
      fireEvent.blur(note);

      await waitFor(() => expect(patches(calls)).toEqual([{ notes: "A gift from Mum" }]));
      expect(await screen.findByText("Saved")).toBeInTheDocument();
    });

    it("keeps the typed text and offers Retry when saving fails", async () => {
      let failing = true;
      const calls = await open(book({ id: "b1", title: "Ash" }), {
        onPatch: () =>
          failing ? { status: 500, body: { error: "Failed to update book" } } : undefined,
      });
      const note = screen.getByRole("textbox", { name: "My note" });

      fireEvent.focus(note);
      fireEvent.change(note, { target: { value: "Lent to Olena" } });
      fireEvent.blur(note);

      expect(await screen.findByRole("alert")).toHaveTextContent("Could not save");
      expect(note).toHaveValue("Lent to Olena");

      failing = false;
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));

      await waitFor(() =>
        expect(patches(calls)).toEqual([{ notes: "Lent to Olena" }, { notes: "Lent to Olena" }]),
      );
      expect(await screen.findByText("Saved")).toBeInTheDocument();
      expect(note).toHaveValue("Lent to Olena");
    });

    it("puts a failed choice back as it was", async () => {
      await open(book({ id: "b1", title: "Ash", ownership: "owned" }), {
        onPatch: () => ({ status: 500, body: { error: "Failed to update book" } }),
      });

      fireEvent.click(screen.getByRole("radio", { name: "Want" }));

      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "Yes" })).toBeChecked();
    });

    it("saves an unsaved note before closing, then closes", async () => {
      const calls = await open(book({ id: "b1", title: "Ash" }));
      const note = screen.getByRole("textbox", { name: "My note" });

      fireEvent.focus(note);
      fireEvent.change(note, { target: { value: "Half way" } });
      fireEvent.keyDown(note, { key: "Escape" });

      await waitFor(() => expect(router.back).toHaveBeenCalledOnce());
      expect(patches(calls)).toEqual([{ notes: "Half way" }]);
    });

    it("stays open when the unsaved note cannot be saved", async () => {
      await open(book({ id: "b1", title: "Ash" }), {
        onPatch: () => ({ status: 500, body: { error: "Failed to update book" } }),
      });
      const note = screen.getByRole("textbox", { name: "My note" });

      fireEvent.focus(note);
      fireEvent.change(note, { target: { value: "Half way" } });
      fireEvent.click(screen.getByRole("button", { name: "Close" }));

      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(router.back).not.toHaveBeenCalled();
      expect(note).toHaveValue("Half way");
    });

    it("renames the book in place", async () => {
      const calls = await open(book({ id: "b1", title: "Ash", author: "A. Writer" }));

      fireEvent.click(screen.getByRole("button", { name: "Rename" }));
      const title = screen.getByRole("textbox", { name: "Title" });
      expect(title).toHaveFocus();
      fireEvent.focus(title);
      fireEvent.change(title, { target: { value: "Ash and Ember" } });
      fireEvent.keyDown(title, { key: "Enter" });

      expect(await screen.findByRole("heading", { name: "Ash and Ember" })).toBeInTheDocument();
      expect(patches(calls)).toEqual([{ title: "Ash and Ember" }]);
      expect(screen.getByRole("button", { name: "Rename" })).toBeInTheDocument();
    });

    it("saves a date picked for the start", async () => {
      const calls = await open(book({ id: "b1", title: "Ash", status: "reading" }));

      fireEvent.click(screen.getByRole("button", { name: "Started: Pick a date" }));
      const input = screen.getByLabelText("Started");
      fireEvent.change(input, { target: { value: "2026-10-03" } });
      fireEvent.blur(input);

      await waitFor(() => expect(patches(calls)).toEqual([{ startedAt: "2026-10-03" }]));
      expect(
        await screen.findByRole("button", { name: "Started: Oct 3, 2026" }),
      ).toBeInTheDocument();
    });

    it("leaves the focus where it went when the date field is left", async () => {
      await open(book({ id: "b1", title: "Ash", status: "reading" }));

      fireEvent.click(screen.getByRole("button", { name: "Started: Pick a date" }));
      const input = screen.getByLabelText("Started");
      const note = screen.getByRole("textbox", { name: "My note" });
      note.focus();
      fireEvent.blur(input, { relatedTarget: note });

      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(note).toHaveFocus();
    });

    it("keeps a number being typed when an earlier save of it comes back", async () => {
      let release: () => void = () => {};
      const slow = new Promise<void>((resolve) => {
        release = resolve;
      });
      const calls = await open(book({ id: "b1", title: "Ash" }), {
        onPatch: () => ({ body: book({ id: "b1", title: "Ash", pages: 830 }), wait: slow }),
      });
      const pages = screen.getByRole("spinbutton", { name: "Pages" });

      fireEvent.focus(pages);
      fireEvent.change(pages, { target: { value: "830" } });
      fireEvent.blur(pages);
      fireEvent.focus(pages);
      fireEvent.change(pages, { target: { value: "831" } });
      release();

      await waitFor(() => expect(patches(calls)).toEqual([{ pages: 830 }]));
      await screen.findByText("Saved");
      expect(pages).toHaveValue(831);
    });

    it("never offers to enter progress", async () => {
      await open(book({ id: "b1", title: "Ash", status: "reading" }), { percent: 40 });

      const progress = await screen.findByRole("progressbar", { name: "Progress" });
      expect(within(progress.parentElement as HTMLElement).queryByRole("spinbutton")).toBeNull();
      expect(screen.queryByRole("button", { name: /mark page/i })).not.toBeInTheDocument();
    });
  });

  describe("links", () => {
    it("adds a link with two languages and removes it", async () => {
      const calls = await open(book({ id: "b1", title: "Ash" }));

      fireEvent.click(screen.getByRole("button", { name: "link" }));
      choose(screen.getByRole("combobox", { name: "Type" }), "Online");
      fireEvent.change(screen.getByRole("textbox", { name: "Link" }), {
        target: { value: "https://bookmate.ru/books/ash" },
      });
      fireEvent.click(screen.getByRole("button", { name: "language" }));
      fireEvent.change(screen.getByRole("searchbox", { name: "Find a language" }), {
        target: { value: "eng" },
      });
      expect(screen.queryByRole("checkbox", { name: /Russian/ })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("checkbox", { name: /English/ }));
      fireEvent.change(screen.getByRole("searchbox", { name: "Find a language" }), {
        target: { value: "" },
      });
      fireEvent.click(screen.getByRole("checkbox", { name: /Russian/ }));
      fireEvent.click(screen.getByRole("button", { name: "Add" }));

      await waitFor(() =>
        expect(patches(calls)).toEqual([
          {
            links: [
              { kind: "online", languages: ["ru", "en"], url: "https://bookmate.ru/books/ash" },
            ],
          },
        ]),
      );
      const row = (await screen.findByRole("link", { name: "Open Online on bookmate.ru" }))
        .parentElement as HTMLElement;
      expect(within(row).getByText("RU")).toBeInTheDocument();
      expect(within(row).getByText("EN")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Remove the link to bookmate.ru" }));
      await waitFor(() => expect(patches(calls).at(-1)).toEqual({ links: [] }));
    });

    it("asks for a language before adding a link", async () => {
      const calls = await open(book({ id: "b1", title: "Ash" }));

      fireEvent.click(screen.getByRole("button", { name: "link" }));
      fireEvent.change(screen.getByRole("textbox", { name: "Link" }), {
        target: { value: "https://example.com/ash" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Add" }));

      expect(screen.getByRole("alert")).toHaveTextContent("Choose at least one language.");
      expect(patches(calls)).toEqual([]);
    });
  });

  describe("impressions", () => {
    it("turns preset and own moods on and off", async () => {
      const calls = await open(book({ id: "b1", title: "Ash", moods: ["Tense"] }));

      fireEvent.click(screen.getByRole("button", { name: "Gripping" }));
      await waitFor(() => expect(patches(calls)).toEqual([{ moods: ["Tense", "Gripping"] }]));

      fireEvent.click(screen.getByRole("button", { name: "own" }));
      const field = screen.getByRole("textbox", { name: "Your own mood" });
      fireEvent.change(field, { target: { value: "tense" } });
      fireEvent.keyDown(field, { key: "Enter" });
      expect(screen.getByRole("alert")).toHaveTextContent("This mood is already here.");

      fireEvent.change(field, { target: { value: "Strange and quiet" } });
      fireEvent.keyDown(field, { key: "Enter" });
      await waitFor(() =>
        expect(patches(calls).at(-1)).toEqual({
          moods: ["Tense", "Gripping", "Strange and quiet"],
        }),
      );
      expect(screen.getByRole("button", { name: "Strange and quiet" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );

      fireEvent.click(screen.getByRole("button", { name: "Tense" }));
      await waitFor(() =>
        expect(patches(calls).at(-1)).toEqual({ moods: ["Gripping", "Strange and quiet"] }),
      );
    });

    it("answers whether to recommend and clears the answer on a second press", async () => {
      const calls = await open(book({ id: "b1", title: "Ash" }));

      fireEvent.click(screen.getByRole("button", { name: "Maybe" }));
      await waitFor(() => expect(patches(calls)).toEqual([{ recommend: "maybe" }]));
      fireEvent.click(screen.getByRole("button", { name: "Maybe" }));
      await waitFor(() => expect(patches(calls).at(-1)).toEqual({ recommend: null }));
    });

    it("adds a quote with its page and removes it", async () => {
      const kept = { text: "Old words.", page: 3 };
      const calls = await open(book({ id: "b1", title: "Ash", quotes: [kept] }));

      fireEvent.click(screen.getByRole("button", { name: "quote" }));
      fireEvent.change(screen.getByRole("textbox", { name: "Quote" }), {
        target: { value: "To see the dawn, live through the night." },
      });
      fireEvent.change(screen.getByRole("spinbutton", { name: "Page" }), {
        target: { value: "214" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Add" }));

      await waitFor(() =>
        expect(patches(calls)).toEqual([
          { quotes: [kept, { text: "To see the dawn, live through the night.", page: 214 }] },
        ]),
      );
      expect(await screen.findByText("p. 214")).toBeInTheDocument();

      fireEvent.click(screen.getAllByRole("button", { name: "Remove the quote" })[0]);
      await waitFor(() =>
        expect(patches(calls).at(-1)).toEqual({
          quotes: [{ text: "To see the dawn, live through the night.", page: 214 }],
        }),
      );
    });
  });

  describe("delete", () => {
    it("asks first with Cancel focused, and Cancel keeps the book", async () => {
      const calls = await open(book({ id: "b1", title: "Ash", seriesId: "saga", seriesNumber: 1 }));

      fireEvent.click(screen.getByRole("button", { name: "Delete book" }));

      const dialog = screen.getByRole("alertdialog", { name: "Delete “Ash”?" });
      expect(dialog).toHaveAccessibleDescription(/from the series “Saga of Ash”/);
      expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
      fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(calls.some((call) => call.method === "DELETE")).toBe(false);
    });

    it("deletes the book and closes the panel", async () => {
      const calls = await open(book({ id: "b1", title: "Ash" }));

      fireEvent.click(screen.getByRole("button", { name: "Delete book" }));
      fireEvent.click(
        within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }),
      );

      await waitFor(() => expect(router.back).toHaveBeenCalledOnce());
      expect(calls).toContainEqual({ method: "DELETE", path: "/api/books/b1", body: undefined });
    });

    it("Escape in the dialog closes only the dialog", async () => {
      await open(book({ id: "b1", title: "Ash" }));

      fireEvent.click(screen.getByRole("button", { name: "Delete book" }));
      fireEvent.keyDown(screen.getByRole("button", { name: "Cancel" }), { key: "Escape" });

      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(screen.getByRole("dialog", { name: "Ash" })).toBeInTheDocument();
      expect(router.back).not.toHaveBeenCalled();
    });
  });

  describe("states and closing", () => {
    it("says the book is not there when the API answers 404", async () => {
      location.pathname = "/books/gone";
      mockApi(({ path }) => {
        if (path === "/api/books/gone") return { status: 404, body: { error: "Book not found" } };
        if (path === "/api/series") return { body: { series: [] } };
      });
      renderApp(<BookPanel id="gone" closeBy="back" />);

      expect(await screen.findByRole("heading", { name: "Book not found" })).toBeInTheDocument();
      fireEvent.click(screen.getAllByRole("button", { name: "Close" }).at(-1) as HTMLElement);
      expect(router.back).toHaveBeenCalledOnce();
    });

    it("offers to try again when the book cannot be loaded", async () => {
      let down = true;
      mockApi(({ path }) => {
        if (path === "/api/books/b1") {
          return down
            ? { status: 500, body: { error: "Failed to fetch book" } }
            : { body: book({ id: "b1", title: "Ash" }) };
        }
        if (path === "/api/series") return { body: { series: [] } };
        if (path === "/api/progress") return { body: { entries: [] } };
      });
      renderApp(<BookPanel id="b1" closeBy="back" />);

      expect(await screen.findByText("Could not load this book")).toBeInTheDocument();
      down = false;
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(await screen.findByRole("heading", { name: "Ash" })).toBeInTheDocument();
    });

    it("shows a loading skeleton before the book arrives", async () => {
      let arrive: () => void = () => {};
      const arrived = new Promise<void>((resolve) => {
        arrive = resolve;
      });
      mockApi(({ path }) => {
        if (path === "/api/books/b1")
          return { body: book({ id: "b1", title: "Ash" }), wait: arrived };
        if (path === "/api/series") return { body: { series: [] } };
        if (path === "/api/progress") return { body: { entries: [] } };
      });
      renderApp(<BookPanel id="b1" closeBy="back" />);

      expect(await screen.findByText("Loading the book…")).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Ash" })).not.toBeInTheDocument();
      arrive();
      expect(await screen.findByRole("heading", { name: "Ash" })).toBeInTheDocument();
      expect(screen.queryByText("Loading the book…")).not.toBeInTheDocument();
    });

    it("names the series above a series book, shows the series' tags and edits the book's own annotation", async () => {
      const calls = await open(
        book({
          id: "b1",
          title: "Ash",
          seriesId: "saga",
          seriesNumber: 1,
          genres: ["Fantasy"],
          tropes: ["dragons"],
          annotation: "The first book wakes the dragon.",
        }),
      );

      expect(await screen.findByRole("link", { name: "Saga of Ash #1" })).toHaveAttribute(
        "href",
        "/series/saga",
      );
      expect(screen.getByText("Fantasy")).toBeInTheDocument();
      expect(screen.getByText("dragons")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Choose genres|Fantasy/ }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole("textbox", { name: "Tropes" })).not.toBeInTheDocument();

      const area = screen.getByRole("textbox", { name: "Annotation" });
      expect(area).toHaveValue("The first book wakes the dragon.");
      fireEvent.focus(area);
      fireEvent.change(area, { target: { value: "The dragon wakes." } });
      fireEvent.blur(area);
      await waitFor(() => expect(patches(calls)).toEqual([{ annotation: "The dragon wakes." }]));
    });

    it("chooses genres and tropes of a standalone book", async () => {
      const calls = await open(book({ id: "b1", title: "Ash" }));

      fireEvent.click(screen.getByRole("button", { name: /Choose genres/ }));
      fireEvent.click(screen.getByRole("checkbox", { name: "Fantasy" }));
      await waitFor(() => expect(patches(calls)).toEqual([{ genres: ["Fantasy"] }]));

      const tropes = screen.getByRole("textbox", { name: "Tropes" });
      fireEvent.change(tropes, { target: { value: "found family" } });
      fireEvent.keyDown(tropes, { key: "Enter" });
      await waitFor(() => expect(patches(calls).at(-1)).toEqual({ tropes: ["found family"] }));
    });

    it("closes the trope suggestions with Escape and leaves the panel open", async () => {
      await open(book({ id: "b1", title: "Ash", tropes: [] }));
      const tropes = screen.getByRole("textbox", { name: "Tropes" });

      fireEvent.focus(tropes);
      fireEvent.change(tropes, { target: { value: "road" } });
      expect(screen.getByRole("listbox")).toBeInTheDocument();
      fireEvent.keyDown(tropes, { key: "Escape" });

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(router.back).not.toHaveBeenCalled();
      expect(screen.getByRole("dialog", { name: "Ash" })).toBeInTheDocument();
    });

    it("closes the genre list with Escape and leaves the panel open", async () => {
      await open(book({ id: "b1", title: "Ash" }));

      fireEvent.click(screen.getByRole("button", { name: /Choose genres/ }));
      fireEvent.keyDown(document.body, { key: "Escape" });

      expect(screen.queryByRole("checkbox", { name: "Fantasy" })).not.toBeInTheDocument();
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(router.back).not.toHaveBeenCalled();
    });

    it("edits the annotation of a standalone book", async () => {
      const calls = await open(book({ id: "b1", title: "Ash" }));
      const area = screen.getByRole("textbox", { name: "Annotation" });

      fireEvent.focus(area);
      fireEvent.change(area, { target: { value: "A quiet book." } });
      fireEvent.blur(area);

      await waitFor(() => expect(patches(calls)).toEqual([{ annotation: "A quiet book." }]));
    });

    it("goes away when a link inside it leads to another page", async () => {
      serve(book({ id: "b1", title: "Ash" }));
      const panel = <BookPanel id="b1" closeBy="back" />;
      const { rerender } = renderApp(panel);
      await screen.findByRole("heading", { name: "Ash" });

      location.pathname = "/series/saga";
      rerender(
        <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
          <AuthProvider>{panel}</AuthProvider>
        </SWRConfig>,
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("closes back to the page underneath with Escape", async () => {
      await open(book({ id: "b1", title: "Ash" }));

      fireEvent.keyDown(document, { key: "Escape" });

      await waitFor(() => expect(router.back).toHaveBeenCalledOnce());
    });

    it("closes to the library when it was opened by its own address", async () => {
      serve(book({ id: "b1", title: "Ash" }));
      renderApp(<BookPanel id="b1" closeBy="library" />);
      await screen.findByRole("heading", { name: "Ash" });

      fireEvent.click(screen.getByRole("button", { name: "Close" }));

      await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/library"));
      expect(router.back).not.toHaveBeenCalled();
    });
  });

  describe("after review", () => {
    afterEach(() => {
      localStorage.clear();
      act(() => resetLocale());
    });

    function panelTree(fallback: Record<string, unknown> = {}) {
      return (
        <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, fallback }}>
          <AuthProvider>
            <BookPanel id="b1" closeBy="back" />
          </AuthProvider>
        </SWRConfig>
      );
    }

    it("closes again after it was closed and opened once more", async () => {
      serve(book({ id: "b1", title: "Ash" }));
      const { rerender } = render(panelTree());
      await screen.findByRole("heading", { name: "Ash" });

      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
      location.pathname = "/series/saga";
      rerender(panelTree());
      location.pathname = "/books/b1";
      rerender(panelTree());
      await screen.findByRole("heading", { name: "Ash" });

      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(router.back).toHaveBeenCalledTimes(2));
    });

    it("saves the same text again after it was undone", async () => {
      const calls = await open(book({ id: "b1", title: "Ash" }));
      const note = screen.getByRole("textbox", { name: "My note" });

      fireEvent.focus(note);
      fireEvent.change(note, { target: { value: "Lent" } });
      fireEvent.blur(note);
      fireEvent.click(await screen.findByRole("button", { name: "Undo" }));
      await screen.findByText("Change undone");
      expect(note).toHaveValue("");

      fireEvent.focus(note);
      fireEvent.change(note, { target: { value: "Lent" } });
      fireEvent.blur(note);

      await waitFor(() =>
        expect(patches(calls)).toEqual([{ notes: "Lent" }, { notes: null }, { notes: "Lent" }]),
      );
    });

    it("saves the text being typed when the page changes under the panel", async () => {
      const calls = serve(book({ id: "b1", title: "Ash" }));
      const { rerender } = render(panelTree());
      await screen.findByRole("heading", { name: "Ash" });
      const note = screen.getByRole("textbox", { name: "My note" });

      fireEvent.focus(note);
      fireEvent.change(note, { target: { value: "Half way" } });
      location.pathname = "/library";
      rerender(panelTree());

      await waitFor(() => expect(patches(calls)).toEqual([{ notes: "Half way" }]));
    });

    it("drops a quote that was cancelled", async () => {
      const calls = await open(book({ id: "b1", title: "Ash" }));

      fireEvent.click(screen.getByRole("button", { name: "quote" }));
      fireEvent.change(screen.getByRole("textbox", { name: "Quote" }), {
        target: { value: "Not this one." },
      });
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      await later(60);

      expect(patches(calls)).toEqual([]);
      expect(screen.getByRole("button", { name: "quote" })).toBeInTheDocument();
    });

    it("shows only Not found when an old copy of a deleted book is still cached", async () => {
      mockApi(({ path }) => {
        if (path === "/api/books/b1") return { status: 404, body: { error: "Book not found" } };
        if (path === "/api/series") return { body: { series: [] } };
        if (path === "/api/progress") return { body: { entries: [] } };
      });
      render(panelTree({ "/api/books/b1": book({ id: "b1", title: "Ash" }) }));

      expect(await screen.findByRole("heading", { name: "Book not found" })).toBeInTheDocument();
      expect(screen.queryByRole("textbox", { name: "My note" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Delete book" })).not.toBeInTheDocument();
    });

    it("renames on leaving the fields and cancels with Escape", async () => {
      const calls = await open(book({ id: "b1", title: "Ash", author: "A. Writer" }));

      fireEvent.click(screen.getByRole("button", { name: "Rename" }));
      const title = screen.getByRole("textbox", { name: "Title" });
      fireEvent.focus(title);
      fireEvent.change(title, { target: { value: "Ember" } });
      fireEvent.keyDown(title, { key: "Escape" });
      expect(screen.getByRole("heading", { name: "Ash" })).toBeInTheDocument();
      await later(60);
      expect(patches(calls)).toEqual([]);

      fireEvent.click(screen.getByRole("button", { name: "Rename" }));
      const again = screen.getByRole("textbox", { name: "Title" });
      fireEvent.focus(again);
      fireEvent.change(again, { target: { value: "Ash and Ember" } });
      fireEvent.blur(again, { relatedTarget: document.body });

      expect(await screen.findByRole("heading", { name: "Ash and Ember" })).toBeInTheDocument();
      expect(patches(calls)).toEqual([{ title: "Ash and Ember" }]);
    });

    it("changes the status and shows the rows of the new status", async () => {
      const calls = await open(book({ id: "b1", title: "Ash", status: "want" }));

      expect(rowNames()).not.toContain("Rating");
      choose(screen.getByRole("combobox", { name: "Status" }), "Read");

      await waitFor(() => expect(patches(calls)).toEqual([{ status: "read" }]));
      expect(rowNames()).toContain("Rating");
    });

    it("refreshes the library under the panel after a save", async () => {
      const calls = serve(book({ id: "b1", title: "Ash", status: "read" }));
      function Shelf() {
        const { books } = useBooks();
        return <p>{books.length} on the shelf</p>;
      }
      renderApp(
        <>
          <Shelf />
          <BookPanel id="b1" closeBy="back" />
        </>,
      );
      await screen.findByText("1 on the shelf");
      const lists = () => calls.filter((call) => call.path.startsWith("/api/books?")).length;
      const before = lists();

      fireEvent.click(screen.getByRole("button", { name: "Rate 4 out of 5" }));

      await waitFor(() => expect(lists()).toBe(before + 1));
    });

    it("stores a preset mood typed in the interface language under its English name", async () => {
      act(() => setLocale("uk"));
      const calls = await open(book({ id: "b1", title: "Ash" }));

      fireEvent.click(screen.getByRole("button", { name: "своє" }));
      const field = screen.getByRole("textbox", { name: "Своє відчуття" });
      fireEvent.change(field, { target: { value: "захоплює" } });
      fireEvent.keyDown(field, { key: "Enter" });

      await waitFor(() => expect(patches(calls)).toEqual([{ moods: ["Gripping"] }]));
    });

    it("keeps a later change on screen when an earlier one fails", async () => {
      let release: () => void = () => {};
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      let first = true;
      await open(book({ id: "b1", title: "Ash", status: "read", rating: 2 }), {
        onPatch: ({ body }) => {
          if (first) {
            first = false;
            return { status: 500, body: { error: "Failed to update book" } };
          }
          return {
            body: { ...book({ id: "b1", title: "Ash", status: "read" }), ...(body as object) },
            wait: held,
          };
        },
      });

      fireEvent.click(screen.getByRole("button", { name: "Rate 3 out of 5" }));
      fireEvent.click(screen.getByRole("button", { name: "Yes" }));

      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Yes" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "Rate 2 out of 5" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      release();
    });

    it("keeps the same field's later change when an earlier one fails", async () => {
      let release: () => void = () => {};
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      let first = true;
      await open(book({ id: "b1", title: "Ash", status: "read", rating: 2 }), {
        onPatch: () => {
          if (first) {
            first = false;
            return { status: 500, body: { error: "Failed to update book" } };
          }
          return { body: book({ id: "b1", title: "Ash", status: "read", rating: 5 }), wait: held };
        },
      });

      fireEvent.click(screen.getByRole("button", { name: "Rate 3 out of 5" }));
      fireEvent.click(screen.getByRole("button", { name: "Rate 5 out of 5" }));

      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Rate 5 out of 5" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      release();
    });

    it("shows the server's own words for a refused save", async () => {
      await open(book({ id: "b1", title: "Ash", status: "read" }), {
        onPatch: () => ({ status: 404, body: { error: "Book not found" } }),
      });

      fireEvent.click(screen.getByRole("button", { name: "Rate 4 out of 5" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Book not found");
    });

    it("puts the focus back in the panel after Undo and after Retry", async () => {
      let failing = false;
      await open(book({ id: "b1", title: "Ash", status: "read" }), {
        onPatch: () =>
          failing ? { status: 500, body: { error: "Failed to update book" } } : undefined,
      });

      fireEvent.click(screen.getByRole("button", { name: "Rate 4 out of 5" }));
      const undo = await screen.findByRole("button", { name: "Undo" });
      undo.focus();
      fireEvent.click(undo);
      expect(screen.getByRole("dialog", { name: "Ash" })).toHaveFocus();

      failing = true;
      fireEvent.click(screen.getByRole("button", { name: "Rate 2 out of 5" }));
      const retry = await screen.findByRole("button", { name: "Retry" });
      retry.focus();
      fireEvent.click(retry);
      expect(screen.getByRole("dialog", { name: "Ash" })).toHaveFocus();
    });

    it("says 0% when the log has no entry for the book", async () => {
      await open(book({ id: "b1", title: "Ash", status: "reading" }));

      expect(await screen.findByRole("progressbar", { name: "Progress" })).toHaveAttribute(
        "aria-valuetext",
        "0% read",
      );
    });

    describe("dates", () => {
      it("ignores a year outside 1900 to 2100", async () => {
        const calls = await open(book({ id: "b1", title: "Ash", status: "reading" }));

        fireEvent.click(screen.getByRole("button", { name: "Started: Pick a date" }));
        const input = screen.getByLabelText("Started");
        fireEvent.change(input, { target: { value: "1899-12-31" } });
        fireEvent.blur(input);
        await later(60);

        expect(patches(calls)).toEqual([]);

        fireEvent.click(screen.getByRole("button", { name: "Started: Pick a date" }));
        const edge = screen.getByLabelText("Started");
        fireEvent.change(edge, { target: { value: "1900-01-01" } });
        fireEvent.blur(edge);
        await waitFor(() => expect(patches(calls)).toEqual([{ startedAt: "1900-01-01" }]));
      });

      it("clears a date with its cross", async () => {
        const calls = await open(
          book({ id: "b1", title: "Ash", status: "read", finishedAt: "2026-10-20T00:00:00.000Z" }),
        );

        fireEvent.click(screen.getByRole("button", { name: "Finished: Clear the date" }));

        await waitFor(() => expect(patches(calls)).toEqual([{ finishedAt: null }]));
        expect(
          await screen.findByRole("button", { name: "Finished: Pick a date" }),
        ).toBeInTheDocument();
      });
    });

    it("refuses pages outside 1 to 10,000 and clears them when emptied", async () => {
      const calls = await open(book({ id: "b1", title: "Ash", pages: 300 }));
      const pages = screen.getByRole("spinbutton", { name: "Pages" });

      for (const wrong of ["0", "10001", "2.5"]) {
        fireEvent.focus(pages);
        fireEvent.change(pages, { target: { value: wrong } });
        fireEvent.blur(pages);
        expect(await screen.findByRole("alert")).toHaveTextContent(
          "A whole number from 1 to 10,000.",
        );
      }
      expect(patches(calls)).toEqual([]);

      fireEvent.focus(pages);
      fireEvent.change(pages, { target: { value: "10000" } });
      fireEvent.blur(pages);
      await waitFor(() => expect(patches(calls)).toEqual([{ pages: 10000 }]));

      fireEvent.focus(pages);
      fireEvent.change(pages, { target: { value: "" } });
      fireEvent.blur(pages);
      await waitFor(() => expect(patches(calls)).toEqual([{ pages: 10000 }, { pages: null }]));
    });

    describe("links", () => {
      it("asks for an http address", async () => {
        const calls = await open(book({ id: "b1", title: "Ash" }));

        fireEvent.click(screen.getByRole("button", { name: "link" }));
        fireEvent.change(screen.getByRole("textbox", { name: "Link" }), {
          target: { value: "bookmate.ru/ash" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Add" }));

        expect(screen.getByRole("alert")).toHaveTextContent("Start the link with https://");
        expect(patches(calls)).toEqual([]);
      });

      it("replaces a link with the same address instead of adding it twice", async () => {
        const url = "https://bookmate.ru/ash";
        const calls = await open(
          book({ id: "b1", title: "Ash", links: [{ kind: "paper", languages: ["uk"], url }] }),
        );

        fireEvent.click(screen.getByRole("button", { name: "link" }));
        choose(screen.getByRole("combobox", { name: "Type" }), "Online");
        fireEvent.change(screen.getByRole("textbox", { name: "Link" }), { target: { value: url } });
        fireEvent.click(screen.getByRole("button", { name: "language" }));
        fireEvent.click(screen.getByRole("checkbox", { name: /English/ }));
        fireEvent.click(screen.getByRole("button", { name: "Add" }));

        await waitFor(() =>
          expect(patches(calls)).toEqual([{ links: [{ kind: "online", languages: ["en"], url }] }]),
        );
      });

      it("closes only the language list, then only the form, with Escape", async () => {
        await open(book({ id: "b1", title: "Ash" }));

        fireEvent.click(screen.getByRole("button", { name: "link" }));
        fireEvent.click(screen.getByRole("button", { name: "language" }));
        fireEvent.keyDown(screen.getByRole("searchbox", { name: "Find a language" }), {
          key: "Escape",
        });
        expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
        expect(screen.getByRole("textbox", { name: "Link" })).toBeInTheDocument();

        fireEvent.keyDown(screen.getByRole("textbox", { name: "Link" }), { key: "Escape" });
        expect(screen.queryByRole("textbox", { name: "Link" })).not.toBeInTheDocument();
        await later(60);
        expect(router.back).not.toHaveBeenCalled();
      });
    });

    describe("delete", () => {
      it("says so when the book could not be deleted", async () => {
        await open(book({ id: "b1", title: "Ash" }), {
          onDelete: () => ({ status: 500, body: { error: "Failed to delete book" } }),
        });

        fireEvent.click(screen.getByRole("button", { name: "Delete book" }));
        fireEvent.click(
          within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }),
        );

        expect(await screen.findByRole("alert")).toHaveTextContent(
          "Could not delete the book. Try again.",
        );
        expect(router.back).not.toHaveBeenCalled();
      });

      it("sends one delete however often Delete is pressed", async () => {
        let release: () => void = () => {};
        const held = new Promise<void>((resolve) => {
          release = resolve;
        });
        const calls = await open(book({ id: "b1", title: "Ash" }), {
          onDelete: () => ({ status: 204, wait: held }),
        });

        fireEvent.click(screen.getByRole("button", { name: "Delete book" }));
        const remove = within(screen.getByRole("alertdialog")).getByRole("button", {
          name: "Delete",
        });
        fireEvent.click(remove);
        await waitFor(() => expect(remove).toBeDisabled());
        fireEvent.click(remove);
        release();

        await waitFor(() => expect(router.back).toHaveBeenCalledOnce());
        expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(1);
      });
    });

    describe("cover", () => {
      it("takes a cover from Google Books and searches only once", async () => {
        const calls = await open(book({ id: "b1", title: "Ash", author: "A. Writer" }), {
          covers: ["https://books.google/one.jpg", "https://books.google/two.jpg"],
        });

        fireEvent.click(screen.getByRole("button", { name: "Change cover" }));
        fireEvent.click(await screen.findByRole("button", { name: "Use cover 2" }));

        await waitFor(() =>
          expect(patches(calls)).toEqual([{ coverUrl: "https://books.google/two.jpg" }]),
        );
        expect(screen.getByRole("img", { name: "Powered by Google" })).toBeInTheDocument();
        await later(60);
        expect(calls.filter((call) => call.path.startsWith("/api/books/search"))).toEqual([
          { method: "GET", path: "/api/books/search?q=Ash%20A.%20Writer", body: undefined },
        ]);
        expect(screen.getByRole("button", { name: "Use cover 1" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Use cover 2" })).not.toBeInTheDocument();
      });

      it("takes a cover by its address and checks it", async () => {
        const calls = await open(book({ id: "b1", title: "Ash" }));

        fireEvent.click(screen.getByRole("button", { name: "Change cover" }));
        const field = screen.getByRole("textbox", { name: "Cover link" });
        fireEvent.change(field, { target: { value: "cover.jpg" } });
        fireEvent.click(screen.getByRole("button", { name: "Use" }));
        expect(screen.getByRole("alert")).toHaveTextContent("Start the link with https://");

        fireEvent.change(field, { target: { value: "https://example.com/cover.jpg" } });
        fireEvent.keyDown(field, { key: "Enter" });
        await waitFor(() =>
          expect(patches(calls)).toEqual([{ coverUrl: "https://example.com/cover.jpg" }]),
        );
      });

      it("goes back to a plain cover", async () => {
        const calls = await open(
          book({ id: "b1", title: "Ash", coverUrl: "https://example.com/old.jpg" }),
        );

        fireEvent.click(screen.getByRole("button", { name: "Change cover" }));
        fireEvent.click(screen.getByRole("button", { name: "Plain cover" }));

        await waitFor(() => expect(patches(calls)).toEqual([{ coverUrl: null }]));
        expect(screen.getByRole("button", { name: "Plain cover" })).toBeDisabled();
      });

      it("says when Google Books cannot be reached and keeps the other ways", async () => {
        await open(book({ id: "b1", title: "Ash" }), { covers: "down" });

        fireEvent.click(screen.getByRole("button", { name: "Change cover" }));

        expect(
          await screen.findByText(
            "Could not reach Google Books. A link or a plain cover still works.",
          ),
        ).toBeInTheDocument();
        expect(screen.getByRole("textbox", { name: "Cover link" })).toBeInTheDocument();
      });
    });
  });
});
