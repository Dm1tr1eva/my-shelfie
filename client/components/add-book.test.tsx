import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { book, booksResponse, mockApi, renderApp, series } from "@/test/helpers";
import { AddBook } from "./add-book";

const route = vi.hoisted(() => ({ params: new URLSearchParams() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => route.params,
}));

const RESULT = {
  volumeId: "vol1",
  title: "A Court of Thorns and Roses",
  authors: ["Sarah J. Maas"],
  year: 2015,
  coverUrl: "https://books.google.com/cover?id=vol1",
  link: "https://books.google.com/books?id=vol1",
};

function serve(options: { existing?: ReturnType<typeof book>[]; searchFails?: boolean } = {}) {
  return mockApi(({ method, path }) => {
    if (path.startsWith("/api/books/search")) {
      if (options.searchFails) return { status: 502, body: { error: "upstream" } };
      return { body: { results: [RESULT] } };
    }
    if (method === "POST" && path === "/api/books") {
      return { status: 201, body: book({ id: "created", title: RESULT.title }) };
    }
    if (method === "PATCH") return { body: book({ id: "wish" }) };
    if (path.startsWith("/api/books")) return booksResponse(options.existing ?? []);
    if (path === "/api/series") {
      return { body: { series: [series({ id: "acotar", title: "ACOTAR" })] } };
    }
  });
}

async function searchFor(text: string) {
  fireEvent.change(await screen.findByPlaceholderText(/Search Google Books|…/), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
}

describe("AddBook", () => {
  beforeEach(() => {
    route.params = new URLSearchParams();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not search for fewer than three characters", async () => {
    const calls = serve();
    renderApp(<AddBook />);

    await searchFor("ab");

    expect(calls.some((call) => call.path.startsWith("/api/books/search"))).toBe(false);
  });

  it("adds a search result to the library and offers the details step", async () => {
    const calls = serve();
    renderApp(<AddBook />);

    await searchFor("thorns");
    const row = (await screen.findByText(RESULT.title)).closest("li") as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: "Add to library" }));

    const toast = await screen.findByRole("status");
    expect(toast).toHaveTextContent("added to your library");
    expect(within(toast).getByRole("link", { name: "Add series & tags" })).toHaveAttribute(
      "href",
      "/add/created/details",
    );
    expect(calls).toContainEqual({
      method: "POST",
      path: "/api/books",
      body: {
        title: RESULT.title,
        author: "Sarah J. Maas",
        ownership: "owned",
        coverUrl: RESULT.coverUrl,
        googleVolumeId: "vol1",
      },
    });
  });

  it("puts the book into the series and number it was opened for", async () => {
    route.params = new URLSearchParams("series=acotar&number=2");
    const calls = serve();
    renderApp(<AddBook />);

    await searchFor("clash of thorns");
    const row = (await screen.findByText(RESULT.title)).closest("li") as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: "Add to wishlist" }));

    await waitFor(() =>
      expect(calls).toContainEqual(
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            ownership: "wanted",
            seriesId: "acotar",
            seriesNumber: 2,
          }),
        }),
      ),
    );
    expect(await screen.findByRole("link", { name: "Add series & tags" })).toHaveAttribute(
      "href",
      "/add/created/details?series=acotar&number=2",
    );
  });

  it("offers to move a book that is already on the wishlist instead of adding it twice", async () => {
    const calls = serve({
      existing: [book({ id: "wish", googleVolumeId: "vol1", ownership: "wanted" })],
    });
    renderApp(<AddBook />);

    await searchFor("thorns");
    expect(await screen.findByText("Already on your wishlist")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add to library" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Move to library" }));

    await waitFor(() =>
      expect(calls).toContainEqual({
        method: "PATCH",
        path: "/api/books/wish",
        body: { ownership: "owned" },
      }),
    );
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });

  it("does not offer to add a book that is already in the library", async () => {
    serve({ existing: [book({ googleVolumeId: "vol1", ownership: "owned" })] });
    renderApp(<AddBook />);

    await searchFor("thorns");

    expect(await screen.findByText("Already in your library")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Move to library" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add to library" })).not.toBeInTheDocument();
  });

  it("falls back to adding by hand when Google Books does not answer", async () => {
    const calls = serve({ searchFails: true });
    renderApp(<AddBook />);

    await searchFor("thorns");
    expect(await screen.findByText("Google Books isn't answering")).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByRole("alert")).getByRole("button", { name: "Add it without search" }),
    );

    const form = screen.getByRole("form", { name: "Add a book by hand" });
    fireEvent.change(within(form).getByLabelText("Title"), { target: { value: "My Own Book" } });
    fireEvent.change(within(form).getByLabelText("Author"), { target: { value: "Me" } });
    fireEvent.click(within(form).getByLabelText("Wishlist"));
    fireEvent.click(within(form).getByRole("button", { name: "Add book" }));

    await waitFor(() =>
      expect(calls).toContainEqual({
        method: "POST",
        path: "/api/books",
        body: { title: "My Own Book", author: "Me", ownership: "wanted" },
      }),
    );
  });
});
