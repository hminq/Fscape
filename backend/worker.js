const { loadRuntimeEnv } = require("./config/env");

async function startWorker() {
  try {
    await loadRuntimeEnv();
    const { validateRuntimeConfig } = require("./config/runtimeConfig");
    validateRuntimeConfig();

    const { connectDB } = require("./config/db");
    const { initModels } = require("./models/initModels");
    const {
      startEmailQueueConsumer,
      stopEmailQueueConsumer,
    } = require("./services/emailQueueConsumer.service");

    await connectDB();
    initModels();

    process.on("SIGTERM", stopEmailQueueConsumer);
    process.on("SIGINT", stopEmailQueueConsumer);

    await startEmailQueueConsumer();
  } catch (error) {
    console.error("Queue worker startup error:", error);
    process.exit(1);
  }
}

startWorker();
