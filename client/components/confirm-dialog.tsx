"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { TrashIcon } from "@/components/icons";
import { useExit } from "@/lib/use-exit";

export function ConfirmDialog({
  title,
  text,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  pending = false,
}: {
  title: string;
  text: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  pending?: boolean;
}) {
  const titleId = useId();
  const textId = useId();
  const box = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const { leaving, leave, onAnimationEnd } = useExit(box, onCancel);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancel.current?.focus();
    return () => opener?.focus();
  }, []);

  function onKeyDown(event: React.KeyboardEvent) {
    event.stopPropagation();

    if (event.key === "Escape") {
      event.preventDefault();
      leave();
      return;
    }

    if (event.key !== "Tab" || !box.current) return;
    const items = [...box.current.querySelectorAll<HTMLElement>("button:not([disabled])")];
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[18dvh]"
      onKeyDown={onKeyDown}
    >
      <div
        aria-hidden="true"
        onClick={leave}
        className={`absolute inset-0 bg-scrim ${leaving ? "animate-fade-out" : "animate-fade-in"}`}
      />
      <div
        ref={box}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={textId}
        onAnimationEnd={onAnimationEnd}
        className={`relative flex w-full max-w-[440px] flex-col gap-3 rounded-modal bg-card p-6 shadow-modal md:p-7 ${leaving ? "animate-pop-out" : "animate-pop-in"}`}
      >
        <h2 id={titleId} className="text-[22px] font-semibold leading-tight md:text-2xl">
          {title}
        </h2>
        <p id={textId} className="text-sm leading-relaxed text-ink-soft md:text-[15px]">
          {text}
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <button ref={cancel} type="button" onClick={leave} className="btn-outline">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={pending} className="btn-primary">
            <TrashIcon size={18} />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
