"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useLocale, type MessageKey } from "@/lib/i18n";
import { useDocumentTitle } from "@/lib/use-document-title";

const TITLES: { match: (path: string) => boolean; key: MessageKey }[] = [
  { match: (path) => path === "/library", key: "shell.titles.library" },
  { match: (path) => path === "/wishlist", key: "shell.titles.wishlist" },
  { match: (path) => path === "/next", key: "shell.titles.next" },
  { match: (path) => path === "/add", key: "shell.titles.add" },
  { match: (path) => /^\/add\/[^/]+\/details$/.test(path), key: "shell.titles.details" },
  { match: (path) => /^\/books\/[^/]+$/.test(path), key: "shell.titles.book" },
  { match: (path) => /^\/series\/[^/]+$/.test(path), key: "shell.titles.series" },
  { match: (path) => path === "/login", key: "shell.titles.login" },
  { match: (path) => path === "/register", key: "shell.titles.register" },
  { match: (path) => path === "/privacy", key: "shell.titles.privacy" },
];

export function LocaleEffects() {
  const locale = useLocale();
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useDocumentTitle(TITLES.find((item) => item.match(pathname))?.key);

  return null;
}
