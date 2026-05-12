const app = require("./app");
const connectDB = require("./config/db");
const env = require("./config/env");
const logger = require("./config/logger");
const { startLsqArtifactsSyncJob } = require("./modules/integrations/lsq/lsqArtifacts.sync");
const getPrisma = require("./config/postgres");

let httpServer = null;

const shutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  try {
    if (httpServer) {
      await new Promise((resolve, reject) => {
        httpServer.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
    const prisma = getPrisma();
    await prisma.$disconnect();
    logger.info("Graceful shutdown complete");
    process.exit(0);
  } catch (error) {
    logger.error(`Graceful shutdown failed: ${error.message}`);
    process.exit(1);
  }
};

const startServer = async () => {
  try {
    await connectDB();
    httpServer = app.listen(env.port, () => {
      logger.info(`Server running on port ${env.port}`);
      startLsqArtifactsSyncJob();
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
