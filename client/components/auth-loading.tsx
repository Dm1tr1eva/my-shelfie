"use client";

import { useEffect, useState } from "react";

const SLOW_AFTER_MS = 5000;

export function AuthLoading() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main
      aria-busy="true"
      className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center"
    >
      <span
        aria-hidden="true"
        className="h-10 w-10 rounded-full border-4 border-mist border-t-burgundy motion-safe:animate-spin"
      />
      <p role="status" className="font-serif text-xl font-semibold">
        Loading your library…
      </p>
      {slow && (
        <p className="max-w-sm text-muted">
          The server is waking up after a pause. This can take up to a minute — thanks for waiting.
        </p>
      )}
    </main>
  );
}
