const knowledgeService = require("../services/knowledge.service");

async function run() {
  console.log("[KnowledgeSyncJob] Starting scheduled knowledge sync");
  const totalVectors = await knowledgeService.syncKnowledge();
  console.log(`[KnowledgeSyncJob] Scheduled knowledge sync completed. Total vectors: ${totalVectors}`);
}

module.exports = { run };
