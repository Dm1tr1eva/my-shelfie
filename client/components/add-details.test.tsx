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
});
