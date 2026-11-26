"use client";

import { useEffect } from "react";
import { APP_NAME } from "./brand";
import { useT, type MessageKey } from "./i18n";

export function useDocumentTitle(key: MessageKey | undefined) {
  const t = useT();

  useEffect(() => {
    if (!key) return;
    const title = `${t(key)} · ${APP_NAME}`;
    const keepTitle = () => {
      if (document.title !== title) document.title = title;
    };
    keepTitle();
    const observer = new MutationObserver(keepTitle);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [key, t]);
}
