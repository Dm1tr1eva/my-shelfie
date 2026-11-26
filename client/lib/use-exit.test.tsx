import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { finishAnimation, pretendAnimations } from "@/test/helpers";
import { useExit, type ExitDone } from "./use-exit";

function Leaving({ onDone }: { onDone: ExitDone }) {
  const box = useRef<HTMLDivElement>(null);
  const { leaving, leave, onAnimationEnd } = useExit(box, onDone);

  return (
    <div ref={box} data-testid="box" data-leaving={leaving} onAnimationEnd={onAnimationEnd}>
      <span data-testid="child" />
      <button type="button" onClick={leave}>
        Leave
      </button>
    </div>
  );
}

describe("useExit", () => {
  let animations: ReturnType<typeof pretendAnimations>;

  beforeEach(() => {
    animations = pretendAnimations();
  });

  afterEach(() => {
    animations.mockRestore();
  });

  it("finishes only when its own animation ends, not when a child's ends", () => {
    const onDone = vi.fn(() => true);
    render(<Leaving onDone={onDone} />);

    fireEvent.click(screen.getByRole("button", { name: "Leave" }));
    finishAnimation(screen.getByTestId("child"));
    expect(onDone).not.toHaveBeenCalled();

    finishAnimation(screen.getByTestId("box"));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("calls onDone once however many times leaving is asked for", () => {
    const onDone = vi.fn(() => true);
    render(<Leaving onDone={onDone} />);
    const leave = screen.getByRole("button", { name: "Leave" });

    fireEvent.click(leave);
    fireEvent.click(leave);
    finishAnimation(screen.getByTestId("box"));

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("comes back, ready to leave again, when the parent keeps it", () => {
    const onDone = vi.fn();
    render(<Leaving onDone={onDone} />);
    const box = screen.getByTestId("box");

    fireEvent.click(screen.getByRole("button", { name: "Leave" }));
    expect(box).toHaveAttribute("data-leaving", "true");
    finishAnimation(box);

    expect(box).toHaveAttribute("data-leaving", "false");
    fireEvent.click(screen.getByRole("button", { name: "Leave" }));
    finishAnimation(box);
    expect(onDone).toHaveBeenCalledTimes(2);
  });

  it("stays gone when the parent says it is leaving on its own time", () => {
    render(<Leaving onDone={() => true} />);
    const box = screen.getByTestId("box");

    fireEvent.click(screen.getByRole("button", { name: "Leave" }));
    finishAnimation(box);

    expect(box).toHaveAttribute("data-leaving", "true");
  });
});
