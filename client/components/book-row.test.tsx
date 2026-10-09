import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookRow } from "./book-row";
import type { Book } from "@/lib/books";

const BOOK: Book = {
  id: "abc123",
  userId: "u1",
  title: "Dracula",
  author: "Bram Stoker",
  status: "read",
  createdAt: "2026-10-09T10:00:00.000Z",
  updatedAt: "2026-10-09T10:00:00.000Z",
};

describe("BookRow", () => {
  it("links the title to the book's page and shows the author and status", () => {
    render(<BookRow book={BOOK} />);

    expect(screen.getByRole("link", { name: "Dracula" })).toHaveAttribute(
      "href",
      "/dashboard/books/abc123",
    );
    expect(screen.getByText("Bram Stoker")).toBeInTheDocument();
    expect(screen.getByText("Read")).toBeInTheDocument();
  });

  it("shows the cover when the book has one", () => {
    const { container } = render(
      <BookRow book={{ ...BOOK, coverUrl: "https://books.google.com/cover?id=vol1" }} />,
    );

    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "https://books.google.com/cover?id=vol1",
    );
  });

  it("shows no image when the book has no cover", () => {
    const { container } = render(<BookRow book={BOOK} />);

    expect(container.querySelector("img")).toBeNull();
  });
});
