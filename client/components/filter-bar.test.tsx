import { describe, it, expect } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { FilterBar } from "./filter-bar";
import { NO_FILTERS, activeFilterCount, type FilterGroup, type Filters } from "@/lib/filters";

const TROPES = Array.from({ length: 9 }, (_, index) => ({
  value: `trope ${index + 1}`,
  label: `trope ${index + 1}`,
  count: 9 - index,
}));

const GROUPS: FilterGroup[] = [
  {
    key: "genre",
    label: "Genre",
    searchable: false,
    options: [
      { value: "Fantasy", label: "Fantasy", count: 3 },
      { value: "Romance", label: "Romance", count: 2 },
    ],
  },
  {
    key: "language",
    label: "Shop language",
    searchable: false,
    options: [
      { value: "uk", label: "Ukrainian", badge: "UK", count: 4 },
      { value: "ru", label: "Russian", badge: "RU", count: 1 },
    ],
  },
  { key: "trope", label: "Trope", searchable: true, options: TROPES },
];

function Harness() {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  return (
    <>
      <FilterBar
        groups={GROUPS}
        filters={filters}
        onChange={setFilters}
        countWith={(draft) => 20 - activeFilterCount(draft)}
        summary="14 books in 4 groups"
      />
      <output data-testid="filters">{JSON.stringify(filters)}</output>
    </>
  );
}

const current = () => JSON.parse(screen.getByTestId("filters").textContent ?? "{}") as Filters;
const openGroup = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${name}`) }));

describe("FilterBar", () => {
  it("shows the summary and one button per group", () => {
    render(<Harness />);

    expect(screen.getByText("14 books in 4 groups")).toBeInTheDocument();
    for (const name of ["Genre", "Shop language", "Trope"]) {
      expect(screen.getByRole("button", { name: new RegExp(`^${name}`) })).toBeInTheDocument();
    }
  });

  it("leaves out a group that has no options at all", () => {
    render(
      <FilterBar
        groups={[...GROUPS, { key: "author", label: "Author", searchable: true, options: [] }]}
        filters={NO_FILTERS}
        onChange={() => {}}
        countWith={() => 0}
        summary="0 books"
      />,
    );

    expect(screen.queryByRole("button", { name: /^Author/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Genre/ })).toBeInTheDocument();
  });

  it("lists a group's options with their counts and applies the ones you tick", () => {
    render(<Harness />);

    openGroup("Genre");
    const group = screen.getByRole("group", { name: "Genre" });
    expect(within(group).getByText("3")).toBeInTheDocument();
    fireEvent.click(within(group).getByRole("checkbox", { name: /Fantasy/ }));

    expect(current().genre).toEqual([]);
    fireEvent.click(within(group).getByRole("button", { name: "Apply" }));

    expect(current().genre).toEqual(["Fantasy"]);
    expect(screen.queryByRole("group", { name: "Genre" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Remove filter Fantasy/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Genre\s*1/ })).toBeInTheDocument();
  });

  it("throws the ticks away when you click outside the popover", () => {
    render(<Harness />);

    openGroup("Genre");
    fireEvent.click(screen.getByRole("checkbox", { name: /Romance/ }));
    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole("group", { name: "Genre" })).not.toBeInTheDocument();
    expect(current().genre).toEqual([]);
  });

  it("starts from what is applied each time the popover is opened", () => {
    render(<Harness />);

    openGroup("Genre");
    fireEvent.click(screen.getByRole("checkbox", { name: /Romance/ }));
    fireEvent.mouseDown(document.body);
    openGroup("Genre");

    expect(screen.getByRole("checkbox", { name: /Romance/ })).not.toBeChecked();
  });

  it("clears one group with Clear", () => {
    render(<Harness />);
    openGroup("Genre");
    fireEvent.click(screen.getByRole("checkbox", { name: /Fantasy/ }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    openGroup("Shop language");
    fireEvent.click(screen.getByRole("checkbox", { name: /Ukrainian/ }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    openGroup("Genre");
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(current()).toMatchObject({ genre: [], language: ["uk"] });
  });

  it("removes a filter with its chip and everything with Clear all", () => {
    render(<Harness />);
    openGroup("Shop language");
    fireEvent.click(screen.getByRole("checkbox", { name: /Ukrainian/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Russian/ }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(screen.getByText("Shop language: UK")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove filter Shop language: UK" }));
    expect(current().language).toEqual(["ru"]);

    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(current().language).toEqual([]);
    expect(screen.queryByRole("button", { name: "Clear all" })).not.toBeInTheDocument();
  });

  it("finds a trope in a long list by typing", () => {
    render(<Harness />);

    openGroup("Trope");
    fireEvent.change(screen.getByLabelText("Find in Trope"), { target: { value: "trope 7" } });

    const group = screen.getByRole("group", { name: "Trope" });
    expect(within(group).getAllByRole("checkbox")).toHaveLength(1);
    expect(within(group).getByRole("checkbox", { name: /trope 7/ })).toBeInTheDocument();
  });

  describe("on a phone", () => {
    const openSheet = () => fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    const sheet = () => screen.getByRole("dialog", { name: "Filters" });

    it("applies a draft with 'Show n books' and says how many it will show", () => {
      render(<Harness />);

      openSheet();
      fireEvent.click(within(sheet()).getByRole("button", { name: /^Fantasy/ }));
      fireEvent.click(within(sheet()).getByRole("button", { name: /Ukrainian/ }));

      expect(within(sheet()).getByRole("button", { name: "Show 18 books" })).toBeInTheDocument();
      fireEvent.click(within(sheet()).getByRole("button", { name: "Show 18 books" }));

      expect(current()).toMatchObject({ genre: ["Fantasy"], language: ["uk"] });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Filters · 2" })).toBeInTheDocument();
    });

    it("discards the draft when the sheet is closed", () => {
      render(<Harness />);

      openSheet();
      fireEvent.click(within(sheet()).getByRole("button", { name: /^Fantasy/ }));
      fireEvent.click(within(sheet()).getByRole("button", { name: "Close" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(current().genre).toEqual([]);
    });

    it("folds a long group to five options and unfolds it on request", () => {
      render(<Harness />);

      openSheet();
      const tropes = within(sheet()).getByRole("region", { name: "Trope" });
      expect(within(tropes).getAllByRole("button", { pressed: false })).toHaveLength(5);

      fireEvent.click(within(tropes).getByRole("button", { name: "+4 more" }));

      expect(within(tropes).getAllByRole("button", { pressed: false })).toHaveLength(9);
    });

    it("clears the whole draft with Clear all", () => {
      render(<Harness />);
      openGroup("Genre");
      fireEvent.click(screen.getByRole("checkbox", { name: /Fantasy/ }));
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));

      openSheet();
      expect(within(sheet()).getByRole("button", { name: /^Fantasy/ })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      fireEvent.click(within(sheet()).getByRole("button", { name: "Clear all" }));
      fireEvent.click(within(sheet()).getByRole("button", { name: /^Show/ }));

      expect(current().genre).toEqual([]);
    });
  });
});
