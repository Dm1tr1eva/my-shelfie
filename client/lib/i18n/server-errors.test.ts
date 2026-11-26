import { describe, it, expect } from "vitest";
import { translator } from "@/lib/i18n";
import { translateServerError } from "@/lib/i18n/server-errors";

describe("translateServerError", () => {
  it("translates a known server message into Ukrainian", () => {
    const t = translator("uk");

    expect(translateServerError("Invalid email or password", t)).toBe(
      "Неправильний email або пароль",
    );
    expect(translateServerError("User already exists", t)).toBe("Користувач уже існує");
  });

  it("translates a known server message into Russian", () => {
    expect(translateServerError("Not authenticated", translator("ru"))).toBe(
      "Вход в аккаунт не выполнен",
    );
  });

  it("translates the failures of Home's stats, progress and goal requests", () => {
    expect(translateServerError("Failed to fetch stats", translator("ru"))).toBe(
      "Не удалось загрузить статистику",
    );
    expect(translateServerError("Failed to save progress", translator("uk"))).toBe(
      "Не вдалося зберегти прогрес",
    );
    expect(translateServerError("Failed to save the goal", translator("ru"))).toBe(
      "Не удалось сохранить цель",
    );
  });

  it("translates every message the auth endpoints and the client can produce", () => {
    const t = translator("ru");
    const english = [
      "Invalid email or password",
      "User already exists",
      "Registration failed",
      "Login failed",
      "Not authenticated",
      "Invalid token",
      "Request failed",
      "must be a valid email address",
      "is required",
      "must be at least 8 characters",
      "must be at most 72 bytes",
    ];

    for (const message of english) {
      expect(translateServerError(message, t)).not.toBe(message);
    }
  });

  it("translates the answer to a body over the server's size limit", () => {
    expect(translateServerError("Request body is too large", translator("ru"))).toBe(
      "Слишком много текста, чтобы сохранить",
    );
  });

  it("keeps the field name when a validation message carries one", () => {
    expect(translateServerError("password: must be at most 72 bytes", translator("uk"))).toBe(
      "password: має бути не довшим за 72 байти",
    );
  });

  it("returns an unknown message unchanged", () => {
    expect(translateServerError("Something nobody mapped", translator("uk"))).toBe(
      "Something nobody mapped",
    );
  });

  it("returns the English message in English", () => {
    expect(translateServerError("Invalid token", translator("en"))).toBe("Invalid token");
  });
});
