import { describe, it, expect, afterEach, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { LanguageSwitch } from "./language-switch";
import { LocaleEffects } from "./locale-effects";
import { SiteFooter } from "./site-footer";
import { resetLocale, setLocale } from "@/lib/i18n";
import { englishDomain, makeDomain } from "@/lib/i18n/domain";
import { translator } from "@/lib/i18n";

vi.mock("next/navigation", () => ({ usePathname: () => "/library" }));

describe("LanguageSwitch", () => {
  afterEach(() => {
    localStorage.clear();
    act(() => resetLocale());
    document.documentElement.lang = "en";
    document.title = "";
  });

  it("offers the three languages and marks the one in use", () => {
    render(<LanguageSwitch />);

    expect(screen.getByRole("group", { name: "Language" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "EN" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "RU" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "UK" })).toHaveAttribute("aria-pressed", "false");
  });

  it("changes the words on the page at once and remembers the choice", () => {
    render(
      <>
        <LanguageSwitch />
        <SiteFooter />
      </>,
    );
    expect(screen.getByText("Source on GitHub")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "UK" }));

    expect(screen.getByText("Вихідний код на GitHub")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Мова" })).toBeInTheDocument();
    expect(localStorage.getItem("my-shelfie:locale")).toBe("uk");

    fireEvent.click(screen.getByRole("button", { name: "RU" }));

    expect(screen.getByText("Исходный код на GitHub")).toBeInTheDocument();
  });

  it("starts from the language saved in the browser", () => {
    localStorage.setItem("my-shelfie:locale", "ru");
    act(() => resetLocale());

    render(<SiteFooter />);

    expect(screen.getByText("Конфиденциальность")).toBeInTheDocument();
  });

  it("sets the language of the page and the title of the tab", () => {
    render(<LocaleEffects />);
    expect(document.title).toBe("Library · My Shelfie");

    act(() => setLocale("uk"));

    expect(document.documentElement.lang).toBe("uk");
    expect(document.title).toBe("Бібліотека · My Shelfie");
  });
});

describe("the names of statuses and genres", () => {
  it("are translated, and a genre of your own is shown as you typed it", () => {
    const uk = makeDomain(translator("uk"));

    expect(englishDomain.status("read")).toBe("Read");
    expect(uk.status("read")).toBe("Прочитано");
    expect(uk.genre("Fantasy")).toBe("Фентезі");
    expect(uk.genre("Мій жанр")).toBe("Мій жанр");
  });
});
