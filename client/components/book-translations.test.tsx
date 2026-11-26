import { describe, it, expect, vi, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { book, booksResponse, mockApi, renderApp, series } from "@/test/helpers";
import { resetLocale, setLocale } from "@/lib/i18n";
import { BookPanel } from "./book-panel";
import { GenreMultiSelect } from "./genre-multi-select";
import { ShopLinkEditor, type LinkRow } from "./shop-link-editor";
import { StarRating } from "./form-controls";
import { TagInput } from "./tag-input";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

const LISTENING = book({
  id: "w1",
  title: "Ash One",
  format: "audio",
  status: "reading",
  durationMinutes: 870,
  links: [{ kind: "ebook", languages: ["uk"], url: "https://www.example.com/ash" }],
});

function serve() {
  mockApi(({ method, path, body }) => {
    if (method === "PATCH") return { body: { ...LISTENING, ...(body as object) } };
    if (path === "/api/books/w1") return { body: LISTENING };
    if (path === "/api/series") return { body: { series: [series({ id: "s1" })] } };
    if (path === "/api/progress") return { body: { entries: [] } };
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

  it("shows the book panel in Ukrainian with audiobook words and «ти» texts", async () => {
    act(() => setLocale("uk"));
    serve();
    renderApp(<BookPanel id="w1" closeBy="back" />);

    expect(await screen.findByRole("heading", { name: "Ash One" })).toBeInTheDocument();
    expect(screen.getByText("Окрема книга")).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "У мене" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Є" })).toBeChecked();
    expect(screen.getByRole("combobox", { name: "Формат" })).toHaveTextContent("Аудіокнига");
    expect(screen.getByRole("combobox", { name: "Статус" })).toHaveTextContent("Слухаю");
    expect(screen.getByRole("spinbutton", { name: "Години" })).toHaveValue(14);
    expect(screen.getByRole("heading", { name: "Посилання" })).toBeInTheDocument();
    expect(screen.getByText("Електронна")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Видалити посилання на example.com" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Захоплює" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Можливо" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Думки про книгу, звідки вона, у кого зараз")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Видалити книгу" }));
    expect(screen.getByRole("alertdialog", { name: "Видалити «Ash One»?" })).toBeInTheDocument();
  });

  it("shows the saved toast and the dialog in Russian", async () => {
    act(() => setLocale("ru"));
    serve();
    renderApp(<BookPanel id="w1" closeBy="back" />);
    await screen.findByRole("heading", { name: "Ash One" });

    fireEvent.click(screen.getByRole("button", { name: "Да" }));

    expect(await screen.findByText("Сохранено")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Отменить" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Статус" })).toHaveTextContent("Слушаю");

    fireEvent.click(screen.getByRole("button", { name: "Удалить книгу" }));
    const dialog = screen.getByRole("alertdialog", { name: "Удалить «Ash One»?" });
    expect(dialog).toHaveAccessibleDescription(
      "Книга пропадёт из библиотеки вместе с прогрессом, заметкой и цитатами. Отменить это будет нельзя.",
    );
    expect(within(dialog).getByRole("button", { name: "Отмена" })).toHaveFocus();
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
    fireEvent.click(screen.getByRole("button", { name: /Обери жанри/ }));
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
