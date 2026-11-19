const mongoose = require("mongoose");

const yearGoalSchema = new mongoose.Schema(
  {
    year: { type: Number, required: true },
    books: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  yearGoal: yearGoalSchema,
});

module.exports = mongoose.model("User", userSchema);
