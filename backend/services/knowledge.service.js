const { embeddingModel } = require('../config/gemini');
const { getPineconeIndex, getPineconeKnowledgeIndex, KNOWLEDGE_NAMESPACE } = require('../config/pinecone');
const { sequelize } = require('../config/db');
const { QueryTypes } = require('sequelize');

const DEFAULT_EMBED_DELAY_MS = 1200;
const DEFAULT_DB_BATCH_SIZE = 500;
const MAX_EMBED_RETRIES = 5;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getEmbedDelayMs() {
  return DEFAULT_EMBED_DELAY_MS;
}

function getDbBatchSize() {
  return DEFAULT_DB_BATCH_SIZE;
}

function getRetryDelayMs(error, attempt) {
  const retryInfo = error?.errorDetails?.find((detail) => detail.retryDelay);
  const retryDelaySeconds = retryInfo?.retryDelay?.match(/^(\d+(?:\.\d+)?)s$/)?.[1];

  if (retryDelaySeconds) {
    return Math.ceil(Number(retryDelaySeconds) * 1000);
  }

  return Math.min(30000, 1000 * 2 ** attempt);
}

function isQuotaError(error) {
  return error?.status === 429 || /quota|too many requests/i.test(error?.message || "");
}

/**
 * Build a semantic text chunk from a building record.
 */
const buildBuildingChunk = (b) =>
  `Tòa nhà: ${b.name}. Địa chỉ: ${b.address}. Khu vực/Vị trí: ${b.location_name || 'Không rõ'}. Mô tả: ${b.description || 'Không có'}. Số tầng: ${b.total_floors || 'Không rõ'}. Trạng thái: ${b.is_active ? 'Đang hoạt động' : 'Ngừng hoạt động'}. Tổng số phòng: ${b.total_rooms ?? 'Không rõ'}. Phòng còn trống có thể thuê: ${b.available_rooms ?? 'Không rõ'}. Tiện ích đi kèm: ${b.facilities || 'Chưa cập nhật'}. Gần các trường đại học: ${b.nearby_universities || 'Không rõ'}.`;

const buildUniversityChunk = (u) =>
  `Trường Đại Học/Cao Đẳng: ${u.name}. Địa chỉ: ${u.address || 'Không rõ'}. Khu vực/Vị trí: ${u.location_name || 'Không rõ'}. Các tòa nhà gần đây: ${u.nearby_buildings || 'Chưa cập nhật'}.`;

const buildRoomChunk = (r) =>
  `Phòng số ${r.room_number} tại tòa nhà ${r.building_name}. Loại phòng: ${r.room_type_name} (${r.area_sqm ? r.area_sqm + 'm²' : ''}). Tầng: ${r.floor || 'Không rõ'}. Giá thuê: ${r.base_price ? Number(r.base_price).toLocaleString('vi-VN') + ' VNĐ/tháng' : 'Không rõ'}. Trạng thái phòng: ${translateRoomStatus(r.status)}. Sức chứa: ${r.capacity_min || 1}-${r.capacity_max || 1} người. Phòng ngủ: ${r.bedrooms || 1}, Phòng tắm: ${r.bathrooms || 1}. Trang bị trong phòng: ${r.assets || 'Tiêu chuẩn theo loại phòng'}.`;

const buildRoomTypeChunk = (rt) =>
  `Loại phòng: ${rt.name}. Mô tả: ${rt.description || 'Không có'}. Giá cơ bản: ${Number(rt.base_price).toLocaleString('vi-VN')} VNĐ/tháng. Đặt cọc: ${rt.deposit_months || 1} tháng. Diện tích: ${rt.area_sqm || 'Không rõ'}m². Sức chứa ${rt.capacity_min}-${rt.capacity_max} người. Phòng ngủ: ${rt.bedrooms}, phòng tắm: ${rt.bathrooms}. Danh sách trang thiết bị đi kèm: ${rt.assets || 'Chưa có thông tin'}.`;

const buildFacilityChunk = (f) =>
  `Tiện ích: ${f.name}. Tòa nhà có tiện ích này: ${f.building_names || 'Không rõ'}.`;

function translateRoomStatus(s) {
  const map = { AVAILABLE: 'Còn trống', OCCUPIED: 'Đang thuê', LOCKED: 'Tạm khóa' };
  return map[s] || s;
}

/**
 * Generate an embedding vector for a text chunk.
 */
async function embedText(text) {
  const embedDelayMs = getEmbedDelayMs();

  for (let attempt = 0; attempt <= MAX_EMBED_RETRIES; attempt += 1) {
    try {
      if (embedDelayMs > 0) {
        await sleep(embedDelayMs);
      }

      const result = await embeddingModel.embedContent(text);
      const raw = result.embedding.values;
      if (!raw || raw.length === 0) {
        throw new Error(`Empty embedding returned for text: "${text.slice(0, 50)}"`);
      }
      // Convert to plain number[] for Pinecone SDK v7.
      return Array.from(raw);
    } catch (error) {
      if (!isQuotaError(error) || attempt === MAX_EMBED_RETRIES) {
        throw error;
      }

      const retryDelayMs = getRetryDelayMs(error, attempt);
      console.warn(`[KnowledgeSync] Embedding quota hit. Retrying in ${retryDelayMs}ms`);
      await sleep(retryDelayMs);
    }
  }
}

/**
 * Upsert vectors to Pinecone in fixed-size batches.
 */
async function upsertBatch(index, vectors) {
  if (vectors.length === 0) {
    console.log('[upsertBatch] Skipped - empty array');
    return;
  }
  const first = vectors[0];
  console.log(`[upsertBatch] ${vectors.length} records | id="${first.id}" | values.length=${first.values?.length}`);
  // Pinecone SDK v7 expects { records: [...] }.
  const batchSize = 100;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    await index.upsert({ records: batch });
  }
}

async function clearIndexNamespace(index, namespaceName) {
  console.log(`[KnowledgeSync] Clearing Pinecone namespace: ${namespaceName}`);
  await index.deleteAll();
  console.log(`[KnowledgeSync] Pinecone namespace cleared: ${namespaceName}`);
}

async function clearKnowledgeIndexes(defaultIndex, knowledgeIndex) {
  await clearIndexNamespace(defaultIndex, "__default__");
  await clearIndexNamespace(knowledgeIndex, KNOWLEDGE_NAMESPACE);
}

function getCursorClause(alias, cursor) {
  if (!cursor) {
    return "";
  }

  return `AND (${alias}.updated_at, ${alias}.id) > (:cursorUpdatedAt, :cursorId)`;
}

function getCursorReplacements(cursor, limit) {
  const replacements = { limit };

  if (cursor) {
    replacements.cursorUpdatedAt = cursor.updated_at;
    replacements.cursorId = cursor.id;
  }

  return replacements;
}

async function syncEntityInBatches(index, options) {
  const {
    entityName,
    vectorType,
    vectorIdPrefix,
    fetchBatch,
    buildChunk,
    logEmbeddingDimension = false,
  } = options;
  const batchSize = getDbBatchSize();
  let cursor = null;
  let totalUpserted = 0;
  let batchNumber = 0;
  let embeddingDimensionLogged = !logEmbeddingDimension;

  while (true) {
    batchNumber += 1;
    const rows = await fetchBatch(cursor, batchSize);

    if (rows.length === 0) {
      console.log(`[KnowledgeSync] ${entityName} completed. Total upserted: ${totalUpserted}`);
      return totalUpserted;
    }

    console.log(`[KnowledgeSync] ${entityName} batch ${batchNumber} fetched: ${rows.length}`);

    const vectors = [];
    for (const row of rows) {
      const text = buildChunk(row);
      const embedding = await embedText(text);

      if (!embeddingDimensionLogged) {
        console.log(`[KnowledgeSync] Embedding dimension: ${embedding.length}`);
        embeddingDimensionLogged = true;
      }

      vectors.push({
        id: `${vectorIdPrefix}-${row.id}`,
        values: embedding,
        metadata: { type: vectorType, id: row.id, content: text }
      });
    }

    await upsertBatch(index, vectors);
    totalUpserted += vectors.length;

    const lastRow = rows[rows.length - 1];
    cursor = {
      updated_at: lastRow.updated_at,
      id: lastRow.id,
    };
  }
}

async function fetchBuildingBatch(cursor, limit) {
  const cursorClause = getCursorClause("b", cursor);
  return sequelize.query(
    `SELECT b.id, b.name, b.address, b.description, b.total_floors, b.is_active, b.updated_at, l.name as location_name,
            (SELECT COUNT(*) FROM rooms r WHERE r.building_id = b.id AND r.deleted_at IS NULL) as total_rooms,
            (SELECT COUNT(*) FROM rooms r WHERE r.building_id = b.id AND r.deleted_at IS NULL AND r.status = 'AVAILABLE') as available_rooms,
            (SELECT STRING_AGG(DISTINCT f.name, ', ') 
             FROM facilities f 
             JOIN building_facilities bf ON f.id = bf.facility_id 
             WHERE bf.building_id = b.id) as facilities,
            (SELECT STRING_AGG(DISTINCT u.name, ', ') 
             FROM universities u 
             WHERE u.location_id = b.location_id AND u.is_active = true) as nearby_universities
     FROM buildings b
     LEFT JOIN locations l ON b.location_id = l.id
     WHERE b.is_active = true
       ${cursorClause}
     ORDER BY b.updated_at ASC, b.id ASC
     LIMIT :limit`,
    {
      type: QueryTypes.SELECT,
      replacements: getCursorReplacements(cursor, limit),
    }
  );
}

async function fetchRoomTypeBatch(cursor, limit) {
  const cursorClause = getCursorClause("rt", cursor);
  return sequelize.query(
    `SELECT rt.id, rt.name, rt.description, rt.base_price, rt.deposit_months, rt.capacity_min, rt.capacity_max, rt.bedrooms, rt.bathrooms, rt.area_sqm, rt.updated_at,
            (SELECT STRING_AGG(CONCAT(at.name, ' (x', rta.quantity, ')'), ', ')
             FROM room_type_assets rta
             JOIN asset_types at ON rta.asset_type_id = at.id
             WHERE rta.room_type_id = rt.id) as assets
     FROM room_types rt 
     WHERE rt.deleted_at IS NULL AND rt.is_active = true
       ${cursorClause}
     ORDER BY rt.updated_at ASC, rt.id ASC
     LIMIT :limit`,
    {
      type: QueryTypes.SELECT,
      replacements: getCursorReplacements(cursor, limit),
    }
  );
}

async function fetchRoomBatch(cursor, limit) {
  const cursorClause = getCursorClause("r", cursor);
  return sequelize.query(
    `SELECT r.id, r.room_number, r.floor, r.status, r.updated_at,
            b.name AS building_name,
            rt.name AS room_type_name, rt.base_price, rt.area_sqm,
            rt.capacity_min, rt.capacity_max, rt.bedrooms, rt.bathrooms,
            (SELECT STRING_AGG(a.name, ', ')
             FROM assets a
             WHERE a.current_room_id = r.id AND a.status = 'IN_USE') as assets
     FROM rooms r
     JOIN buildings b ON r.building_id = b.id
     JOIN room_types rt ON r.room_type_id = rt.id
     WHERE r.deleted_at IS NULL AND b.is_active = true
       ${cursorClause}
     ORDER BY r.updated_at ASC, r.id ASC
     LIMIT :limit`,
    {
      type: QueryTypes.SELECT,
      replacements: getCursorReplacements(cursor, limit),
    }
  );
}

async function fetchFacilityBatch(cursor, limit) {
  const cursorClause = getCursorClause("f", cursor);
  return sequelize.query(
    `SELECT f.id, f.name, f.updated_at,
            STRING_AGG(DISTINCT b.name, ', ') AS building_names
     FROM facilities f
     LEFT JOIN building_facilities bf ON bf.facility_id = f.id
     LEFT JOIN buildings b ON b.id = bf.building_id
     WHERE 1 = 1
       ${cursorClause}
     GROUP BY f.id, f.name, f.updated_at
     ORDER BY f.updated_at ASC, f.id ASC
     LIMIT :limit`,
    {
      type: QueryTypes.SELECT,
      replacements: getCursorReplacements(cursor, limit),
    }
  );
}

async function fetchUniversityBatch(cursor, limit) {
  const cursorClause = getCursorClause("u", cursor);
  return sequelize.query(
    `SELECT u.id, u.name, u.address, u.is_active, u.updated_at, l.name as location_name,
            (SELECT STRING_AGG(DISTINCT b.name, ', ')
             FROM buildings b
             WHERE b.location_id = u.location_id AND b.is_active = true) as nearby_buildings
     FROM universities u
     LEFT JOIN locations l ON u.location_id = l.id
     WHERE u.is_active = true
       ${cursorClause}
     ORDER BY u.updated_at ASC, u.id ASC
     LIMIT :limit`,
    {
      type: QueryTypes.SELECT,
      replacements: getCursorReplacements(cursor, limit),
    }
  );
}

/**
 * Sync all searchable knowledge from PostgreSQL to Pinecone.
 */
async function syncKnowledge() {
  const defaultIndex = getPineconeIndex();
  const index = getPineconeKnowledgeIndex();
  let totalUpserted = 0;

  await clearKnowledgeIndexes(defaultIndex, index);

  totalUpserted += await syncEntityInBatches(index, {
    entityName: "Buildings",
    vectorType: "building",
    vectorIdPrefix: "building",
    fetchBatch: fetchBuildingBatch,
    buildChunk: buildBuildingChunk,
    logEmbeddingDimension: true,
  });

  totalUpserted += await syncEntityInBatches(index, {
    entityName: "RoomTypes",
    vectorType: "room_type",
    vectorIdPrefix: "roomtype",
    fetchBatch: fetchRoomTypeBatch,
    buildChunk: buildRoomTypeChunk,
  });

  totalUpserted += await syncEntityInBatches(index, {
    entityName: "Rooms",
    vectorType: "room",
    vectorIdPrefix: "room",
    fetchBatch: fetchRoomBatch,
    buildChunk: buildRoomChunk,
  });

  totalUpserted += await syncEntityInBatches(index, {
    entityName: "Facilities",
    vectorType: "facility",
    vectorIdPrefix: "facility",
    fetchBatch: fetchFacilityBatch,
    buildChunk: buildFacilityChunk,
  });

  totalUpserted += await syncEntityInBatches(index, {
    entityName: "Universities",
    vectorType: "university",
    vectorIdPrefix: "university",
    fetchBatch: fetchUniversityBatch,
    buildChunk: buildUniversityChunk,
  });

  console.log(`[KnowledgeSync] Sync complete. Total vectors upserted: ${totalUpserted}`);
  return totalUpserted;
}

module.exports = { syncKnowledge };
