/**
 * Prints one line for .env / .env.production:
 *   GOOGLE_SERVICE_ACCOUNT_JSON='…'
 * Use this for Docker/Linux prod (no file path inside the container).
 *
 * From backend/: npm run env:google-service-account-json
 * Optional path: node scripts/printGoogleServiceAccountEnv.js ./path/to/key.json
 */
const fs = require("fs");
const path = require("path");

const defaultPath = path.join(__dirname, "..", ".secrets", "google-service-account.json");
const keyPath = path.resolve(process.argv[2] || defaultPath);

if (!fs.existsSync(keyPath)) {
  console.error(`Missing file: ${keyPath}`);
  console.error("Create .secrets/google-service-account.json or pass a path.");
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(fs.readFileSync(keyPath, "utf8"));
} catch (e) {
  console.error(`Invalid JSON in ${keyPath}: ${e.message}`);
  process.exit(1);
}

const oneLine = JSON.stringify(parsed);
const quoted = `'${oneLine.replace(/'/g, "''")}'`;

process.stdout.write(`GOOGLE_SERVICE_ACCOUNT_JSON=${quoted}\n`);
process.stderr.write(
  "Paste into .env or backend/.env.production. Leave GOOGLE_SERVICE_ACCOUNT_KEY_PATH empty for prod.\n",
);
