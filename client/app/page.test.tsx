import { describe, it, expect, vi, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import { mockApi, renderApp } from "@/test/helpers";
import Home from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe("home page", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("says what the app is for and offers to start a shelf to a visitor", async () => {
    mockApi(() => undefined, false);
    renderApp(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: /Your books, shelved by series\./ }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Start your shelf/ })).toHaveAttribute(
      "href",
      "/register",
    );
    expect(screen.getByRole("link", { name: "I already have an account" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("sends a signed-in visitor to the library instead", async () => {
    mockApi(() => undefined, true);
    renderApp(<Home />);

    expect(await screen.findByRole("link", { name: /Open my library/ })).toHaveAttribute(
      "href",
      "/library",
    );
    expect(screen.queryByRole("link", { name: /Start your shelf/ })).not.toBeInTheDocument();
  });

  it("presents the three things the app does", () => {
    mockApi(() => undefined, false);
    renderApp(<Home />);

    for (const title of ["Collect by series", "Spot the gaps", "Know where to buy"]) {
      expect(screen.getByRole("heading", { level: 3, name: title })).toBeInTheDocument();
    }
  });
});
