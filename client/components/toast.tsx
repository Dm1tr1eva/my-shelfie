"use client";

import { useEffect, useRef } from "react";
import { CheckIcon, XIcon } from "@/components/icons";
import { useT } from "@/lib/i18n";

export const TOAST_DURATION_MS = 5000;

export type ToastMessage = {
  id: number;
  text: string;
  tone: "done" | "error";
  onUndo?: () => void;
  onRetry?: () => void;
};

export function Toast({ toast, onDismiss }: { toast: ToastMessage | null; onDismiss: () => void }) {
  const t = useT();
  const region = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!toast || toast.tone === "error") return;
    const timer = window.setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  const onUndo = toast?.onUndo;
  const onRetry = toast?.onRetry;

  function act(action: () => void) {
    const dialog = region.current?.closest<HTMLElement>('[role="dialog"]');
    onDismiss();
    action();
    dialog?.focus();
  }

  return (
    <div
      ref={region}
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-[60] flex justify-center px-4"
    >
      {toast && (
        <div
          role={toast.tone === "error" ? "alert" : undefined}
          className={`pointer-events-auto flex max-w-[min(32rem,100%)] items-center gap-3 rounded-pill py-2 pl-4 pr-2 text-sm text-page shadow-modal ${
            toast.tone === "error" ? "bg-burgundy" : "bg-navy"
          }`}
        >
          {toast.tone === "done" && (
            <span className="shrink-0">
              <CheckIcon size={18} />
            </span>
          )}
          <span className="min-w-0 py-1 font-medium">{toast.text}</span>
          {onUndo && (
            <button
              type="button"
              onClick={() => act(onUndo)}
              className="inline-flex min-h-10 shrink-0 items-center rounded-pill border border-mist px-4 font-semibold focus-visible:outline-page"
            >
              {t("shell.toast.undo")}
            </button>
          )}
          {onRetry && (
            <button
              type="button"
              onClick={() => act(onRetry)}
              className="inline-flex min-h-10 shrink-0 items-center rounded-pill border border-mist px-4 font-semibold focus-visible:outline-page"
            >
              {t("shell.toast.retry")}
            </button>
          )}
          {toast.tone === "error" && (
            <button
              type="button"
              aria-label={t("shell.toast.dismiss")}
              onClick={onDismiss}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full focus-visible:outline-page"
            >
              <XIcon size={18} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
