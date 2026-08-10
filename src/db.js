const neo4j = require("neo4j-driver");

const URI = process.env.COGNODB_URI;
const USER = process.env.COGNODB_USER;
const PASSWORD = process.env.COGNODB_PASSWORD;

let driver = null;
let connectionError = null;

function getDriver() {
  if (driver) return driver;

  if (!URI || !USER || !PASSWORD) {
    connectionError =
      "Missing CognoDB connection details. Set COGNODB_URI, COGNODB_USER and COGNODB_PASSWORD in your .env file.";
    return null;
  }

  try {
    driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD), {
      maxConnectionLifetime: 3 * 60 * 60 * 1000,
    });
    connectionError = null;
  } catch (err) {
    connectionError = err.message;
    driver = null;
  }

  return driver;
}

// Verifies connectivity once at boot so we fail loudly (but gracefully) instead
// of surfacing a confusing error on the first user request.
async function verifyConnection() {
  const d = getDriver();
  if (!d) return { ok: false, error: connectionError };
  try {
    await d.verifyConnectivity();
    return { ok: true };
  } catch (err) {
    connectionError = err.message;
    return { ok: false, error: err.message };
  }
}

// Runs a single Cypher statement in a managed session and always closes it,
// even on error, so we never leak connections under the free tier's cap.
async function runQuery(cypher, params = {}, mode = "READ") {
  const d = getDriver();
  if (!d) {
    const err = new Error(connectionError || "Database driver is not initialised.");
    err.code = "DB_UNAVAILABLE";
    throw err;
  }

  const session = d.session({
    defaultAccessMode: mode === "WRITE" ? neo4j.session.WRITE : neo4j.session.READ,
  });

  try {
    const result = await session.run(cypher, params);
    return result.records;
  } catch (err) {
    err.code = err.code || "QUERY_FAILED";
    throw err;
  } finally {
    await session.close();
  }
}

async function closeDriver() {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

module.exports = { getDriver, verifyConnection, runQuery, closeDriver };
