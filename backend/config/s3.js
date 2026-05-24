const { S3Client } = require('@aws-sdk/client-s3');
const { getRuntimeConfig } = require('./runtimeConfig');

const { aws } = getRuntimeConfig();
const s3Config = {
  region: aws.region,
};

if (aws.credentials) {
  s3Config.credentials = aws.credentials;
}

const s3Client = new S3Client(s3Config);

const bucketName = aws.s3BucketName;

module.exports = { s3Client, bucketName };
