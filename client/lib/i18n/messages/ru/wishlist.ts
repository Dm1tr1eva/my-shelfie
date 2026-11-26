import type { Localized } from "../../core";
import type { wishlist as en } from "../en/wishlist";

export const wishlist: Localized<typeof en> = {
  title: "Вишлист",
  loading: "Загружаем вишлист…",
  groups: {
    continue: {
      title: "Продолжить серию",
      empty: "Сюда попадают серии, где у тебя есть книги, но не все.",
    },
    newSeries: {
      title: "Новые серии",
      empty: "Сюда попадают серии, где у тебя пока нет ни одной книги.",
    },
    standalone: {
      title: "Отдельные книги",
      empty: "Сюда попадают книги вне серий, которые ты хочешь.",
    },
  },
  empty: {
    title: "Твой вишлист пуст",
    text: "Добавь книгу, которую хочешь, и она будет ждать здесь, рядом со своей серией.",
  },
  loadError: {
    title: "Не удалось загрузить вишлист",
    text: "Проверь подключение и попробуй ещё раз.",
  },
  desire: {
    high: "Очень хочу",
    normal: "Хочу",
    someday: "Когда-нибудь",
    label: "Желание: {level}. Нажми, чтобы сменить",
    changed: "{title}: {level}",
    failed: "Не получилось изменить желание для «{title}». Попробуй ещё раз.",
  },
  show: {
    one: "Показать {count} результат",
    few: "Показать {count} результата",
    many: "Показать {count} результатов",
    other: "Показать {count} результата",
  },
};
