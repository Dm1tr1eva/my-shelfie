export type Ownership = "owned" | "wanted";
export type Format = "paper" | "ebook";
export type LinkLanguage = "ru" | "uk" | "en" | "other";
export type SeriesStatus = "ongoing" | "complete" | "unknown";

export const OWNERSHIP_LABELS: Record<Ownership, string> = {
  owned: "In my library",
  wanted: "Wishlist",
};

export const FORMAT_LABELS: Record<Format, string> = {
  paper: "Paper",
  ebook: "E-book",
};

export const FORMATS = Object.keys(FORMAT_LABELS) as Format[];

export const LINK_LANGUAGES: { value: LinkLanguage; badge: string; name: string }[] = [
  { value: "ru", badge: "RU", name: "Russian" },
  { value: "uk", badge: "UK", name: "Ukrainian" },
  { value: "en", badge: "EN", name: "English" },
  { value: "other", badge: "OTH", name: "Other" },
];

export const SERIES_STATUS_LABELS: Record<SeriesStatus, string> = {
  ongoing: "Ongoing",
  complete: "Complete",
  unknown: "Unknown",
};
