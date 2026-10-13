import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import PrivacyPage from "./page";

describe("privacy page", () => {
  it("gives a public contact for questions, deletion and takedown requests", () => {
    render(<PrivacyPage />);

    expect(screen.getByRole("link", { name: "the project's issue tracker" })).toHaveAttribute(
      "href",
      "https://github.com/Dm1tr1eva/my-shelfie/issues",
    );
    expect(screen.getByRole("heading", { name: "Deleting your data" })).toBeInTheDocument();
  });

  it("says what is stored and that book search goes through Google", () => {
    render(<PrivacyPage />);

    expect(screen.getByRole("heading", { name: "What we store" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Book search" })).toBeInTheDocument();
    expect(screen.getByText(/sent through this app's server to the Google/)).toBeInTheDocument();
  });

  it("lists every section in a contents list that links to it", () => {
    render(<PrivacyPage />);

    const contents = screen.getByRole("navigation", { name: "On this page" });
    const links = within(contents).getAllByRole("link");

    expect(links.map((link) => link.textContent)).toEqual([
      "What we store",
      "Book search",
      "Shop links",
      "Where your data lives",
      "Deleting your data",
      "Contact",
    ]);
    for (const link of links) {
      const id = link.getAttribute("href")?.slice(1) as string;
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it("does not promise Google sign-in, which the app does not have, or leave placeholders", () => {
    render(<PrivacyPage />);

    expect(screen.queryByText(/Continue with Google/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\[[A-Z ]+\]/)).not.toBeInTheDocument();
  });
});
