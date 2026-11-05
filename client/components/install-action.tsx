"use client";

import { useInstall } from "@/lib/install";

export function InstallAction() {
  const { state, install } = useInstall();

  if (state === "prompt") {
    return (
      <button type="button" onClick={install} className="btn-outline mt-3 w-full">
        Install app
      </button>
    );
  }

  if (state === "ios") {
    return (
      <p className="mt-3 border-t border-mist pt-3 text-sm text-muted">
        <span className="font-semibold text-ink">Install app:</span> tap Share, then Add to Home
        Screen.
      </p>
    );
  }

  return null;
}
