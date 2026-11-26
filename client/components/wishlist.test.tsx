import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { mockApi, renderApp, type Call } from "@/test/helpers";
import { useBookActions } from "@/lib/books";
import { resetLocale, setLocale } from "@/lib/i18n";
import type { WishlistBookRow, WishlistGroup, WishlistSeriesRow } from "@/lib/wishlist";
import { Wishlist } from "./wishlist";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

function MarkLooseRead() {
  const { updateBook } = useBookActions();
  return (
    <button type="button" onClick={() => void updateBook("loose", { status: "read" })}>
      Mark read elsewhere
    </button>
  );
}

function seriesRow(overrides: Partial<WishlistSeriesRow> = {}): WishlistSeriesRow {
  return {
    type: "series",
    id: "saga",
    title: "Saga of Ash",
    author: "A. Writer",
    status: "ongoing",
    desire: "high",
    segments: [
      { number: 1, state: "owned" },
      { number: 2, state: "owned" },
      { number: 3, state: "wanted" },
      { number: 4, state: "missing" },
    ],
    genres: ["Fantasy"],
    tropes: [],
    linkLanguages: ["uk"],
    linkKinds: ["ebook"],
    ...overrides,
  };
}

function bookRow(overrides: Partial<WishlistBookRow> = {}): WishlistBookRow {
  return {
    type: "book",
    id: "loose",
    title: "Loose Leaf",
    author: "Solo Person",
    desire: "someday",
    format: "paper",
    genres: ["Horror"],
    tropes: [],
    linkLanguages: [],
    linkKinds: [],
    ...overrides,
  };
}

const NEW_SERIES = seriesRow({
  id: "fresh",
  title: "Fresh Start",
  author: "B. Writer",
  desire: "normal",
  status: "complete",
  segments: [{ number: 1, state: "missing" }],
  genres: ["Romance"],
});

function groups(
  continuing = [seriesRow()],
  fresh = [NEW_SERIES],
  standalone = [bookRow()],
): WishlistGroup[] {
  return [
    { key: "continue", count: continuing.length, items: continuing },
    { key: "newSeries", count: fresh.length, items: fresh },
    { key: "standalone", count: standalone.length, items: standalone },
  ];
}

type Patch = { status?: number; wait?: Promise<unknown> };

function serve(list: WishlistGroup[] = groups(), patch: Patch = {}) {
  return mockApi((call) => {
    if (call.path === "/api/wishlist") return { body: { groups: list } };
    if (call.method === "PATCH") return { status: patch.status ?? 200, body: {}, wait: patch.wait };
    if (call.method === "GET") return { body: { books: [], series: [] } };
  });
}

function sectionOf(name: string) {
  return screen.getByRole("region", { name: new RegExp(`^${name}`) });
}

function rowTitles(name: string) {
  return within(sectionOf(name))
    .getAllByRole("heading", { level: 3 })
    .map((heading) => heading.textContent);
}

function patches(calls: Call[]) {
  return calls.filter((call) => call.method === "PATCH");
}

function wishlistReads(calls: Call[]) {
  return calls.filter((call) => call.path === "/api/wishlist").length;
}

function heldPatches(replies: Array<{ status: number; held: boolean }>) {
  const releases: Array<() => void> = [];
  let saves = 0;
  const calls = mockApi((call) => {
    if (call.path === "/api/wishlist") return { body: { groups: groups() } };
    if (call.method === "PATCH") {
      const reply = replies[saves];
      saves += 1;
      if (!reply.held) return { status: reply.status, body: {} };
      const wait = new Promise<void>((resolve) => releases.push(resolve));
      return { status: reply.status, body: {}, wait };
    }
    if (call.method === "GET") return { body: { books: [], series: [] } };
  });
  return { calls, release: (index: number) => releases[index]() };
}

async function settle() {
  await act(() => new Promise((resolve) => setTimeout(resolve, 500)));
}

describe("Wishlist", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/wishlist");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    act(() => resetLocale());
  });

  it("shows the three groups in the server's order, each row with a count, segments and a link", async () => {
    serve(groups([seriesRow(), seriesRow({ id: "second", title: "Second Saga" })]));
    renderApp(<Wishlist />);

    await screen.findByRole("heading", { name: "Continue a series" });

    expect(
      screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(["Continue a series", "New series", "Standalone books"]);
    expect(within(sectionOf("Continue a series")).getByText("2")).toBeInTheDocument();
    expect(rowTitles("Continue a series")).toEqual(["Saga of Ash", "Second Saga"]);
    expect(
      within(sectionOf("Continue a series")).getAllByRole("img", { name: "Own 2 of 4" }),
    ).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Saga of Ash, A. Writer" })).toHaveAttribute(
      "href",
      "/series/saga",
    );
    expect(screen.getByRole("link", { name: "Loose Leaf, Solo Person" })).toHaveAttribute(
      "href",
      "/books/loose",
    );
    expect(within(sectionOf("Standalone books")).queryByRole("img", { name: /Own/ })).toBeNull();
  });

  it("names each desire level on its pill", async () => {
    serve();
    renderApp(<Wishlist />);

    expect(
      await screen.findByRole("button", { name: "Desire: Very much. Tap to change" }),
    ).toHaveTextContent("Very much");
    expect(screen.getByRole("button", { name: "Desire: Want. Tap to change" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Desire: Someday. Tap to change" })).toBeVisible();
  });

  it("says what lands in a group that is empty while others are not", async () => {
    serve(groups([seriesRow()], [], [bookRow()]));
    renderApp(<Wishlist />);

    await screen.findByRole("heading", { name: "New series" });

    expect(within(sectionOf("New series")).getByText("0")).toBeInTheDocument();
    expect(
      within(sectionOf("New series")).getByText("Series you have no books of yet land here."),
    ).toBeInTheDocument();
  });

  it("shows one empty state with a way to add a book when nothing is wanted", async () => {
    serve(groups([], [], []));
    renderApp(<Wishlist />);

    expect(
      await screen.findByRole("heading", { name: "Your wishlist is empty" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add a book" })).toHaveAttribute("href", "/add");
    expect(screen.queryByRole("heading", { name: "Continue a series" })).toBeNull();
    expect(screen.queryByRole("searchbox")).toBeNull();
  });

  it("shows a loading state, then an error with a retry that loads the list again", async () => {
    let fail = true;
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const calls = mockApi((call) => {
      if (call.path !== "/api/wishlist") return undefined;
      return fail
        ? { status: 500, body: { error: "Request failed" }, wait: held }
        : { body: { groups: groups() } };
    });
    renderApp(<Wishlist />);

    expect(await screen.findByText("Loading your wishlist…")).toBeInTheDocument();
    release();
    expect(await screen.findByText("Could not load your wishlist")).toBeInTheDocument();

    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("heading", { name: "Saga of Ash" })).toBeInTheDocument();
    expect(wishlistReads(calls)).toBe(2);
  });

  it("narrows the rows by title or author, hides groups left empty and says when nothing matches", async () => {
    serve();
    renderApp(<Wishlist />);
    const search = await screen.findByRole("searchbox", { name: "Search the wishlist" });

    fireEvent.change(search, { target: { value: "solo" } });
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Loose Leaf",
    ]);
    expect(screen.queryByRole("heading", { name: "Continue a series" })).toBeNull();
    expect(within(sectionOf("Standalone books")).getByText("1")).toBeInTheDocument();
    expect(window.location.search).toBe("?q=solo");

    fireEvent.change(search, { target: { value: "fresh" } });
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Fresh Start",
    ]);

    fireEvent.change(search, { target: { value: "zzz" } });
    expect(screen.getByRole("heading", { name: "No books match" })).toBeInTheDocument();
  });

  it("filters through the library's panel, counts what will show and keeps the choice in the address", async () => {
    serve();
    renderApp(<Wishlist />);
    fireEvent.click(await screen.findByRole("button", { name: "Filters" }));

    const panel = screen.getByRole("dialog", { name: "Filters" });
    expect(
      within(panel)
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(["Genre", "Author", "Series status", "Link language", "Link type"]);

    fireEvent.click(within(panel).getByRole("button", { name: "Fantasy" }));
    fireEvent.click(within(panel).getByRole("button", { name: "Show 1 result" }));

    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Saga of Ash",
    ]);
    expect(window.location.search).toBe("?genre=Fantasy");
    expect(screen.getByRole("button", { name: "Filters · 1" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove filter Fantasy" }));
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
    expect(window.location.search).toBe("");
  });

  it("counts only rows that also match the search on the panel's button", async () => {
    serve();
    renderApp(<Wishlist />);
    fireEvent.change(await screen.findByRole("searchbox"), { target: { value: "solo" } });
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));

    expect(
      within(screen.getByRole("dialog", { name: "Filters" })).getByRole("button", {
        name: "Show 1 result",
      }),
    ).toBeInTheDocument();
  });

  it("filters a series by its own author", async () => {
    serve();
    renderApp(<Wishlist />);
    fireEvent.click(await screen.findByRole("button", { name: "Filters" }));
    const panel = screen.getByRole("dialog", { name: "Filters" });

    fireEvent.click(within(panel).getByRole("button", { name: "A. Writer" }));
    fireEvent.click(within(panel).getByRole("button", { name: "Show 1 result" }));

    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Saga of Ash",
    ]);
  });

  it("loads the wishlist again when a book is changed elsewhere in the app", async () => {
    const calls = serve();
    renderApp(
      <>
        <Wishlist />
        <MarkLooseRead />
      </>,
    );
    await screen.findByRole("heading", { name: "Loose Leaf" });

    fireEvent.click(screen.getByRole("button", { name: "Mark read elsewhere" }));

    await waitFor(() => expect(wishlistReads(calls)).toBe(2));
  });

  it("restores the search and filters from the address and ignores groups the page does not have", async () => {
    window.history.replaceState(null, "", "/wishlist?status=standalone&format=paper&q=leaf");
    serve();
    renderApp(<Wishlist />);

    expect(await screen.findByRole("searchbox", { name: "Search the wishlist" })).toHaveValue(
      "leaf",
    );
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Loose Leaf",
    ]);
    expect(screen.getByRole("button", { name: "Filters · 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove filter Standalone books" })).toBeVisible();
  });

  it("cycles the desire level at once and saves only the last one after the taps stop, keeping the order", async () => {
    const calls = serve();
    renderApp(<Wishlist />);
    const pill = await screen.findByRole("button", { name: "Desire: Very much. Tap to change" });

    fireEvent.click(pill);
    expect(pill).toHaveAccessibleName("Desire: Want. Tap to change");
    fireEvent.click(pill);
    expect(pill).toHaveAccessibleName("Desire: Someday. Tap to change");
    expect(patches(calls)).toHaveLength(0);

    await waitFor(() => expect(patches(calls)).toHaveLength(1));
    expect(patches(calls)[0]).toMatchObject({
      path: "/api/series/saga",
      body: { desire: "someday" },
    });
    await settle();

    expect(patches(calls)).toHaveLength(1);
    expect(wishlistReads(calls)).toBe(1);
    expect(pill).toHaveAccessibleName("Desire: Someday. Tap to change");
    expect(rowTitles("Continue a series")).toEqual(["Saga of Ash"]);
    expect(screen.getByText("Saga of Ash: Someday")).toBeInTheDocument();
  });

  it("goes from Someday back to Very much and saves a standalone book through the books endpoint", async () => {
    const calls = serve();
    renderApp(<Wishlist />);
    const pill = await screen.findByRole("button", { name: "Desire: Someday. Tap to change" });

    fireEvent.click(pill);

    expect(pill).toHaveAccessibleName("Desire: Very much. Tap to change");
    await waitFor(() => expect(patches(calls)).toHaveLength(1));
    expect(patches(calls)[0]).toMatchObject({ path: "/api/books/loose", body: { desire: "high" } });
  });

  it("puts the saved level back and says so when saving fails", async () => {
    serve(groups(), { status: 500 });
    renderApp(<Wishlist />);
    const pill = await screen.findByRole("button", { name: "Desire: Very much. Tap to change" });

    fireEvent.click(pill);
    expect(pill).toHaveAccessibleName("Desire: Want. Tap to change");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not change how much you want “Saga of Ash”. Try again.",
    );
    expect(pill).toHaveAccessibleName("Desire: Very much. Tap to change");
  });

  it("ignores a late failure of an older save once a newer one has succeeded", async () => {
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let saves = 0;
    const calls = mockApi((call) => {
      if (call.path === "/api/wishlist") return { body: { groups: groups() } };
      if (call.method === "PATCH") {
        saves += 1;
        return saves === 1 ? { status: 500, body: {}, wait: held } : { body: {} };
      }
      if (call.method === "GET") return { body: { books: [], series: [] } };
    });
    renderApp(<Wishlist />);
    const pill = await screen.findByRole("button", { name: "Desire: Very much. Tap to change" });

    fireEvent.click(pill);
    await waitFor(() => expect(patches(calls)).toHaveLength(1));
    fireEvent.click(pill);
    await waitFor(() => expect(patches(calls)).toHaveLength(2));
    await settle();
    release();
    await settle();

    expect(screen.queryByRole("alert")).toBeNull();
    expect(pill).toHaveAccessibleName("Desire: Someday. Tap to change");
  });

  it("keeps the newer level when an older save fails while another tap is still settling", async () => {
    const { calls, release } = heldPatches([
      { status: 500, held: true },
      { status: 200, held: false },
    ]);
    renderApp(<Wishlist />);
    const pill = await screen.findByRole("button", { name: "Desire: Very much. Tap to change" });

    fireEvent.click(pill);
    await waitFor(() => expect(patches(calls)).toHaveLength(1));
    fireEvent.click(pill);
    release(0);
    await act(() => Promise.resolve());

    expect(screen.queryByRole("alert")).toBeNull();
    expect(pill).toHaveAccessibleName("Desire: Someday. Tap to change");

    await waitFor(() => expect(patches(calls)).toHaveLength(2));
    await settle();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(pill).toHaveAccessibleName("Desire: Someday. Tap to change");
  });

  it("shows the level an older save confirmed when the newer one fails", async () => {
    const { calls, release } = heldPatches([
      { status: 200, held: true },
      { status: 500, held: false },
    ]);
    renderApp(<Wishlist />);
    const pill = await screen.findByRole("button", { name: "Desire: Very much. Tap to change" });

    fireEvent.click(pill);
    await waitFor(() => expect(patches(calls)).toHaveLength(1));
    fireEvent.click(pill);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    release(0);
    await settle();

    expect(patches(calls).map((call) => call.body)).toEqual([
      { desire: "normal" },
      { desire: "someday" },
    ]);
    expect(pill).toHaveAccessibleName("Desire: Want. Tap to change");
  });

  it("sends a change right away, kept alive, when the page is left before the taps settle", async () => {
    const calls = serve();
    const { unmount } = renderApp(<Wishlist />);
    fireEvent.click(await screen.findByRole("button", { name: "Desire: Want. Tap to change" }));

    unmount();

    expect(patches(calls)).toEqual([
      { method: "PATCH", path: "/api/series/fresh", body: { desire: "someday" } },
    ]);
    const sent = vi
      .mocked(fetch)
      .mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === "PATCH");
    expect((sent?.[1] as RequestInit).keepalive).toBe(true);
  });

  it("speaks Russian and Ukrainian", async () => {
    act(() => setLocale("ru"));
    serve();
    const { unmount } = renderApp(<Wishlist />);

    expect(await screen.findByRole("heading", { name: "Продолжить серию" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Отдельные книги" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Желание: Очень хочу. Нажми, чтобы сменить" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Поиск по вишлисту" })).toBeInTheDocument();
    unmount();

    act(() => setLocale("uk"));
    serve();
    renderApp(<Wishlist />);
    expect(await screen.findByRole("heading", { name: "Нові серії" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Бажання: Колись. Натисни, щоб змінити" }),
    ).toBeInTheDocument();
  });
});
