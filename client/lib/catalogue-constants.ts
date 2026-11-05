export type Ownership = "owned" | "wanted";
export type Format = "paper" | "ebook";
export type LinkLanguage = "ru" | "uk" | "en" | "other";
export type LinkKind = "paper" | "ebook" | "free" | "online";
export type SeriesStatus = "ongoing" | "readable" | "complete" | "unknown";

export const OWNERSHIP_LABELS: Record<Ownership, string> = {
  owned: "In my library",
  wanted: "Wishlist",
};

export const FORMAT_LABELS: Record<Format, string> = {
  paper: "Paper",
  ebook: "E-book",
};

export const FORMATS = Object.keys(FORMAT_LABELS) as Format[];

export const LINK_KINDS: { value: LinkKind; label: string; short: string }[] = [
  { value: "paper", label: "Buy paper", short: "Paper" },
  { value: "ebook", label: "Buy e-book", short: "E-book" },
  { value: "free", label: "Free e-book download", short: "Free" },
  { value: "online", label: "Read online", short: "Online" },
];

export const LINK_LANGUAGES: { value: LinkLanguage; badge: string; name: string }[] = [
  { value: "ru", badge: "RU", name: "Russian" },
  { value: "uk", badge: "UK", name: "Ukrainian" },
  { value: "en", badge: "EN", name: "English" },
  { value: "other", badge: "OTH", name: "Other" },
];

export const SERIES_STATUS_LABELS: Record<SeriesStatus, string> = {
  ongoing: "Ongoing",
  readable: "Readable now",
  complete: "Complete",
  unknown: "Unknown",
};
