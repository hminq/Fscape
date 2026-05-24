const { isProduction, isTest, nodeEnv } = require("./env");

function cleanEnv(value) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  if (!text || text === "null" || text === "undefined") return undefined;
  return text;
}

function optionalEnv(name) {
  return cleanEnv(process.env[name]);
}

function requireEnv(name) {
  const value = optionalEnv(name);
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function getAwsCredentials() {
  const accessKeyId = optionalEnv("AWS_ACCESS_KEY_ID");
  const secretAccessKey = optionalEnv("AWS_SECRET_ACCESS_KEY");

  if (!accessKeyId && !secretAccessKey) {
    return undefined;
  }

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be configured together");
  }

  return { accessKeyId, secretAccessKey };
}

function getDatabaseConfig() {
  if (isTest) {
    return {
      mode: "sqlite",
      url: "sqlite::memory:",
    };
  }

  if (isProduction) {
    return {
      mode: "url",
      url: requireEnv("DATABASE_URL"),
    };
  }

  const databaseName = optionalEnv("DB_NAME") || requireEnv("POSTGRES_DB");
  const username = optionalEnv("DB_USER") || requireEnv("POSTGRES_USER");
  const password = optionalEnv("DB_PASSWORD") || requireEnv("POSTGRES_PASSWORD");

  return {
    mode: "local",
    databaseName,
    username,
    password,
    host: optionalEnv("DB_HOST") || "db",
    port: Number(optionalEnv("DB_PORT") || 5432),
  };
}

function getRuntimeConfig() {
  return {
    nodeEnv,
    isProduction,
    isTest,
    port: Number(optionalEnv("PORT") || 3000),
    database: getDatabaseConfig(),
    jwtSecret: isTest ? optionalEnv("JWT_SECRET") || "test-jwt-secret" : requireEnv("JWT_SECRET"),
    mail: isTest
      ? {
          host: optionalEnv("MAIL_HOST"),
          port: Number(optionalEnv("MAIL_PORT") || 587),
          user: optionalEnv("MAIL_USER") || "test@example.com",
          pass: optionalEnv("MAIL_PASS") || "test",
        }
      : {
          host: requireEnv("MAIL_HOST"),
          port: Number(requireEnv("MAIL_PORT")),
          user: requireEnv("MAIL_USER"),
          pass: requireEnv("MAIL_PASS"),
        },
    google: {
      clientId: requireEnv("GOOGLE_CLIENT_ID"),
    },
    urls: {
      client: requireEnv("CLIENT_URL"),
      admin: requireEnv("ADMIN_URL"),
      cloudFront: requireEnv("CLOUD_FRONT_URL"),
    },
    payos: {
      clientId: requireEnv("PAYOS_CLIENT_ID"),
      apiKey: requireEnv("PAYOS_API_KEY"),
      checksumKey: requireEnv("PAYOS_CHECKSUM_KEY"),
      returnUrl: requireEnv("PAYOS_RETURN_URL"),
      cancelUrl: requireEnv("PAYOS_CANCEL_URL"),
      testAmount: optionalEnv("PAYOS_TEST_AMOUNT"),
    },
    openRouteService: {
      apiKey: requireEnv("ORS_API_KEY"),
    },
    gemini: {
      apiKey: requireEnv("GEMINI_API_KEY"),
    },
    pinecone: {
      apiKey: requireEnv("PINECONE_API_KEY"),
      index: requireEnv("PINECONE_INDEX"),
    },
    aws: {
      region: requireEnv("AWS_REGION"),
      credentials: getAwsCredentials(),
      s3BucketName: requireEnv("AWS_S3_BUCKET_NAME"),
      sqsEmailQueueUrl: requireEnv("AWS_SQS_EMAIL_QUEUE_URL"),
    },
  };
}

function validateRuntimeConfig() {
  getRuntimeConfig();
}

module.exports = {
  cleanEnv,
  getRuntimeConfig,
  optionalEnv,
  requireEnv,
  validateRuntimeConfig,
};
