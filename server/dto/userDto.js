function toUserDto(user) {
  return { id: user._id.toString(), email: user.email, name: user.name };
}

module.exports = { toUserDto };
