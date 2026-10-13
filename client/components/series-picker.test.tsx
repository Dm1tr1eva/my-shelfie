import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { book, series } from "@/test/helpers";
import { SeriesPicker, type SeriesChoice } from "./series-picker";

const saga = series({ id: "saga", title: "Saga of Ash" });

function setup(
  overrides: {
    value?: SeriesChoice;
    books?: ReturnType<typeof book>[];
    suggestion?: { title: string; author?: string };
  } = {},
) {
  const onChange = vi.fn();
  const onCreate = vi.fn(async (input: { title: string }) =>
    series({ id: "created", title: input.title }),
  );

  render(
    <SeriesPicker
      series={[saga]}
      books={overrides.books ?? []}
      value={overrides.value ?? {}}
      onChange={onChange}
      onCreate={onCreate}
      suggestion={overrides.suggestion}
    />,
  );

  return { onChange, onCreate, input: screen.getByRole("combobox", { name: "Series" }) };
}

describe("SeriesPicker", () => {
  it("starts from the book's title and author, ready to create that series", async () => {
    const { onChange, onCreate, input } = setup({
      suggestion: { title: "Жнець без коси", author: "Олександра Черепан" },
    });

    expect(input).toHaveValue("Жнець без коси");
    expect(screen.getByText("New series “Жнець без коси”")).toBeInTheDocument();
    expect(screen.getByLabelText("Author")).toHaveValue("Олександра Черепан");

    fireEvent.click(screen.getByRole("button", { name: "Create series" }));

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({ seriesId: "created", seriesNumber: undefined }),
    );
    expect(onCreate).toHaveBeenCalledWith({
      title: "Жнець без коси",
      author: "Олександра Черепан",
      status: "unknown",
    });
  });

  it("lets you change the title and the author before creating", async () => {
    const { onCreate, input } = setup({ suggestion: { title: "Reaper", author: "Someone" } });

    fireEvent.change(input, { target: { value: "Reaper Without a Scythe" } });
    fireEvent.mouseDown(screen.getByRole("option", { name: /New series/ }));
    fireEvent.change(screen.getByLabelText("Author"), { target: { value: "O. Cherepan" } });
    fireEvent.click(screen.getByRole("button", { name: "Create series" }));

    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith({
        title: "Reaper Without a Scythe",
        author: "O. Cherepan",
        status: "unknown",
      }),
    );
  });

  it("keeps the form closed after you cancel it", () => {
    setup({ suggestion: { title: "Reaper", author: "Someone" } });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("button", { name: "Create series" })).not.toBeInTheDocument();
  });

  it("offers the existing series instead of a duplicate when the book's title is already one", () => {
    const { onChange } = setup({ suggestion: { title: "Saga of Ash", author: "A. Writer" } });

    expect(screen.queryByRole("button", { name: "Create series" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Use the existing series/ }));

    expect(onChange).toHaveBeenLastCalledWith({ seriesId: "saga", seriesNumber: undefined });
  });

  it("shows the chosen series, not the suggestion, when the book already has one", () => {
    const { input } = setup({
      value: { seriesId: "saga", seriesNumber: 2 },
      suggestion: undefined,
    });

    expect(input).toHaveValue("Saga of Ash");
    expect(screen.queryByRole("button", { name: "Create series" })).not.toBeInTheDocument();
  });

  it("links the book to an existing series and keeps the number you typed", () => {
    const { onChange, input } = setup({ value: { seriesNumber: 2 } });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "saga" } });
    fireEvent.mouseDown(screen.getByRole("option", { name: /Saga of Ash/ }));

    expect(onChange).toHaveBeenLastCalledWith({ seriesId: "saga", seriesNumber: 2 });
  });

  it("creates a new series from what you typed and links the book to it", async () => {
    const { onChange, onCreate, input } = setup();

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Brand New" } });
    fireEvent.mouseDown(screen.getByRole("option", { name: /New series/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create series" }));

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({ seriesId: "created", seriesNumber: undefined }),
    );
    expect(onCreate).toHaveBeenCalledWith({
      title: "Brand New",
      author: undefined,
      status: "unknown",
    });
  });

  it("does not offer to create a series whose title already exists", () => {
    const { input } = setup();

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "saga of ash" } });

    expect(screen.queryByRole("option", { name: /New series/ })).not.toBeInTheDocument();
  });

  it("says when the chosen number fills a gap", () => {
    const books = [
      book({ seriesId: "saga", seriesNumber: 1 }),
      book({ seriesId: "saga", seriesNumber: 3 }),
    ];

    setup({ value: { seriesId: "saga", seriesNumber: 2 }, books });

    expect(screen.getByText("This fills the gap at #2.")).toBeInTheDocument();
  });

  it("clears the series when you mark the book standalone", () => {
    const { onChange } = setup({ value: { seriesId: "saga", seriesNumber: 2 } });

    fireEvent.click(screen.getByRole("button", { name: "Mark as standalone" }));

    expect(onChange).toHaveBeenLastCalledWith({});
    expect(screen.getByRole("status")).toHaveTextContent("Standalone book");
    expect(screen.queryByRole("button", { name: "Mark as standalone" })).not.toBeInTheDocument();
  });

  it("goes back to asking for a series when you start typing one after marking standalone", () => {
    const { input } = setup();

    fireEvent.click(screen.getByRole("button", { name: "Mark as standalone" }));
    fireEvent.change(input, { target: { value: "sa" } });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark as standalone" })).toBeInTheDocument();
  });

  it("asks whether the series is finished with pills and sends the pill you pick", async () => {
    const { onCreate } = setup({ suggestion: { title: "Reaper", author: "Someone" } });

    expect(screen.getByRole("radiogroup", { name: "Is the series finished?" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Don't know" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    fireEvent.click(screen.getByRole("radio", { name: "Still coming out" }));
    fireEvent.click(screen.getByRole("button", { name: "Create series" }));

    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith({
        title: "Reaper",
        author: "Someone",
        status: "ongoing",
      }),
    );
  });

  it("sends how many books the series has when you fill it in", async () => {
    const { onCreate } = setup({ suggestion: { title: "Reaper", author: "Someone" } });

    fireEvent.change(screen.getByLabelText(/Books in the series/), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Create series" }));

    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith({
        title: "Reaper",
        author: "Someone",
        status: "unknown",
        totalBooks: 5,
      }),
    );
  });

  it("refuses a series size that is not a whole number from 1 to 200", async () => {
    const { onCreate } = setup({ suggestion: { title: "Reaper", author: "Someone" } });

    for (const bad of ["0", "201", "2.5"]) {
      fireEvent.change(screen.getByLabelText(/Books in the series/), { target: { value: bad } });
      fireEvent.click(screen.getByRole("button", { name: "Create series" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("whole number from 1 to 200");
    }

    expect(onCreate).not.toHaveBeenCalled();
  });

  it("lists every series from the chevron even when the field holds other text", () => {
    const other = series({ id: "other", title: "Another Saga" });
    const onChange = vi.fn();
    render(
      <SeriesPicker
        series={[saga, other]}
        books={[]}
        value={{}}
        onChange={onChange}
        onCreate={vi.fn()}
        suggestion={{ title: "Something Unrelated" }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show all series" }));

    expect(screen.getByRole("option", { name: /Saga of Ash/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Another Saga/ })).toBeInTheDocument();
  });
});
