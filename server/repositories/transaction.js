const mongoose = require("mongoose");

async function inTransaction(work) {
  return mongoose.connection.transaction(work);
}

module.exports = { inTransaction };
