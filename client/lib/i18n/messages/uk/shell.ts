import type { Localized } from "../../core";
import type { shell as en } from "../en/shell";

export const shell: Localized<typeof en> = {
  nav: {
    main: "Головне меню",
    library: "Бібліотека",
    backTo: "Назад:",
    wishlist: "Вішліст",
    addBook: "Додати книгу",
    account: "Акаунт",
    signIn: "Увійти",
  },
  account: { logOut: "Вийти" },
  close: "Закрити",
  labels: { inWishlist: "У вішлісті" },
  install: {
    button: "Встановити застосунок",
    iosTitle: "Встановити застосунок:",
    iosSteps: "натисніть «Поділитися», потім «На початковий екран».",
  },
  footer: {
    tagline: "My Shelfie · pet-проєкт каталогу книжок",
    home: "Головна",
    source: "Вихідний код на GitHub",
    privacy: "Конфіденційність",
  },
  loading: {
    title: "Завантажуємо вашу бібліотеку…",
    slow: "Сервер прокидається після паузи. Це може тривати до хвилини — дякуємо, що зачекали.",
  },
  language: { label: "Мова" },
  states: {
    tryAgain: "Спробувати ще раз",
    back: "Назад",
    notFoundText: "Можливо, це видалено або посилання хибне. Нічого не змінилося.",
    loadingShelves: "Завантажуємо ваші полиці…",
    loading: "Завантаження…",
  },
  notFound: { title: "Сторінку не знайдено", back: "На головну" },
  titles: {
    library: "Бібліотека",
    wishlist: "Вішліст",
    next: "Що купити далі",
    add: "Додати книгу",
    details: "Деталі книги",
    book: "Книга",
    series: "Серія",
    login: "Вхід",
    register: "Реєстрація",
    privacy: "Конфіденційність",
  },
};
