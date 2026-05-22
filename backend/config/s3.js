const { S3Client } = require('@aws-sdk/client-s3');

const s3Config = {
  region: process.env.AWS_REGION,
};

// Configure credentials only if AWS access key and secret are provided (local development)
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3Config.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

const s3Client = new S3Client(s3Config);

const bucketName = process.env.AWS_S3_BUCKET_NAME;

module.exports = { s3Client, bucketName };
