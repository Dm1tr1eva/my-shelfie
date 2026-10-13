import Link from "next/link";

export function PublicHeader({ showSignIn }: { showSignIn: boolean }) {
  return (
    <header className="bg-navy text-page">
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-8"
      >
        <Link href="/" className="font-serif text-2xl font-bold">
          my-shelfie
        </Link>

        {showSignIn && (
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-control border border-mist px-4 font-semibold hover:bg-mist/20"
          >
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
