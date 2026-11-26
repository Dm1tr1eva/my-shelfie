export type Ownership = "owned" | "wanted";
export type Format = "paper" | "ebook" | "audio";
export type LinkLanguage = "ru" | "uk" | "en" | "other";
export type LinkKind = "paper" | "ebook" | "audio" | "free" | "online";
export type SeriesStatus = "ongoing" | "readable" | "complete" | "unknown";
export type DesireLevel = "high" | "normal" | "someday";
export type AgeRating = "none" | "12" | "16" | "18";
export type Recommend = "yes" | "maybe" | "no";
export type ExpectedSource = "fantlab" | "ai" | "manual";

export const PRESET_MOODS: readonly string[] = [
  "Gripping",
  "Cozy",
  "Tense",
  "Funny",
  "Sad",
  "Inspiring",
];

export const RECOMMEND_VALUES: Recommend[] = ["yes", "maybe", "no"];

export const MOODS_MAX = 12;
export const MOOD_NAME_MAX = 40;
export const LINKS_MAX = 10;
export const QUOTES_MAX = 50;
export const BOOK_LENGTH_MAX = 10000;

export const OWNERSHIP_LABELS: Record<Ownership, string> = {
  owned: "In my library",
  wanted: "Wishlist",
};

export const LINK_KINDS: { value: LinkKind; label: string; short: string }[] = [
  { value: "paper", label: "Paper", short: "Paper" },
  { value: "ebook", label: "E-book", short: "E-book" },
  { value: "audio", label: "Audio", short: "Audio" },
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
