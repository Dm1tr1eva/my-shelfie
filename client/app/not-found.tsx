import type { Metadata } from "next";
import { NotFound } from "@/components/error-state";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-12 sm:px-8">
      <NotFound title="Page not found" backHref="/" backLabel="Back to the home page" />
    </main>
  );
}
