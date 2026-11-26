import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { booksResponse, mockApi, renderApp, type Call } from "@/test/helpers";
import { useBooks } from "@/lib/books";
import { resetLocale, setLocale } from "@/lib/i18n";
import { localDate, type HomeStats } from "@/lib/stats";
import { Dashboard } from "./dashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

function emptyMonths() {
  return Array.from({ length: 12 }, (_, index) => ({ month: index + 1, books: [] }));
}

function emptyStats(overrides: Partial<HomeStats> = {}): HomeStats {
  return {
    year: 2026,
    readCount: 0,
    pagesRead: 0,
    waitingOnShelf: 0,
    seriesComplete: { complete: 0, of: 0 },
    yearGoal: null,
    readPerMonth: emptyMonths(),
    currentlyReading: [],
    genres: [],
    waitingForContinuation: [],
    veryMuch: [],
    quoteOfTheDay: null,
    newOnShelf: [],
    ...overrides,
  };
}

const PRIORY = {
  id: "priory",
  title: "The Priory of the Orange Tree",
  author: "Samantha Shannon",
  format: "paper" as const,
  series: { id: "roots", title: "Roots of Chaos", number: 1 },
  pages: 400,
  startedAt: "2026-10-03T00:00:00.000Z",
  progress: { percent: 50, page: 200, date: "2026-11-20T10:00:00.000Z" },
};

function fullStats(overrides: Partial<HomeStats> = {}): HomeStats {
  const months = emptyMonths() as HomeStats["readPerMonth"];
  months[8] = {
    month: 9,
    books: [
      {
        id: "onyx",
        title: "Onyx Storm",
        author: "Rebecca Yarros",
        format: "paper",
        series: { id: "empyrean", title: "Empyrean", number: 3 },
        rating: 5,
        finishedAt: "2026-09-10T00:00:00.000Z",
      },
      {
        id: "moon",
        title: "Flawless Moon",
        author: "A. Writer",
        format: "ebook",
        finishedAt: "2026-09-20T00:00:00.000Z",
      },
    ],
  };
  months[3] = {
    month: 4,
    books: [
      {
        id: "jane",
        title: "Jane Eyre",
        author: "Charlotte Brontë",
        format: "audio",
        finishedAt: "2026-04-02T00:00:00.000Z",
      },
    ],
  };

  return emptyStats({
    readCount: 9,
    pagesRead: 3420,
    waitingOnShelf: 4,
    seriesComplete: { complete: 1, of: 4 },
    yearGoal: { year: 2026, target: 24, done: 9, percent: 38, weeksLeft: 6 },
    readPerMonth: months,
    currentlyReading: [PRIORY],
    genres: [
      { name: "Fantasy", count: 6 },
      { name: "Cosy mystery", count: 2 },
    ],
    waitingForContinuation: [
      {
        series: { id: "roots", title: "Roots of Chaos" },
        number: 4,
        expectedYear: 2027,
        source: "fantlab",
      },
      { series: { id: "empyrean", title: "Empyrean" }, number: 4 },
    ],
    veryMuch: [
      {
        type: "series",
        group: "continue",
        id: "roots",
        title: "Roots of Chaos",
        owned: 2,
        total: 6,
      },
      { type: "series", group: "new", id: "court", title: "A Court of Thorns", owned: 0, total: 5 },
      { type: "book", id: "flame", title: "Flame in the Dark", author: "B. Writer" },
    ],
    quoteOfTheDay: {
      text: "Sometimes you have to survive the longest night.",
      page: 214,
      book: { id: "priory", title: "The Priory of the Orange Tree" },
    },
    newOnShelf: Array.from({ length: 6 }, (_, index) => ({
      id: `new-${index}`,
      title: `New ${index}`,
      author: "An author",
      format: "paper" as const,
    })),
    ...overrides,
  });
}

function serve(
  stats: HomeStats,
  extra: (call: Call) => { status?: number; body?: unknown } | undefined = () => undefined,
) {
  return mockApi((call) => {
    if (call.path === "/api/stats") return { body: stats };
    return extra(call);
  });
}

function statsLoads(calls: Call[]) {
  return calls.filter((call) => call.path === "/api/stats").length;
}

async function renderHome() {
  renderApp(<Dashboard />);
  await screen.findByRole("heading", { name: "Currently reading" });
}

function useWideScreen() {
  vi.mocked(window.matchMedia).mockImplementation(
    (query: string) =>
      ({
        matches: query === "(min-width: 48rem)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList,
  );
}

describe("Home after sign-in", () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => resetLocale());
  });

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

  it("shows a status line while the numbers load", async () => {
    let release = () => {};
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    mockApi((call) => (call.path === "/api/stats" ? { body: fullStats(), wait } : undefined));
    renderApp(<Dashboard />);

    expect(await screen.findByRole("status")).toHaveTextContent("Loading your shelf…");
    release();
    expect(await screen.findByRole("heading", { name: "Currently reading" })).toBeInTheDocument();
  });

  it("shows the four tiles with this year's numbers", async () => {
    serve(fullStats());
    await renderHome();

    const tiles = screen
      .getAllByRole("listitem")
      .slice(0, 4)
      .map((tile) => tile.textContent);
    expect(tiles).toEqual([
      "9Read in 2026",
      "3,420Pages this year",
      "4Waiting on the shelf",
      "1 of 4Series complete",
    ]);
  });

  it("shows the book being read with its series, author, progress and start", async () => {
    serve(fullStats());
    await renderHome();
    const reading = screen.getByRole("region", { name: "Currently reading" });

    expect(within(reading).getByRole("link", { name: PRIORY.title })).toHaveAttribute(
      "href",
      "/books/priory",
    );
    expect(within(reading).getByText("Roots of Chaos #1 · Samantha Shannon")).toBeInTheDocument();
    expect(within(reading).getByRole("progressbar", { name: "50% done" })).toHaveAttribute(
      "aria-valuenow",
      "50",
    );
    expect(within(reading).getByText("started 3 Oct")).toBeInTheDocument();
  });

  it("saves the page entered in Where are you now and reloads the numbers", async () => {
    const calls = serve(fullStats(), (call) =>
      call.method === "POST" && call.path === "/api/progress"
        ? { status: 201, body: {} }
        : undefined,
    );
    await renderHome();

    fireEvent.click(screen.getByRole("button", { name: "Mark page" }));
    const dialog = screen.getByRole("dialog", { name: "Where are you now?" });
    fireEvent.change(within(dialog).getByLabelText("Page"), { target: { value: "260" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(calls).toContainEqual({
        method: "POST",
        path: "/api/progress",
        body: { bookId: "priory", page: 260 },
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(statsLoads(calls)).toBe(2));
  });

  it("adds the quick steps to the page, stops at the last page, and converts to a percent", async () => {
    const calls = serve(fullStats(), (call) =>
      call.method === "POST" && call.path === "/api/progress"
        ? { status: 201, body: {} }
        : undefined,
    );
    await renderHome();

    fireEvent.click(screen.getByRole("button", { name: "Mark page" }));
    const dialog = screen.getByRole("dialog", { name: "Where are you now?" });
    const page = within(dialog).getByLabelText("Page");

    fireEvent.click(within(dialog).getByRole("button", { name: "Add 50" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Add 25" }));
    expect(page).toHaveValue(275);

    fireEvent.change(page, { target: { value: "390" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add 50" }));
    expect(page).toHaveValue(400);

    fireEvent.click(within(dialog).getByRole("radio", { name: "Percent" }));
    expect(within(dialog).getByLabelText("Percent")).toHaveValue(100);
    fireEvent.change(within(dialog).getByLabelText("Percent"), { target: { value: "70" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(calls).toContainEqual({
        method: "POST",
        path: "/api/progress",
        body: { bookId: "priory", percent: 70 },
      }),
    );
  });

  it("refuses to save a page past the end of the book", async () => {
    serve(fullStats());
    await renderHome();

    fireEvent.click(screen.getByRole("button", { name: "Mark page" }));
    const dialog = screen.getByRole("dialog", { name: "Where are you now?" });
    fireEvent.change(within(dialog).getByLabelText("Page"), { target: { value: "401" } });

    expect(within(dialog).getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("asks an audiobook for a percent only and names its buttons for listening", async () => {
    const audiobook = {
      ...PRIORY,
      id: "audio",
      format: "audio" as const,
      progress: { percent: 40, date: "2026-11-20T10:00:00.000Z" },
    };
    const calls = serve(fullStats({ currentlyReading: [audiobook] }), (call) =>
      call.method === "POST" ? { status: 201, body: {} } : undefined,
    );
    await renderHome();

    expect(screen.getByRole("button", { name: "Listened" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mark progress" }));
    const dialog = screen.getByRole("dialog", { name: "Where are you now?" });

    expect(within(dialog).queryByRole("radio")).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText("Percent")).toHaveValue(40);
    fireEvent.click(within(dialog).getByRole("button", { name: "Add 10%" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(calls).toContainEqual({
        method: "POST",
        path: "/api/progress",
        body: { bookId: "audio", percent: 50 },
      }),
    );
  });

  it("finishes a book with a 100% entry, then marks it read on the reader's local day", async () => {
    const calls = serve(fullStats(), (call) => {
      if (call.method === "POST" && call.path === "/api/progress") return { status: 201, body: {} };
      if (call.method === "PATCH" && call.path === "/api/books/priory") return { body: {} };
    });
    await renderHome();

    fireEvent.click(screen.getByRole("button", { name: "Finished" }));

    await waitFor(() => expect(calls.some((call) => call.method === "PATCH")).toBe(true));
    const writes = calls.filter((call) => call.method !== "GET");
    expect(writes).toEqual([
      { method: "POST", path: "/api/progress", body: { bookId: "priory", percent: 100 } },
      {
        method: "PATCH",
        path: "/api/books/priory",
        body: { status: "read", finishedAt: localDate() },
      },
    ]);
    await waitFor(() => expect(statsLoads(calls)).toBe(2));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Currently reading" })).toHaveFocus(),
    );
  });

  it("says what went wrong when finishing fails, translated", async () => {
    act(() => setLocale("ru"));
    const calls = serve(fullStats(), (call) => {
      if (call.method === "POST") return { status: 201, body: {} };
      if (call.method === "PATCH") return { status: 500, body: { error: "Failed to update book" } };
    });
    renderApp(<Dashboard />);
    await screen.findByRole("heading", { name: "Сейчас читаю" });

    fireEvent.click(screen.getByRole("button", { name: "Дочитано" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось обновить книгу");
    expect(screen.getByRole("button", { name: "Дочитано" })).toBeEnabled();
    await waitFor(() => expect(statsLoads(calls)).toBe(2));
  });

  it("closes Where are you now on Escape or a click outside, and gives focus back to its button", async () => {
    useWideScreen();
    serve(fullStats());
    await renderHome();
    const trigger = screen.getByRole("button", { name: "Mark page" });

    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Where are you now?" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-controls", dialog.id);
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Where are you now?" })).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByRole("heading", { name: "Welcome back" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("draws the goal ring with the share done and the weeks left", async () => {
    serve(fullStats());
    await renderHome();

    expect(screen.getByRole("img", { name: "2026 goal: 9 of 24 books, 38%" })).toBeInTheDocument();
    expect(screen.getByText("38% · 6 weeks left in the year")).toBeInTheDocument();
  });

  it("changes the goal with the quick choice and steps, shows the pace and saves it", async () => {
    const calls = serve(fullStats(), (call) =>
      call.method === "PUT" ? { body: { yearGoal: { year: 2026, books: 37 } } } : undefined,
    );
    await renderHome();

    fireEvent.click(screen.getByRole("button", { name: "Change goal" }));
    const dialog = screen.getByRole("dialog", { name: "2026 goal" });
    const field = within(dialog).getByLabelText("Books in 2026");
    expect(field).toHaveValue(24);

    fireEvent.click(within(dialog).getByRole("button", { name: "36" }));
    expect(within(dialog).getByRole("button", { name: "36" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "One book more" }));
    expect(field).toHaveValue(37);
    expect(
      within(dialog).getByText("28 books left in 6 weeks, about 5 a week"),
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(calls).toContainEqual({
        method: "PUT",
        path: "/api/year-goal",
        body: { year: 2026, books: 37 },
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("says the goal is reached once the target is not above the books read, and stops at one book", async () => {
    serve(fullStats());
    await renderHome();

    fireEvent.click(screen.getByRole("button", { name: "Change goal" }));
    const dialog = screen.getByRole("dialog", { name: "2026 goal" });
    fireEvent.change(within(dialog).getByLabelText("Books in 2026"), { target: { value: "9" } });

    expect(within(dialog).getByText("Goal reached")).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText("Books in 2026"), { target: { value: "1" } });
    expect(within(dialog).getByRole("button", { name: "One book fewer" })).toBeDisabled();
  });

  it("keeps the goal editor open with the server's error when saving fails", async () => {
    act(() => setLocale("uk"));
    serve(fullStats(), (call) =>
      call.method === "PUT"
        ? { status: 500, body: { error: "Failed to save the goal" } }
        : undefined,
    );
    renderApp(<Dashboard />);
    await screen.findByRole("heading", { name: "Зараз читаю" });

    fireEvent.click(screen.getByRole("button", { name: "Змінити ціль" }));
    const dialog = screen.getByRole("dialog", { name: "Ціль на 2026" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Зберегти" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Не вдалося зберегти ціль");
    expect(within(dialog).getByRole("button", { name: "Зберегти" })).toBeEnabled();
  });

  it("keeps Where are you now open with the server's error when saving fails", async () => {
    serve(fullStats(), (call) =>
      call.method === "POST"
        ? { status: 500, body: { error: "Failed to save progress" } }
        : undefined,
    );
    await renderHome();

    fireEvent.click(screen.getByRole("button", { name: "Mark page" }));
    const dialog = screen.getByRole("dialog", { name: "Where are you now?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Failed to save progress");
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("offers to set a goal when there is none for this year", async () => {
    const calls = serve(fullStats({ yearGoal: null }), (call) =>
      call.method === "PUT" ? { body: { yearGoal: { year: 2026, books: 24 } } } : undefined,
    );
    await renderHome();

    expect(screen.getByText("No goal for 2026 yet.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Set a goal" }));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "2026 goal" })).getByRole("button", {
        name: "Save",
      }),
    );

    await waitFor(() =>
      expect(calls).toContainEqual({
        method: "PUT",
        path: "/api/year-goal",
        body: { year: 2026, books: 24 },
      }),
    );
  });

  it("opens a month's books from its bar with a click, the keyboard or the mouse, and closes on Escape", async () => {
    serve(fullStats());
    await renderHome();
    const chart = screen.getByRole("region", { name: "Read per month" });

    expect(
      within(chart)
        .getAllByRole("button")
        .map((bar) => bar.getAttribute("aria-label")),
    ).toEqual(["April, 1 book", "September, 2 books"]);

    const september = within(chart).getByRole("button", { name: "September, 2 books" });
    fireEvent.click(september);
    const card = within(chart).getByRole("region", { name: "September · 2 books" });
    expect(september).toHaveAttribute("aria-controls", card.id);
    expect(within(card).getByRole("link", { name: "Onyx Storm" })).toHaveAttribute(
      "href",
      "/books/onyx",
    );
    expect(within(card).getByText(/Empyrean #3/)).toBeInTheDocument();
    expect(within(card).getByRole("img", { name: "Rated 5 out of 5" })).toBeInTheDocument();

    fireEvent.keyDown(september, { key: "Escape" });
    expect(within(chart).queryByRole("region")).not.toBeInTheDocument();

    const april = within(chart).getByRole("button", { name: "April, 1 book" });
    fireEvent.pointerEnter(april.closest("li")!, { pointerType: "mouse" });
    expect(within(chart).getByRole("region", { name: "April · 1 book" })).toBeInTheDocument();
    fireEvent.pointerLeave(april.closest("ul")!.parentElement!, { pointerType: "mouse" });
    await waitFor(() => expect(within(chart).queryByRole("region")).not.toBeInTheDocument());
  });

  it("keeps a month's card open while the mouse moves from its bar to the card, and pins it on a click", async () => {
    serve(fullStats());
    await renderHome();
    const chart = screen.getByRole("region", { name: "Read per month" });
    const september = within(chart).getByRole("button", { name: "September, 2 books" });
    const area = september.closest("ul")!.parentElement!;

    fireEvent.pointerEnter(september.closest("li")!, { pointerType: "mouse" });
    fireEvent.pointerLeave(area, { pointerType: "mouse" });
    fireEvent.pointerEnter(area, { pointerType: "mouse" });
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(within(chart).getByRole("region", { name: "September · 2 books" })).toBeInTheDocument();

    fireEvent.click(september);
    expect(september).toHaveAttribute("aria-expanded", "true");
    fireEvent.pointerLeave(area, { pointerType: "mouse" });
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(within(chart).getByRole("region", { name: "September · 2 books" })).toBeInTheDocument();

    fireEvent.click(september);
    expect(within(chart).queryByRole("region")).not.toBeInTheDocument();

    fireEvent.click(september);
    fireEvent.pointerDown(screen.getByRole("heading", { name: "Welcome back" }));
    expect(within(chart).queryByRole("region")).not.toBeInTheDocument();
  });

  it("opens a month's books with one tap on a touch screen", async () => {
    serve(fullStats());
    await renderHome();
    const chart = screen.getByRole("region", { name: "Read per month" });
    const april = within(chart).getByRole("button", { name: "April, 1 book" });

    fireEvent.pointerEnter(april.closest("li")!, { pointerType: "touch" });
    fireEvent.click(april);

    expect(within(chart).getByRole("region", { name: "April · 1 book" })).toBeInTheDocument();
  });

  it("lists genres, continuations and the very much wishlist with their links", async () => {
    serve(fullStats());
    await renderHome();

    const genres = screen.getByRole("region", { name: "Genres on the shelf" });
    expect(
      within(genres)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Fantasy6", "Cosy mystery2"]);

    const waiting = screen.getByRole("region", { name: "Waiting for continuation" });
    const [roots, empyrean] = within(waiting).getAllByRole("listitem");
    expect(within(roots).getByRole("link", { name: "Roots of Chaos #4" })).toHaveAttribute(
      "href",
      "/series/roots",
    );
    expect(roots).toHaveTextContent("according to FantLab");
    expect(roots).toHaveTextContent("2027+");
    expect(empyrean).toHaveTextContent("no release info");

    const veryMuch = screen.getByRole("region", { name: "Very much" });
    expect(within(veryMuch).getByRole("link", { name: "Whole wishlist" })).toHaveAttribute(
      "href",
      "/wishlist",
    );
    expect(within(veryMuch).getByRole("img", { name: "Own 2 of 6" })).toBeInTheDocument();
    expect(within(veryMuch).getByRole("link", { name: /A Court of Thorns/ })).toHaveTextContent(
      "new series · 5 books",
    );
    expect(within(veryMuch).getByRole("link", { name: /Flame in the Dark/ })).toHaveAttribute(
      "href",
      "/books/flame",
    );
  });

  it("shows the quote of the day and the newest books on the shelf", async () => {
    serve(fullStats());
    await renderHome();

    const quote = screen.getByRole("region", { name: "Quote of the day" });
    expect(within(quote).getByText(/survive the longest night/)).toBeInTheDocument();
    expect(quote).toHaveTextContent("The Priory of the Orange Tree · p. 214");

    const shelf = screen.getByRole("region", { name: "New on the shelf" });
    expect(within(shelf).getByRole("link", { name: "Whole library" })).toHaveAttribute(
      "href",
      "/library",
    );
    expect(within(shelf).getByRole("link", { name: "New 0" })).toHaveAttribute(
      "href",
      "/books/new-0",
    );
  });

  it("says what each block is waiting for on an empty shelf", async () => {
    serve(emptyStats());
    await renderHome();

    for (const text of [
      "You are not reading anything right now.",
      "No goal for 2026 yet.",
      "No books finished in 2026 yet.",
      "No genres on the shelf yet.",
      "No series is waiting for its next book.",
      "Nothing on the wishlist is marked as very much.",
      "No saved quotes yet.",
      "The shelf is empty.",
    ]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "Open the library" })).toHaveAttribute(
      "href",
      "/library",
    );
    expect(screen.getByRole("link", { name: "Add a book" })).toHaveAttribute("href", "/add");
    expect(screen.queryByRole("button", { name: /, \d+ book/ })).not.toBeInTheDocument();
  });

  it("translates a failed load and loads again on Try again", async () => {
    act(() => setLocale("ru"));
    let failing = true;
    mockApi((call) => {
      if (call.path !== "/api/stats") return undefined;
      return failing
        ? { status: 500, body: { error: "Failed to fetch stats" } }
        : { body: fullStats() };
    });
    renderApp(<Dashboard />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Главная не загрузилась");
    expect(alert).toHaveTextContent("Не удалось загрузить статистику");

    failing = false;
    fireEvent.click(within(alert).getByRole("button", { name: "Попробовать снова" }));
    expect(await screen.findByRole("heading", { name: "Сейчас читаю" })).toBeInTheDocument();
  });

  it("speaks Russian with plural forms and no gendered verbs", async () => {
    act(() => setLocale("ru"));
    serve(fullStats());
    renderApp(<Dashboard />);
    await screen.findByRole("heading", { name: "Сейчас читаю" });

    expect(screen.getByText("Прочитано в 2026")).toBeInTheDocument();
    expect(screen.getByText("38% · до конца года 6 недель")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Сентябрь, 2 книги" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Апрель, 1 книга" })).toBeInTheDocument();
  });

  it("lets the goal field be cleared and typed again, and rounds the pace up", async () => {
    const calls = serve(fullStats(), (call) =>
      call.method === "PUT" ? { body: { yearGoal: { year: 2026, books: 40 } } } : undefined,
    );
    await renderHome();

    fireEvent.click(screen.getByRole("button", { name: "Change goal" }));
    const dialog = screen.getByRole("dialog", { name: "2026 goal" });
    const field = within(dialog).getByLabelText("Books in 2026");

    fireEvent.change(field, { target: { value: "" } });
    expect(field).toHaveValue(null);
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeDisabled();

    fireEvent.change(field, { target: { value: "4" } });
    fireEvent.change(field, { target: { value: "40" } });
    expect(field).toHaveValue(40);
    expect(
      within(dialog).getByText("31 books left in 6 weeks, about 6 a week"),
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: "PUT",
        path: "/api/year-goal",
        body: { year: 2026, books: 40 },
      }),
    );
  });

  it("saves a goal above 1,000 as 1,000 and one below 1 as 1", async () => {
    const calls = serve(fullStats(), (call) =>
      call.method === "PUT" ? { body: { yearGoal: { year: 2026, books: 1 } } } : undefined,
    );
    await renderHome();

    for (const [typed, saved] of [
      ["2000", 1000],
      ["0", 1],
    ] as const) {
      fireEvent.click(screen.getByRole("button", { name: "Change goal" }));
      const dialog = screen.getByRole("dialog", { name: "2026 goal" });
      fireEvent.change(within(dialog).getByLabelText("Books in 2026"), {
        target: { value: typed },
      });
      fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
      await waitFor(() =>
        expect(calls).toContainEqual({
          method: "PUT",
          path: "/api/year-goal",
          body: { year: 2026, books: saved },
        }),
      );
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    }
  });

  it("names a one-book goal in the singular", async () => {
    serve(fullStats({ yearGoal: { year: 2026, target: 1, done: 1, percent: 100, weeksLeft: 6 } }));
    await renderHome();

    expect(screen.getByRole("img", { name: "2026 goal: 1 of 1 book, 100%" })).toBeInTheDocument();
  });

  it("holds Save while the goal and the page are being saved", async () => {
    let release = () => {};
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    serve(fullStats(), (call) => {
      if (call.method === "PUT") return { body: { yearGoal: { year: 2026, books: 24 } }, wait };
      if (call.method === "POST") return { status: 201, body: {}, wait };
    });
    await renderHome();

    fireEvent.click(screen.getByRole("button", { name: "Change goal" }));
    const goal = screen.getByRole("dialog", { name: "2026 goal" });
    fireEvent.click(within(goal).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(within(goal).getByRole("button", { name: "Save" })).toBeDisabled());
    fireEvent.click(within(goal).getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByRole("button", { name: "Mark page" }));
    const where = screen.getByRole("dialog", { name: "Where are you now?" });
    fireEvent.click(within(where).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(within(where).getByRole("button", { name: "Save" })).toBeDisabled());
    expect(within(where).getByRole("button", { name: "Finished" })).toBeDisabled();

    release();
  });

  it("finishes a book once, holding both of its buttons until the first finish is done", async () => {
    let release = () => {};
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    const calls = serve(fullStats(), (call) => {
      if (call.method === "POST") return { status: 201, body: {}, wait };
      if (call.method === "PATCH") return { body: {} };
    });
    await renderHome();
    const finished = screen.getByRole("button", { name: "Finished" });
    const markPage = screen.getByRole("button", { name: "Mark page" });

    fireEvent.click(finished);
    await waitFor(() => expect(finished).toBeDisabled());
    expect(markPage).toBeDisabled();
    fireEvent.click(finished);
    fireEvent.click(markPage);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    release();
    await waitFor(() => expect(calls.filter((call) => call.method === "PATCH")).toHaveLength(1));
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(1);
  });

  it("reloads the library after progress is saved, so its lists agree with Home", async () => {
    const calls = serve(fullStats(), (call) => {
      if (call.path.startsWith("/api/books?")) return booksResponse([]);
      if (call.method === "POST") return { status: 201, body: {} };
    });
    function LibraryUser() {
      useBooks();
      return null;
    }
    renderApp(
      <>
        <Dashboard />
        <LibraryUser />
      </>,
    );
    await screen.findByRole("heading", { name: "Currently reading" });
    const libraryLoads = () => calls.filter((call) => call.path.startsWith("/api/books?")).length;
    await waitFor(() => expect(libraryLoads()).toBe(1));

    fireEvent.click(screen.getByRole("button", { name: "Mark page" }));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Where are you now?" })).getByRole("button", {
        name: "Save",
      }),
    );

    await waitFor(() => expect(libraryLoads()).toBe(2));
  });

  it("points the phone sheet's button at the sheet's content", async () => {
    serve(fullStats());
    await renderHome();
    const trigger = screen.getByRole("button", { name: "Mark page" });

    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Where are you now?" });
    const controlled = document.getElementById(trigger.getAttribute("aria-controls") ?? "");

    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(controlled).not.toBeNull();
    expect(dialog).toContainElement(controlled);
  });

  it("draws owned books first in a very much series", async () => {
    serve(fullStats());
    await renderHome();
    const bar = screen.getByRole("img", { name: "Own 2 of 6" });
    const states = [...bar.querySelectorAll("[data-state]")].map((segment) =>
      segment.getAttribute("data-state"),
    );

    expect(states).toEqual(["owned", "owned", "missing", "missing", "missing", "missing"]);
  });

  it("keeps the fifth and sixth new covers for screens from 768 px", async () => {
    serve(fullStats());
    await renderHome();
    const covers = within(screen.getByRole("region", { name: "New on the shelf" })).getAllByRole(
      "listitem",
    );

    expect(covers.map((cover) => cover.classList.contains("hidden"))).toEqual([
      false,
      false,
      false,
      false,
      true,
      true,
    ]);
  });
});
