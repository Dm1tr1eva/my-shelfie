const mongoose = require("mongoose");

const TEST_DB_SUFFIX = "-test";

function dbNameOf(uri) {
  return new URL(uri).pathname.replace(/^\//, "");
}

function withDbName(uri, name) {
  const url = new URL(uri);
  url.pathname = `/${name}`;
  return url.toString();
}

// Tests clear every collection between cases. A run against the development
// database would wipe real books and users with nothing to restore them from,
// so the database name is checked rather than assumed.
function resolveTestUri() {
  const devUri = process.env.MONGODB_URI;
  if (!devUri) {
    throw new Error("MONGODB_URI is not set — see server/.env.example");
  }

  const devName = dbNameOf(devUri);
  if (!devName) {
    throw new Error(
      "MONGODB_URI has no database name in its path — set MONGODB_URI_TEST explicitly",
    );
  }

  const testUri =
    process.env.MONGODB_URI_TEST || withDbName(devUri, devName + TEST_DB_SUFFIX);

  if (dbNameOf(testUri) === devName) {
    throw new Error(
      `Refusing to run tests against "${devName}": tests wipe every collection. ` +
        "Point MONGODB_URI_TEST at a different database.",
    );
  }

  return testUri;
}

async function connectTestDb() {
  await mongoose.connect(resolveTestUri());
}

async function clearTestDb() {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

async function disconnectTestDb() {
  await mongoose.disconnect();
}

module.exports = {
  connectTestDb,
  clearTestDb,
  disconnectTestDb,
  resolveTestUri,
};
