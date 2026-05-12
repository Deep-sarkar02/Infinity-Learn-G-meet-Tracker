const jwt = require("jsonwebtoken");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");
const getPrisma = require("../config/postgres");
const logger = require("../config/logger");
const { idOrLegacyWhere } = require("../utils/id");

const prisma = env.databaseUrl ? getPrisma() : null;

const authMiddleware = async (req, _res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    logger.warn(`Auth rejected (missing token): ${req.method} ${req.originalUrl}`);
    return next(new ApiError(401, "Authentication token is required"));
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    let user = null;
    if (prisma) {
      const lookup = idOrLegacyWhere(decoded.sub);
      if (!lookup) {
        return next(new ApiError(401, "Invalid token user"));
      }
      const pgUser = await prisma.user.findFirst({
        where: lookup,
        select: {
          id: true,
          legacyMongoId: true,
          name: true,
          email: true,
          role: true,
          grade: true,
          display: true,
          batchId: true,
          batchName: true,
        },
      });
      if (pgUser) {
        user = {
          _id: pgUser.legacyMongoId || pgUser.id,
          id: pgUser.id,
          name: pgUser.name,
          email: pgUser.email,
          role: pgUser.role,
          grade: pgUser.grade,
          display: pgUser.display,
          batchId: pgUser.batchId,
          batchName: pgUser.batchName,
        };
      }
    }
    if (!user) {
      logger.warn(
        `Auth rejected (token subject not found): sub=${decoded.sub} ${req.method} ${req.originalUrl}`,
      );
      return next(new ApiError(401, "Invalid token user"));
    }
    req.user = user;
    return next();
  } catch (error) {
    logger.warn(
      `Auth rejected (${error.name || "Error"}): ${error.message || ""} ${req.method} ${req.originalUrl}`,
    );
    return next(new ApiError(401, "Invalid or expired token"));
  }
};

module.exports = authMiddleware;
