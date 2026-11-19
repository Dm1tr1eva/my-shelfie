import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { book, booksResponse, mockApi, renderApp, series } from "@/test/helpers";
import { resetLocale, setLocale, translator } from "@/lib/i18n";
import { makeDomain } from "@/lib/i18n/domain";
import { NO_FILTERS, buildFilterGroups, chipLabel } from "@/lib/filters";
import { FilterBar } from "./filter-bar";
import { Library } from "./library";
import { Wishlist } from "./wishlist";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
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

function labelsFor(locale: "ru" | "uk") {
  const t = translator(locale);
  return { t, domain: makeDomain(t) };
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

  it("shows the wishlist in Russian with the count words in the right form", async () => {
    act(() => setLocale("ru"));
    serve();
    renderApp(<Wishlist />);

    expect(await screen.findByText("Wished Alone")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Вишлист" })).toBeInTheDocument();
    expect(screen.getByText("Не входят в серию · 1 книга")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Вид" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Сетка" }));

    expect(screen.getAllByText("Ссылок пока нет").length).toBeGreaterThan(0);
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

  it("builds filter group names, option names and chips in the chosen language", () => {
    const ukrainian = labelsFor("uk");
    const russian = labelsFor("ru");
    const items = [
      book({
        id: "a",
        links: [{ kind: "online", languages: ["uk"], url: "https://example.com/a" }],
      }),
    ];
    const subjectOf = (item: (typeof items)[number]) => ({ book: item });

    const groups = buildFilterGroups(items, subjectOf, NO_FILTERS, ukrainian);
    const kind = groups.find((group) => group.key === "kind");

    expect(kind?.label).toBe("Тип посилання");
    expect(kind?.options[0].label).toBe("Читати онлайн");
    expect(chipLabel("status", "ongoing", russian)).toBe("Серия: Выходит");
    expect(chipLabel("language", "uk", russian)).toBe("Язык магазина: UK");
    expect(chipLabel("kind", "online", ukrainian)).toBe("Посилання: Читати онлайн");
  });

  it("translates the filter bar, its sheet and the removable chips", () => {
    act(() => setLocale("ru"));
    render(
      <FilterBar
        groups={[
          {
            key: "genre",
            label: "Жанр",
            searchable: false,
            options: [{ value: "Fantasy", label: "Фэнтези", count: 2 }],
          },
        ]}
        filters={{ ...NO_FILTERS, genre: ["Fantasy"], status: ["ongoing"] }}
        onChange={() => {}}
        countWith={() => 5}
        summary="5 книг"
      />,
    );

    expect(screen.getByRole("button", { name: "Фильтры · 2" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Убрать фильтр «Серия: Выходит»" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Сбросить всё" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Фильтры · 2" }));

    const sheet = screen.getByRole("dialog", { name: "Фильтры" });
    expect(within(sheet).getByRole("button", { name: "Показать 5 книг" })).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Закрыть" })).toBeInTheDocument();
  });
});
