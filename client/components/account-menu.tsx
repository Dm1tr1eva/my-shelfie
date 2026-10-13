"use client";

import { useAuth } from "@/lib/auth-context";
import { UserIcon } from "@/components/icons";

export function AccountMenu({ variant }: { variant: "avatar" | "tab" }) {
  const { user, logout } = useAuth();
  if (!user) return null;

  const initial = user.name.trim().charAt(0).toUpperCase() || "?";
  const panel =
    variant === "avatar" ? "absolute right-0 top-full mt-2" : "absolute bottom-full right-2 mb-3";

  return (
    <details className="group relative">
      <summary
        aria-label="Account"
        className={
          variant === "avatar"
            ? "flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full bg-beige font-semibold text-ink [&::-webkit-details-marker]:hidden"
            : "flex min-h-11 cursor-pointer list-none flex-col items-center gap-1 rounded-control px-2 py-1 text-xs text-mist [&::-webkit-details-marker]:hidden"
        }
      >
        {variant === "avatar" ? (
          initial
        ) : (
          <>
            <UserIcon />
            <span>Account</span>
          </>
        )}
      </summary>
      <div className={`${panel} z-30 w-56 card p-3 text-ink shadow-pop`}>
        <p className="truncate font-semibold">{user.name}</p>
        <p className="truncate text-sm text-muted">{user.email}</p>
        <button type="button" onClick={() => logout()} className="btn-outline mt-3 w-full">
          Log out
        </button>
      </div>
    </details>
  );
}
