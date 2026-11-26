export const privacy = {
  title: "Privacy",
  intro: "What My Shelfie keeps about you, and why. Last updated 26 November 2026.",
  onThisPage: "On this page",
  store: {
    title: "What we store",
    lead: "To run your catalogue, My Shelfie keeps:",
    account:
      "your account: your name, your email address and a hash of your password. The password itself is never stored;",
    books:
      "your books and series: titles, authors, cover addresses, series and numbers, ownership, reading status, ratings and reviews, genres and tropes, and for a book found through search its Google Books id;",
    written: "what you write: notes, your own annotations and shop links;",
    cookieBefore: "one cookie, ",
    cookieAfter:
      ", that keeps you signed in for seven days. Scripts on the page cannot read it. There are no analytics and no advertising cookies.",
    private: "Your shelves are private. Other users cannot see them.",
  },
  search: {
    title: "Book search",
    body: "The text you type into the search box is sent through this app's server to the Google Books API, and Google's own terms and privacy policy apply to it. Results are shown and not kept; the one you pick is saved to your shelf. Book covers are loaded straight from Google's servers, so your browser contacts Google when a cover is displayed. To find out whether a book belongs to a series, its title, authors and, when known, its subtitle, ISBN, Google Books id and language are sent through this app's server to Anthropic's Claude API, which searches the web for the answer; your name, email and shelves are never sent. The answer is kept on the server and reused for anyone who looks up the same book, and only becomes part of your shelf when you confirm it.",
  },
  links: {
    title: "Shop links",
    body: "Links are stored exactly as you paste them. My Shelfie does not read the shops' pages, does not track clicks and does not add affiliate codes. A link opens the shop in a new tab.",
  },
  hosting: {
    title: "Where your data lives",
    body: "The site is hosted on Vercel, the server on Render and the database on MongoDB Atlas. The data is not sold and not shared with anyone beyond what this page describes.",
  },
  deleting: {
    title: "Deleting your data",
    body: "Deleting a book removes it with its notes and links. Deleting a series keeps its books on your shelf. To delete your whole account and everything in it, open an issue on the project's issue tracker below and say that you want your account deleted.",
  },
  contact: {
    title: "Contact",
    before:
      "Questions about your data, deletion requests, or content you believe infringes your rights: open an issue at ",
    link: "the project's issue tracker",
    after:
      ". Issues are public, so describe the request without personal details; the author will answer there.",
  },
};
