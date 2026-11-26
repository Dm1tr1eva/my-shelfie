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
  ageRating: "16",
  expected: [{ number: 4, expectedYear: 2027, source: "manual" }],
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
    if (path === "/api/series") return { body: { series: [SAGA] } };
    if (path === "/api/progress") return { body: { entries: [] } };
  });
}

describe("the series page in other languages", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    act(() => resetLocale());
  });

  it("is in Ukrainian, with the count, the rows and the gap", async () => {
    act(() => setLocale("uk"));
    serveSeries();
    renderApp(<SeriesPage id="saga" />);

    const title = await screen.findByRole("heading", { level: 1 });
    expect(within(title).getByText("Вік 16+")).toBeInTheDocument();
    expect(screen.getByText("Можна читати")).toBeInTheDocument();
    expect(screen.getByText("з 5 є")).toBeInTheDocument();
    const books = screen.getByRole("region", { name: "Книги" });
    expect(within(books).getByText("У вішлісті")).toBeInTheDocument();
    expect(within(books).getAllByText("У планах")).toHaveLength(2);
    expect(within(books).getByText("Ще немає в каталозі")).toBeInTheDocument();
    expect(within(books).getByText("За нотаткою до серії: не раніше 2027")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Додати #4–5 до серії" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Моя нотатка" })).toBeInTheDocument();
  });

  it("is in Russian, down to the edit form and the labels of its fields", async () => {
    act(() => setLocale("ru"));
    serveSeries();
    renderApp(<SeriesPage id="saga" />);

    fireEvent.click(await screen.findByRole("button", { name: "Редактировать серию" }));
    const form = screen.getByRole("form", { name: "Редактирование серии" });

    expect(within(form).getByLabelText("Название")).toHaveValue("Saga of Ash");
    expect(within(form).getByText("планируется, можно оставить пустым")).toBeInTheDocument();
    expect(within(form).getByRole("radio", { name: "Можно читать" })).toBeChecked();
    expect(within(form).getByRole("radio", { name: "Не указан" })).not.toBeChecked();
    expect(within(form).getByRole("button", { name: "Готово" })).toBeInTheDocument();
    expect(within(form).getByRole("button", { name: "Отменить" })).toBeInTheDocument();
  });

  it("asks before deleting in the language of the interface, with the title filled in", async () => {
    act(() => setLocale("uk"));
    serveSeries();
    renderApp(<SeriesPage id="saga" />);

    fireEvent.click(await screen.findByRole("button", { name: "Редагувати серію" }));
    fireEvent.click(screen.getByRole("button", { name: "Видалити серію" }));

    const dialog = screen.getByRole("alertdialog", { name: "Видалити серію «Saga of Ash»?" });
    expect(dialog).toHaveAccessibleDescription(
      "Книжки залишаться в бібліотеці як окремі, і до них перейдуть жанри та тропи серії. Скасувати це буде неможливо.",
    );
    expect(within(dialog).getByRole("button", { name: "Скасувати" })).toHaveFocus();
  });

  it("says in Russian that the books keep the series' genres and tropes", async () => {
    act(() => setLocale("ru"));
    serveSeries();
    renderApp(<SeriesPage id="saga" />);

    fireEvent.click(await screen.findByRole("button", { name: "Редактировать серию" }));
    fireEvent.click(screen.getByRole("button", { name: "Удалить серию" }));

    expect(
      screen.getByRole("alertdialog", { name: "Удалить серию «Saga of Ash»?" }),
    ).toHaveAccessibleDescription(
      "Книги останутся в библиотеке как отдельные, и к ним перейдут жанры и тропы серии. Отменить это будет нельзя.",
    );
  });
});
