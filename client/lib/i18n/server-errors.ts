import type { MessageKey, Translate } from "@/lib/i18n";

const SERVER_MESSAGES: Record<string, MessageKey> = {
  "Invalid email or password": "errors.server.invalidCredentials",
  "User already exists": "errors.server.userExists",
  "Registration failed": "errors.server.registrationFailed",
  "Login failed": "errors.server.loginFailed",
  "Not authenticated": "errors.server.notAuthenticated",
  "Invalid token": "errors.server.invalidToken",
  "Request failed": "errors.server.requestFailed",
  "Request body is too large": "errors.server.bodyTooLarge",
  "must be a valid email address": "errors.server.validEmail",
  "is required": "errors.server.required",
  "must be at least 8 characters": "errors.server.passwordShort",
  "must be at most 72 bytes": "errors.server.passwordLong",
  "Book not found": "errors.server.bookNotFound",
  "Series not found": "errors.server.seriesNotFound",
  "Book search is unavailable right now": "errors.server.searchUnavailable",
  "Failed to create book": "errors.server.failedCreateBook",
  "Failed to update book": "errors.server.failedUpdateBook",
  "Failed to delete book": "errors.server.failedDeleteBook",
  "Failed to create series": "errors.server.failedCreateSeries",
  "Failed to update series": "errors.server.failedUpdateSeries",
  "Failed to delete series": "errors.server.failedDeleteSeries",
  "Failed to fetch book": "errors.server.failedFetchBook",
  "Failed to fetch books": "errors.server.failedFetchBooks",
  "Failed to fetch series": "errors.server.failedFetchSeries",
  "Failed to fetch tropes": "errors.server.failedFetchTropes",
  "Failed to fetch the current user": "errors.server.failedFetchUser",
  "Failed to search books": "errors.server.failedSearchBooks",
  "Failed to build the list": "errors.server.failedBuildList",
  "Failed to fetch stats": "errors.server.failedFetchStats",
  "Failed to save progress": "errors.server.failedSaveProgress",
  "Failed to save the goal": "errors.server.failedSaveGoal",
  "unknown series": "errors.server.unknownSeries",
  "needs a seriesId": "errors.server.needsSeriesId",
};

const FIELD_PREFIX = /^(name|email|password|seriesId|seriesNumber): (.+)$/;

export function translateServerError(message: string, t: Translate): string {
  const key = SERVER_MESSAGES[message];
  if (key) return t(key);

  const field = FIELD_PREFIX.exec(message);
  if (field && SERVER_MESSAGES[field[2]]) {
    return `${field[1]}: ${t(SERVER_MESSAGES[field[2]])}`;
  }

  return message;
}
