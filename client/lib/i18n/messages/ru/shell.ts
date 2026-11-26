import type { Localized } from "../../core";
import type { shell as en } from "../en/shell";

export const shell: Localized<typeof en> = {
  nav: {
    main: "Главное меню",
    library: "Библиотека",
    backTo: "Назад:",
    wishlist: "Вишлист",
    addBook: "Добавить книгу",
    account: "Аккаунт",
    signIn: "Войти",
  },
  account: { logOut: "Выйти" },
  close: "Закрыть",
  labels: { inWishlist: "В вишлисте" },
  install: {
    button: "Установить приложение",
    iosTitle: "Установить приложение:",
    iosSteps: "нажми «Поделиться», затем «На экран „Домой“».",
  },
  footer: {
    tagline: "My Shelfie · pet-проект каталога книг",
    home: "Главная",
    source: "Исходный код на GitHub",
    privacy: "Конфиденциальность",
  },
  loading: {
    title: "Загружаем твою библиотеку…",
    slow: "Сервер просыпается после паузы. Это может занять до минуты — спасибо за терпение.",
  },
  language: { label: "Язык" },
  states: {
    tryAgain: "Попробовать снова",
    back: "Назад",
    notFoundText: "Возможно, это удалено или ссылка неверна. Ничего не изменилось.",
    loadingShelves: "Загружаем твои полки…",
    loading: "Загрузка…",
  },
  notFound: { title: "Страница не найдена", back: "На главную" },
  titles: {
    library: "Библиотека",
    wishlist: "Вишлист",
    next: "Что взять дальше",
    add: "Добавить книгу",
    details: "Детали книги",
    book: "Книга",
    series: "Серия",
    login: "Вход",
    register: "Регистрация",
    privacy: "Конфиденциальность",
    notFound: "Страница не найдена",
  },
};
