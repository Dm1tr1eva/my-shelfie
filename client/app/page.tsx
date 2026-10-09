import { BookSpines } from "@/components/book-spines";
import { HeroActions } from "@/components/hero-actions";

const FEATURES = [
  {
    title: "Track what you read",
    text: "Add books by hand and keep your whole shelf in one place.",
  },
  {
    title: "Filter by status",
    text: "Want to read, reading, read or dropped — narrow the list to one status in a click.",
  },
  {
    title: "Rate and review",
    text: "Give each book up to five stars and keep a short review of your own.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-4 py-12 sm:px-8 sm:py-20">
      <section className="flex flex-col gap-6">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
          Your reading, on one shelf.
        </h1>
        <p className="max-w-2xl text-lg text-muted">
          my-shelfie is a personal tracker for the books you want to read, are reading and have
          finished — with ratings and reviews of your own.
        </p>
        <HeroActions />
        <BookSpines />
      </section>

      <section aria-labelledby="features-heading">
        <h2 id="features-heading" className="sr-only">
          Features
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="card p-5">
              <h3 className="font-display text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-muted">{feature.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
