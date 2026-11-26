import type { Localized } from "../../core";
import type { library as en } from "../en/library";

export const library: Localized<typeof en> = {
  title: "Бібліотека",
  searchAll: "Назва, автор або серія",
  shelf: {
    notPartOfSeries: "Не входять до серії",
    notInCatalogue: "Немає в каталозі",
    add: "+ додати",
    gapLabel: "Додати {range} до «{series}», немає в каталозі",
    gapLabelWithYear: "Додати {range} до «{series}», немає в каталозі, не раніше {year}",
    notBefore: "Не раніше {year}",
    more: "ще",
    moreLabel: "Ще {count} у серії «{series}»",
  },
  panel: {
    reset: "Скинути",
    have: { owned: "Є" },
    age: { none: "Не вказано" },
    rating: { low: "★ 3 і нижче", none: "Без оцінки" },
    group: {
      have: "У мене",
      reading: "Статус",
      format: "Формат",
      genre: "Жанр",
      age: "Вік",
      trope: "Тропи",
      author: "Автор",
      status: "Статус серії",
      language: "Мова посилання",
      kind: "Тип посилання",
      rating: "Оцінка",
    },
    chip: { age: "Вік: {value}", language: "Мова посилання: {value}" },
  },
  loadError: {
    title: "Не вдалося завантажити книги",
    text: "Перевір з’єднання та спробуй ще раз.",
  },
  noMatch: {
    title: "Нічого не знайдено",
    query: "У цьому списку немає нічого за запитом «{query}».",
    queryAndFilters: "У цьому списку немає нічого за запитом «{query}» з вибраними фільтрами.",
    filters: "У цьому списку немає книг, що підходять під фільтри.",
  },
  emptyLibrary: {
    title: "Твоя бібліотека порожня",
    text: "Додай книги, які у тебе є або які хочеться прочитати, і вони зберуться тут, полиця за полицею.",
  },
  standalone: {
    title: "Окремі книги",
  },
  rating: "Оцінка: {rating} з 5",
  progress: {
    own: "Є {owned} з {total}",
  },
  filters: {
    title: "Фільтри",
    withCount: "Фільтри · {count}",
    nothingFound: "Нічого не знайдено.",
    more: "ще {count}",
    show: {
      one: "Показати {count} книгу",
      few: "Показати {count} книги",
      many: "Показати {count} книг",
      other: "Показати {count} книги",
    },
    remove: "Прибрати фільтр «{label}»",
    searchForOne: {
      trope: "Знайти троп",
    },
    chip: {
      status: "Серія: {value}",
      kind: "Посилання: {value}",
    },
  },
};
