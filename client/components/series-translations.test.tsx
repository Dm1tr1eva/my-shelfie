import { describe, it, expect, vi, afterEach } from "vitest";
import { act, fireEvent, screen, within } from "@testing-library/react";
import { resetLocale, setLocale } from "@/lib/i18n";
import { book, booksResponse, mockApi, renderApp, series } from "@/test/helpers";
import { NextToBuy } from "./next-to-buy";
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
const ALONE = book({
  id: "alone",
  title: "Wished Alone",
  author: "B. Author",
  ownership: "wanted",
});

function serveSeries() {
  mockApi(({ path }) => {
    if (path === "/api/series/saga") return { body: { series: SAGA, books: [ONE, TWO, THREE] } };
    if (path.startsWith("/api/books")) return booksResponse([ONE, TWO, THREE]);
  });
}

function serveNext() {
  mockApi(({ path }) => {
    if (path.startsWith("/api/next-to-buy")) {
      return {
        body: {
          items: [
            { type: "series", book: TWO, gap: true, series: SAGA },
            { type: "missing", series: SAGA, number: 4, gap: false },
            { type: "standalone", book: ALONE, gap: false },
          ],
        },
      };
    }
    if (path.startsWith("/api/books")) return booksResponse([ONE, TWO, THREE, ALONE]);
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

describe("Next to buy in other languages", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    act(() => resetLocale());
  });

  it("is in Ukrainian, with the gap and the plural of the count", async () => {
    act(() => setLocale("uk"));
    serveNext();
    renderApp(<NextToBuy />);

    expect(await screen.findByRole("heading", { name: "Що взяти далі" })).toBeInTheDocument();
    await screen.findByText("Книга 4");
    expect(screen.getAllByText("Пропуск: у тебе є #1 і #3")).toHaveLength(1);
    expect(screen.getByText("3 книги")).toBeInTheDocument();
    expect(screen.getByText("Книга 4")).toBeInTheDocument();
    expect(screen.getByText("B. Author · окрема книга")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Уже є" })).toHaveLength(2);
  });

  it("is in Russian, with the plural for five and for one", async () => {
    act(() => setLocale("ru"));
    serveNext();
    renderApp(<NextToBuy />);

    expect(await screen.findByRole("heading", { name: "Что взять дальше" })).toBeInTheDocument();
    await screen.findByText("Пропуск: у тебя есть #1 и #3");
    expect(screen.getByText("3 книги")).toBeInTheDocument();
    expect(screen.getByText("Saga of Ash · ещё нет в твоём списке")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Добавить эту книгу" })).toBeInTheDocument();
    expect(screen.getByText("Пропуск: у тебя есть #1 и #3")).toBeInTheDocument();
  });

  it("says that nothing is missing in Russian", async () => {
    act(() => setLocale("ru"));
    mockApi(({ path }) => {
      if (path.startsWith("/api/next-to-buy")) return { body: { items: [] } };
      if (path.startsWith("/api/books")) return booksResponse([]);
    });
    renderApp(<NextToBuy />);

    expect(await screen.findByText("Всё на месте")).toBeInTheDocument();
  });
});
