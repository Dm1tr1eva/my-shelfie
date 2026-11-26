import type { Localized } from "../../core";
import type { auth as en } from "../en/auth";

export const auth: Localized<typeof en> = {
  common: {
    email: "Email",
    password: "Пароль",
    showPassword: "Показати пароль",
    hidePassword: "Сховати пароль",
    somethingWrong: "Щось пішло не так. Спробуй ще раз.",
  },
  login: {
    heading: "З поверненням",
    lead: "Увійди, щоб відкрити свої полиці.",
    enterBoth: "Введи email і пароль.",
    mismatch: "Такої пари email і пароля немає в жодному акаунті.",
    submit: "Увійти",
    pending: "Входимо...",
    newHere: "Вперше тут?",
    create: "Створити акаунт",
  },
  register: {
    heading: "Заведи свою полицю",
    lead: "Створи акаунт, щоб вести каталог своїх книг.",
    name: "Ім’я",
    confirm: "Повтори пароль",
    hint: "Не менше 8 символів.",
    submit: "Створити акаунт",
    pending: "Створюємо акаунт...",
    agree: "Створюючи акаунт, ти погоджуєшся з",
    privacyNotice: "політикою конфіденційності",
    already: "Вже є акаунт?",
    signIn: "Увійти",
    enterName: "Введи ім’я.",
    validEmail: "Введи дійсний email.",
    enterPassword: "Введи пароль.",
    tooShort: "Занадто короткий: {length} з {min} потрібних символів.",
    tooLong: "Занадто довгий пароль.",
    noMatch: "Паролі не збігаються.",
    emailTaken: "На цей email уже є акаунт.",
    signInInstead: "Натомість увійти",
    checkFields: "Перевір поля й спробуй ще раз.",
  },
};
