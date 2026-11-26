"use client";

import { NotFound } from "@/components/error-state";
import { useT } from "@/lib/i18n";
import { useDocumentTitle } from "@/lib/use-document-title";

export function NotFoundPage() {
  const t = useT();
  useDocumentTitle("shell.titles.notFound");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-12 sm:px-8">
      <NotFound
        title={t("shell.notFound.title")}
        backHref="/"
        backLabel={t("shell.notFound.back")}
      />
    </main>
  );
}
