import type { Localized } from "../../core";
import type { auth as en } from "../en/auth";

export const auth: Localized<typeof en> = {
  common: {
    email: "Email",
    password: "Пароль",
    showPassword: "Показати пароль",
    hidePassword: "Сховати пароль",
    somethingWrong: "Щось пішло не так. Спробуйте ще раз.",
  },
  login: {
    heading: "З поверненням",
    lead: "Увійдіть, щоб відкрити свої полиці.",
    enterBoth: "Введіть email і пароль.",
    mismatch: "Такої пари email і пароля немає в жодному акаунті.",
    submit: "Увійти",
    pending: "Входимо...",
    newHere: "Вперше тут?",
    create: "Створити акаунт",
  },
  register: {
    heading: "Заведіть свою полицю",
    lead: "Створіть акаунт, щоб вести каталог своїх книг.",
    name: "Ім’я",
    confirm: "Повторіть пароль",
    hint: "Не менше 8 символів.",
    submit: "Створити акаунт",
    pending: "Створюємо акаунт...",
    agree: "Створюючи акаунт, ви погоджуєтеся з",
    privacyNotice: "політикою конфіденційності",
    already: "Вже є акаунт?",
    signIn: "Увійти",
    enterName: "Введіть ім’я.",
    validEmail: "Введіть дійсний email.",
    enterPassword: "Введіть пароль.",
    tooShort: "Занадто короткий: {length} з {min} потрібних символів.",
    tooLong: "Занадто довгий пароль.",
    noMatch: "Паролі не збігаються.",
    emailTaken: "На цей email уже є акаунт.",
    signInInstead: "Натомість увійти",
    checkFields: "Перевірте поля й спробуйте ще раз.",
  },
};
