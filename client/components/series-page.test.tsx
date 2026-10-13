import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { book, choose, mockApi, renderApp, series } from "@/test/helpers";
import { SeriesPage } from "./series-page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const SAGA = series({ id: "saga", title: "Saga of Ash", author: "A. Writer", status: "ongoing" });
const BOOKS = [
  book({ id: "one", title: "Ash One", seriesId: "saga", seriesNumber: 1, genres: ["Fantasy"] }),
  book({
    id: "three",
    title: "Ash Three",
    seriesId: "saga",
    seriesNumber: 3,
    genres: ["Fantasy", "Romance"],
    tropes: ["slow burn"],
  }),
  book({
    id: "two",
    title: "Ash Two",
    seriesId: "saga",
    seriesNumber: 2,
    ownership: "wanted",
    tropes: ["slow burn"],
  }),
];

function serve() {
  return mockApi(({ method, path }) => {
    if (method === "PATCH" && path === "/api/series/saga") {
      return { body: { ...SAGA, status: "complete" } };
    }
    if (path === "/api/series/saga") return { body: { series: SAGA, books: BOOKS } };
    if (path === "/api/series/gone") return { status: 404, body: { error: "Not found" } };
  });
}

describe("SeriesPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows how many of the series you own and which number is a gap", async () => {
    serve();
    renderApp(<SeriesPage id="saga" />);

    expect(await screen.findByRole("heading", { name: "Saga of Ash" })).toBeInTheDocument();
    expect(screen.getByText("Own 2 of 3")).toBeInTheDocument();
    expect(screen.getByText("Missing: #2 (a gap)")).toBeInTheDocument();
  });

  it("links the next book to the add page with the next number", async () => {
    serve();
    renderApp(<SeriesPage id="saga" />);

    expect(await screen.findByRole("link", { name: "Add the next book" })).toHaveAttribute(
      "href",
      "/add?series=saga&number=4",
    );
  });

  it("counts genres and tropes across the series", async () => {
    serve();
    renderApp(<SeriesPage id="saga" />);

    const tropes = (await screen.findByRole("heading", { name: "Tropes" })).closest(
      "section",
    ) as HTMLElement;
    const genres = screen
      .getByRole("heading", { name: "Genres in this series" })
      .closest("section") as HTMLElement;

    expect(within(tropes).getByText("slow burn").parentElement).toHaveTextContent("2");
    expect(within(genres).getByText("Fantasy").parentElement).toHaveTextContent("2");
    expect(within(genres).getByText("Romance").parentElement).toHaveTextContent("1");
  });

  it("saves the edited series details", async () => {
    const calls = serve();
    renderApp(<SeriesPage id="saga" />);
    await screen.findByRole("heading", { name: "Saga of Ash" });

    fireEvent.click(screen.getByRole("button", { name: "Edit series" }));
    const form = screen.getByRole("form", { name: "Edit series" });
    choose(within(form).getByRole("combobox", { name: "Status" }), "Complete");
    fireEvent.click(within(form).getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(calls).toContainEqual({
        method: "PATCH",
        path: "/api/series/saga",
        body: { title: "Saga of Ash", author: "A. Writer", note: null, status: "complete" },
      }),
    );
  });

  it("says so when the series does not exist", async () => {
    serve();
    renderApp(<SeriesPage id="gone" />);

    expect(await screen.findByText("Series not found.")).toBeInTheDocument();
  });
});
