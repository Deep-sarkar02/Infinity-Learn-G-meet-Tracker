const crypto = require("crypto");
const express = require("express");
const swaggerUi = require("swagger-ui-express");

const env = require("../config/env");
const logger = require("../config/logger");
const openApiSpec = require("./openapi");

/**
 * Content-Security-Policy scoped to the docs routes only. The global helmet CSP
 * uses `script-src 'self'`, which blocks the inline bootstrap script Swagger UI
 * injects. We relax it just here (self + inline) instead of loosening the whole app.
 */
const DOCS_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "img-src 'self' data: https:",
  "font-src 'self' https: data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
].join("; ");

const docsCsp = (_req, res, next) => {
  res.setHeader("Content-Security-Policy", DOCS_CSP);
  next();
};

/** Constant-time string comparison that is safe against length leaks. */
const safeEqual = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

/** Optional HTTP Basic auth — only active when both SWAGGER_USER and SWAGGER_PASSWORD are set. */
const basicAuthGuard = (req, res, next) => {
  const { basicAuthUser, basicAuthPassword } = env.docs;
  if (!basicAuthUser || !basicAuthPassword) return next();

  const header = req.headers.authorization || "";
  if (header.startsWith("Basic ")) {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const sep = decoded.indexOf(":");
    const user = sep >= 0 ? decoded.slice(0, sep) : decoded;
    const pass = sep >= 0 ? decoded.slice(sep + 1) : "";
    if (safeEqual(user, basicAuthUser) && safeEqual(pass, basicAuthPassword)) {
      return next();
    }
  }

  res.setHeader("WWW-Authenticate", 'Basic realm="API Docs", charset="UTF-8"');
  return res.status(401).json({ success: false, message: "Authentication required" });
};

const swaggerUiOptions = {
  explorer: true,
  customSiteTitle: "Infinity Learn G-Meet Tracker — API Docs",
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: "none",
    filter: true,
    tryItOutEnabled: true,
  },
};

/**
 * Mounts the API docs on the given base router:
 *   - GET {base}/docs          → Swagger UI
 *   - GET {base}/docs/openapi.json → raw OpenAPI 3.0 spec
 *
 * No-op when SWAGGER_ENABLED=false.
 */
const mountDocs = (baseRouter) => {
  if (!env.docs.enabled) {
    logger.info("API docs disabled (SWAGGER_ENABLED=false)");
    return;
  }

  const router = express.Router();
  router.use(docsCsp, basicAuthGuard);

  router.get("/openapi.json", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(openApiSpec);
  });

  router.use("/", swaggerUi.serve);
  router.get("/", swaggerUi.setup(openApiSpec, swaggerUiOptions));

  baseRouter.use("/docs", router);

  const authNote = env.docs.basicAuthUser && env.docs.basicAuthPassword ? " (HTTP Basic auth)" : "";
  logger.info(`API docs mounted at /api/v1/docs${authNote}`);
};

module.exports = { mountDocs };
