import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { book, booksResponse, mockApi, renderApp, series } from "@/test/helpers";
import { AddDetails } from "./add-details";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
const route = vi.hoisted(() => ({ params: new URLSearchParams() }));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => route.params,
}));

const saga = series({ id: "saga", title: "Saga of Ash" });
const NEW_BOOK = book({ id: "new", title: "Ash Four", seriesId: "saga", seriesNumber: 4 });
const SIBLINGS = [
  book({ seriesId: "saga", seriesNumber: 1, genres: ["Romantasy", "Fantasy"] }),
  book({ seriesId: "saga", seriesNumber: 2, genres: ["Romantasy"] }),
];

function serve() {
  return mockApi(({ method, path }) => {
    if (method === "PATCH" && path === "/api/books/new") return { body: NEW_BOOK };
    if (path === "/api/books/new") return { body: NEW_BOOK };
    if (path.startsWith("/api/books")) return booksResponse([...SIBLINGS, NEW_BOOK]);
    if (path === "/api/series") return { body: { series: [saga] } };
  });
}

describe("AddDetails", () => {
  beforeEach(() => {
    route.params = new URLSearchParams("series=saga&number=4");
    router.push.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts the genres from the other books of the series", async () => {
    serve();
    renderApp(<AddDetails id="new" />);

    const genres = (await screen.findByText("Genres")).parentElement as HTMLElement;

    await waitFor(() => expect(within(genres).getByText("Romantasy")).toBeInTheDocument());
    expect(within(genres).getByText("Fantasy")).toBeInTheDocument();
  });

  it("keeps the genres you pick instead of the series genres", async () => {
    const calls = serve();
    renderApp(<AddDetails id="new" />);
    await screen.findByText("Genres");

    fireEvent.click(await screen.findByRole("button", { name: /Romantasy/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Romantasy" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Fantasy" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Horror" }));
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));

    await waitFor(() =>
      expect(calls).toContainEqual(
        expect.objectContaining({
          method: "PATCH",
          path: "/api/books/new",
          body: expect.objectContaining({ genres: ["Horror"] }),
        }),
      ),
    );
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/library"));
  });

  it("returns to the library without changes when you skip", async () => {
    const calls = serve();
    renderApp(<AddDetails id="new" />);

    fireEvent.click(await screen.findByRole("button", { name: "Skip for now" }));

    expect(router.push).toHaveBeenCalledWith("/library");
    expect(calls.some((call) => call.method === "PATCH")).toBe(false);
  });

  describe("a book with no series yet", () => {
    const SOLO = book({ id: "solo", title: "Жнець без коси", author: "Олександра Черепан" });

    function serveSolo() {
      return mockApi(({ method, path }) => {
        if (method === "POST" && path === "/api/series") {
          return { status: 201, body: series({ id: "made", title: "Жнець без коси" }) };
        }
        if (method === "PATCH" && path === "/api/books/solo") return { body: SOLO };
        if (path === "/api/books/solo") return { body: SOLO };
        if (path.startsWith("/api/books")) return booksResponse([SOLO]);
        if (path === "/api/series") return { body: { series: [] } };
      });
    }

    beforeEach(() => {
      route.params = new URLSearchParams();
    });

    it("creates the series that is typed and links the book when you save, without a separate click", async () => {
      const calls = serveSolo();
      renderApp(<AddDetails id="solo" />);

      fireEvent.click(await screen.findByRole("button", { name: "Save details & create series" }));

      await waitFor(() =>
        expect(calls).toContainEqual({
          method: "PATCH",
          path: "/api/books/solo",
          body: expect.objectContaining({ seriesId: "made" }),
        }),
      );
      expect(calls).toContainEqual({
        method: "POST",
        path: "/api/series",
        body: { title: "Жнець без коси", author: "Олександра Черепан", status: "unknown" },
      });
    });

    it("does not borrow genres from other books that have no series either", async () => {
      mockApi(({ path }) => {
        if (path === "/api/books/solo") return { body: SOLO };
        if (path.startsWith("/api/books")) {
          return booksResponse([
            SOLO,
            book({ title: "Other alone", genres: ["Horror", "Poetry"] }),
          ]);
        }
        if (path === "/api/series") return { body: { series: [] } };
      });
      renderApp(<AddDetails id="solo" />);

      const genres = (await screen.findByText("Genres")).parentElement as HTMLElement;
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(within(genres).getByText("Choose genres")).toBeInTheDocument();
      expect(within(genres).queryByText("Horror")).not.toBeInTheDocument();
    });

    it("saves the number only together with the series", async () => {
      const calls = serveSolo();
      renderApp(<AddDetails id="solo" />);

      fireEvent.change(await screen.findByLabelText("No."), { target: { value: "1" } });
      fireEvent.click(screen.getByRole("button", { name: "Save details & create series" }));

      await waitFor(() =>
        expect(calls).toContainEqual({
          method: "PATCH",
          path: "/api/books/solo",
          body: expect.objectContaining({ seriesId: "made", seriesNumber: 1 }),
        }),
      );
    });

    it("saves the rest and creates no series once you cancel the new-series form", async () => {
      const calls = serveSolo();
      renderApp(<AddDetails id="solo" />);

      fireEvent.change(await screen.findByLabelText("No."), { target: { value: "3" } });
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      fireEvent.click(screen.getByRole("button", { name: "Save details" }));

      await waitFor(() => expect(calls.some((call) => call.method === "PATCH")).toBe(true));
      expect(calls.some((call) => call.method === "POST")).toBe(false);
      const patch = calls.find((call) => call.method === "PATCH");
      expect(patch?.body).not.toHaveProperty("seriesId");
      expect(patch?.body).not.toHaveProperty("seriesNumber");
    });

    it("does not touch the book when the series cannot be created", async () => {
      const calls = mockApi(({ method, path }) => {
        if (method === "POST" && path === "/api/series") {
          return { status: 500, body: { error: "boom" } };
        }
        if (path === "/api/books/solo") return { body: SOLO };
        if (path.startsWith("/api/books")) return booksResponse([SOLO]);
        if (path === "/api/series") return { body: { series: [] } };
      });
      renderApp(<AddDetails id="solo" />);

      fireEvent.click(await screen.findByRole("button", { name: "Save details & create series" }));

      expect(
        await screen.findByText("Could not create the series. Try again."),
      ).toBeInTheDocument();
      expect(calls.some((call) => call.method === "PATCH")).toBe(false);
      expect(router.push).not.toHaveBeenCalled();
    });
  });
});
