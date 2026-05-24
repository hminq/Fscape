const { loadRuntimeEnv } = require("./config/env");

async function startCronWorker() {
  try {
    await loadRuntimeEnv();
    const { validateRuntimeConfig } = require("./config/runtimeConfig");
    validateRuntimeConfig();

    const { connectDB } = require("./config/db");
    const { initModels } = require("./models/initModels");
    const { initCronJobs } = require("./jobs");

    await connectDB();
    initModels();
    initCronJobs();
    console.log("Cron worker started");
  } catch (error) {
    console.error("Cron worker startup error:", error);
    process.exit(1);
  }
}

startCronWorker();
