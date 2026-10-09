import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { THEME_INIT_SCRIPT, THEME_KEY } from "@/lib/theme-script";
import { ThemeToggle } from "./theme-toggle";

function systemPrefersDark(dark: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: dark,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("offers the dark theme when the system is light", () => {
    systemPrefersDark(false);

    render(<ThemeToggle />);

    expect(screen.getByRole("button", { name: "Switch to dark theme" })).toBeInTheDocument();
  });

  it("offers the light theme when the system is dark", () => {
    systemPrefersDark(true);

    render(<ThemeToggle />);

    expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeInTheDocument();
  });

  it("forces the other theme on the page, keeps it, and offers the way back", () => {
    systemPrefersDark(true);
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button", { name: "Switch to light theme" }));

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem(THEME_KEY)).toBe("light");
    expect(screen.getByRole("button", { name: "Switch to dark theme" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
  });

  it("goes by the theme already on the page, whatever the system says", () => {
    systemPrefersDark(false);
    document.documentElement.dataset.theme = "dark";

    render(<ThemeToggle />);

    expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeInTheDocument();
  });

  it("still switches when the browser refuses to store the choice", () => {
    systemPrefersDark(false);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    vi.restoreAllMocks();
  });
});

describe("theme init script", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it("applies a stored theme to the page before it is drawn", () => {
    localStorage.setItem(THEME_KEY, "dark");

    new Function(THEME_INIT_SCRIPT)();

    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("ignores a stored value that is not a theme", () => {
    localStorage.setItem(THEME_KEY, "purple");

    new Function(THEME_INIT_SCRIPT)();

    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("leaves the page to the system when nothing is stored", () => {
    new Function(THEME_INIT_SCRIPT)();

    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
});
