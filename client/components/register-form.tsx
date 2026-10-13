"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PasswordField, TextField } from "@/components/auth-fields";
import { useAuth, ApiError } from "@/lib/auth-context";

type Field = "name" | "email" | "password" | "confirm";
type Errors = Partial<Record<Field, React.ReactNode>>;

const MIN_PASSWORD = 8;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values: Record<Field, string>): Errors {
  const errors: Errors = {};

  if (values.name.trim() === "") errors.name = "Enter your name.";
  if (!EMAIL_SHAPE.test(values.email.trim())) errors.email = "Enter a valid email address.";
  if (values.password === "") errors.password = "Enter a password.";
  else if (values.password.length < MIN_PASSWORD) {
    errors.password = `Too short: ${values.password.length} of the ${MIN_PASSWORD} characters needed.`;
  }
  if (new TextEncoder().encode(values.password).length > 72) {
    errors.password = "That password is too long.";
  }
  if (values.confirm !== values.password) errors.confirm = "Passwords do not match.";

  return errors;
}

export function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();
  const [values, setValues] = useState<Record<Field, string>>({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (failedAttempts === 0) return;
    form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [failedAttempts]);

  function set(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBanner(null);

    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setFailedAttempts((count) => count + 1);
      return;
    }

    setPending(true);
    try {
      await register(values.email.trim(), values.password, values.name.trim());
      router.push("/library");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrors({
          email: (
            <>
              This email already has an account.{" "}
              <Link href="/login" className="link">
                Sign in instead
              </Link>
            </>
          ),
        });
      } else if (err instanceof ApiError && err.status === 400) {
        const field = (["name", "email", "password"] as const).find((name) =>
          err.message.startsWith(`${name}:`),
        );
        if (field) setErrors({ [field]: err.message.slice(field.length + 1).trim() });
        else setBanner("Check the fields and try again.");
      } else {
        setBanner("Something went wrong. Try again.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex flex-1 items-start justify-center px-4 py-10 sm:py-16">
      <form
        ref={form}
        onSubmit={handleSubmit}
        noValidate
        aria-labelledby="register-heading"
        className="card flex w-full max-w-md flex-col gap-5 p-6 sm:p-8"
      >
        <div className="flex flex-col gap-1">
          <h1 id="register-heading" className="text-[32px] font-semibold leading-tight">
            Start your shelf
          </h1>
          <p className="text-muted">Create an account to catalogue your books.</p>
        </div>

        {banner && (
          <p
            role="alert"
            className="rounded-control border-2 border-burgundy bg-burgundy/[0.06] px-3 py-2 font-semibold text-burgundy"
          >
            {banner}
          </p>
        )}

        <TextField
          label="Name"
          value={values.name}
          onChange={(value) => set("name", value)}
          error={errors.name}
          autoComplete="name"
        />
        <TextField
          label="Email"
          type="email"
          value={values.email}
          onChange={(value) => set("email", value)}
          error={errors.email}
          autoComplete="email"
        />
        <PasswordField
          label="Password"
          value={values.password}
          onChange={(value) => set("password", value)}
          error={errors.password}
          hint="Use at least 8 characters."
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm password"
          value={values.confirm}
          onChange={(value) => set("confirm", value)}
          error={errors.confirm}
          autoComplete="new-password"
        />

        <button type="submit" disabled={pending} className="btn-primary min-h-12">
          {pending ? "Creating account..." : "Create account"}
        </button>

        <p className="text-center text-sm text-muted">
          By creating an account you agree to the{" "}
          <Link href="/privacy" className="link">
            privacy notice
          </Link>
          .
        </p>

        <p className="text-center">
          Already have an account?{" "}
          <Link href="/login" className="link">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
