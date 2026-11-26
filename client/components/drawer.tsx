"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "@/components/icons";
import { FOCUSABLE } from "@/lib/focusable";
import { useT } from "@/lib/i18n";

function subscribeToNothing() {
  return () => {};
}

function useOnClient() {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

export function Drawer({
  label,
  header,
  footer,
  children,
  onClose,
  className = "md:w-[420px]",
  tall = false,
  lightScrim = false,
}: {
  label: string;
  header: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
  tall?: boolean;
  lightScrim?: boolean;
}) {
  const t = useT();
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  const onClient = useOnClient();

  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!onClient) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented) close.current();
    }
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, [onClient]);

  function trapTab(event: React.KeyboardEvent) {
    if (event.key !== "Tab" || !panel.current) return;

    const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (!first || !last) {
      event.preventDefault();
    } else if (event.shiftKey && (active === first || active === panel.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!onClient) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end">
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`absolute inset-0 ${lightScrim ? "bg-scrim-light" : "bg-scrim"}`}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onKeyDown={trapTab}
        className={`relative flex w-full flex-col rounded-t-modal bg-card shadow-modal outline-none md:h-full md:max-h-none md:rounded-none ${tall ? "h-[calc(100dvh-2rem)]" : "max-h-[92dvh]"} ${className}`}
      >
        <span aria-hidden="true" className="mx-auto mt-2 h-1 w-10 rounded-full bg-mist md:hidden" />
        <div className="flex items-center justify-between gap-3 px-5 pt-3 md:px-6 md:pt-6">
          <div className="min-w-0">{header}</div>
          <button
            type="button"
            aria-label={t("shell.close")}
            onClick={onClose}
            className="btn-round shrink-0"
          >
            <XIcon size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 md:px-6">{children}</div>
        {footer && (
          <div className="border-t border-mist px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
