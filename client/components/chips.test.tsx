import { describe, it, expect, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { resetLocale, setLocale } from "@/lib/i18n";
import { StatusDot, WishlistLabel } from "./chips";

describe("labels", () => {
  afterEach(() => {
    localStorage.clear();
    act(() => resetLocale());
  });

  it("names every reading status in one word next to its dot", () => {
    const { container } = render(
      <>
        <StatusDot status="want" />
        <StatusDot status="reading" />
        <StatusDot status="read" />
        <StatusDot status="dropped" />
      </>,
    );

    expect(Array.from(container.children, (label) => label.textContent)).toEqual([
      "To read",
      "Reading",
      "Read",
      "Dropped",
    ]);
  });

  it("calls a book you plan to read «В планах» in Russian and «У планах» in Ukrainian", () => {
    act(() => setLocale("ru"));
    const { rerender } = render(<StatusDot status="want" />);
    expect(screen.getByText("В планах")).toBeInTheDocument();

    act(() => setLocale("uk"));
    rerender(<StatusDot status="want" />);
    expect(screen.getByText("У планах")).toBeInTheDocument();
  });

  it("marks a book you do not have as in the wishlist, in the chosen language", () => {
    const { rerender } = render(<WishlistLabel />);
    expect(screen.getByText("In wishlist")).toBeInTheDocument();

    act(() => setLocale("ru"));
    rerender(<WishlistLabel />);
    expect(screen.getByText("В вишлисте")).toBeInTheDocument();

    act(() => setLocale("uk"));
    rerender(<WishlistLabel />);
    expect(screen.getByText("У вішлісті")).toBeInTheDocument();
  });
});
