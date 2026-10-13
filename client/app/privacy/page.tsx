import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
};

const ISSUES_URL = "https://github.com/Dm1tr1eva/my-shelfie/issues";

const SECTIONS = [
  { id: "store", title: "What we store" },
  { id: "search", title: "Book search" },
  { id: "links", title: "Shop links" },
  { id: "hosting", title: "Where your data lives" },
  { id: "deleting", title: "Deleting your data" },
  { id: "contact", title: "Contact" },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 sm:px-8 sm:py-12 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-14">
      <header className="flex flex-col gap-2 lg:col-span-2">
        <h1 className="text-[32px] font-semibold leading-tight md:text-[44px]">Privacy</h1>
        <p className="max-w-2xl text-muted">
          What my-shelfie keeps about you, and why. Last updated 13 October 2026.
        </p>
      </header>

      <nav
        aria-label="On this page"
        className="flex flex-col gap-2 lg:sticky lg:top-6 lg:self-start"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">On this page</p>
        <ul className="flex flex-col">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="inline-flex min-h-11 items-center text-navy underline-offset-2 hover:underline"
              >
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex max-w-2xl flex-col gap-8">
        <section id="store" aria-labelledby="store-heading" className="flex flex-col gap-3">
          <h2 id="store-heading" className="text-2xl font-semibold">
            What we store
          </h2>
          <p>To run your catalogue, my-shelfie keeps:</p>
          <ul className="list-disc pl-6">
            <li>
              your account: your name, your email address and a hash of your password. The password
              itself is never stored;
            </li>
            <li>
              your books and series: titles, authors, cover addresses, series and numbers,
              ownership, reading status, ratings and reviews, genres and tropes, and for a book
              found through search its Google Books id;
            </li>
            <li>what you write: notes, your own annotations and shop links;</li>
            <li>
              one cookie, <code>token</code>, that keeps you signed in for seven days. Scripts on
              the page cannot read it. There are no analytics and no advertising cookies.
            </li>
          </ul>
          <p>Your shelves are private. Other users cannot see them.</p>
        </section>

        <section id="search" aria-labelledby="search-heading" className="flex flex-col gap-3">
          <h2 id="search-heading" className="text-2xl font-semibold">
            Book search
          </h2>
          <p>
            The text you type into the search box is sent through this app&apos;s server to the
            Google Books API, and Google&apos;s own terms and privacy policy apply to it. Results
            are shown and not kept; the one you pick is saved to your shelf. Book covers are loaded
            straight from Google&apos;s servers, so your browser contacts Google when a cover is
            displayed.
          </p>
        </section>

        <section id="links" aria-labelledby="links-heading" className="flex flex-col gap-3">
          <h2 id="links-heading" className="text-2xl font-semibold">
            Shop links
          </h2>
          <p>
            Links are stored exactly as you paste them. my-shelfie does not read the shops&apos;
            pages, does not track clicks and does not add affiliate codes. A link opens the shop in
            a new tab.
          </p>
        </section>

        <section id="hosting" aria-labelledby="hosting-heading" className="flex flex-col gap-3">
          <h2 id="hosting-heading" className="text-2xl font-semibold">
            Where your data lives
          </h2>
          <p>
            The site is hosted on Vercel, the server on Render and the database on MongoDB Atlas.
            The data is not sold and not shared with anyone else.
          </p>
        </section>

        <section id="deleting" aria-labelledby="deleting-heading" className="flex flex-col gap-3">
          <h2 id="deleting-heading" className="text-2xl font-semibold">
            Deleting your data
          </h2>
          <p>
            Deleting a book removes it with its notes and links. Deleting a series keeps its books
            on your shelf. To delete your whole account and everything in it, open an issue on the
            project&apos;s issue tracker below and say that you want your account deleted.
          </p>
        </section>

        <section id="contact" aria-labelledby="contact-heading" className="flex flex-col gap-3">
          <h2 id="contact-heading" className="text-2xl font-semibold">
            Contact
          </h2>
          <p>
            Questions about your data, deletion requests, or content you believe infringes your
            rights: open an issue at{" "}
            <a href={ISSUES_URL} className="link">
              the project&apos;s issue tracker
            </a>
            . Issues are public, so describe the request without personal details; the author will
            answer there.
          </p>
        </section>
      </div>
    </main>
  );
}
