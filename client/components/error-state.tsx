"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

export function ErrorState({
  title,
  text,
  onRetry,
  backHref,
  backLabel,
}: {
  title: string;
  text: string;
  onRetry?: () => void;
  backHref?: string;
  backLabel?: string;
}) {
  const t = useT();

  return (
    <div role="alert" className="card flex flex-col gap-3 border-2 border-burgundy p-5">
      <p className="font-serif text-xl font-semibold">{title}</p>
      <p className="text-muted">{text}</p>
      {(onRetry || backHref) && (
        <div className="flex flex-wrap gap-2">
          {onRetry && (
            <button type="button" onClick={onRetry} className="btn-primary">
              {t("shell.states.tryAgain")}
            </button>
          )}
          {backHref && (
            <Link href={backHref} className="btn-outline">
              {backLabel ?? t("shell.states.back")}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export function NotFound({
  title,
  backHref,
  backLabel,
}: {
  title: string;
  backHref: string;
  backLabel: string;
}) {
  const t = useT();

  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <h1 className="font-serif text-2xl font-semibold">{title}</h1>
      <p className="max-w-md text-muted">{t("shell.states.notFoundText")}</p>
      <Link href={backHref} className="btn-primary mt-2">
        {backLabel}
      </Link>
    </div>
  );
}
