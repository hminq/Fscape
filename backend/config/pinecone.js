const { Pinecone } = require('@pinecone-database/pinecone');
const { getRuntimeConfig } = require('./runtimeConfig');

let pineconeClient = null;
const KNOWLEDGE_NAMESPACE = "__default__";

const getPineconeClient = () => {
  if (!pineconeClient) {
    const { pinecone } = getRuntimeConfig();
    pineconeClient = new Pinecone({
      apiKey: pinecone.apiKey,
    });
  }
  return pineconeClient;
};

const getPineconeIndex = () => {
  const { pinecone } = getRuntimeConfig();
  const client = getPineconeClient();
  return client.index(pinecone.index);
};

const getPineconeKnowledgeIndex = () => getPineconeIndex();

module.exports = { getPineconeClient, getPineconeIndex, getPineconeKnowledgeIndex, KNOWLEDGE_NAMESPACE };
