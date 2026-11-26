import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import BookRoute from "./page";
import BookPanelOverPage from "../../@panel/(.)books/[id]/page";

vi.mock("@/components/library", () => ({
  Library: () => <main>The library</main>,
}));

vi.mock("@/components/book-panel", () => ({
  BookPanel: ({ id, closeBy }: { id: string; closeBy: string }) => (
    <div role="dialog" aria-label={`Book ${id}, closes by ${closeBy}`} />
  ),
}));

const params = Promise.resolve({ id: "b1" });

describe("book routes", () => {
  it("opened by its own address, shows the library with the panel on top, closing to the library", async () => {
    render(await BookRoute({ params }));

    expect(screen.getByRole("main")).toHaveTextContent("The library");
    expect(screen.getByRole("dialog", { name: "Book b1, closes by library" })).toBeInTheDocument();
  });

  it("opened from a page, shows only the panel, closing back to that page", async () => {
    render(await BookPanelOverPage({ params }));

    expect(screen.queryByRole("main")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Book b1, closes by back" })).toBeInTheDocument();
  });
});
