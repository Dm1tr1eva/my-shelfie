export type BookSearchResult = {
  volumeId: string;
  title: string;
  authors: string[];
  year?: number;
  coverUrl?: string;
  link?: string;
};
