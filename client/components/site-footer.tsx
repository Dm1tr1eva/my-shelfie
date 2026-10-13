import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-mist">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm text-muted sm:px-8">
        <span>my-shelfie · a book-catalogue pet project</span>
        <a
          href="https://github.com/Dm1tr1eva/my-shelfie"
          className="inline-flex min-h-11 items-center text-navy underline underline-offset-2"
        >
          Source on GitHub
        </a>
        <Link
          href="/privacy"
          className="inline-flex min-h-11 items-center text-navy underline underline-offset-2"
        >
          Privacy
        </Link>
      </div>
    </footer>
  );
}
