"use client";

import { useEffect, useRef } from "react";
import { CheckIcon, XIcon } from "@/components/icons";
import { useT } from "@/lib/i18n";
import { useExit } from "@/lib/use-exit";

export const TOAST_DURATION_MS = 5000;

export type ToastMessage = {
  id: number;
  text: string;
  tone: "done" | "error";
  onUndo?: () => void;
  onRetry?: () => void;
};

const TOAST_BUTTON =
  "inline-flex min-h-10 shrink-0 items-center rounded-pill border border-mist px-4 font-semibold hover:bg-page/15 active:bg-page/25 focus-visible:outline-page";

function ToastCard({
  toast,
  onDismiss,
  onAct,
}: {
  toast: ToastMessage;
  onDismiss: () => void;
  onAct: (action: () => void) => void;
}) {
  const t = useT();
  const card = useRef<HTMLDivElement>(null);
  const { leaving, leave, onAnimationEnd } = useExit(card, onDismiss);
  const leaveLater = useRef(leave);

  useEffect(() => {
    leaveLater.current = leave;
  });

  useEffect(() => {
    if (toast.tone === "error") return;
    const timer = window.setTimeout(() => leaveLater.current(), TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const { onUndo, onRetry } = toast;

  return (
    <div
      ref={card}
      role={toast.tone === "error" ? "alert" : undefined}
      onAnimationEnd={onAnimationEnd}
      className={`pointer-events-auto flex max-w-[min(32rem,100%)] items-center gap-3 rounded-pill py-2 pl-4 pr-2 text-sm text-page shadow-modal ${
        toast.tone === "error" ? "bg-burgundy" : "bg-navy"
      } ${leaving ? "animate-rise-out" : "animate-rise-in"}`}
    >
      {toast.tone === "done" && (
        <span className="shrink-0">
          <CheckIcon size={18} />
        </span>
      )}
      <span className="min-w-0 py-1 font-medium">{toast.text}</span>
      {onUndo && (
        <button type="button" onClick={() => onAct(onUndo)} className={TOAST_BUTTON}>
          {t("shell.toast.undo")}
        </button>
      )}
      {onRetry && (
        <button type="button" onClick={() => onAct(onRetry)} className={TOAST_BUTTON}>
          {t("shell.toast.retry")}
        </button>
      )}
      {toast.tone === "error" && (
        <button
          type="button"
          aria-label={t("shell.toast.dismiss")}
          onClick={leave}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-page/15 active:bg-page/25 focus-visible:outline-page"
        >
          <XIcon size={18} />
        </button>
      )}
    </div>
  );
}

export function Toast({ toast, onDismiss }: { toast: ToastMessage | null; onDismiss: () => void }) {
  const region = useRef<HTMLDivElement>(null);

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
      {toast && <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} onAct={act} />}
    </div>
  );
}
