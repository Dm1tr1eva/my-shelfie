import { fireEvent, render, screen } from "@testing-library/react";
import { SWRConfig } from "swr";
import { vi } from "vitest";
import { AuthProvider } from "@/lib/auth-context";
import type { Book, Ownership } from "@/lib/books";
import type { Series } from "@/lib/series";

export type Call = { method: string; path: string; body: unknown };
type Reply = { status?: number; body?: unknown; wait?: Promise<unknown> };
type Handler = (call: Call) => Reply | undefined;

const ALICE = { id: "1", email: "alice@example.com", name: "Alice" };

export function mockApi(handler: Handler, signedIn = true) {
  const calls: Call[] = [];

  vi.stubGlobal(
    "fetch",
    vi.fn((path: string, init: RequestInit = {}) => {
      const call: Call = {
        method: init.method ?? "GET",
        path,
        body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
      };

      if (path === "/api/auth/me") {
        return Promise.resolve(new Response(JSON.stringify(signedIn ? ALICE : null)));
      }

      calls.push(call);
      const reply = handler(call);

      if (!reply) {
        return Promise.reject(new Error(`unexpected request: ${call.method} ${path}`));
      }

      const status = reply.status ?? 200;
      const response =
        status === 204
          ? new Response(null, { status })
          : new Response(JSON.stringify(reply.body ?? null), { status });
      return reply.wait ? reply.wait.then(() => response) : Promise.resolve(response);
    }),
  );

  return calls;
}

export function renderApp(ui: React.ReactElement) {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <AuthProvider>{ui}</AuthProvider>
    </SWRConfig>,
  );
}

export function choose(select: HTMLElement, optionName: string | RegExp) {
  fireEvent.click(select);
  fireEvent.click(screen.getByRole("option", { name: optionName }));
}

let counter = 0;

export function book(overrides: Partial<Book> = {}): Book {
  counter += 1;
  return {
    id: `book-${counter}`,
    userId: "1",
    title: `Book ${counter}`,
    author: "An author",
    status: "want",
    ownership: "owned" as Ownership,
    format: "paper",
    genres: [],
    tropes: [],
    links: [],
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

export function series(overrides: Partial<Series> = {}): Series {
  counter += 1;
  return {
    id: `series-${counter}`,
    title: `Series ${counter}`,
    status: "ongoing",
    ownedCount: 0,
    wantedCount: 0,
    genres: [],
    tropes: [],
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

export function booksResponse(books: Book[]) {
  return { body: { books, total: books.length, page: 1, limit: 500 } };
}
