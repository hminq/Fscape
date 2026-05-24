const { SQSClient } = require("@aws-sdk/client-sqs");
const { getRuntimeConfig } = require("./runtimeConfig");

const { aws } = getRuntimeConfig();
const sqsConfig = {
  region: aws.region,
};

if (aws.credentials) {
  sqsConfig.credentials = aws.credentials;
}

const sqsClient = new SQSClient(sqsConfig);

const emailQueueUrl = aws.sqsEmailQueueUrl;

function requireEmailQueueConfig() {
  getRuntimeConfig();
}

module.exports = {
  sqsClient,
  emailQueueUrl,
  requireEmailQueueConfig,
};
