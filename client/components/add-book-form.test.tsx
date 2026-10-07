import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { AddBookForm } from "./add-book-form";

const BOOKS_URL = "http://localhost:5000/api/books";

function jsonResponse(status: number, body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function renderForm(onDone = vi.fn()) {
  render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <AddBookForm onDone={onDone} />
    </SWRConfig>,
  );
  return onDone;
}

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "  Dune " } });
  fireEvent.change(screen.getByLabelText("Author"), { target: { value: "Frank Herbert" } });
  fireEvent.change(screen.getByLabelText("Status"), { target: { value: "reading" } });
  fireEvent.submit(screen.getByRole("form", { name: "Add a book" }));
}

describe("AddBookForm", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the trimmed title, the author and the chosen status, then closes", async () => {
    vi.mocked(fetch).mockImplementation(() =>
      jsonResponse(201, { id: "1", title: "Dune", author: "Frank Herbert", status: "reading" }),
    );
    const onDone = renderForm();

    fillAndSubmit();

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe(BOOKS_URL);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      title: "Dune",
      author: "Frank Herbert",
      status: "reading",
    });
  });

  it("shows the server's error and stays open when the book is rejected", async () => {
    vi.mocked(fetch).mockImplementation(() => jsonResponse(400, { error: "title: Too small" }));
    const onDone = renderForm();

    fillAndSubmit();

    expect(await screen.findByText("title: Too small")).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });
});
