"use client";

import { LOCALE_NAMES, LOCALES, setLocale, useLocale, useT } from "@/lib/i18n";

export function LanguageSwitch({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const locale = useLocale();
  const t = useT();
  const frame = tone === "dark" ? "border-mist text-page" : "border-field text-ink";
  const active = tone === "dark" ? "bg-mist/25 font-bold" : "bg-beige font-bold";

  return (
    <div
      role="group"
      aria-label={t("shell.language.label")}
      className={`inline-flex rounded-control border p-0.5 ${frame}`}
    >
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          title={LOCALE_NAMES[code]}
          aria-pressed={locale === code}
          onClick={() => setLocale(code)}
          className={`inline-flex min-h-9 min-w-9 items-center justify-center rounded-[6px] px-2 text-sm font-semibold ${
            locale === code ? active : "hover:bg-mist/20"
          }`}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
