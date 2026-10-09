import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { AddBookForm } from "./add-book-form";

const BOOKS_URL = "/api/books";

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

  it("saves the Google volume id and cover of the result it was filled in from", async () => {
    vi.mocked(fetch).mockImplementation((url) =>
      String(url).startsWith("/api/books/search")
        ? jsonResponse(200, {
            results: [
              {
                volumeId: "vol1",
                title: "Dracula",
                authors: ["Bram Stoker"],
                coverUrl: "https://books.google.com/cover?id=vol1",
              },
            ],
          })
        : jsonResponse(201, { id: "1", title: "Dracula", author: "Bram Stoker", status: "want" }),
    );
    vi.useFakeTimers();
    const onDone = renderForm();

    fireEvent.change(screen.getByLabelText("Find a book"), { target: { value: "dracula" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    vi.useRealTimers();

    fireEvent.click(screen.getByRole("button", { name: "Use Dracula" }));
    expect(screen.getByLabelText("Title")).toHaveValue("Dracula");
    expect(screen.getByLabelText("Author")).toHaveValue("Bram Stoker");

    fireEvent.submit(screen.getByRole("form", { name: "Add a book" }));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    const createCall = vi.mocked(fetch).mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
      title: "Dracula",
      author: "Bram Stoker",
      status: "want",
      googleVolumeId: "vol1",
      coverUrl: "https://books.google.com/cover?id=vol1",
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
