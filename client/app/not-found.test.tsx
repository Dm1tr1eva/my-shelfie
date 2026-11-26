import { describe, it, expect, afterEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { resetLocale, setLocale } from "@/lib/i18n";
import NotFoundPage from "./not-found";

describe("NotFoundPage", () => {
  afterEach(() => {
    localStorage.clear();
    act(() => resetLocale());
    document.head.querySelectorAll("title").forEach((title) => title.remove());
  });

  it("says the page does not exist and leads back to the home page", () => {
    render(<NotFoundPage />);

    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the home page" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("names the tab in the chosen language and keeps it when the page writes its English title back", async () => {
    const title = document.createElement("title");
    title.textContent = "Page not found · My Shelfie";
    document.head.appendChild(title);
    act(() => setLocale("uk"));

    render(<NotFoundPage />);
    expect(document.title).toBe("Сторінку не знайдено · My Shelfie");

    title.textContent = "Page not found · My Shelfie";
    await waitFor(() => expect(document.title).toBe("Сторінку не знайдено · My Shelfie"));
  });
});
