import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { Select } from "./select";

const OPTIONS = [
  { value: "", label: "Any" },
  { value: "uk", label: "UK · Ukrainian", short: "UK" },
  { value: "ru", label: "RU · Russian", short: "RU" },
];

function Harness({ onChange = vi.fn() }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <>
      <Select
        label="Shop language"
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange(next);
        }}
        options={OPTIONS}
      />
      <p>outside</p>
    </>
  );
}

const combobox = () => screen.getByRole("combobox", { name: "Shop language" });

describe("Select", () => {
  it("shows the current choice and opens a list of options when clicked", () => {
    render(<Harness />);

    expect(combobox()).toHaveTextContent("Any");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    fireEvent.click(combobox());

    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Any",
      "UK · Ukrainian",
      "RU · Russian",
    ]);
    expect(screen.getByRole("option", { name: "Any" })).toHaveAttribute("aria-selected", "true");
  });

  it("applies the option you click, closes, and shows its short label", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.click(combobox());
    fireEvent.click(screen.getByRole("option", { name: "RU · Russian" }));

    expect(onChange).toHaveBeenCalledWith("ru");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(combobox()).toHaveTextContent("RU");
    expect(combobox()).not.toHaveTextContent("Russian");
  });

  it("works from the keyboard: arrows move, Enter picks, Escape closes without changing", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.keyDown(combobox(), { key: "ArrowDown" });
    fireEvent.keyDown(combobox(), { key: "ArrowDown" });
    fireEvent.keyDown(combobox(), { key: "Enter" });

    expect(onChange).toHaveBeenLastCalledWith("uk");

    fireEvent.keyDown(combobox(), { key: "ArrowDown" });
    fireEvent.keyDown(combobox(), { key: "Escape" });

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("closes when you click elsewhere", () => {
    render(<Harness />);

    fireEvent.click(combobox());
    fireEvent.mouseDown(screen.getByText("outside"));

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
