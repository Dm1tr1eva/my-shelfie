"use client";

import { useT } from "@/lib/i18n";
import { useInstall } from "@/lib/install";

export function InstallAction() {
  const { state, install } = useInstall();
  const t = useT();

  if (state === "prompt") {
    return (
      <button type="button" onClick={install} className="btn-outline mt-3 w-full">
        {t("shell.install.button")}
      </button>
    );
  }

  if (state === "ios") {
    return (
      <p className="mt-3 border-t border-mist pt-3 text-sm text-muted">
        <span className="font-semibold text-ink">{t("shell.install.iosTitle")}</span>{" "}
        {t("shell.install.iosSteps")}
      </p>
    );
  }

  return null;
}
