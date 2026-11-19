import type { Localized } from "../../core";
import type { library as en } from "../en/library";

export const library: Localized<typeof en> = {
  title: "Библиотека",
  search: "Поиск по моим книгам",
  sections: "Разделы библиотеки",
  tabs: { library: "Моя библиотека", wishlist: "Вишлист" },
  stats: "{owned} в библиотеке · {wishlist} в вишлисте · {read} прочитано",
  summary: {
    books: {
      one: "{count} книга",
      few: "{count} книги",
      many: "{count} книг",
      other: "{count} книги",
    },
    inGroups: {
      one: "в {count} группе",
      few: "в {count} группах",
      many: "в {count} группах",
      other: "в {count} группах",
    },
    withGroups: "{books} {groups}",
  },
  loadError: {
    title: "Не удалось загрузить книги",
    text: "Проверьте подключение и попробуйте ещё раз.",
  },
  noMatch: {
    title: "Ничего не найдено",
    query: "В этом списке нет ничего по запросу «{query}».",
    queryAndFilters: "В этом списке нет ничего по запросу «{query}» с выбранными фильтрами.",
    filters: "В этом списке нет книг, подходящих под фильтры.",
  },
  emptyLibrary: {
    title: "Ваша библиотека пуста",
    text: "Добавьте бумажные книги, которые у вас есть, и они соберутся здесь, полка за полкой.",
  },
  emptyWishlist: {
    title: "Ваш вишлист пуст",
    text: "Книги, которые вы хотите купить, будут ждать здесь, сгруппированные по сериям.",
  },
  standalone: {
    title: "Отдельные книги",
    subtitle: {
      one: "Не входят в серию · {count} книга",
      few: "Не входят в серию · {count} книги",
      many: "Не входят в серию · {count} книг",
      other: "Не входят в серию · {count} книги",
    },
  },
  gap: {
    badge: "Пропуск",
    missing: "Нет в серии",
    notInLibrary: "Нет в библиотеке",
    onWishlist: "В вишлисте",
  },
  noLinks: "Ссылок пока нет",
  rating: "Оценка: {rating} из 5",
  openSeries: "Открыть серию",
  progress: {
    own: "Есть {owned} из {total}",
    ownWithBooks: "Есть {owned} из {total}: книги {numbers}",
  },
  view: { label: "Вид", grid: "Сетка", list: "Список" },
  filters: {
    title: "Фильтры",
    withCount: "Фильтры · {count}",
    close: "Закрыть",
    clear: "Сбросить",
    clearAll: "Сбросить всё",
    apply: "Применить",
    nothingFound: "Ничего не найдено.",
    more: "ещё {count}",
    show: {
      one: "Показать {count} книгу",
      few: "Показать {count} книги",
      many: "Показать {count} книг",
      other: "Показать {count} книги",
    },
    remove: "Убрать фильтр «{label}»",
    findIn: "Поиск: {group}",
    group: {
      genre: "Жанр",
      trope: "Троп",
      status: "Статус серии",
      author: "Автор",
      language: "Язык магазина",
      kind: "Тип ссылки",
    },
    searchInGroup: {
      genre: "Найти жанр",
      trope: "Найти троп",
      status: "Найти статус серии",
      author: "Найти автора",
      language: "Найти язык магазина",
      kind: "Найти тип ссылки",
    },
    searchForOne: {
      genre: "Найти жанр",
      trope: "Найти троп",
      status: "Найти статус серии",
      author: "Найти автора",
      language: "Найти язык магазина",
      kind: "Найти тип ссылки",
    },
    chip: {
      language: "Язык магазина: {value}",
      status: "Серия: {value}",
      kind: "Ссылка: {value}",
    },
  },
};
