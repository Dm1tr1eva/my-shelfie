import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BookCover } from "./book-cover";

describe("BookCover", () => {
  it("shows the cover without Google's page-curl corner", () => {
    const { container } = render(
      <BookCover url="https://books.google.com/books/content?id=vol1&zoom=1&edge=curl&source=gbs_api" />,
    );

    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "https://books.google.com/books/content?id=vol1&zoom=1&source=gbs_api",
    );
  });

  it("leaves a cover address that has no page curl as it is", () => {
    const { container } = render(<BookCover url="https://books.google.com/cover?id=vol1" />);

    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "https://books.google.com/cover?id=vol1",
    );
  });

  it("draws an empty placeholder instead of an image when there is no cover", () => {
    const { container } = render(<BookCover />);

    expect(container.querySelector("img")).toBeNull();
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });
});
