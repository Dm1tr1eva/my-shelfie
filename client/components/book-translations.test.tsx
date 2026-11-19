import { describe, it, expect, vi, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { book, booksResponse, mockApi, renderApp, series } from "@/test/helpers";
import { resetLocale, setLocale } from "@/lib/i18n";
import { BookPage } from "./book-page";
import { GenreMultiSelect } from "./genre-multi-select";
import { ShopLinkEditor, type LinkRow } from "./shop-link-editor";
import { StarRating } from "./form-controls";
import { TagInput } from "./tag-input";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const WANTED = book({
  id: "w1",
  title: "Ash One",
  ownership: "wanted",
  genres: ["Fantasy", "Slow magic"],
  links: [{ kind: "ebook", languages: ["uk"], url: "https://www.example.com/ash" }],
});

function serve() {
  mockApi(({ path }) => {
    if (path === "/api/books/w1") return { body: WANTED };
    if (path.startsWith("/api/books")) return booksResponse([WANTED]);
    if (path === "/api/series") return { body: { series: [series({ id: "s1" })] } };
  });
}

function TagHarness() {
  const [tags, setTags] = useState<string[]>([]);
  return (
    <TagInput
      label="Tropes"
      value={tags}
      onChange={setTags}
      suggestions={[
        { name: "found family", count: 1 },
        { name: "slow burn", count: 5 },
      ]}
    />
  );
}

function LinksHarness() {
  const [rows, setRows] = useState<LinkRow[]>([{ kind: "paper", languages: ["uk"], url: "nope" }]);
  return <ShopLinkEditor rows={rows} onChange={setRows} />;
}

describe("book screens in other languages", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
    act(() => resetLocale());
  });

  it("shows the book page in Ukrainian with plural links and a filled placeholder", async () => {
    act(() => setLocale("uk"));
    serve();
    renderApp(<BookPage id="w1" />);

    expect(await screen.findByRole("heading", { name: "Ash One" })).toBeInTheDocument();
    expect(screen.getByText("Окрема книга")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Вішліст" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Формат" })).toBeInTheDocument();
    expect(screen.getByText("Де взяти")).toBeInTheDocument();
    expect(screen.getByText("1 посилання")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Видалити посилання example.com" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Поставити оцінку 4 із 5" })).toBeInTheDocument();
    expect(screen.getByText("Без оцінки")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Читаю" })).toBeInTheDocument();
    expect(screen.getByText("Фентезі")).toBeInTheDocument();
    expect(screen.getByText("Slow magic")).toBeInTheDocument();
  });

  it("shows the unsaved-changes bar in Russian once something changes", async () => {
    act(() => setLocale("ru"));
    serve();
    renderApp(<BookPage id="w1" />);
    await screen.findByRole("heading", { name: "Ash One" });

    fireEvent.click(screen.getByRole("button", { name: "Поставить оценку 4 из 5" }));

    const bar = screen.getByRole("region", { name: "Несохранённые изменения" });
    expect(within(bar).getByText("Есть несохранённые изменения")).toBeInTheDocument();
    expect(within(bar).getByRole("button", { name: "Сохранить изменения" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Статус чтения" })).toBeInTheDocument();
  });

  it("counts the books of a trope with Russian plural forms", () => {
    act(() => setLocale("ru"));
    render(<TagHarness />);

    fireEvent.focus(screen.getByRole("textbox", { name: "Tropes" }));

    expect(screen.getByText("в 1 книге")).toBeInTheDocument();
    expect(screen.getByText("в 5 книгах")).toBeInTheDocument();
    expect(screen.getByText("Любой текст. Enter или запятая добавляют тег.")).toBeInTheDocument();
  });

  it("fills the name into the create option in Ukrainian", () => {
    act(() => setLocale("uk"));
    render(<TagHarness />);

    const field = screen.getByRole("textbox", { name: "Tropes" });
    fireEvent.change(field, { target: { value: "road trip" } });

    expect(screen.getByText("Створити «road trip»")).toBeInTheDocument();
    expect(screen.getByRole("listbox", { name: "Tropes: підказки" })).toBeInTheDocument();
  });

  it("shows default genres translated while storing the English name", () => {
    act(() => setLocale("uk"));
    mockApi(({ path }) => {
      if (path.startsWith("/api/books")) return booksResponse([]);
      if (path === "/api/series") return { body: { series: [] } };
    });
    const chosen: string[][] = [];

    function Harness() {
      const [genres, setGenres] = useState<string[]>([]);
      chosen.push(genres);
      return <GenreMultiSelect value={genres} onChange={setGenres} />;
    }

    renderApp(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /Оберіть жанри/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Фентезі" }));

    expect(chosen.at(-1)).toEqual(["Fantasy"]);
    expect(screen.getByRole("group", { name: "Жанри" })).toBeInTheDocument();
  });

  it("names the rating stars and the link fields in Russian", () => {
    act(() => setLocale("ru"));
    render(
      <>
        <StarRating value={undefined} onChange={() => {}} />
        <LinksHarness />
      </>,
    );

    expect(screen.getByRole("button", { name: "Поставить оценку 3 из 5" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Тип ссылки 1" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Адрес ссылки 1" })).toBeInTheDocument();
    expect(screen.getByText("Ссылка должна начинаться с https://")).toBeInTheDocument();
  });
});
