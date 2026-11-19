"use client";

import { PlusIcon, XIcon } from "@/components/icons";
import { Select } from "@/components/select";
import {
  linkKindOptions,
  linkLanguageOptions,
  type LinkKind,
  type LinkLanguage,
  type ShopLink,
} from "@/lib/books";
import { useT } from "@/lib/i18n";
import { useDomain } from "@/lib/i18n/domain";
import { isHttpUrl } from "@/lib/links";

export type LinkRow = ShopLink;

export function validLinks(rows: LinkRow[]): ShopLink[] {
  return rows
    .filter((row) => isHttpUrl(row.url))
    .map((row) => ({ kind: row.kind, languages: row.languages, url: row.url.trim() }));
}

export function ShopLinkEditor({
  rows,
  onChange,
}: {
  rows: LinkRow[];
  onChange: (rows: LinkRow[]) => void;
}) {
  const t = useT();
  const domain = useDomain();
  const kindOptions = linkKindOptions(domain);
  const languageOptions = linkLanguageOptions(domain);

  function update(index: number, patch: Partial<LinkRow>) {
    onChange(rows.map((row, position) => (position === index ? { ...row, ...patch } : row)));
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="font-semibold">{t("book.shopLinks.legend")}</legend>

      {rows.map((row, index) => {
        const invalid = row.url.trim() !== "" && !isHttpUrl(row.url);
        return (
          <div key={index} className="flex flex-col gap-1">
            <div className="flex flex-wrap gap-2">
              <Select
                label={t("book.shopLinks.kind", { number: index + 1 })}
                hideLabel
                className="w-36 shrink-0"
                value={row.kind}
                onChange={(value) => update(index, { kind: value as LinkKind })}
                options={kindOptions}
              />
              <Select
                label={t("book.shopLinks.language", { number: index + 1 })}
                hideLabel
                className="w-28 shrink-0"
                value={row.languages[0]}
                onChange={(value) => update(index, { languages: [value as LinkLanguage] })}
                options={languageOptions}
              />
              <div className="flex min-w-0 flex-1 basis-56 gap-2">
                <input
                  type="url"
                  aria-label={t("book.shopLinks.url", { number: index + 1 })}
                  aria-invalid={invalid}
                  placeholder="https://"
                  value={row.url}
                  onChange={(event) => update(index, { url: event.target.value })}
                  className={`field ${invalid ? "border-2 border-burgundy" : ""}`}
                />
                <button
                  type="button"
                  aria-label={t("book.shopLinks.remove", { number: index + 1 })}
                  onClick={() => onChange(rows.filter((_, position) => position !== index))}
                  className="btn-round"
                >
                  <XIcon size={18} />
                </button>
              </div>
            </div>
            {invalid && (
              <p className="text-sm font-semibold text-burgundy">
                {t("book.links.startWithHttps")}
              </p>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onChange([...rows, { kind: "paper", languages: ["uk"], url: "" }])}
        className="btn-outline self-start"
      >
        <PlusIcon size={18} />
        {t("book.shopLinks.add")}
      </button>
    </fieldset>
  );
}
