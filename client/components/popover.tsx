"use client";

import { useEffect, useRef } from "react";
import { Drawer } from "@/components/drawer";
import { FOCUSABLE } from "@/lib/focusable";
import { useExit } from "@/lib/use-exit";
import { useMediaQuery } from "@/lib/use-media-query";

const WIDE = "(min-width: 48rem)";

const ALIGN = {
  start: "left-0",
  center: "left-1/2 -translate-x-1/2",
  end: "right-0",
};

const ARROW = {
  start: "left-8",
  center: "left-1/2 -ml-1.5",
  end: "right-8",
};

function PopoverCard({
  id,
  label,
  onClose,
  align,
  children,
}: {
  id: string;
  label: string;
  onClose: () => void;
  align: keyof typeof ALIGN;
  children: React.ReactNode;
}) {
  const card = useRef<HTMLDivElement>(null);
  const { leaving, leave, onAnimationEnd } = useExit(card, onClose);
  const leaveLater = useRef(leave);

  useEffect(() => {
    leaveLater.current = leave;
  });

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = card.current;
    node?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") leaveLater.current();
    }
    function onPointerDown(event: PointerEvent) {
      const wrapper = node?.parentElement;
      if (wrapper && !wrapper.contains(event.target as Node)) leaveLater.current();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
      const focused = document.activeElement;
      if (!focused || focused === document.body || node?.contains(focused)) opener?.focus();
    };
  }, []);

  return (
    <div
      ref={card}
      id={id}
      role="dialog"
      aria-label={label}
      onAnimationEnd={onAnimationEnd}
      className={`absolute top-full z-30 mt-2 flex w-[22rem] max-w-[calc(100vw-2rem)] origin-top flex-col gap-4 rounded-popover bg-card p-5 text-left shadow-popover ${ALIGN[align]} ${leaving ? "animate-pop-out" : "animate-pop-in"}`}
    >
      <span
        aria-hidden="true"
        className={`absolute -top-1.5 h-3 w-3 rotate-45 border-l border-t border-beige bg-card ${ARROW[align]}`}
      />
      <p className="font-serif text-lg font-semibold">{label}</p>
      {children}
    </div>
  );
}

export function Popover({
  id,
  label,
  onClose,
  align = "start",
  children,
}: {
  id: string;
  label: string;
  onClose: () => void;
  align?: keyof typeof ALIGN;
  children: React.ReactNode;
}) {
  const wide = useMediaQuery(WIDE);

  if (!wide) {
    return (
      <Drawer
        label={label}
        header={<h2 className="font-serif text-xl font-semibold">{label}</h2>}
        onClose={onClose}
      >
        <div id={id} className="flex flex-col gap-4 pb-2">
          {children}
        </div>
      </Drawer>
    );
  }

  return (
    <PopoverCard id={id} label={label} onClose={onClose} align={align}>
      {children}
    </PopoverCard>
  );
}
