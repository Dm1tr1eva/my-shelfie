"use client";

import { useId, useState } from "react";
import { EyeIcon, EyeOffIcon, XIcon } from "@/components/icons";

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: React.ReactNode;
  hint?: string;
  autoComplete?: string;
};

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-2 text-sm font-semibold text-burgundy">
      <span className="mt-0.5 shrink-0">
        <XIcon size={16} />
      </span>
      <span>{children}</span>
    </p>
  );
}

export function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  autoComplete,
  type = "text",
}: FieldProps & { type?: "text" | "email" }) {
  const id = useId();
  const messageId = `${id}-message`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`field ${error ? "border-2 border-burgundy" : ""}`}
      />
      {error ? (
        <FieldError id={messageId}>{error}</FieldError>
      ) : hint ? (
        <p id={messageId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function PasswordField({ label, value, onChange, error, hint, autoComplete }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const [shown, setShown] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={shown ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={`field pr-12 ${error ? "border-2 border-burgundy" : ""}`}
        />
        <button
          type="button"
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          onClick={() => setShown((current) => !current)}
          className="absolute right-1 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-control text-muted hover:text-ink"
        >
          {shown ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
        </button>
      </div>
      {error ? (
        <FieldError id={messageId}>{error}</FieldError>
      ) : hint ? (
        <p id={messageId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
