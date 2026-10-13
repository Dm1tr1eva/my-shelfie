import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { mockApi, renderApp } from "@/test/helpers";
import { AppFrame } from "./app-frame";

const route = vi.hoisted(() => ({ pathname: "/library" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => route.pathname,
}));

describe("AppFrame", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
