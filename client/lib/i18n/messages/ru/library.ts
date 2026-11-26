import type { Localized } from "../../core";
import type { library as en } from "../en/library";

export const library: Localized<typeof en> = {
  title: "Библиотека",
  searchAll: "Название, автор или серия",
  shelf: {
    notPartOfSeries: "Не входят в серию",
    notInCatalogue: "Нет в каталоге",
    add: "+ добавить",
    gapLabel: "Добавить {range} в «{series}», нет в каталоге",
    gapLabelWithYear: "Добавить {range} в «{series}», нет в каталоге, не раньше {year}",
    notBefore: "Не раньше {year}",
    more: "ещё",
    moreLabel: "Ещё {count} в серии «{series}»",
  },
  panel: {
    reset: "Сбросить",
    have: { owned: "Есть" },
    age: { none: "Не указан" },
    rating: { low: "★ 3 и ниже", none: "Без оценки" },
    group: {
      have: "У меня",
      reading: "Статус",
      format: "Формат",
      genre: "Жанр",
      age: "Возраст",
      trope: "Тропы",
      author: "Автор",
      status: "Статус серии",
      language: "Язык ссылки",
      kind: "Тип ссылки",
      rating: "Оценка",
    },
    chip: { age: "Возраст: {value}", language: "Язык ссылки: {value}" },
  },
  loadError: {
    title: "Не удалось загрузить книги",
    text: "Проверь подключение и попробуй ещё раз.",
  },
  noMatch: {
    title: "Ничего не найдено",
    query: "В этом списке нет ничего по запросу «{query}».",
    queryAndFilters: "В этом списке нет ничего по запросу «{query}» с выбранными фильтрами.",
    filters: "В этом списке нет книг, подходящих под фильтры.",
  },
  emptyLibrary: {
    title: "Твоя библиотека пуста",
    text: "Добавь книги, которые у тебя есть или которые хочется прочитать, и они соберутся здесь, полка за полкой.",
  },
  standalone: {
    title: "Отдельные книги",
  },
  rating: "Оценка: {rating} из 5",
  progress: {
    own: "Есть {owned} из {total}",
  },
  filters: {
    title: "Фильтры",
    withCount: "Фильтры · {count}",
    nothingFound: "Ничего не найдено.",
    more: "ещё {count}",
    show: {
      one: "Показать {count} книгу",
      few: "Показать {count} книги",
      many: "Показать {count} книг",
      other: "Показать {count} книги",
    },
    remove: "Убрать фильтр «{label}»",
    searchForOne: {
      trope: "Найти троп",
    },
    chip: {
      status: "Серия: {value}",
      kind: "Ссылка: {value}",
    },
  },
};
