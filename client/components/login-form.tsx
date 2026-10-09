"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, ApiError } from "@/lib/auth-context";

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="card flex w-full max-w-sm flex-col gap-4 p-6">
        <h1 className="text-3xl">Log in</h1>

        <label className="flex flex-col gap-1">
          <span>Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span>Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
          />
        </label>

        {error && <p className="text-danger">{error}</p>}

        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Logging in..." : "Log in"}
        </button>

        <p>
          No account?{" "}
          <Link href="/register" className="link">
            Register
          </Link>
        </p>
      </form>
    </main>
  );
}
