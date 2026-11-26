"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

function animates(node: HTMLElement) {
  const name = getComputedStyle(node).animationName;
  return Boolean(name) && name !== "none";
}

export function useExit<T extends HTMLElement>(node: RefObject<T | null>, onDone: () => void) {
  const done = useRef(onDone);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  function leave() {
    if (leaving) return;
    if (node.current && animates(node.current)) setLeaving(true);
    else done.current();
  }

  function onAnimationEnd(event: React.AnimationEvent<T>) {
    if (leaving && event.target === event.currentTarget) done.current();
  }

  return { leaving, leave, onAnimationEnd };
}
