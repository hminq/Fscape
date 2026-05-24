const { loadRuntimeEnv } = require("./config/env");

async function startServer() {
  try {
    await loadRuntimeEnv();
    const { getRuntimeConfig, validateRuntimeConfig } = require("./config/runtimeConfig");
    validateRuntimeConfig();

    const app = require("./app");
    const { connectDB } = require("./config/db");
    const { initModels } = require("./models/initModels");
    const { port } = getRuntimeConfig();

    await connectDB();
    initModels();

    app.listen(port, "0.0.0.0", () => {
      console.log(`Server running at Port:${port}`);
    });
  } catch (error) {
    console.error("Server startup error:", error);
    process.exit(1);
  }
}

startServer();
