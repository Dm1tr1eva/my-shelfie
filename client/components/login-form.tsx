"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PasswordField, TextField } from "@/components/auth-fields";
import { useAuth, ApiError } from "@/lib/auth-context";
import { useT } from "@/lib/i18n";

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (email.trim() === "" || password === "") {
      setError(t("auth.login.enterBoth"));
      return;
    }

    setPending(true);
    try {
      await login(email.trim(), password);
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? t("auth.login.mismatch")
          : t("auth.common.somethingWrong"),
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
            {t("auth.login.heading")}
          </h1>
          <p className="text-muted">{t("auth.login.lead")}</p>
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
          label={t("auth.common.email")}
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        <PasswordField
          label={t("auth.common.password")}
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />

        <button type="submit" disabled={pending} className="btn-primary min-h-12">
          {pending ? t("auth.login.pending") : t("auth.login.submit")}
        </button>

        <p className="text-center">
          {t("auth.login.newHere")}{" "}
          <Link href="/register" className="link">
            {t("auth.login.create")}
          </Link>
        </p>
      </form>
    </main>
  );
}
