import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { useState } from "react";
import { book, booksResponse, mockApi, renderApp, series } from "@/test/helpers";
import { GenreMultiSelect } from "./genre-multi-select";

function Harness({
  initial = [],
  onSubmit = () => {},
}: {
  initial?: string[];
  onSubmit?: () => void;
}) {
  const [genres, setGenres] = useState<string[]>(initial);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <GenreMultiSelect value={genres} onChange={setGenres} />
      <output aria-label="chosen">{genres.join("|")}</output>
    </form>
  );
}

function serve() {
  mockApi(({ path }) => {
    if (path.startsWith("/api/books")) {
      return booksResponse([book({ genres: ["Litrpg", "Fantasy"] })]);
    }
    if (path === "/api/series") return { body: { series: [series({ genres: ["Cosy mystery"] })] } };
  });
}

async function openPanel() {
  fireEvent.click(await screen.findByRole("button", { expanded: false }));
  return screen.findByRole("textbox", { name: "Add your own genre" });
}

const chosen = () => screen.getByLabelText("chosen").textContent;

describe("GenreMultiSelect", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("offers the usual genres and the ones the user already made up on books and series", async () => {
    serve();
    renderApp(<Harness />);
    await openPanel();

    expect(await screen.findByRole("checkbox", { name: "Litrpg" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Cosy mystery" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Romantasy" })).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox", { name: "Fantasy" })).toHaveLength(1);
  });

  it("adds a genre of your own with the button and with Enter, trimmed, and clears the field", async () => {
    serve();
    renderApp(<Harness />);
    const field = await openPanel();

    fireEvent.change(field, { target: { value: "  Manga " } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(chosen()).toBe("Manga");
    expect(field).toHaveValue("");
    expect(screen.getByRole("checkbox", { name: "Manga" })).toBeChecked();

    fireEvent.change(field, { target: { value: "Cozy sci-fi" } });
    fireEvent.keyDown(field, { key: "Enter" });

    expect(chosen()).toBe("Manga|Cozy sci-fi");
  });

  it("does not submit the form around it when you press Enter in the field", async () => {
    serve();
    const onSubmit = vi.fn();
    renderApp(<Harness onSubmit={onSubmit} />);
    const field = await openPanel();

    fireEvent.change(field, { target: { value: "Manga" } });
    const notPrevented = fireEvent.keyDown(field, { key: "Enter" });

    expect(notPrevented).toBe(false);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(chosen()).toBe("Manga");
  });

  it("picks the existing spelling when the typed name matches a known genre in another letter case", async () => {
    serve();
    renderApp(<Harness />);
    const field = await openPanel();
    await screen.findByRole("checkbox", { name: "Litrpg" });

    fireEvent.change(field, { target: { value: "LITRPG" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.change(field, { target: { value: "science FICTION" } });
    fireEvent.keyDown(field, { key: "Enter" });

    expect(chosen()).toBe("Litrpg|Science fiction");
  });

  it("says so and adds nothing when the genre is already chosen", async () => {
    serve();
    renderApp(<Harness initial={["Manga"]} />);
    const field = await openPanel();

    fireEvent.change(field, { target: { value: "manga" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByText("Already added")).toBeInTheDocument();
    expect(chosen()).toBe("Manga");

    fireEvent.change(field, { target: { value: "manga2" } });

    expect(screen.queryByText("Already added")).not.toBeInTheDocument();
  });

  it("keeps Add switched off while the field is empty", async () => {
    serve();
    renderApp(<Harness />);
    const field = await openPanel();

    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();

    fireEvent.change(field, { target: { value: "   " } });

    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });

  it("stops at twelve genres: no more to add or to tick, and it says why", async () => {
    serve();
    const twelve = Array.from({ length: 12 }, (_, index) => `Genre ${index}`);
    renderApp(<Harness initial={twelve} />);
    const field = await openPanel();

    expect(field).toBeDisabled();
    expect(screen.getByText("Up to 12 genres.")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Romantasy" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Genre 3" })).toBeEnabled();
  });

  it("limits a name to forty characters", async () => {
    serve();
    renderApp(<Harness />);
    const field = await openPanel();

    expect(field).toHaveAttribute("maxlength", "40");
  });
});
