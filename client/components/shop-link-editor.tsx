"use client";

import { PlusIcon, XIcon } from "@/components/icons";
import { Select } from "@/components/select";
import { LINK_LANGUAGE_OPTIONS, type LinkLanguage, type ShopLink } from "@/lib/books";
import { isHttpUrl } from "@/lib/links";

export type LinkRow = { language: LinkLanguage; url: string };

export function validLinks(rows: LinkRow[]): ShopLink[] {
  return rows
    .filter((row) => isHttpUrl(row.url))
    .map((row) => ({ language: row.language, url: row.url.trim() }));
}

export function ShopLinkEditor({
  rows,
  onChange,
}: {
  rows: LinkRow[];
  onChange: (rows: LinkRow[]) => void;
}) {
  function update(index: number, patch: Partial<LinkRow>) {
    onChange(rows.map((row, position) => (position === index ? { ...row, ...patch } : row)));
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="font-semibold">Shop links</legend>

      {rows.map((row, index) => {
        const invalid = row.url.trim() !== "" && !isHttpUrl(row.url);
        return (
          <div key={index} className="flex flex-col gap-1">
            <div className="flex gap-2">
              <Select
                label={`Language of link ${index + 1}`}
                hideLabel
                className="w-28 shrink-0"
                value={row.language}
                onChange={(value) => update(index, { language: value as LinkLanguage })}
                options={LINK_LANGUAGE_OPTIONS}
              />
              <input
                type="url"
                aria-label={`URL of link ${index + 1}`}
                aria-invalid={invalid}
                placeholder="https://"
                value={row.url}
                onChange={(event) => update(index, { url: event.target.value })}
                className={`field ${invalid ? "border-2 border-burgundy" : ""}`}
              />
              <button
                type="button"
                aria-label={`Remove link ${index + 1}`}
                onClick={() => onChange(rows.filter((_, position) => position !== index))}
                className="btn-outline w-11 shrink-0 px-0"
              >
                <XIcon size={18} />
              </button>
            </div>
            {invalid && (
              <p className="text-sm font-semibold text-burgundy">Start the link with https://</p>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onChange([...rows, { language: "uk", url: "" }])}
        className="btn-outline self-start"
      >
        <PlusIcon size={18} />
        Add another link
      </button>
    </fieldset>
  );
}
