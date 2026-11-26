import type { Localized } from "../../core";
import type { auth as en } from "../en/auth";

export const auth: Localized<typeof en> = {
  common: {
    email: "Email",
    password: "Пароль",
    showPassword: "Показать пароль",
    hidePassword: "Скрыть пароль",
    somethingWrong: "Что-то пошло не так. Попробуй ещё раз.",
  },
  login: {
    heading: "С возвращением",
    lead: "Войди, чтобы открыть свои полки.",
    enterBoth: "Введи email и пароль.",
    mismatch: "Такой пары email и пароля нет ни в одном аккаунте.",
    submit: "Войти",
    pending: "Входим...",
    newHere: "Впервые здесь?",
    create: "Создать аккаунт",
  },
  register: {
    heading: "Заведи свою полку",
    lead: "Создай аккаунт, чтобы вести каталог своих книг.",
    name: "Имя",
    confirm: "Повтори пароль",
    hint: "Не меньше 8 символов.",
    submit: "Создать аккаунт",
    pending: "Создаём аккаунт...",
    agree: "Создавая аккаунт, ты соглашаешься с",
    privacyNotice: "политикой конфиденциальности",
    already: "Уже есть аккаунт?",
    signIn: "Войти",
    enterName: "Введи имя.",
    validEmail: "Введи корректный email.",
    enterPassword: "Введи пароль.",
    tooShort: "Слишком короткий: {length} из {min} необходимых символов.",
    tooLong: "Слишком длинный пароль.",
    noMatch: "Пароли не совпадают.",
    emailTaken: "На этот email уже есть аккаунт.",
    signInInstead: "Войти вместо этого",
    checkFields: "Проверь поля и попробуй ещё раз.",
  },
};
