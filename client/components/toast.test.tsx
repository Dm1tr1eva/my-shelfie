import { describe, it, expect, vi, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { TOAST_DURATION_MS, Toast, type ToastMessage } from "./toast";
import { finishAnimation, pretendAnimations } from "@/test/helpers";

function renderToast(toast: ToastMessage) {
  const onDismiss = vi.fn();
  render(<Toast toast={toast} onDismiss={onDismiss} />);
  return onDismiss;
}

describe("Toast", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("goes away by itself after a few seconds", () => {
    vi.useFakeTimers();
    const onDismiss = renderToast({ id: 1, tone: "done", text: "Saved" });

    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1));
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("runs Undo and goes away when Undo is pressed", () => {
    const onUndo = vi.fn();
    const onDismiss = renderToast({ id: 1, tone: "done", text: "Saved", onUndo });

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));

    expect(onUndo).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("keeps an error on screen with Retry until it is dismissed", () => {
    vi.useFakeTimers();
    const onRetry = vi.fn();
    const onDismiss = renderToast({ id: 1, tone: "error", text: "Could not save", onRetry });

    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS * 3));

    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Could not save");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("slides away before it is dismissed when its time is up", () => {
    vi.useFakeTimers();
    const animations = pretendAnimations();
    const onDismiss = renderToast({ id: 1, tone: "done", text: "Saved" });
    const card = screen.getByText("Saved").parentElement as HTMLElement;

    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS));

    expect(card.className).toContain("animate-rise-out");
    expect(onDismiss).not.toHaveBeenCalled();
    finishAnimation(card);
    expect(onDismiss).toHaveBeenCalledOnce();
    animations.mockRestore();
  });
});
