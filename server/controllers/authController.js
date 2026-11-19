const bcrypt = require("bcrypt");
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const { registerSchema, loginSchema } = require("../validation/authSchemas");
const { validate } = require("../validation/validate");

const ROOT_LABEL = "";

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
}

async function register(req, res) {
  const { email, password, name } = validate(registerSchema, req.body, ROOT_LABEL);

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return res.status(409).json({ error: "User already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash, name });

  res.status(201).json({ id: user._id, email: user.email, name: user.name });
}

async function login(req, res) {
  const { email, password } = validate(loginSchema, req.body, ROOT_LABEL);

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("token", token, {
    ...sessionCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ id: user._id, email: user.email, name: user.name });
}

function logout(req, res) {
  res.clearCookie("token", sessionCookieOptions());
  res.status(204).end();
}

async function getMe(req, res) {
  if (!req.userId) {
    return res.json(null);
  }

  const user = await User.findById(req.userId);

  if (!user) {
    return res.json(null);
  }

  res.json({ id: user._id, email: user.email, name: user.name });
}

module.exports = { register, login, logout, getMe };
