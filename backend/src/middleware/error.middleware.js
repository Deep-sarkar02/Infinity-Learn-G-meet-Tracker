const logger = require("../config/logger");

const errorMiddleware = (err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  if (statusCode >= 500) {
    logger.error(err.stack || message);
  }

  res.status(statusCode).json({
    success: false,
    message,
    details: err.details || undefined,
  });
};

module.exports = errorMiddleware;
