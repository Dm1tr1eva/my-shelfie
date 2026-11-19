"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PasswordField, TextField } from "@/components/auth-fields";
import { useAuth, ApiError } from "@/lib/auth-context";
import { useT, type Translate } from "@/lib/i18n";
import { translateServerError } from "@/lib/i18n/server-errors";

type Field = "name" | "email" | "password" | "confirm";
type Errors = Partial<Record<Field, React.ReactNode>>;

const MIN_PASSWORD = 8;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values: Record<Field, string>, t: Translate): Errors {
  const errors: Errors = {};

  if (values.name.trim() === "") errors.name = t("auth.register.enterName");
  if (!EMAIL_SHAPE.test(values.email.trim())) errors.email = t("auth.register.validEmail");
  if (values.password === "") errors.password = t("auth.register.enterPassword");
  else if (values.password.length < MIN_PASSWORD) {
    errors.password = t("auth.register.tooShort", {
      length: values.password.length,
      min: MIN_PASSWORD,
    });
  }
  if (new TextEncoder().encode(values.password).length > 72) {
    errors.password = t("auth.register.tooLong");
  }
  if (values.confirm !== values.password) errors.confirm = t("auth.register.noMatch");

  return errors;
}

export function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();
  const t = useT();
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

    const found = validate(values, t);
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
              {t("auth.register.emailTaken")}{" "}
              <Link href="/login" className="link">
                {t("auth.register.signInInstead")}
              </Link>
            </>
          ),
        });
      } else if (err instanceof ApiError && err.status === 400) {
        const field = (["name", "email", "password"] as const).find((name) =>
          err.message.startsWith(`${name}:`),
        );
        if (field) {
          setErrors({
            [field]: translateServerError(err.message.slice(field.length + 1).trim(), t),
          });
        } else setBanner(t("auth.register.checkFields"));
      } else {
        setBanner(t("auth.common.somethingWrong"));
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
            {t("auth.register.heading")}
          </h1>
          <p className="text-muted">{t("auth.register.lead")}</p>
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
          label={t("auth.register.name")}
          value={values.name}
          onChange={(value) => set("name", value)}
          error={errors.name}
          autoComplete="name"
        />
        <TextField
          label={t("auth.common.email")}
          type="email"
          value={values.email}
          onChange={(value) => set("email", value)}
          error={errors.email}
          autoComplete="email"
        />
        <PasswordField
          label={t("auth.common.password")}
          value={values.password}
          onChange={(value) => set("password", value)}
          error={errors.password}
          hint={t("auth.register.hint")}
          autoComplete="new-password"
        />
        <PasswordField
          label={t("auth.register.confirm")}
          value={values.confirm}
          onChange={(value) => set("confirm", value)}
          error={errors.confirm}
          autoComplete="new-password"
        />

        <button type="submit" disabled={pending} className="btn-primary min-h-12">
          {pending ? t("auth.register.pending") : t("auth.register.submit")}
        </button>

        <p className="text-center text-sm text-muted">
          {t("auth.register.agree")}{" "}
          <Link href="/privacy" className="link">
            {t("auth.register.privacyNotice")}
          </Link>
          .
        </p>

        <p className="text-center">
          {t("auth.register.already")}{" "}
          <Link href="/login" className="link">
            {t("auth.register.signIn")}
          </Link>
        </p>
      </form>
    </main>
  );
}
