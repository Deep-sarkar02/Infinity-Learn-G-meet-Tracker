const path = require("path");

/** Single repo-root `.env` — used by the API, npm scripts, Vite (dev), and Docker Compose. */
module.exports = path.resolve(__dirname, "../../../.env");
