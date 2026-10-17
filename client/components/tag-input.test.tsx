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
const field = () => screen.getByRole("textbox", { name: "Tropes" });

describe("TagInput", () => {
  it("offers tags you already use, with how many books carry them", () => {
    render(<Harness />);

    fireEvent.focus(field());

    expect(screen.getByText("used in 4 books")).toBeInTheDocument();
    expect(screen.getByText("used in 1 book")).toBeInTheDocument();
  });

  it("adds a brand-new tag with Enter", () => {
    render(<Harness />);

    fireEvent.change(field(), { target: { value: "slow burn" } });
    expect(screen.getByText("Create “slow burn”")).toBeInTheDocument();
    fireEvent.keyDown(field(), { key: "Enter" });

    expect(tags()).toBe("slow burn");
    expect(field()).toHaveValue("");
  });

  it("picks the highlighted suggestion with Enter", () => {
    render(<Harness />);

    fireEvent.change(field(), { target: { value: "f" } });
    fireEvent.keyDown(field(), { key: "Enter" });

    expect(tags()).toBe("found family");
  });

  it("draws the remove button inside the frame of the tag it removes", () => {
    render(<Harness initial={["Slow burn"]} />);

    const frame = screen.getByRole("button", { name: "Remove Slow burn" }).parentElement;

    expect(frame).toHaveClass("border");
    expect(frame).toHaveTextContent("Slow burn");
  });

  it("says a trope is already added, keeps the text, and does not add it twice", () => {
    render(<Harness initial={["Slow burn"]} />);

    fireEvent.change(field(), { target: { value: "slow BURN" } });

    expect(screen.getByText("Already added")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove Slow burn" }).parentElement).toHaveClass(
      "ring-burgundy",
    );

    fireEvent.keyDown(field(), { key: "," });

    expect(tags()).toBe("Slow burn");
    expect(field()).toHaveValue("slow BURN");
  });

  it("stops saying it once the text is no longer a trope you have", () => {
    render(<Harness initial={["Slow burn"]} />);

    fireEvent.change(field(), { target: { value: "slow burn" } });
    fireEvent.change(field(), { target: { value: "slow burn romance" } });

    expect(screen.queryByText("Already added")).not.toBeInTheDocument();
  });

  it("removes the last tag with Backspace on an empty field and any tag with its button", () => {
    render(<Harness initial={["a", "b", "c"]} />);

    fireEvent.keyDown(field(), { key: "Backspace" });
    expect(tags()).toBe("a|b");

    fireEvent.click(screen.getByRole("button", { name: "Remove a" }));
    expect(tags()).toBe("b");
  });

  it("keeps a long trope on one line of its own as it is typed, and counts down the last ten characters", () => {
    render(<Harness />);
    const long = "От врагов к возлюбленным / Союзники поневоле";

    fireEvent.change(field(), { target: { value: long } });

    expect(field()).toHaveValue(long);
    expect(field().tagName).toBe("TEXTAREA");
    expect(field()).toHaveClass("basis-full");
    expect(screen.queryByText(/characters left/)).not.toBeInTheDocument();

    fireEvent.change(field(), { target: { value: "x".repeat(52) } });

    expect(screen.getByText("8 characters left")).toBeInTheDocument();
    expect(field()).toHaveAttribute("maxlength", "60");
  });

  it("turns a pasted line break into a space", () => {
    render(<Harness />);

    fireEvent.change(field(), { target: { value: "slow\nburn" } });

    expect(field()).toHaveValue("slow burn");
  });

  it("refuses a thirty-first trope and says why", () => {
    const thirty = Array.from({ length: 30 }, (_, index) => `trope ${index}`);
    render(<Harness initial={thirty} />);

    fireEvent.change(field(), { target: { value: "one more" } });
    fireEvent.keyDown(field(), { key: "Enter" });

    expect(tags().split("|")).toHaveLength(30);
    expect(screen.getByText("A book can have up to 30 tropes.")).toBeInTheDocument();
  });
});
