const { SQSClient } = require("@aws-sdk/client-sqs");

const sqsConfig = {
  region: process.env.AWS_REGION,
};

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  sqsConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

const sqsClient = new SQSClient(sqsConfig);

const emailQueueUrl = process.env.AWS_SQS_EMAIL_QUEUE_URL;

function requireEmailQueueConfig() {
  if (!process.env.AWS_REGION) {
    throw new Error("AWS_REGION is required to use SQS");
  }

  if (!emailQueueUrl) {
    throw new Error("AWS_SQS_EMAIL_QUEUE_URL is required to enqueue email jobs");
  }
}

module.exports = {
  sqsClient,
  emailQueueUrl,
  requireEmailQueueConfig,
};
