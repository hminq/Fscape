const { SendMessageCommand } = require("@aws-sdk/client-sqs");
const {
  sqsClient,
  emailQueueUrl,
  requireEmailQueueConfig,
} = require("../config/sqs");

async function enqueueEmailJob(type, payload, options = {}) {
  requireEmailQueueConfig();

  const message = {
    type,
    payload,
    queued_at: new Date().toISOString(),
  };

  const input = {
    QueueUrl: emailQueueUrl,
    MessageBody: JSON.stringify(message),
    MessageAttributes: {
      email_type: {
        DataType: "String",
        StringValue: type,
      },
    },
  };

  if (options.delaySeconds !== undefined) {
    input.DelaySeconds = options.delaySeconds;
  }

  const response = await sqsClient.send(new SendMessageCommand(input));
  console.log(`[EmailQueue] Enqueued ${type} (${response.MessageId})`);

  return response;
}

module.exports = {
  enqueueEmailJob,
};
