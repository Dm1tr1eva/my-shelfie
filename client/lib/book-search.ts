export const SEARCH_DEBOUNCE_MS = 400;
export const SEARCH_MIN_LENGTH = 3;

export type BookSearchResult = {
  volumeId: string;
  title: string;
  authors: string[];
  year?: number;
  coverUrl?: string;
  link?: string;
};
