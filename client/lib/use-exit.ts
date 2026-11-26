"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export type ExitDone = () => void | boolean;

function animates(node: HTMLElement) {
  const name = getComputedStyle(node).animationName;
  return Boolean(name) && name !== "none";
}

export function useExit<T extends HTMLElement>(node: RefObject<T | null>, onDone: ExitDone) {
  const done = useRef(onDone);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  function finish() {
    if (done.current() !== true) setLeaving(false);
  }

  function leave() {
    if (node.current && animates(node.current)) setLeaving(true);
    else done.current();
  }

  function onAnimationEnd(event: React.AnimationEvent<T>) {
    if (leaving && event.target === event.currentTarget) finish();
  }

  return { leaving, leave, onAnimationEnd };
}
