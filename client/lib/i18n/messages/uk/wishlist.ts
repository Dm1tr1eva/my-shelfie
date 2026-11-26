import type { Localized } from "../../core";
import type { wishlist as en } from "../en/wishlist";

export const wishlist: Localized<typeof en> = {
  title: "Вішліст",
  loading: "Завантажуємо вішліст…",
  groups: {
    continue: {
      title: "Продовжити серію",
      empty: "Сюди потрапляють серії, де в тебе є книги, але не всі.",
    },
    newSeries: {
      title: "Нові серії",
      empty: "Сюди потрапляють серії, де в тебе ще немає жодної книги.",
    },
    standalone: {
      title: "Окремі книги",
      empty: "Сюди потрапляють книги поза серіями, які ти хочеш.",
    },
  },
  empty: {
    title: "Твій вішліст порожній",
    text: "Додай книгу, яку хочеш, і вона чекатиме тут, поруч зі своєю серією.",
  },
  loadError: {
    title: "Не вдалося завантажити вішліст",
    text: "Перевір підключення і спробуй ще раз.",
  },
  desire: {
    high: "Дуже хочу",
    normal: "Хочу",
    someday: "Колись",
    label: "Бажання: {level}. Натисни, щоб змінити",
    changed: "{title}: {level}",
    failed: "Не вдалося змінити бажання для «{title}». Спробуй ще раз.",
  },
  show: {
    one: "Показати {count} результат",
    few: "Показати {count} результати",
    many: "Показати {count} результатів",
    other: "Показати {count} результату",
  },
};
