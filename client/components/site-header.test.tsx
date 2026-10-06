import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuthProvider } from "@/lib/auth-context";
import { SiteHeader } from "./site-header";
import { HeroActions } from "./hero-actions";

const ME_URL = "http://localhost:5000/api/auth/me";
const LOGOUT_URL = "http://localhost:5000/api/auth/logout";
const ALICE = { id: "1", email: "alice@example.com", name: "Alice" };

function jsonResponse(status: number, body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function renderWithAuth(ui: React.ReactNode) {
  return render(<AuthProvider>{ui}</AuthProvider>);
}

describe("SiteHeader", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows log in and register links to a signed-out visitor", async () => {
    vi.mocked(fetch).mockImplementation(() => jsonResponse(200, null));

    renderWithAuth(<SiteHeader />);

    expect(await screen.findByRole("link", { name: "Log in" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Register" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Log out" })).not.toBeInTheDocument();
  });

  it("shows the shelf link, the user's name and log out to a signed-in user", async () => {
    vi.mocked(fetch).mockImplementation(() => jsonResponse(200, ALICE));

    renderWithAuth(<SiteHeader />);

    expect(await screen.findByRole("link", { name: "My shelf" })).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Log in" })).not.toBeInTheDocument();
  });

  it("shows no account links while the session check is in flight", () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));

    renderWithAuth(<SiteHeader />);

    expect(screen.getByRole("link", { name: "my-shelfie" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Log in" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "My shelf" })).not.toBeInTheDocument();
  });

  it("switches to the signed-out links after logging out", async () => {
    vi.mocked(fetch).mockImplementation((url) => {
      if (url === ME_URL) return jsonResponse(200, ALICE);
      if (url === LOGOUT_URL) return Promise.resolve(new Response(null, { status: 204 }));
      throw new Error(`unexpected fetch: ${url}`);
    });

    renderWithAuth(<SiteHeader />);
    fireEvent.click(await screen.findByRole("button", { name: "Log out" }));

    expect(await screen.findByRole("link", { name: "Log in" })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(LOGOUT_URL, expect.objectContaining({ method: "POST" }));
  });
});

describe("HeroActions", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("offers to get started while the session check is in flight", () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}));

    renderWithAuth(<HeroActions />);

    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/register");
  });

  it("offers the shelf to a signed-in user", async () => {
    vi.mocked(fetch).mockImplementation(() => jsonResponse(200, ALICE));

    renderWithAuth(<HeroActions />);

    expect(await screen.findByRole("link", { name: "Go to my shelf" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.queryByRole("link", { name: "Get started" })).not.toBeInTheDocument();
  });
});
