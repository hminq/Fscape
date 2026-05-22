const path = require("path");
const dotenv = require("dotenv");
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";
let runtimeEnvLoaded = false;

if (!isProduction) {
  dotenv.config({
    path: path.resolve(__dirname, "../.env"),
  });
}

function applySecretString(secretString) {
  if (!secretString) return;

  let values;
  try {
    values = JSON.parse(secretString);
  } catch (error) {
    values = dotenv.parse(secretString);
  }

  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      process.env[key] = "";
      return;
    }

    process.env[key] = String(value);
  });
}

async function loadRuntimeEnv() {
  if (runtimeEnvLoaded) return;

  if (!isProduction) {
    runtimeEnvLoaded = true;
    return;
  }

  const secretName = process.env.AWS_SECRETS_MANAGER_SECRET_NAME;
  if (!secretName) {
    throw new Error("AWS_SECRETS_MANAGER_SECRET_NAME is required in production");
  }

  const client = new SecretsManagerClient({
    region: process.env.AWS_REGION,
  });

  const response = await client.send(new GetSecretValueCommand({
    SecretId: secretName,
  }));

  if (response.SecretString) {
    applySecretString(response.SecretString);
  } else if (response.SecretBinary) {
    applySecretString(Buffer.from(response.SecretBinary).toString("utf8"));
  }

  runtimeEnvLoaded = true;
}

module.exports = {
  loadRuntimeEnv,
  nodeEnv,
  isDevelopment: nodeEnv === "development",
  isProduction,
  isTest: nodeEnv === "test",
};
