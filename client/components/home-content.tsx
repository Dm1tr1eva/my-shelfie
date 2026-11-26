"use client";

import { GapChip, LangBadge } from "@/components/chips";
import { HeroActions } from "@/components/hero-actions";
import { HeroShelf } from "@/components/hero-shelf";
import { useT } from "@/lib/i18n";

function Segments() {
  const t = useT();

  return (
    <div aria-hidden="true" className="flex h-9 items-center gap-3">
      <span className="flex gap-[3px]">
        {[true, false, true, false].map((owned, index) => (
          <i key={index} className={`h-2 w-7 rounded-full ${owned ? "bg-burgundy" : "bg-mist"}`} />
        ))}
      </span>
      <b className="text-[13px]">{t("home.features.series.owned", { owned: 2, total: 4 })}</b>
    </div>
  );
}

export function HomeContent() {
  const t = useT();

  const features = [
    {
      title: t("home.features.series.title"),
      text: t("home.features.series.text"),
      visual: <Segments />,
    },
    {
      title: t("home.features.gaps.title"),
      text: t("home.features.gaps.text"),
      visual: (
        <div aria-hidden="true" className="flex h-9 items-center">
          <GapChip text={t("home.features.gaps.chip")} />
        </div>
      ),
    },
    {
      title: t("home.features.shops.title"),
      text: t("home.features.shops.text"),
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

  return (
    <main className="flex flex-1 flex-col">
      <section className="bg-navy text-page [&_:focus-visible]:outline-page">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-[minmax(0,1fr)] items-end gap-10 px-4 pt-12 sm:px-8 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14">
          <div className="flex flex-col gap-6 pb-10 lg:pb-20">
            <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-mist">
              {t("home.eyebrow")}
            </p>
            <h1 className="text-[40px] font-semibold leading-[1.05] sm:text-6xl">
              {t("home.headingStart")}{" "}
              <span className="font-medium italic text-beige">{t("home.headingEmphasis")}</span>
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-mist">{t("home.lead")}</p>
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
          {t("home.featuresHeading")}
        </h2>
        <ul className="grid gap-6 md:grid-cols-3">
          {features.map((feature, index) => (
            <li key={index} className="card flex flex-col gap-3 p-6">
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
