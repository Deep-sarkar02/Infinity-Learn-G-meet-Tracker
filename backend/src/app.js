const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const env = require("./config/env");
const apiRoutes = require("./routes");
const errorMiddleware = require("./middleware/error.middleware");
const ApiError = require("./utils/ApiError");

const app = express();
app.disable("x-powered-by");

if (env.nodeEnv === "production") {
  // Behind VM/reverse proxy deployments preserve client IP/proto correctly.
  app.set("trust proxy", 1);
}

app.use(helmet());

const localhostOrigin =
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
const corsOptions =
  env.nodeEnv === "development"
    ? { origin: localhostOrigin }
    : env.corsOrigins.length > 0
      ? { origin: env.corsOrigins }
      : appPublicUrlForCors();

function appPublicUrlForCors() {
  const base = env.email.publicUrl;
  return base ? { origin: [base] } : { origin: true };
}

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("combined"));

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
  });
});

app.use("/api/v1", apiRoutes);

app.use((_req, _res, next) => {
  next(new ApiError(404, "Route not found"));
});

app.use(errorMiddleware);

module.exports = app;
