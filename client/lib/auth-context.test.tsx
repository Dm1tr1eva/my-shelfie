import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "./auth-context";

const ME_URL = "http://localhost:5000/api/auth/me";
const LOGIN_URL = "http://localhost:5000/api/auth/login";
const REGISTER_URL = "http://localhost:5000/api/auth/register";
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

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider });
}

describe("AuthProvider / useAuth", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws when used outside an AuthProvider", () => {
    // Suppress the expected console.error React logs for the thrown render.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used inside an AuthProvider",
    );
    spy.mockRestore();
  });

  it("starts loading, then settles on anonymous when /me answers 401", async () => {
    vi.mocked(fetch).mockImplementation((url) => {
      if (url === ME_URL) return jsonResponse(401, { error: "Not authenticated" });
      throw new Error(`unexpected fetch: ${url}`);
    });

    const { result } = renderAuth();

    expect(result.current.status).toBe("loading");

    await waitFor(() => expect(result.current.status).toBe("anonymous"));
    expect(result.current.user).toBeNull();
  });

  it("settles on authenticated with the user when /me succeeds", async () => {
    vi.mocked(fetch).mockImplementation((url) => {
      if (url === ME_URL) return jsonResponse(200, ALICE);
      throw new Error(`unexpected fetch: ${url}`);
    });

    const { result } = renderAuth();

    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current.user).toEqual(ALICE);
  });

  it("login() updates user and status on success", async () => {
    vi.mocked(fetch).mockImplementation((url) => {
      if (url === ME_URL) return jsonResponse(401, { error: "Not authenticated" });
      if (url === LOGIN_URL) return jsonResponse(200, ALICE);
      throw new Error(`unexpected fetch: ${url}`);
    });

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.status).toBe("anonymous"));

    await act(async () => {
      await result.current.login("alice@example.com", "secret123");
    });

    expect(result.current.status).toBe("authenticated");
    expect(result.current.user).toEqual(ALICE);
  });

  it("login() throws and leaves the caller anonymous on invalid credentials", async () => {
    vi.mocked(fetch).mockImplementation((url) => {
      if (url === ME_URL) return jsonResponse(401, { error: "Not authenticated" });
      if (url === LOGIN_URL) return jsonResponse(401, { error: "Invalid email or password" });
      throw new Error(`unexpected fetch: ${url}`);
    });

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.status).toBe("anonymous"));

    await expect(
      act(async () => {
        await result.current.login("alice@example.com", "wrong");
      }),
    ).rejects.toThrow("Invalid email or password");

    expect(result.current.status).toBe("anonymous");
    expect(result.current.user).toBeNull();
  });

  it("register() calls register then login, so the caller ends up signed in", async () => {
    const calledUrls: string[] = [];
    vi.mocked(fetch).mockImplementation((url) => {
      calledUrls.push(String(url));
      if (url === ME_URL) return jsonResponse(401, { error: "Not authenticated" });
      if (url === REGISTER_URL) return jsonResponse(201, ALICE);
      if (url === LOGIN_URL) return jsonResponse(200, ALICE);
      throw new Error(`unexpected fetch: ${url}`);
    });

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.status).toBe("anonymous"));

    await act(async () => {
      await result.current.register("alice@example.com", "secret123", "Alice");
    });

    expect(result.current.status).toBe("authenticated");
    expect(calledUrls).toContain(REGISTER_URL);
    expect(calledUrls).toContain(LOGIN_URL);
  });

  it("logout() clears the user and sets status to anonymous", async () => {
    vi.mocked(fetch).mockImplementation((url) => {
      if (url === ME_URL) return jsonResponse(200, ALICE);
      if (url === LOGOUT_URL) return Promise.resolve(new Response(null, { status: 204 }));
      throw new Error(`unexpected fetch: ${url}`);
    });

    const { result } = renderAuth();
    await waitFor(() => expect(result.current.status).toBe("authenticated"));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.status).toBe("anonymous");
    expect(result.current.user).toBeNull();
  });
});
