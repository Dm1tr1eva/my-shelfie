import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, screen, within } from "@testing-library/react";
import { book, booksResponse, mockApi, renderApp, series } from "@/test/helpers";
import { resetLocale, setLocale } from "@/lib/i18n";
import { Library } from "./library";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const saga = series({ id: "saga", title: "Saga of Ash", author: "A. Writer", totalBooks: 4 });

const SHELF = [
  book({ id: "one", title: "Ash One", seriesId: "saga", seriesNumber: 1 }),
  book({ id: "three", title: "Ash Three", seriesId: "saga", seriesNumber: 3, rating: 4 }),
  book({ id: "alone", title: "Stand Alone", author: "Solo Person" }),
  book({ id: "wish", title: "Wished Alone", ownership: "wanted" }),
];

function serve() {
  mockApi(({ path }) => {
    if (path.startsWith("/api/books")) return booksResponse(SHELF);
    if (path === "/api/series") return { body: { series: [saga] } };
  });
}

describe("Library in Russian and Ukrainian", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    act(() => resetLocale());
    vi.unstubAllGlobals();
  });

  it("shows the library in Ukrainian with segments, a gap and the standalone shelf", async () => {
    act(() => setLocale("uk"));
    serve();
    renderApp(<Library />);

    const section = await screen.findByRole("region", { name: "Saga of Ash" });

    expect(screen.getByRole("heading", { name: "Бібліотека" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Назва, автор або серія")).toBeInTheDocument();
    expect(within(section).getByRole("img", { name: "Є 2 з 4" })).toBeInTheDocument();
    expect(
      within(section).getByRole("link", { name: "Додати #2 до «Saga of Ash», немає в каталозі" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Окремі книги" })).toBeInTheDocument();
    expect(screen.getByText("Не входять до серії")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Оцінка: 4 з 5" })).toBeInTheDocument();
  });

  it("shows the filter panel in Russian with its groups, reset and a counted button", async () => {
    act(() => setLocale("ru"));
    serve();
    renderApp(<Library />);
    await screen.findByRole("region", { name: "Saga of Ash" });

    fireEvent.click(screen.getByRole("button", { name: "Фильтры" }));
    const panel = screen.getByRole("dialog", { name: "Фильтры" });

    expect(within(panel).getByRole("region", { name: "У меня" })).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "В вишлисте" })).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Без оценки" })).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Сбросить" })).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Показать 4 книги" })).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Закрыть" })).toBeInTheDocument();
  });

  it("says nothing matches and quotes the query in Ukrainian", async () => {
    act(() => setLocale("uk"));
    serve();
    renderApp(<Library />);
    await screen.findByRole("region", { name: "Saga of Ash" });

    fireEvent.change(screen.getByPlaceholderText("Назва, автор або серія"), {
      target: { value: "zzz" },
    });

    expect(screen.getByText("Нічого не знайдено")).toBeInTheDocument();
    expect(screen.getByText("У цьому списку немає нічого за запитом «zzz».")).toBeInTheDocument();
  });
});
