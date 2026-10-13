"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PasswordField, TextField } from "@/components/auth-fields";
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

    if (email.trim() === "" || password === "") {
      setError("Enter your email and password.");
      return;
    }

    setPending(true);
    try {
      await login(email.trim(), password);
      router.push("/library");
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? "That email and password do not match an account."
          : "Something went wrong. Try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex flex-1 items-start justify-center px-4 py-10 sm:py-16">
      <form
        onSubmit={handleSubmit}
        noValidate
        aria-labelledby="login-heading"
        className="card flex w-full max-w-md flex-col gap-5 p-6 sm:p-8"
      >
        <div className="flex flex-col gap-1">
          <h1 id="login-heading" className="text-[32px] font-semibold leading-tight">
            Welcome back
          </h1>
          <p className="text-muted">Sign in to open your shelves.</p>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-control border-2 border-burgundy bg-burgundy/[0.06] px-3 py-2 font-semibold text-burgundy"
          >
            {error}
          </p>
        )}

        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        <PasswordField
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />

        <button type="submit" disabled={pending} className="btn-primary min-h-12">
          {pending ? "Signing in..." : "Sign in"}
        </button>

        <p className="text-center">
          New here?{" "}
          <Link href="/register" className="link">
            Create an account
          </Link>
        </p>
      </form>
    </main>
  );
}
