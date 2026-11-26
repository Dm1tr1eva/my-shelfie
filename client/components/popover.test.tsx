import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { finishAnimation, pretendAnimations } from "@/test/helpers";
import { Popover } from "./popover";

describe("Popover", () => {
  afterEach(() => {
    vi.mocked(window.matchMedia).mockImplementation(
      (query: string) =>
        ({
          matches: false,
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList,
    );
  });

  it("on a wide screen plays its closing animation before it goes on Escape", () => {
    vi.mocked(window.matchMedia).mockImplementation(
      (query: string) =>
        ({
          matches: true,
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }) as unknown as MediaQueryList,
    );
    const animations = pretendAnimations();
    const onClose = vi.fn();
    render(
      <div>
        <Popover id="goal" label="Change goal" onClose={onClose}>
          <button type="button">Save</button>
        </Popover>
      </div>,
    );
    const card = screen.getByRole("dialog", { name: "Change goal" });

    fireEvent.keyDown(document, { key: "Escape" });

    expect(card.className).toContain("animate-pop-out");
    expect(onClose).not.toHaveBeenCalled();
    finishAnimation(card);
    expect(onClose).toHaveBeenCalledOnce();
    animations.mockRestore();
  });
});
