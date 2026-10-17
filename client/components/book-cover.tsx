import { BookIcon, TabletIcon } from "@/components/icons";
import type { Format } from "@/lib/catalogue-constants";

const SIZES = {
  sm: "w-10",
  md: "w-16",
  lg: "w-24",
  fill: "w-full",
};

const PAIRS = [
  "bg-burgundy text-page",
  "bg-ink text-page",
  "bg-navy text-page",
  "bg-slate text-ink",
  "bg-mist text-navy",
  "bg-beige text-burgundy",
];

const FORMAT_BADGES: Record<Format, { label: string; Icon: typeof BookIcon }> = {
  paper: { label: "Paper book", Icon: BookIcon },
  ebook: { label: "E-book", Icon: TabletIcon },
};

function withoutPageCurl(url: string) {
  return url.replace("&edge=curl", "");
}

function pairFor(title: string) {
  let hash = 0;
  for (const char of title) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return PAIRS[hash % PAIRS.length];
}

export function BookCover({
  url,
  title,
  size = "fill",
  number,
  format,
}: {
  url?: string;
  title: string;
  size?: keyof typeof SIZES;
  number?: number;
  format?: Format;
}) {
  const box = `${SIZES[size]} aspect-[2/3] shrink-0`;
  const badge = format ? FORMAT_BADGES[format] : undefined;

  return (
    <div className={`relative @container ${box}`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- next/image would keep a copy of the cover in Vercel's optimizer, which Google's terms do not allow
        <img
          src={withoutPageCurl(url)}
          alt=""
          width={128}
          height={192}
          loading="lazy"
          className="h-full w-full rounded-cover object-cover shadow-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className={`relative flex h-full w-full flex-col justify-end overflow-hidden rounded-cover p-[11%] font-serif italic leading-[1.1] shadow-cover ${pairFor(title)}`}
        >
          <span className="absolute inset-y-0 left-0 w-1 bg-page/15" />
          {size !== "sm" && (
            <span className="line-clamp-6 break-words [font-size:max(9px,11cqw)]">{title}</span>
          )}
        </div>
      )}

      {number !== undefined && (
        <span className="absolute left-1 top-1 rounded-full bg-card px-2 py-0.5 text-xs font-bold text-ink shadow">
          #{number}
        </span>
      )}

      {badge && (
        <span
          role="img"
          aria-label={badge.label}
          title={badge.label}
          className={`absolute bottom-1 right-1 flex items-center justify-center rounded-full bg-card text-ink shadow ${size === "sm" ? "h-5 w-5" : "h-7 w-7"}`}
        >
          <badge.Icon size={size === "sm" ? 12 : 16} />
        </span>
      )}
    </div>
  );
}
