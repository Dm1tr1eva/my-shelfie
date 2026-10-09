import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { SWRConfig } from "swr";
import { AuthProvider } from "@/lib/auth-context";
import { Dashboard } from "./dashboard";
import type { Book, BookStatus } from "@/lib/books";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const ALICE = { id: "1", email: "alice@example.com", name: "Alice" };

function jsonResponse(status: number, body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function book(id: string, title: string, status: BookStatus, rating?: number): Book {
  return {
    id,
    userId: "1",
    title,
    author: `Author of ${title}`,
    status,
    rating,
    createdAt: "",
    updatedAt: "",
  };
}

function renderDashboard(books: Book[]) {
  vi.mocked(fetch).mockImplementation((url) => {
    if (url === "/api/auth/me") return jsonResponse(200, ALICE);
    return jsonResponse(200, { books, total: books.length, page: 1, limit: 100 });
  });

  render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <AuthProvider>
        <Dashboard />
      </AuthProvider>
    </SWRConfig>,
  );
}

const SHELF = [
  book("1", "Dune", "read", 5),
  book("2", "Emma", "read", 4),
  book("3", "Ulysses", "reading"),
  book("4", "Beloved", "want"),
  book("5", "Walden", "dropped"),
];

describe("Dashboard", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the shelf's counts and average rating", async () => {
    renderDashboard(SHELF);

    const stats = (await screen.findByText("On the shelf")).closest("dl") as HTMLElement;
    const card = (label: string) => within(stats).getByText(label).parentElement as HTMLElement;

    expect(within(card("On the shelf")).getByText("5")).toBeInTheDocument();
    expect(within(card("Read")).getByText("2")).toBeInTheDocument();
    expect(within(card("Reading now")).getByText("1")).toBeInTheDocument();
    expect(within(card("Average rating")).getByText("4.5")).toBeInTheDocument();
  });

  it("lists the books being read under 'Currently reading'", async () => {
    renderDashboard(SHELF);

    const section = (await screen.findByRole("heading", { name: "Currently reading" }))
      .parentElement as HTMLElement;

    expect(within(section).getByText("Ulysses")).toBeInTheDocument();
    expect(within(section).queryByText("Dune")).not.toBeInTheDocument();
  });

  it("leaves out 'Currently reading' when nothing is being read", async () => {
    renderDashboard([book("1", "Dune", "read", 5)]);

    await screen.findByText("Dune");

    expect(screen.queryByRole("heading", { name: "Currently reading" })).not.toBeInTheDocument();
  });

  it("filters the library by status without asking the API again", async () => {
    renderDashboard(SHELF);
    await screen.findByText("Beloved");
    const callsBefore = vi.mocked(fetch).mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Want to read" }));

    const library = screen.getByRole("heading", { name: "Library" }).parentElement
      ?.parentElement as HTMLElement;
    expect(within(library).getByText("Beloved")).toBeInTheDocument();
    expect(within(library).queryByText("Emma")).not.toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls.length).toBe(callsBefore);
  });

  it("switches between a list and a grid, and remembers the choice", async () => {
    renderDashboard(SHELF);
    await screen.findByText("Beloved");

    expect(screen.getByRole("button", { name: "List" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Grid" }));

    expect(screen.getByRole("button", { name: "Grid" })).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem("my-shelfie:view")).toBe("grid");
  });

  it("opens in the grid when that was the last choice", async () => {
    localStorage.setItem("my-shelfie:view", "grid");

    renderDashboard(SHELF);
    await screen.findByText("Beloved");

    expect(screen.getByRole("button", { name: "Grid" })).toHaveAttribute("aria-pressed", "true");
  });

  it("says so when the shelf is empty", async () => {
    renderDashboard([]);

    expect(await screen.findByText("No books here yet.")).toBeInTheDocument();
    expect(screen.queryByText("On the shelf")).not.toBeInTheDocument();
  });
});
