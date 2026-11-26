import { describe, it, expect, vi, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { SWRConfig } from "swr";
import { AuthProvider } from "@/lib/auth-context";
import { resetLocale, setLocale } from "@/lib/i18n";
import { mockApi, renderApp } from "@/test/helpers";
import { AppFrame } from "./app-frame";
import { MobileHeader } from "./mobile-header";
import { TabBar } from "./tab-bar";

const route = vi.hoisted(() => ({ pathname: "/library" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => route.pathname,
}));

describe("AppFrame", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
    act(() => resetLocale());
  });

  describe("while the session is being checked", () => {
    function sessionPending() {
      let answer: (body: unknown) => void = () => {};
      vi.stubGlobal(
        "fetch",
        vi.fn(
          () =>
            new Promise<Response>((resolve) => {
              answer = (body) => resolve(new Response(JSON.stringify(body)));
            }),
        ),
      );
      return (body: unknown) => answer(body);
    }

    function renderFrame() {
      renderApp(
        <AppFrame>
          <p>page</p>
        </AppFrame>,
      );
    }

    it("shows a loading message instead of a blank page on a private page", () => {
      route.pathname = "/library";
      sessionPending();
      renderFrame();

      expect(screen.getByRole("status")).toHaveTextContent("Loading your library…");
      expect(screen.queryByText("page")).not.toBeInTheDocument();
      expect(screen.queryByText(/waking up/)).not.toBeInTheDocument();
    });

    it("says the server may be waking up once the wait has gone on for a few seconds", () => {
      vi.useFakeTimers();
      route.pathname = "/library";
      sessionPending();
      renderFrame();

      act(() => {
        vi.advanceTimersByTime(4900);
      });
      expect(screen.queryByText(/waking up/)).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByText(/waking up after a pause/)).toBeInTheDocument();
    });

    it("draws the public pages at once, without waiting for the session", () => {
      sessionPending();

      for (const path of ["/", "/login", "/register", "/privacy"]) {
        route.pathname = path;
        const { unmount } = render(
          <SWRConfig value={{ provider: () => new Map() }}>
            <AuthProvider>
              <AppFrame>
                <p>page at {path}</p>
              </AppFrame>
            </AuthProvider>
          </SWRConfig>,
        );

        expect(screen.getByText(`page at ${path}`)).toBeInTheDocument();
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
        unmount();
      }
    });

    it("swaps the message for the page when the session answers", async () => {
      route.pathname = "/library";
      const answer = sessionPending();
      renderFrame();

      await act(async () => {
        answer({ id: "1", email: "alice@example.com", name: "Alice" });
      });

      expect(await screen.findByText("page")).toBeInTheDocument();
      expect(screen.queryByText("Loading your library…")).not.toBeInTheDocument();
    });
  });

  it("offers a sign-in link and no library navigation to a visitor", async () => {
    mockApi(() => undefined, false);
    renderApp(
      <AppFrame>
        <p>page</p>
      </AppFrame>,
    );

    expect(await screen.findByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "My Shelfie" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("link", { name: "Wishlist" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Next to buy" })).not.toBeInTheDocument();
  });

  it("gives a signed-in user the library, the wishlist and an add button, and no Next to buy", async () => {
    route.pathname = "/library";
    mockApi(() => undefined);
    renderApp(
      <AppFrame>
        <p>page</p>
      </AppFrame>,
    );

    const wishlist = await screen.findAllByRole("link", { name: "Wishlist" });
    const library = screen.getAllByRole("link", { name: "Library" });
    const add = screen.getAllByRole("link", { name: /Add a book/ });

    for (const link of wishlist) expect(link).toHaveAttribute("href", "/wishlist");
    for (const link of library) expect(link).toHaveAttribute("href", "/library");
    for (const link of add) expect(link).toHaveAttribute("href", "/add");
    expect(screen.queryByRole("link", { name: "Next to buy" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
  });

  it.each([
    ["/library", "Library"],
    ["/series/saga", "Library"],
    ["/wishlist", "Wishlist"],
    ["/", "nothing"],
    ["/books/one", "nothing"],
    ["/next", "nothing"],
  ])("on %s highlights %s", async (path, current) => {
    route.pathname = path;
    mockApi(() => undefined);
    renderApp(
      <AppFrame>
        <p>page</p>
      </AppFrame>,
    );

    await screen.findAllByRole("link", { name: "Add a book" });
    const expected = { Library: ["/library"], Wishlist: ["/wishlist"], nothing: [] }[current];
    const [nav, tabBar] = screen.getAllByRole("navigation", { name: "Main" });

    for (const bar of [nav, tabBar]) {
      const highlighted = within(bar)
        .getAllByRole("link")
        .filter((link) => link.getAttribute("aria-current") === "page")
        .map((link) => link.getAttribute("href"));
      expect(highlighted).toEqual(expected);
    }
    expect(within(tabBar).getByRole("link", { name: "Add a book" })).toBeInTheDocument();
  });

  it("lets a visitor switch the language in the public header", async () => {
    route.pathname = "/";
    mockApi(() => undefined, false);
    renderApp(
      <AppFrame>
        <p>page</p>
      </AppFrame>,
    );

    await screen.findByRole("link", { name: "Sign in" });
    fireEvent.click(screen.getByRole("button", { name: "RU" }));

    expect(screen.getByRole("link", { name: "Войти" })).toHaveAttribute("href", "/login");
  });

  it("lets a signed-in user switch the language from the account menu", async () => {
    route.pathname = "/library";
    mockApi(() => undefined);
    renderApp(
      <AppFrame>
        <p>page</p>
      </AppFrame>,
    );

    const [logOut] = await screen.findAllByRole("button", { name: "Log out" });
    const menu = logOut.parentElement!;
    fireEvent.click(
      within(within(menu).getByRole("group", { name: "Language" })).getByRole("button", {
        name: "UK",
      }),
    );

    expect(screen.getAllByRole("button", { name: "Вийти" }).length).toBeGreaterThan(0);
  });

  it("gives a phone a way back to the library from an inner page", async () => {
    route.pathname = "/series/saga";
    mockApi(() => undefined);
    renderApp(
      <AppFrame>
        <p>page</p>
      </AppFrame>,
    );

    expect(await screen.findByRole("link", { name: "Back to Library" })).toHaveAttribute(
      "href",
      "/library",
    );
  });

  it("puts the install button in the account menu once the browser offers it", async () => {
    mockApi(() => undefined);
    renderApp(
      <AppFrame>
        <p>page</p>
      </AppFrame>,
    );
    await screen.findAllByRole("link", { name: "Wishlist" });

    expect(screen.queryByRole("button", { name: "Install app" })).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(
        Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
          prompt: vi.fn(),
          userChoice: Promise.resolve({ outcome: "dismissed" }),
        }),
      );
    });

    expect((await screen.findAllByRole("button", { name: "Install app" })).length).toBeGreaterThan(
      0,
    );
  });

  it("sends a signed-in user to Home from the logo", async () => {
    route.pathname = "/library";
    mockApi(() => undefined);
    renderApp(
      <AppFrame>
        <p>page</p>
      </AppFrame>,
    );

    await screen.findAllByRole("link", { name: "Wishlist" });

    const logos = screen.getAllByRole("link", { name: "My Shelfie" });
    expect(logos.length).toBeGreaterThan(0);
    for (const logo of logos) expect(logo).toHaveAttribute("href", "/dashboard");
  });

  it("marks the section you are in as the current page", async () => {
    route.pathname = "/wishlist";
    mockApi(() => undefined);
    renderApp(
      <AppFrame>
        <p>page</p>
      </AppFrame>,
    );

    const wishlist = await screen.findAllByRole("link", { name: "Wishlist" });

    for (const link of wishlist) {
      expect(link).toHaveAttribute("aria-current", "page");
    }
    for (const link of screen.getAllByRole("link", { name: "Library" })) {
      expect(link).not.toHaveAttribute("aria-current");
    }
  });
  it("logs out from the account menu", async () => {
    route.pathname = "/library";
    const calls = mockApi(({ method, path }) => {
      if (method === "POST" && path === "/api/auth/logout") return { status: 204 };
    });
    renderApp(
      <AppFrame>
        <p>page</p>
      </AppFrame>,
    );

    const [logout] = await screen.findAllByRole("button", { name: "Log out" });
    fireEvent.click(logout);

    await waitFor(() => expect(calls.some((call) => call.path === "/api/auth/logout")).toBe(true));
    expect(await screen.findByRole("link", { name: "Sign in" })).toBeInTheDocument();
  });
});

describe("TabBar", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the library, add and wishlist as icons named for screen readers", () => {
    route.pathname = "/library";
    renderApp(<TabBar />);

    const bar = screen.getByRole("navigation", { name: "Main" });
    const links = within(bar).getAllByRole("link");

    expect(links.map((link) => link.getAttribute("aria-label"))).toEqual([
      "Library",
      "Add a book",
      "Wishlist",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/library",
      "/add",
      "/wishlist",
    ]);
    expect(bar).toHaveTextContent(/^$/);
  });
});

describe("MobileHeader", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    act(() => resetLocale());
  });

  it("shows the logo and the account on a top-level page", async () => {
    route.pathname = "/wishlist";
    mockApi(() => undefined);
    renderApp(<MobileHeader />);

    expect(await screen.findByLabelText("Account")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My Shelfie" })).toHaveAttribute("href", "/dashboard");
  });

  it.each(["/series/saga", "/books/one", "/add", "/add/one/details"])(
    "leads back to the library from the inner page %s",
    async (path) => {
      route.pathname = path;
      mockApi(() => undefined);
      renderApp(<MobileHeader />);

      const back = await screen.findByRole("link", { name: "Back to Library" });
      expect(back).toHaveAttribute("href", "/library");
      expect(screen.queryByRole("link", { name: "My Shelfie" })).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Account")).not.toBeInTheDocument();
    },
  );

  it.each([
    ["en", "Library", "Back to Library"],
    ["ru", "Библиотека", "Назад: Библиотека"],
    ["uk", "Бібліотека", "Назад: Бібліотека"],
  ] as const)(
    "names the back link in %s with the word it shows, %s",
    async (locale, visible, name) => {
      act(() => setLocale(locale));
      route.pathname = "/series/saga";
      mockApi(() => undefined);
      renderApp(<MobileHeader />);

      const back = await screen.findByRole("link", { name });
      expect(back).toHaveAccessibleName(expect.stringContaining(visible));
      expect(back).not.toHaveAttribute("aria-label");
    },
  );
});
