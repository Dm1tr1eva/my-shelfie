import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { book, series } from "@/test/helpers";
import { SeriesPicker, type SeriesChoice } from "./series-picker";

const saga = series({ id: "saga", title: "Saga of Ash" });

function setup(overrides: { value?: SeriesChoice; books?: ReturnType<typeof book>[] } = {}) {
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
    />,
  );

  return { onChange, onCreate, input: screen.getByRole("combobox", { name: "Series" }) };
}

describe("SeriesPicker", () => {
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
});
