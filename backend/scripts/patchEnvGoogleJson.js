/**
 * Writes .secrets/google-service-account.json into repo-root .env as GOOGLE_SERVICE_ACCOUNT_JSON
 * and clears GOOGLE_SERVICE_ACCOUNT_KEY_PATH. Run from backend/: npm run env:patch-google-into-dotenv
 */
const fs = require("fs");
const path = require("path");
const dotenvPath = require("../src/config/dotenvPath");

const backendRoot = path.join(__dirname, "..");
const keyPath = path.join(backendRoot, ".secrets", "google-service-account.json");
const envPath = dotenvPath;

const oneLine = JSON.stringify(JSON.parse(fs.readFileSync(keyPath, "utf8")));
const quoted = `GOOGLE_SERVICE_ACCOUNT_JSON='${oneLine.replace(/'/g, "''")}'`;

let env = fs.readFileSync(envPath, "utf8");
if (!/^GOOGLE_SERVICE_ACCOUNT_JSON=/m.test(env)) {
  console.error(".env must contain a line: GOOGLE_SERVICE_ACCOUNT_JSON=");
  process.exit(1);
}
env = env.replace(/^GOOGLE_SERVICE_ACCOUNT_JSON=.*$/m, quoted);
env = env.replace(/^GOOGLE_SERVICE_ACCOUNT_KEY_PATH=.*$/m, "GOOGLE_SERVICE_ACCOUNT_KEY_PATH=");
fs.writeFileSync(envPath, env);
console.log("Updated .env: GOOGLE_SERVICE_ACCOUNT_JSON from .secrets/, KEY_PATH cleared.");
