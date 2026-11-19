import type { Localized } from "../../core";
import type { shell as en } from "../en/shell";

export const shell: Localized<typeof en> = {
  nav: {
    main: "Главное меню",
    library: "Библиотека",
    wishlist: "Вишлист",
    nextToBuy: "Что купить дальше",
    addBook: "Добавить книгу",
    account: "Аккаунт",
    signIn: "Войти",
  },
  account: { logOut: "Выйти" },
  labels: { inWishlist: "В вишлисте" },
  install: {
    button: "Установить приложение",
    iosTitle: "Установить приложение:",
    iosSteps: "нажмите «Поделиться», затем «На экран „Домой“».",
  },
  footer: {
    tagline: "My Shelfie · pet-проект каталога книг",
    home: "Главная",
    source: "Исходный код на GitHub",
    privacy: "Конфиденциальность",
  },
  loading: {
    title: "Загружаем вашу библиотеку…",
    slow: "Сервер просыпается после паузы. Это может занять до минуты — спасибо, что подождали.",
  },
  language: { label: "Язык" },
  states: {
    tryAgain: "Попробовать снова",
    back: "Назад",
    notFoundText: "Возможно, это удалено или ссылка неверна. Ничего не изменилось.",
    loadingShelves: "Загружаем ваши полки…",
    loading: "Загрузка…",
  },
  notFound: { title: "Страница не найдена", back: "На главную" },
  titles: {
    library: "Библиотека",
    wishlist: "Вишлист",
    next: "Что купить дальше",
    add: "Добавить книгу",
    details: "Детали книги",
    book: "Книга",
    series: "Серия",
    login: "Вход",
    register: "Регистрация",
    privacy: "Конфиденциальность",
  },
};
