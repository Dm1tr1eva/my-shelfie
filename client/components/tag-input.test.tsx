import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { TagInput } from "./tag-input";

function Harness({ initial = [] as string[] }) {
  const [tags, setTags] = useState(initial);
  return (
    <>
      <TagInput
        label="Tropes"
        value={tags}
        onChange={setTags}
        suggestions={[
          { name: "enemies to lovers", count: 4 },
          { name: "found family", count: 1 },
        ]}
      />
      <output data-testid="tags">{tags.join("|")}</output>
    </>
  );
}

const tags = () => screen.getByTestId("tags").textContent;

describe("TagInput", () => {
  it("offers tags you already use, with how many books carry them", () => {
    render(<Harness />);

    fireEvent.focus(screen.getByRole("combobox", { name: "Tropes" }));

    expect(screen.getByText("used in 4 books")).toBeInTheDocument();
    expect(screen.getByText("used in 1 book")).toBeInTheDocument();
  });

  it("adds a brand-new tag with Enter", () => {
    render(<Harness />);
    const input = screen.getByRole("combobox", { name: "Tropes" });

    fireEvent.change(input, { target: { value: "slow burn" } });
    expect(screen.getByText("Create “slow burn”")).toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Enter" });

    expect(tags()).toBe("slow burn");
    expect(input).toHaveValue("");
  });

  it("picks the highlighted suggestion with Enter", () => {
    render(<Harness />);
    const input = screen.getByRole("combobox", { name: "Tropes" });

    fireEvent.change(input, { target: { value: "f" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(tags()).toBe("found family");
  });

  it("does not add the same tag twice, whatever its case", () => {
    render(<Harness initial={["Slow burn"]} />);
    const input = screen.getByRole("combobox", { name: "Tropes" });

    fireEvent.change(input, { target: { value: "slow BURN" } });
    fireEvent.keyDown(input, { key: "," });

    expect(tags()).toBe("Slow burn");
  });

  it("removes the last tag with Backspace on an empty field and any tag with its button", () => {
    render(<Harness initial={["a", "b", "c"]} />);
    const input = screen.getByRole("combobox", { name: "Tropes" });

    fireEvent.keyDown(input, { key: "Backspace" });
    expect(tags()).toBe("a|b");

    fireEvent.click(screen.getByRole("button", { name: "Remove a" }));
    expect(tags()).toBe("b");
  });
});
