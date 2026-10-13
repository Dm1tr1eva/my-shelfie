import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { mockApi, renderApp } from "@/test/helpers";
import { LoginForm } from "./login-form";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

const fill = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("LoginForm", () => {
  beforeEach(() => {
    router.push.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("welcomes you back and offers email sign-in and account creation only", async () => {
    mockApi(() => undefined, false);
    renderApp(<LoginForm />);

    expect(await screen.findByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(screen.queryByText(/Google/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Forgot password/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("shows and hides the password on request", async () => {
    mockApi(() => undefined, false);
    renderApp(<LoginForm />);

    const input = await screen.findByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("asks for both fields without calling the server when one is empty", async () => {
    const calls = mockApi(() => undefined, false);
    renderApp(<LoginForm />);
    await screen.findByLabelText("Email");

    fill("Email", "alice@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Enter your email and password.");
    expect(calls).toEqual([]);
  });

  it("answers a wrong password with one banner that does not say which field was wrong", async () => {
    mockApi(({ path }) => {
      if (path === "/api/auth/login") return { status: 401, body: { error: "Invalid" } };
    }, false);
    renderApp(<LoginForm />);
    await screen.findByLabelText("Email");

    fill("Email", "alice@example.com");
    fill("Password", "wrong-password");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    const banner = await screen.findByRole("alert");
    expect(banner).toHaveTextContent("That email and password do not match an account.");
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText("Password")).not.toHaveAttribute("aria-invalid");
  });

  it("signs in and opens the library", async () => {
    const calls = mockApi(({ path }) => {
      if (path === "/api/auth/login") {
        return { body: { id: "1", email: "alice@example.com", name: "Alice" } };
      }
    }, false);
    renderApp(<LoginForm />);
    await screen.findByLabelText("Email");

    fill("Email", " alice@example.com ");
    fill("Password", "secret123");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/library"));
    expect(calls).toContainEqual({
      method: "POST",
      path: "/api/auth/login",
      body: { email: "alice@example.com", password: "secret123" },
    });
  });
});
