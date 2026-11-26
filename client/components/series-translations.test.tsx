import { describe, it, expect, vi, afterEach } from "vitest";
import { act, fireEvent, screen, within } from "@testing-library/react";
import { resetLocale, setLocale } from "@/lib/i18n";
import { book, booksResponse, mockApi, renderApp, series } from "@/test/helpers";
import { SeriesPage } from "./series-page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const SAGA = series({
  id: "saga",
  title: "Saga of Ash",
  author: "A. Writer",
  status: "readable",
  totalBooks: 5,
});
const ONE = book({ id: "one", title: "Ash One", seriesId: "saga", seriesNumber: 1 });
const TWO = book({
  id: "two",
  title: "Ash Two",
  seriesId: "saga",
  seriesNumber: 2,
  ownership: "wanted",
});
const THREE = book({ id: "three", title: "Ash Three", seriesId: "saga", seriesNumber: 3 });

function serveSeries() {
  mockApi(({ path }) => {
    if (path === "/api/series/saga") return { body: { series: SAGA, books: [ONE, TWO, THREE] } };
    if (path.startsWith("/api/books")) return booksResponse([ONE, TWO, THREE]);
  });
}

describe("the series page in other languages", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    act(() => resetLocale());
  });

  it("is in Ukrainian, with the missing numbers listed and the gap marked", async () => {
    act(() => setLocale("uk"));
    serveSeries();
    renderApp(<SeriesPage id="saga" />);

    expect(await screen.findByText("Серія виходить, вже можна читати")).toBeInTheDocument();
    expect(screen.getByText("Бракує: #2 (пропуск) і #4 і #5")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Додати наступну книгу" })).toBeInTheDocument();
    const books = screen.getByRole("region", { name: "Книги цієї серії" });
    expect(within(books).getByText("У вішлісті")).toBeInTheDocument();
    expect(within(books).getAllByText("У планах")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Про цю серію" })).toBeInTheDocument();
  });

  it("is in Russian, down to the form and the labels of its fields", async () => {
    act(() => setLocale("ru"));
    serveSeries();
    renderApp(<SeriesPage id="saga" />);

    fireEvent.click(await screen.findByRole("button", { name: "Изменить серию" }));
    const form = screen.getByRole("form", { name: "Изменить серию" });

    expect(within(form).getByLabelText("Название")).toBeInTheDocument();
    expect(within(form).getByLabelText("Книг в серии")).toHaveAttribute(
      "placeholder",
      "Необязательно",
    );
    expect(within(form).getByRole("button", { name: "Удалить серию" })).toBeInTheDocument();
    expect(screen.getByText("Не хватает: #2 (пропуск) и #4 и #5")).toBeInTheDocument();
  });

  it("asks before deleting in the language of the interface, with the title filled in", async () => {
    act(() => setLocale("uk"));
    serveSeries();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderApp(<SeriesPage id="saga" />);

    fireEvent.click(await screen.findByRole("button", { name: "Змінити серію" }));
    fireEvent.click(screen.getByRole("button", { name: "Видалити серію" }));

    expect(confirm).toHaveBeenCalledWith(
      "Видалити серію «Saga of Ash»? Її книги залишаться на твоїй полиці.",
    );
    confirm.mockRestore();
  });
});
