import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { SegmentState } from "@/lib/shelves";
import { SeriesSegments } from "./series-segments";

function statesOf(image: HTMLElement) {
  return [...image.querySelectorAll("[data-state]")].map((item) => item.getAttribute("data-state"));
}

describe("SeriesSegments", () => {
  it("draws one segment per book, coloured by owned, wanted and missing, and says how many you own", () => {
    render(
      <SeriesSegments states={["owned", "owned", "wanted", "missing", "missing", "missing"]} />,
    );

    const image = screen.getByRole("img", { name: "Own 2 of 6" });
    expect(statesOf(image)).toEqual(["owned", "owned", "wanted", "missing", "missing", "missing"]);
    expect(image).not.toHaveTextContent("+");
  });

  it("stops at ten segments and adds a +N for the rest, still counting the whole series", () => {
    const states: SegmentState[] = [
      ...Array<SegmentState>(5).fill("owned"),
      "wanted",
      ...Array<SegmentState>(6).fill("missing"),
    ];
    render(<SeriesSegments states={states} />);

    const image = screen.getByRole("img", { name: "Own 5 of 12" });
    expect(statesOf(image)).toHaveLength(10);
    expect(image).toHaveTextContent("+2");
  });
});
