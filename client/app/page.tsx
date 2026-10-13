import { GapChip, LangBadge } from "@/components/chips";
import { HeroActions } from "@/components/hero-actions";
import { HeroShelf } from "@/components/hero-shelf";

function Segments() {
  return (
    <div aria-hidden="true" className="flex h-9 items-center gap-3">
      <span className="flex gap-[3px]">
        {[true, false, true, false].map((owned, index) => (
          <i key={index} className={`h-2 w-7 rounded-full ${owned ? "bg-burgundy" : "bg-mist"}`} />
        ))}
      </span>
      <b className="text-[13px]">Own 2 of 4</b>
    </div>
  );
}

const FEATURES = [
  {
    title: "Collect by series",
    text: "Books are grouped into series with their number, so each shelf reads in order. Standalones get a shelf of their own.",
    visual: <Segments />,
  },
  {
    title: "Spot the gaps",
    text: "Next to buy lists every missing volume of the series you collect, plus the standalone books you want.",
    visual: (
      <div aria-hidden="true" className="flex h-9 items-center">
        <GapChip text="Gap: you own #1 and #3" />
      </div>
    ),
  },
  {
    title: "Know where to buy",
    text: "Save shop links for each book, marked by language, and filter by the shops you can actually order from.",
    visual: (
      <div aria-hidden="true" className="flex h-9 items-center gap-1.5">
        <LangBadge language="ru" />
        <LangBadge language="uk" />
        <LangBadge language="en" />
        <LangBadge language="other" />
      </div>
    ),
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="bg-navy text-page">
        <div className="mx-auto grid w-full max-w-5xl items-end gap-10 px-4 pt-12 sm:px-8 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14">
          <div className="flex flex-col gap-6 pb-10 lg:pb-20">
            <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-mist">
              For people who collect paper books
            </p>
            <h1 className="text-[40px] font-semibold leading-[1.05] sm:text-6xl">
              Your books, <span className="font-medium italic text-beige">shelved by series.</span>
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-mist">
              Catalogue the books you own, keep a wishlist, and always know which volume is missing
              and where to buy it.
            </p>
            <HeroActions />
          </div>

          <HeroShelf />
        </div>
      </section>

      <section
        aria-labelledby="features-heading"
        className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12 sm:px-8 sm:py-16"
      >
        <h2
          id="features-heading"
          className="max-w-2xl text-[28px] font-semibold leading-tight sm:text-4xl"
        >
          Made for series readers who buy books in more than one language.
        </h2>
        <ul className="grid gap-6 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="card flex flex-col gap-3 p-6">
              {feature.visual}
              <h3 className="text-[22px] font-semibold">{feature.title}</h3>
              <p className="text-muted">{feature.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
