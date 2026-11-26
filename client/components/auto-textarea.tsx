"use client";

import { useLayoutEffect, useRef } from "react";

function sizesItself() {
  return typeof CSS !== "undefined" && CSS.supports?.("field-sizing", "content") === true;
}

export function AutoTextarea({
  className = "",
  value,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const area = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const element = area.current;
    if (!element || sizesItself()) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight + 2}px`;
  }, [value]);

  return (
    <textarea
      ref={area}
      value={value}
      rows={3}
      className={`block min-h-[92px] w-full resize-none overflow-hidden [field-sizing:content] ${className}`}
      {...props}
    />
  );
}
