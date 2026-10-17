import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BookCover } from "./book-cover";

describe("BookCover", () => {
  it("shows the cover without Google's page-curl corner", () => {
    const { container } = render(
      <BookCover
        title="Dune"
        url="https://books.google.com/books/content?id=vol1&zoom=1&edge=curl&source=gbs_api"
      />,
    );

    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "https://books.google.com/books/content?id=vol1&zoom=1&source=gbs_api",
    );
  });

  it("leaves a cover address that has no page curl as it is", () => {
    const { container } = render(
      <BookCover title="Dune" url="https://books.google.com/cover?id=vol1" />,
    );

    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "https://books.google.com/cover?id=vol1",
    );
  });

  it("draws a cover with the real title instead of an image when there is no cover", () => {
    const { container, getByText } = render(<BookCover title="Корона з попелу" />);

    expect(container.querySelector("img")).toBeNull();
    expect(getByText("Корона з попелу")).toBeInTheDocument();
    expect(container.querySelector("[aria-hidden='true']")).not.toBeNull();
  });

  it("gives the same book the same colour every time and spreads books over the palette", () => {
    const colourOf = (title: string) => {
      const { container } = render(<BookCover title={title} />);
      return (container.querySelector("[aria-hidden='true']") as HTMLElement).className.match(
        /bg-\w+ text-\w+/,
      )?.[0];
    };
    const titles = Array.from({ length: 40 }, (_, index) => `Book number ${index}`);
    const colours = new Set(titles.map(colourOf));

    expect(colourOf("Dune")).toBe(colourOf("Dune"));
    expect(colours.size).toBeGreaterThan(3);
  });

  it("marks the cover as a paper book or an e-book in words as well as in the icon", () => {
    const { getByRole, queryByRole, rerender } = render(<BookCover title="Dune" format="paper" />);

    expect(getByRole("img", { name: "Paper book" })).toBeInTheDocument();
    expect(queryByRole("img", { name: "E-book" })).toBeNull();

    rerender(<BookCover title="Dune" format="ebook" />);

    expect(getByRole("img", { name: "E-book" })).toBeInTheDocument();
    expect(queryByRole("img", { name: "Paper book" })).toBeNull();
  });

  it("draws no format mark when the format is not given", () => {
    const { queryByRole } = render(<BookCover title="Dune" />);

    expect(queryByRole("img")).toBeNull();
  });

  it("labels the cover with its number in the series when one is given", () => {
    const { getByText, queryByText, rerender } = render(<BookCover title="Dune" number={3} />);

    expect(getByText("#3")).toBeInTheDocument();

    rerender(<BookCover title="Dune" />);

    expect(queryByText("#3")).toBeNull();
  });
});
