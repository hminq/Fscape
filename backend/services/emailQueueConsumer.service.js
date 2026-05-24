const {
  DeleteMessageCommand,
  ReceiveMessageCommand,
} = require("@aws-sdk/client-sqs");
const {
  sqsClient,
  emailQueueUrl,
  requireEmailQueueConfig,
} = require("../config/sqs");
const { EMAIL_JOB_TYPES } = require("../constants/emailJobs");
const {
  sendContractSigningEmail,
  sendManagerSigningEmail,
  sendOtpMail,
  sendPaymentReceivedEmail,
  sendRenewalSigningEmail,
  sendWelcomeCheckInEmail,
} = require("../utils/mail.util");

let isRunning = false;

function parseEmailJob(message) {
  try {
    return JSON.parse(message.Body);
  } catch (error) {
    throw new Error(`Invalid email job JSON: ${error.message}`);
  }
}

async function handleEmailJob(job) {
  if (!job?.type) {
    throw new Error("Email job type is required");
  }

  switch (job.type) {
    case EMAIL_JOB_TYPES.CONTRACT_SIGNING_INVITE:
      await sendContractSigningEmail(job.payload?.email, job.payload);
      return;
    case EMAIL_JOB_TYPES.MANAGER_SIGNING_INVITE:
      await sendManagerSigningEmail(job.payload?.email, job.payload);
      return;
    case EMAIL_JOB_TYPES.PAYMENT_RECEIVED:
      await sendPaymentReceivedEmail(job.payload?.email, job.payload);
      return;
    case EMAIL_JOB_TYPES.RENEWAL_SIGNING_INVITE:
      await sendRenewalSigningEmail(job.payload?.email, job.payload);
      return;
    case EMAIL_JOB_TYPES.SEND_OTP:
      await sendOtpMail(job.payload?.email, job.payload?.code);
      return;
    case EMAIL_JOB_TYPES.WELCOME_CHECK_IN:
      await sendWelcomeCheckInEmail(job.payload?.email, job.payload);
      return;
    default:
      throw new Error(`Unsupported email job type: ${job.type}`);
  }
}

async function deleteMessage(message) {
  await sqsClient.send(new DeleteMessageCommand({
    QueueUrl: emailQueueUrl,
    ReceiptHandle: message.ReceiptHandle,
  }));
}

async function pollEmailQueue() {
  const response = await sqsClient.send(new ReceiveMessageCommand({
    QueueUrl: emailQueueUrl,
    MaxNumberOfMessages: 5,
    WaitTimeSeconds: 20,
    VisibilityTimeout: 60,
    MessageAttributeNames: ["All"],
  }));

  return response.Messages || [];
}

async function processMessage(message) {
  const job = parseEmailJob(message);
  console.log(`[EmailWorker] Received ${job.type} (${message.MessageId})`);
  await handleEmailJob(job);
  await deleteMessage(message);
  console.log(`[EmailWorker] Processed ${job.type} (${message.MessageId})`);
}

async function startEmailQueueConsumer() {
  requireEmailQueueConfig();
  isRunning = true;
  console.log("Email queue worker started");

  while (isRunning) {
    try {
      const messages = await pollEmailQueue();

      for (const message of messages) {
        try {
          await processMessage(message);
        } catch (error) {
          console.error("[EmailWorker] Message processing failed:", error.message);
        }
      }
    } catch (error) {
      console.error("[EmailWorker] Queue polling failed:", error.message);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

function stopEmailQueueConsumer() {
  isRunning = false;
}

module.exports = {
  startEmailQueueConsumer,
  stopEmailQueueConsumer,
  handleEmailJob,
};
