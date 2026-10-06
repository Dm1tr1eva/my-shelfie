import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { EditBookForm } from "./edit-book-form";
import type { Book } from "@/lib/books";

const BOOK_URL = "http://localhost:5000/api/books/1";

const DUNE: Book = {
  id: "1",
  userId: "u1",
  title: "Dune",
  author: "Frank Herbert",
  status: "read",
  rating: 4,
  review: "Good",
  createdAt: "",
  updatedAt: "",
};

function jsonResponse(status: number, body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function renderForm(onDeleted = vi.fn()) {
  render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <EditBookForm book={DUNE} onDeleted={onDeleted} />
    </SWRConfig>,
  );
  return onDeleted;
}

describe("EditBookForm", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends null for a rating and review the user cleared", async () => {
    vi.mocked(fetch).mockImplementation(() =>
      jsonResponse(200, { ...DUNE, rating: undefined, review: undefined }),
    );
    renderForm();

    fireEvent.change(screen.getByLabelText("Rating"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Review"), { target: { value: "   " } });
    fireEvent.submit(screen.getByRole("form", { name: "Edit book" }));

    expect(await screen.findByText("Saved.")).toBeInTheDocument();
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe(BOOK_URL);
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toMatchObject({ rating: null, review: null });
  });

  it("deletes the book once the user confirms", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(new Response(null, { status: 204 })),
    );
    const onDeleted = renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe(BOOK_URL);
    expect(init?.method).toBe("DELETE");
  });

  it("does not delete anything when the user cancels the confirmation", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const onDeleted = renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(fetch).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
