import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { resetLocale, setLocale } from "@/lib/i18n";
import { book, booksResponse, mockApi, renderApp, series } from "@/test/helpers";
import { AddBook } from "./add-book";
import { AddDetails } from "./add-details";
import { SeriesPicker } from "./series-picker";

const route = vi.hoisted(() => ({ params: new URLSearchParams() }));
const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => route.params,
}));

const RESULTS = ["one", "two", "three"].map((name) => ({
  volumeId: `vol-${name}`,
  title: `Book ${name}`,
  authors: ["Sarah J. Maas"],
  year: 2015,
}));

function serve() {
  return mockApi(({ path }) => {
    if (path.startsWith("/api/books/search")) return { body: { results: RESULTS } };
    if (path === "/api/books/own") return { body: book({ id: "own", ownership: "owned" }) };
    if (path.startsWith("/api/books")) return booksResponse([]);
    if (path === "/api/series") {
      return { body: { series: [series({ id: "acotar", title: "ACOTAR" })] } };
    }
  });
}

describe("add translations", () => {
  beforeEach(() => {
    route.params = new URLSearchParams();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    act(() => resetLocale());
  });

  it("shows the search in Ukrainian with the series and number filled in", async () => {
    act(() => setLocale("uk"));
    route.params = new URLSearchParams("series=acotar&number=3");
    serve();
    renderApp(<AddBook />);

    expect(await screen.findByRole("heading", { name: "Додати книгу" })).toBeInTheDocument();
    const target = await screen.findByText(/Додаємо до серії/);
    expect(target).toHaveTextContent("Додаємо до серії ACOTAR як книгу №3.");
    expect(within(target).getByText("ACOTAR").tagName).toBe("STRONG");
    expect(screen.getByRole("button", { name: "Знайти" })).toBeInTheDocument();
    expect(screen.getByText("Шукай за назвою, автором або ISBN.")).toBeInTheDocument();
  });

  it("counts the results with the Russian plural form", async () => {
    act(() => setLocale("ru"));
    serve();
    renderApp(<AddBook />);

    fireEvent.change(await screen.findByPlaceholderText("Искать в Google Книгах"), {
      target: { value: "maas" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Найти" }));

    expect(await screen.findByText("3 результата.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "В библиотеку" }).length).toBeGreaterThan(0);
  });

  it("shows the details step in Russian", async () => {
    act(() => setLocale("ru"));
    route.params = new URLSearchParams();
    serve();
    renderApp(<AddDetails id="own" />);

    expect(await screen.findByText("Добавлена в библиотеку")).toBeInTheDocument();
    expect(screen.getByText("Заметки")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Сохранить" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Пропустить" })).toBeInTheDocument();
  });

  it("explains a series size outside the range in Ukrainian", () => {
    act(() => setLocale("uk"));
    render(
      <SeriesPicker
        series={[]}
        books={[]}
        value={{}}
        onChange={vi.fn()}
        onCreate={vi.fn()}
        suggestion={{ title: "Жнець без коси" }}
      />,
    );

    expect(screen.getByText("Нова серія «Жнець без коси»")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Книг у серії/), { target: { value: "500" } });
    fireEvent.click(screen.getByRole("button", { name: "Створити серію" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Кількість книг у серії має бути цілим числом від 1 до 200.",
    );
  });
});
