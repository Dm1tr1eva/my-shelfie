import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
};

const ISSUES_URL = "https://github.com/Dm1tr1eva/my-shelfie/issues";

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 sm:p-8">
      <h1 className="text-xl font-semibold">Privacy</h1>

      <p>
        my-shelfie is a learning project: a personal book tracker. This page says what it stores and
        where the data goes.
      </p>

      <h2 className="text-lg font-semibold">What it stores</h2>
      <ul className="list-disc pl-6">
        <li>Your email address and name.</li>
        <li>A hash of your password. The password itself is never stored.</li>
        <li>
          The books you add, with their status, rating and review, and for a book found through
          search its Google Books id and cover address.
        </li>
        <li>
          One cookie, <code>token</code>, that keeps you signed in for seven days. It cannot be read
          by scripts on the page. There are no analytics and no advertising cookies.
        </li>
      </ul>

      <h2 className="text-lg font-semibold">Book search</h2>
      <p>
        The text you type into the search box is sent through this app&apos;s server to the Google
        Books API, and Google&apos;s own terms and privacy policy apply to it. Results are shown and
        not kept. Book covers are loaded straight from Google&apos;s servers, so your browser
        contacts Google when a cover is displayed.
      </p>

      <h2 className="text-lg font-semibold">Where the data lives</h2>
      <p>
        The site is hosted on Vercel, the server on Render and the database on MongoDB Atlas. The
        data is not sold and not shared with anyone else.
      </p>

      <h2 className="text-lg font-semibold">Requests and takedowns</h2>
      <p>
        To have your account and data deleted, or to report content you believe infringes your
        rights, open an issue at{" "}
        <a href={ISSUES_URL} className="underline">
          the project&apos;s issue tracker
        </a>
        . Issues are public, so describe the request without personal details.
      </p>
    </main>
  );
}
