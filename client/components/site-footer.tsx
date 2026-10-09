import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto w-full max-w-5xl p-4 text-sm text-muted">
        my-shelfie — a reading tracker pet project ·{" "}
        <a href="https://github.com/Dm1tr1eva/my-shelfie" className="link">
          Source on GitHub
        </a>{" "}
        ·{" "}
        <Link href="/privacy" className="link">
          Privacy
        </Link>
      </div>
    </footer>
  );
}
