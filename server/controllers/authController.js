const authService = require("../services/authService");
const { registerSchema, loginSchema } = require("../validation/authSchemas");
const { validate } = require("../validation/validate");
const { toUserDto } = require("../dto/userDto");

const ROOT_LABEL = "";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
}

async function register(req, res) {
  const data = validate(registerSchema, req.body, ROOT_LABEL);

  const user = await authService.register(data);

  if (!user) {
    return res.status(409).json({ error: "User already exists" });
  }

  res.status(201).json(toUserDto(user));
}

async function login(req, res) {
  const credentials = validate(loginSchema, req.body, ROOT_LABEL);

  const session = await authService.logIn(credentials);

  if (!session) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  res.cookie("token", session.token, {
    ...sessionCookieOptions(),
    maxAge: SESSION_MAX_AGE_MS,
  });

  res.json(toUserDto(session.user));
}

function logout(req, res) {
  res.clearCookie("token", sessionCookieOptions());
  res.status(204).end();
}

async function getMe(req, res) {
  if (!req.userId) {
    return res.json(null);
  }

  const user = await authService.getUser(req.userId);

  res.json(user ? toUserDto(user) : null);
}

module.exports = { register, login, logout, getMe };
