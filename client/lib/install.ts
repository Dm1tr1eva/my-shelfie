"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallState = "installed" | "prompt" | "ios" | "none";

type Base = "installed" | "ios" | "none";

function detect(): Base {
  if (typeof window === "undefined") return "none";

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";

  const agent = navigator.userAgent;
  const apple =
    /iPhone|iPad|iPod/.test(agent) || (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1);
  return apple ? "ios" : "none";
}

export function useInstall() {
  const [base, setBase] = useState<Base>(detect);
  const [event, setEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    function onPrompt(next: Event) {
      next.preventDefault();
      setEvent(next as InstallEvent);
    }

    function onInstalled() {
      setEvent(null);
      setBase("installed");
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const state: InstallState = base === "installed" ? "installed" : event ? "prompt" : base;

  async function install() {
    if (!event) return;
    setEvent(null);
    await event.prompt();
    await event.userChoice;
  }

  return { state, install };
}
