import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { book, choose, mockApi, renderApp, series, type Call } from "@/test/helpers";
import type { Book } from "@/lib/books";
import { BookPanel } from "./book-panel";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

const saga = series({ id: "saga", title: "Saga of Ash" });

type Reply = { status?: number; body?: unknown; wait?: Promise<unknown> };

function serve(
  initial: Book,
  { percent, onPatch }: { percent?: number; onPatch?: (call: Call) => Reply | undefined } = {},
) {
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
      return { body: current };
    }
    if (method === "DELETE" && path === `/api/books/${initial.id}`) return { status: 204 };
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
    if (path.startsWith("/api/books/search")) return { body: { results: [] } };
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
  });

  afterEach(() => {
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

      expect(await screen.findByRole("status")).toHaveTextContent("Saved");
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
      expect(screen.getByRole("dialog", { name: "Ash" })).toBeInTheDocument();
      expect(router.back).not.toHaveBeenCalled();
    });
  });

  describe("states and closing", () => {
    it("says the book is not there when the API answers 404", async () => {
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

    it("names the series and number above the book, linking to the series", async () => {
      await open(
        book({
          id: "b1",
          title: "Ash",
          seriesId: "saga",
          seriesNumber: 1,
          annotation: "A series about ash.",
        }),
      );

      expect(await screen.findByRole("link", { name: "Saga of Ash #1" })).toHaveAttribute(
        "href",
        "/series/saga",
      );
      expect(screen.getByText("A series about ash.")).toBeInTheDocument();
      expect(screen.queryByRole("textbox", { name: "Annotation" })).not.toBeInTheDocument();
    });

    it("edits the annotation of a standalone book", async () => {
      const calls = await open(book({ id: "b1", title: "Ash" }));
      const area = screen.getByRole("textbox", { name: "Annotation" });

      fireEvent.focus(area);
      fireEvent.change(area, { target: { value: "A quiet book." } });
      fireEvent.blur(area);

      await waitFor(() => expect(patches(calls)).toEqual([{ annotation: "A quiet book." }]));
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
});
