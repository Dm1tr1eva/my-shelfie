import { describe, it, expect, vi, afterEach } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import { mockApi, renderApp } from "@/test/helpers";
import { resetLocale, setLocale } from "@/lib/i18n";
import Home from "@/app/page";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe("home and sign-in screens in other languages", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    act(() => resetLocale());
  });

  it("shows the home page in Ukrainian with the placeholders filled", async () => {
    act(() => setLocale("uk"));
    mockApi(() => undefined, false);
    renderApp(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: /Твої книги, розставлені за серіями\./ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Знаходь пропуски" })).toBeInTheDocument();
    expect(screen.getByText("Є 2 з 4")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Заведи свою полицю/ })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("shows the home page in Russian for a signed-in visitor", async () => {
    act(() => setLocale("ru"));
    mockApi(() => undefined, true);
    renderApp(<Home />);

    expect(await screen.findByRole("link", { name: /Открыть мою библиотеку/ })).toHaveAttribute(
      "href",
      "/library",
    );
    expect(screen.getByText("Есть 2 из 4")).toBeInTheDocument();
  });

  it("translates the sign-in form and its own messages", async () => {
    act(() => setLocale("ru"));
    mockApi(() => undefined, false);
    renderApp(<LoginForm />);

    expect(screen.getByRole("heading", { name: "С возвращением" })).toBeInTheDocument();
    expect(screen.getByLabelText("Пароль")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Войти" }));
    expect(await screen.findByText("Введи email и пароль.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Показать пароль" })).toBeInTheDocument();
  });

  it("translates the registration form, the length message and a server validation message", async () => {
    act(() => setLocale("uk"));
    const calls = mockApi((call) => {
      if (call.path === "/api/auth/register") {
        return { status: 400, body: { error: "email: must be a valid email address" } };
      }
      return undefined;
    }, false);
    renderApp(<RegisterForm />);

    expect(await screen.findByText("Не менше 8 символів.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Пароль"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "Створити акаунт" }));
    expect(
      await screen.findByText("Занадто короткий: 5 з 8 потрібних символів."),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Ім’я"), { target: { value: "Аліса" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "alice@example.com" } });
    fireEvent.change(screen.getByLabelText("Пароль"), { target: { value: "secret123" } });
    fireEvent.change(screen.getByLabelText("Повтори пароль"), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Створити акаунт" }));

    expect(await screen.findByText("має бути дійсним email")).toBeInTheDocument();
    expect(calls.some((call) => call.path === "/api/auth/register")).toBe(true);
  });
});
