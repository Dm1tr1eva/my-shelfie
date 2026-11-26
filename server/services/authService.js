const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userRepository = require("../repositories/userRepository");

const HASH_ROUNDS = 10;
const SESSION_LIFETIME = "7d";

async function register({ email, password, name }) {
  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) return null;

  const passwordHash = await bcrypt.hash(password, HASH_ROUNDS);
  return userRepository.create({ email, passwordHash, name });
}

async function logIn({ email, password }) {
  const user = await userRepository.findByEmail(email);
  if (!user) return null;

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) return null;

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: SESSION_LIFETIME,
  });
  return { user, token };
}

async function getUser(userId) {
  return userRepository.findById(userId);
}

module.exports = { register, logIn, getUser };
