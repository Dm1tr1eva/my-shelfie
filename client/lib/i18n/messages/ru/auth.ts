import type { Localized } from "../../core";
import type { auth as en } from "../en/auth";

export const auth: Localized<typeof en> = {
  common: {
    email: "Email",
    password: "Пароль",
    showPassword: "Показать пароль",
    hidePassword: "Скрыть пароль",
    somethingWrong: "Что-то пошло не так. Попробуйте ещё раз.",
  },
  login: {
    heading: "С возвращением",
    lead: "Войдите, чтобы открыть свои полки.",
    enterBoth: "Введите email и пароль.",
    mismatch: "Такой пары email и пароля нет ни в одном аккаунте.",
    submit: "Войти",
    pending: "Входим...",
    newHere: "Впервые здесь?",
    create: "Создать аккаунт",
  },
  register: {
    heading: "Заведите свою полку",
    lead: "Создайте аккаунт, чтобы вести каталог своих книг.",
    name: "Имя",
    confirm: "Повторите пароль",
    hint: "Не меньше 8 символов.",
    submit: "Создать аккаунт",
    pending: "Создаём аккаунт...",
    agree: "Создавая аккаунт, вы соглашаетесь с",
    privacyNotice: "политикой конфиденциальности",
    already: "Уже есть аккаунт?",
    signIn: "Войти",
    enterName: "Введите имя.",
    validEmail: "Введите корректный email.",
    enterPassword: "Введите пароль.",
    tooShort: "Слишком короткий: {length} из {min} необходимых символов.",
    tooLong: "Слишком длинный пароль.",
    noMatch: "Пароли не совпадают.",
    emailTaken: "На этот email уже есть аккаунт.",
    signInInstead: "Войти вместо этого",
    checkFields: "Проверьте поля и попробуйте ещё раз.",
  },
};
