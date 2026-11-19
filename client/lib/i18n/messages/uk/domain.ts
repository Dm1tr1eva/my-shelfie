import type { Localized } from "../../core";
import type { domain as en } from "../en/domain";

export const domain: Localized<typeof en> = {
  status: { want: "Хочу прочитати", reading: "Читаю", read: "Прочитано", dropped: "Покинуто" },
  ownership: { owned: "У моїй бібліотеці", wanted: "Вішліст" },
  format: {
    paper: "Паперова",
    ebook: "Електронна",
    audio: "Аудіокнига",
    paperBook: "Паперова книга",
    ebookBook: "Електронна книга",
    audioBook: "Аудіокнига",
  },
  seriesStatus: {
    ongoing: "Виходить",
    readable: "Можна читати",
    complete: "Завершена",
    unknown: "Невідомо",
  },
  seriesChoice: {
    ongoing: "Ще виходить",
    readable: "Ще виходить, але вже можна читати",
    complete: "Завершена",
    unknown: "Не знаю",
  },
  seriesHeader: {
    ongoing: "Серія виходить",
    readable: "Серія виходить, вже можна читати",
    complete: "Завершена серія",
    unknown: "Статус серії невідомий",
  },
  linkKind: {
    paper: "Паперова",
    ebook: "Електронна",
    audio: "Аудіо",
    free: "Завантажити електронну безкоштовно",
    online: "Читати онлайн",
  },
  linkKindShort: {
    paper: "Папір",
    ebook: "Ел. книга",
    audio: "Аудіо",
    free: "Безкоштовно",
    online: "Онлайн",
  },
  language: { ru: "Російська", uk: "Українська", en: "Англійська", misc: "Інша" },
  genre: {
    Fantasy: "Фентезі",
    Romantasy: "Романтичне фентезі",
    Romance: "Любовний роман",
    "Science fiction": "Наукова фантастика",
    "Mystery & thriller": "Детектив і трилер",
    Horror: "Жахи",
    "Historical fiction": "Історичний роман",
    "Contemporary fiction": "Сучасна проза",
    Classics: "Класика",
    "Young adult": "Молодіжна проза",
    "Non-fiction": "Нон-фікшн",
    Poetry: "Поезія",
  },
};
