import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { mockApi, renderApp } from "@/test/helpers";
import { RegisterForm } from "./register-form";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

const fill = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

function fillValid() {
  fill("Name", "Alice");
  fill("Email", "alice@example.com");
  fill("Password", "secret123");
  fill("Confirm password", "secret123");
}

const submit = () => fireEvent.click(screen.getByRole("button", { name: "Create account" }));

async function open(handler: Parameters<typeof mockApi>[0] = () => undefined) {
  const calls = mockApi(handler, false);
  renderApp(<RegisterForm />);
  await screen.findByLabelText("Name");
  return calls;
}

describe("RegisterForm", () => {
  beforeEach(() => {
    router.push.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the password rule before anything goes wrong, and links the privacy notice", async () => {
    await open();

    expect(screen.getByText("Use at least 8 characters.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "privacy notice" })).toHaveAttribute(
      "href",
      "/privacy",
    );
  });

  it("names every empty or wrong field and does not call the server", async () => {
    const calls = await open();

    fill("Email", "not-an-email");
    fill("Password", "short");
    submit();

    expect(await screen.findByText("Enter your name.")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true");
    expect(calls).toEqual([]);
  });

  it("clears a field's message as soon as you edit that field", async () => {
    await open();

    submit();
    expect(await screen.findByText("Enter your name.")).toBeInTheDocument();
    fill("Name", "Alice");

    expect(screen.queryByText("Enter your name.")).not.toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
  });

  it("registers, signs in and opens the library", async () => {
    const calls = await open(({ path }) => {
      if (path === "/api/auth/register") {
        return { status: 201, body: { id: "1", email: "alice@example.com", name: "Alice" } };
      }
      if (path === "/api/auth/login") {
        return { body: { id: "1", email: "alice@example.com", name: "Alice" } };
      }
    });

    fillValid();
    submit();

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/library"));
    expect(calls[0]).toEqual({
      method: "POST",
      path: "/api/auth/register",
      body: { email: "alice@example.com", password: "secret123", name: "Alice" },
    });
  });

  it("puts a taken email under the email field with a way to sign in", async () => {
    await open(({ path }) => {
      if (path === "/api/auth/register") return { status: 409, body: { error: "exists" } };
    });

    fillValid();
    submit();

    expect(await screen.findByText(/This email already has an account/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in instead" })).toHaveAttribute("href", "/login");
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("puts the server's complaint about the password under the password field", async () => {
    await open(({ path }) => {
      if (path === "/api/auth/register") {
        return { status: 400, body: { error: "password: must be at least 8 characters" } };
      }
    });

    fillValid();
    submit();

    expect(await screen.findByText("must be at least 8 characters")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true");
  });

  it("falls back to one banner for an error it cannot place", async () => {
    await open(({ path }) => {
      if (path === "/api/auth/register") return { status: 500, body: { error: "boom" } };
    });

    fillValid();
    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong. Try again.");
  });
});
