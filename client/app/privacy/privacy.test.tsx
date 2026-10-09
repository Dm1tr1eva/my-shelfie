import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PrivacyPage from "./page";

describe("privacy page", () => {
  it("gives a public takedown and deletion contact", () => {
    render(<PrivacyPage />);

    expect(screen.getByRole("link", { name: "the project's issue tracker" })).toHaveAttribute(
      "href",
      "https://github.com/Dm1tr1eva/my-shelfie/issues",
    );
  });

  it("says what is stored and that book search goes through Google", () => {
    render(<PrivacyPage />);

    expect(screen.getByRole("heading", { name: "What it stores" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Book search" })).toBeInTheDocument();
    expect(screen.getByText(/sent through this app's server to the Google/)).toBeInTheDocument();
  });
});
