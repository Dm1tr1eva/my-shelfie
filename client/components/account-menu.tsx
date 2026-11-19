"use client";

import { InstallAction } from "@/components/install-action";
import { LanguageSwitch } from "@/components/language-switch";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/i18n";

export function AccountMenu() {
  const { user, logout } = useAuth();
  const t = useT();
  if (!user) return null;

  const initial = user.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <details className="group relative">
      <summary
        aria-label={t("shell.nav.account")}
        className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full focus-visible:outline-page [&::-webkit-details-marker]:hidden"
      >
        <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-slate font-bold text-ink md:h-10 md:w-10">
          {initial}
        </span>
      </summary>
      <div className="absolute right-0 top-full z-30 mt-2 w-56 card p-3 text-ink shadow-pop">
        <p className="truncate font-semibold">{user.name}</p>
        <p className="truncate text-sm text-muted">{user.email}</p>
        <button type="button" onClick={() => logout()} className="btn-outline mt-3 w-full">
          {t("shell.account.logOut")}
        </button>
        <div className="mt-3">
          <LanguageSwitch tone="light" />
        </div>
        <InstallAction />
      </div>
    </details>
  );
}
