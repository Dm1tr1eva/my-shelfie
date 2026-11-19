"use client";

import { useT } from "@/lib/i18n";

const ISSUES_URL = "https://github.com/Dm1tr1eva/my-shelfie/issues";

const SECTION_IDS = ["store", "search", "links", "hosting", "deleting", "contact"] as const;

export function PrivacyContent() {
  const t = useT();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 sm:px-8 sm:py-12 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-14">
      <header className="flex flex-col gap-2 lg:col-span-2">
        <h1 className="text-[32px] font-semibold leading-tight md:text-[44px]">
          {t("privacy.title")}
        </h1>
        <p className="max-w-2xl text-muted">{t("privacy.intro")}</p>
      </header>

      <nav
        aria-label={t("privacy.onThisPage")}
        className="flex flex-col gap-2 lg:sticky lg:top-6 lg:self-start"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">
          {t("privacy.onThisPage")}
        </p>
        <ul className="flex flex-col">
          {SECTION_IDS.map((id) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="inline-flex min-h-11 items-center text-navy underline-offset-2 hover:underline"
              >
                {t(`privacy.${id}.title`)}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex max-w-2xl flex-col gap-8">
        <section id="store" aria-labelledby="store-heading" className="flex flex-col gap-3">
          <h2 id="store-heading" className="text-2xl font-semibold">
            {t("privacy.store.title")}
          </h2>
          <p>{t("privacy.store.lead")}</p>
          <ul className="list-disc pl-6">
            <li>{t("privacy.store.account")}</li>
            <li>{t("privacy.store.books")}</li>
            <li>{t("privacy.store.written")}</li>
            <li>
              {t("privacy.store.cookieBefore")}
              <code>token</code>
              {t("privacy.store.cookieAfter")}
            </li>
          </ul>
          <p>{t("privacy.store.private")}</p>
        </section>

        <section id="search" aria-labelledby="search-heading" className="flex flex-col gap-3">
          <h2 id="search-heading" className="text-2xl font-semibold">
            {t("privacy.search.title")}
          </h2>
          <p>{t("privacy.search.body")}</p>
        </section>

        <section id="links" aria-labelledby="links-heading" className="flex flex-col gap-3">
          <h2 id="links-heading" className="text-2xl font-semibold">
            {t("privacy.links.title")}
          </h2>
          <p>{t("privacy.links.body")}</p>
        </section>

        <section id="hosting" aria-labelledby="hosting-heading" className="flex flex-col gap-3">
          <h2 id="hosting-heading" className="text-2xl font-semibold">
            {t("privacy.hosting.title")}
          </h2>
          <p>{t("privacy.hosting.body")}</p>
        </section>

        <section id="deleting" aria-labelledby="deleting-heading" className="flex flex-col gap-3">
          <h2 id="deleting-heading" className="text-2xl font-semibold">
            {t("privacy.deleting.title")}
          </h2>
          <p>{t("privacy.deleting.body")}</p>
        </section>

        <section id="contact" aria-labelledby="contact-heading" className="flex flex-col gap-3">
          <h2 id="contact-heading" className="text-2xl font-semibold">
            {t("privacy.contact.title")}
          </h2>
          <p>
            {t("privacy.contact.before")}
            <a href={ISSUES_URL} className="link">
              {t("privacy.contact.link")}
            </a>
            {t("privacy.contact.after")}
          </p>
        </section>
      </div>
    </main>
  );
}
