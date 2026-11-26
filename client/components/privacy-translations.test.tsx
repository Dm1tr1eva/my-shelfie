import { describe, it, expect, afterEach } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import { PrivacyContent } from "./privacy-content";
import { resetLocale, setLocale } from "@/lib/i18n";

describe("the privacy page in other languages", () => {
  afterEach(() => {
    localStorage.clear();
    act(() => resetLocale());
  });

  it("is read in Ukrainian, with the contents list and the issue link translated", () => {
    act(() => setLocale("uk"));
    render(<PrivacyContent />);

    expect(screen.getByRole("heading", { name: "Конфіденційність" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Видалення даних" })).toBeInTheDocument();
    const contents = screen.getByRole("navigation", { name: "На цій сторінці" });
    expect(
      within(contents)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual([
      "Що ми зберігаємо",
      "Пошук книг",
      "Посилання на магазини",
      "Де зберігаються твої дані",
      "Видалення даних",
      "Контакти",
    ]);
    expect(screen.getByRole("link", { name: "трекері проєкту" })).toHaveAttribute(
      "href",
      "https://github.com/Dm1tr1eva/my-shelfie/issues",
    );
  });

  it("is read in Russian and keeps the cookie name in code", () => {
    act(() => setLocale("ru"));
    render(<PrivacyContent />);

    expect(screen.getByRole("heading", { name: "Что мы храним" })).toBeInTheDocument();
    expect(screen.getByText("token").tagName).toBe("CODE");
    expect(
      screen.getByText(/отправляется через сервер приложения в Google Books API/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "трекере проекта" })).toBeInTheDocument();
  });

  it("keeps the section anchors the same in every language", () => {
    act(() => setLocale("uk"));
    render(<PrivacyContent />);

    for (const id of ["store", "search", "links", "hosting", "deleting", "contact"]) {
      expect(document.getElementById(id)).not.toBeNull();
    }
  });
});
