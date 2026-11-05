import { describe, it, expect, vi, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { AuthProvider } from "@/lib/auth-context";
import { mockApi, renderApp } from "@/test/helpers";
import { AppFrame } from "./app-frame";

const route = vi.hoisted(() => ({ pathname: "/library" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => route.pathname,
}));

describe("AppFrame", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
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
    expect(screen.queryByRole("link", { name: "Wishlist" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Next to buy" })).not.toBeInTheDocument();
  });

  it("gives a signed-in user the three sections and an add button, with the current one marked", async () => {
    route.pathname = "/series/saga";
    mockApi(() => undefined);
    renderApp(
      <AppFrame>
        <p>page</p>
      </AppFrame>,
    );

    const [wishlist] = await screen.findAllByRole("link", { name: "Wishlist" });
    const [next] = screen.getAllByRole("link", { name: "Next to buy" });
    const [add] = screen.getAllByRole("link", { name: /Add a book/ });

    expect(wishlist).toHaveAttribute("href", "/wishlist");
    expect(next).toHaveAttribute("href", "/next");
    expect(add).toHaveAttribute("href", "/add");
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
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

  it("sends a signed-in user to the home page from the logo", async () => {
    route.pathname = "/library";
    mockApi(() => undefined);
    renderApp(
      <AppFrame>
        <p>page</p>
      </AppFrame>,
    );

    await screen.findAllByRole("link", { name: "Wishlist" });

    expect(screen.getByRole("link", { name: "my-shelfie" })).toHaveAttribute("href", "/");
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
