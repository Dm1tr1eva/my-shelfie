"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { TrashIcon } from "@/components/icons";

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

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancel.current?.focus();
    return () => opener?.focus();
  }, []);

  function onKeyDown(event: React.KeyboardEvent) {
    event.stopPropagation();

    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
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
      <div aria-hidden="true" onClick={onCancel} className="absolute inset-0 bg-scrim" />
      <div
        ref={box}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={textId}
        className="relative flex w-full max-w-[440px] flex-col gap-3 rounded-modal bg-card p-6 shadow-modal md:p-7"
      >
        <h2 id={titleId} className="text-[22px] font-semibold leading-tight md:text-2xl">
          {title}
        </h2>
        <p id={textId} className="text-sm leading-relaxed text-ink-soft md:text-[15px]">
          {text}
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <button ref={cancel} type="button" onClick={onCancel} className="btn-outline">
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
