"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LangBadge } from "@/components/chips";
import { CheckIcon, ExternalLinkIcon, PlusIcon, XIcon } from "@/components/icons";
import { Select } from "@/components/select";
import {
  LINK_KINDS,
  LINK_LANGUAGES,
  LINKS_MAX,
  type LinkKind,
  type LinkLanguage,
} from "@/lib/catalogue-constants";
import type { ShopLink } from "@/lib/books";
import { useT } from "@/lib/i18n";
import { useDomain } from "@/lib/i18n/domain";
import { hostOf, isHttpUrl } from "@/lib/links";

export const FRESH_LINK_MS = 1500;

function LanguagePicker({
  value,
  onChange,
}: {
  value: LinkLanguage[];
  onChange: (value: LinkLanguage[]) => void;
}) {
  const t = useT();
  const domain = useDomain();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(event: MouseEvent) {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const needle = search.trim().toLowerCase();
  const options = LINK_LANGUAGES.filter(
    (language) =>
      needle === "" ||
      domain.language(language.value).toLowerCase().includes(needle) ||
      language.badge.toLowerCase().includes(needle),
  );

  function flip(language: LinkLanguage) {
    onChange(
      value.includes(language)
        ? value.filter((item) => item !== language)
        : LINK_LANGUAGES.map((item) => item.value).filter(
            (item) => item === language || value.includes(item),
          ),
    );
  }

  return (
    <div ref={root} className="relative flex flex-wrap items-center gap-2">
      {value.map((language) => (
        <span
          key={language}
          className="inline-flex h-7 items-center gap-1 rounded-[6px] border border-slate pl-2 text-[11px] font-bold text-navy"
        >
          {LINK_LANGUAGES.find((item) => item.value === language)?.badge}
          <button
            type="button"
            aria-label={t("book.panel.links.removeLanguage", {
              language: domain.language(language),
            })}
            onClick={() => flip(language)}
            className="inline-flex h-7 w-7 items-center justify-center"
          >
            <XIcon size={12} />
          </button>
        </span>
      ))}
      <button
        ref={toggle}
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          setSearch("");
          setOpen((current) => !current);
        }}
        className="inline-flex h-7 items-center gap-1 rounded-pill border border-dashed border-slate px-2.5 text-xs font-semibold text-navy"
      >
        <PlusIcon size={12} />
        {t("book.panel.links.addLanguage")}
      </button>

      {open && (
        <div
          id={listId}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
              toggle.current?.focus();
            }
          }}
          className="absolute left-0 top-full z-30 mt-2 flex w-64 max-w-full flex-col gap-1 rounded-popover bg-card p-2 shadow-popover"
        >
          <input
            type="search"
            aria-label={t("book.panel.links.findLanguage")}
            placeholder={t("book.panel.links.findLanguage")}
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="field min-h-10 bg-input-strong"
          />
          {options.length === 0 && (
            <p className="px-2 py-2 text-sm text-muted">{t("book.panel.links.noLanguage")}</p>
          )}
          {options.map((language) => {
            const chosen = value.includes(language.value);
            return (
              <button
                key={language.value}
                type="button"
                role="checkbox"
                aria-checked={chosen}
                onClick={() => flip(language.value)}
                className={`flex min-h-10 items-center justify-between gap-3 rounded-control px-2 text-left text-sm ${
                  chosen ? "bg-page" : "hover:bg-page"
                }`}
              >
                {domain.language(language.value)}
                <span className="flex items-center gap-2 text-xs font-bold text-muted">
                  {language.badge}
                  <span className={chosen ? "text-navy" : "invisible"}>
                    <CheckIcon size={14} />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LinkForm({ onAdd, onCancel }: { onAdd: (link: ShopLink) => void; onCancel: () => void }) {
  const t = useT();
  const domain = useDomain();
  const urlId = useId();
  const [kind, setKind] = useState<LinkKind>("paper");
  const [url, setUrl] = useState("");
  const [languages, setLanguages] = useState<LinkLanguage[]>([]);
  const [error, setError] = useState<"url" | "language" | null>(null);

  function add() {
    if (!isHttpUrl(url)) {
      setError("url");
      return;
    }
    if (languages.length === 0) {
      setError("language");
      return;
    }
    onAdd({ kind, languages, url: url.trim() });
  }

  return (
    <div
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented) {
          event.preventDefault();
          onCancel();
        }
      }}
      className="flex flex-col gap-3 rounded-card border border-slate p-4"
    >
      <Select
        label={t("book.panel.links.type")}
        className="self-start text-sm"
        value={kind}
        onChange={(value) => setKind(value as LinkKind)}
        options={LINK_KINDS.map((item) => ({
          value: item.value,
          label: domain.linkKindShort(item.value),
        }))}
      />
      <div className="flex flex-col gap-1">
        <label htmlFor={urlId} className="text-sm font-semibold">
          {t("book.panel.links.url")}
        </label>
        <input
          id={urlId}
          type="url"
          inputMode="url"
          placeholder="https://"
          value={url}
          aria-invalid={error === "url"}
          onChange={(event) => {
            setUrl(event.target.value);
            setError(null);
          }}
          className={`field bg-input-strong ${error === "url" ? "border-2 border-burgundy" : ""}`}
        />
      </div>
      <div role="group" aria-label={t("book.panel.links.language")} className="flex flex-col gap-1">
        <span className="text-sm font-semibold">{t("book.panel.links.language")}</span>
        <LanguagePicker
          value={languages}
          onChange={(value) => {
            setLanguages(value);
            setError(null);
          }}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-burgundy">
          {error === "url" ? t("book.links.startWithHttps") : t("book.panel.links.needLanguage")}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onCancel} className="btn-outline">
          {t("book.panel.links.cancel")}
        </button>
        <button type="button" onClick={add} className="btn-primary bg-navy">
          {t("book.panel.links.save")}
        </button>
      </div>
    </div>
  );
}

export function BookLinks({
  links,
  onChange,
}: {
  links: ShopLink[];
  onChange: (links: ShopLink[]) => void;
}) {
  const t = useT();
  const domain = useDomain();
  const [adding, setAdding] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!fresh) return;
    const timer = window.setTimeout(() => setFresh(null), FRESH_LINK_MS);
    return () => window.clearTimeout(timer);
  }, [fresh]);

  function close() {
    setAdding(false);
    window.setTimeout(() => addButton.current?.focus());
  }

  return (
    <section aria-labelledby="book-links-heading" className="flex flex-col gap-3">
      <h2 id="book-links-heading" className="text-xl font-semibold">
        {t("book.panel.links.heading")}
      </h2>
      {links.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {links.map((link) => {
            const host = hostOf(link.url);
            return (
              <li
                key={link.url}
                className={`flex items-center gap-2 rounded-control bg-page py-2 pl-3 pr-1 ${
                  fresh === link.url ? "ring-2 ring-navy" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{domain.linkKindShort(link.kind)}</p>
                  <p className="truncate text-xs text-muted">{host}</p>
                </div>
                <span className="flex flex-wrap justify-end gap-1">
                  {link.languages.map((language) => (
                    <LangBadge key={language} language={language} />
                  ))}
                </span>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("book.panel.links.open", {
                    kind: domain.linkKindShort(link.kind),
                    host,
                  })}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-navy hover:bg-beige"
                >
                  <ExternalLinkIcon size={18} />
                </a>
                <button
                  type="button"
                  aria-label={t("book.panel.links.remove", { host })}
                  onClick={() => onChange(links.filter((item) => item !== link))}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-beige"
                >
                  <XIcon size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {adding ? (
        <LinkForm
          onCancel={close}
          onAdd={(link) => {
            onChange([...links.filter((item) => item.url !== link.url), link]);
            setFresh(link.url);
            close();
          }}
        />
      ) : (
        links.length < LINKS_MAX && (
          <button
            ref={addButton}
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex min-h-9 items-center gap-1 self-start rounded-pill border border-dashed border-slate px-3 text-sm font-semibold text-navy"
          >
            <PlusIcon size={14} />
            {t("book.panel.links.add")}
          </button>
        )
      )}
    </section>
  );
}
