import { describe, it, expect, afterEach, vi } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { LocaleEffects } from "./locale-effects";
import { resetLocale, setLocale } from "@/lib/i18n";

const navigation = vi.hoisted(() => ({ pathname: "/library" }));

vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));

function addTitle(text: string) {
  const title = document.createElement("title");
  title.textContent = text;
  document.head.insertBefore(title, document.head.querySelector("title"));
  return title;
}

describe("LocaleEffects", () => {
  afterEach(() => {
    localStorage.clear();
    act(() => resetLocale());
    document.head.querySelectorAll("title").forEach((title) => title.remove());
    navigation.pathname = "/library";
  });

  it("keeps the tab title in the chosen language when the page writes its English title back", async () => {
    const title = addTitle("Library · My Shelfie");
    act(() => setLocale("ru"));
    render(<LocaleEffects />);
    expect(document.title).toBe("Библиотека · My Shelfie");

    title.textContent = "Library · My Shelfie";

    await waitFor(() => expect(document.title).toBe("Библиотека · My Shelfie"));
  });

  it("keeps the tab title in the chosen language when a new English title is put in front", async () => {
    addTitle("Library · My Shelfie");
    act(() => setLocale("uk"));
    render(<LocaleEffects />);

    addTitle("Library · My Shelfie");

    await waitFor(() => expect(document.title).toBe("Бібліотека · My Shelfie"));
  });

  it("leaves the title alone once it is unmounted", async () => {
    addTitle("Library · My Shelfie");
    act(() => setLocale("uk"));
    const { unmount } = render(<LocaleEffects />);
    unmount();

    addTitle("Privacy · My Shelfie");
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(document.title).toBe("Privacy · My Shelfie");
  });

  it("leaves the not-found title of a deeper path under a book or a series alone", () => {
    for (const path of ["/books/abc/more", "/series/abc/more"]) {
      addTitle("Page not found · My Shelfie");
      act(() => setLocale("ru"));
      navigation.pathname = path;
      const { unmount } = render(<LocaleEffects />);

      expect(document.title).toBe("Page not found · My Shelfie");
      unmount();
    }
  });
});
