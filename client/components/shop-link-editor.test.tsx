import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { ShopLinkEditor, validLinks, type LinkRow } from "./shop-link-editor";

function Harness({ initial }: { initial: LinkRow[] }) {
  const [rows, setRows] = useState(initial);
  return (
    <>
      <ShopLinkEditor rows={rows} onChange={setRows} />
      <output data-testid="saved">{JSON.stringify(validLinks(rows))}</output>
    </>
  );
}

describe("validLinks", () => {
  it("keeps only web addresses and trims them", () => {
    const rows: LinkRow[] = [
      { kind: "paper", language: "uk", url: "  https://yakaboo.ua/a  " },
      { kind: "paper", language: "ru", url: "yakaboo.ua/b" },
      { kind: "paper", language: "en", url: "javascript:alert(1)" },
      { kind: "paper", language: "other", url: "" },
    ];

    expect(validLinks(rows)).toEqual([
      { kind: "paper", language: "uk", url: "https://yakaboo.ua/a" },
    ]);
  });
});

describe("ShopLinkEditor", () => {
  it("starts a new link as a paper book link and saves the kind you choose for it", () => {
    render(<Harness initial={[{ kind: "paper", language: "uk", url: "" }]} />);

    fireEvent.click(screen.getByRole("button", { name: "Add another link" }));
    fireEvent.change(screen.getByLabelText("URL of link 2"), {
      target: { value: "https://library.example/free" },
    });
    fireEvent.click(screen.getByRole("combobox", { name: "Kind of link 2" }));
    fireEvent.click(screen.getByRole("option", { name: "Free e-book download" }));

    expect(JSON.parse(screen.getByTestId("saved").textContent ?? "")).toEqual([
      { kind: "free", language: "uk", url: "https://library.example/free" },
    ]);
  });

  it("warns about an address that does not start with https and leaves it out of the saved links", () => {
    render(<Harness initial={[{ kind: "paper", language: "uk", url: "" }]} />);

    fireEvent.change(screen.getByLabelText("URL of link 1"), {
      target: { value: "yakaboo.ua/book" },
    });

    expect(screen.getByText("Start the link with https://")).toBeInTheDocument();
    expect(screen.getByTestId("saved").textContent).toBe("[]");
  });

  it("adds another row and removes a row", () => {
    render(<Harness initial={[{ kind: "paper", language: "uk", url: "https://a.example/x" }]} />);

    fireEvent.click(screen.getByRole("button", { name: "Add another link" }));
    fireEvent.change(screen.getByLabelText("URL of link 2"), {
      target: { value: "https://b.example/y" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Remove link 1" }));

    expect(screen.getByTestId("saved").textContent).toBe(
      JSON.stringify([{ kind: "paper", language: "uk", url: "https://b.example/y" }]),
    );
  });
});
