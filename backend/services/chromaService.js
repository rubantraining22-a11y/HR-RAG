import { ChromaClient } from 'chromadb';
import { embeddingService } from './embeddingService.js';
import crypto from 'crypto';

/**
 * Cosine Similarity calculation helper for vector arrays
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

class ChromaVectorService {
  constructor() {
    this.client = null;
    this.collection = null;
    this.chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';
    this.collectionName = process.env.CHROMA_COLLECTION || 'automobile_hr_kb';
    
    // In-Memory Fallback Storage
    this.inMemoryStore = []; // Array of { id, embedding, document, metadata }
    this.useInMemoryFallback = false;
  }

  getClient() {
    if (!this.client) {
      let cleanUrl = this.chromaUrl.trim().replace(/\/$/, '');
      this.client = new ChromaClient({ path: cleanUrl });
    }
    return this.client;
  }

  async getCollection() {
    if (this.useInMemoryFallback) {
      return null;
    }
    if (this.collection) {
      return this.collection;
    }

    try {
      const client = this.getClient();
      this.collection = await client.getOrCreateCollection({
        name: this.collectionName,
        metadata: {
          description: 'Automobile HR Knowledge Base with Xenova Embeddings',
          'hnsw:space': 'cosine',
        },
      });
      console.log(`[VectorStore] Connected to ChromaDB collection '${this.collectionName}' successfully.`);
      return this.collection;
    } catch (err) {
      console.warn(`[VectorStore] ChromaDB connection unavailable (${err.message}). Activating In-Memory Vector Store Fallback.`);
      this.useInMemoryFallback = true;
      return null;
    }
  }

  /**
   * Add chunked documents to Vector Store (ChromaDB or In-Memory)
   */
  async addDocuments(documents) {
    if (!documents || documents.length === 0) return { count: 0 };

    const ids = [];
    const texts = [];
    const metadatas = [];

    documents.forEach((doc, idx) => {
      const uniqueId = `doc_${crypto.createHash('md5').update(doc.metadata.source + '_' + (doc.metadata.chunkIndex ?? idx) + '_' + doc.pageContent.slice(0, 50)).digest('hex')}`;
      ids.push(uniqueId);
      texts.push(doc.pageContent);

      const cleanMeta = {};
      for (const [key, value] of Object.entries(doc.metadata || {})) {
        if (value === null || value === undefined) continue;
        if (typeof value === 'object') {
          cleanMeta[key] = JSON.stringify(value);
        } else {
          cleanMeta[key] = value;
        }
      }
      metadatas.push(cleanMeta);
    });

    console.log(`[VectorStore] Generating embeddings for ${texts.length} chunks via Xenova...`);
    const embeddings = await embeddingService.embedDocuments(texts);

    // Try ChromaDB first
    try {
      const collection = await this.getCollection();
      if (collection && !this.useInMemoryFallback) {
        console.log(`[VectorStore] Upserting ${ids.length} chunks into ChromaDB...`);
        await collection.upsert({
          ids,
          embeddings,
          metadatas,
          documents: texts,
        });
      }
    } catch (err) {
      console.warn(`[VectorStore] ChromaDB upsert failed, switching to In-Memory store:`, err.message);
      this.useInMemoryFallback = true;
    }

    // Always keep in-memory store updated as backup
    ids.forEach((id, i) => {
      const existingIdx = this.inMemoryStore.findIndex(item => item.id === id);
      const record = {
        id,
        embedding: embeddings[i],
        document: texts[i],
        metadata: metadatas[i],
      };
      if (existingIdx >= 0) {
        this.inMemoryStore[existingIdx] = record;
      } else {
        this.inMemoryStore.push(record);
      }
    });

    return { count: documents.length, ids };
  }

  /**
   * Perform vector similarity search
   */
  async similaritySearch(query, k = 4) {
    const queryEmbedding = await embeddingService.embedQuery(query);

    // Attempt ChromaDB search if available
    if (!this.useInMemoryFallback) {
      try {
        const collection = await this.getCollection();
        if (collection) {
          const results = await collection.query({
            queryEmbeddings: [queryEmbedding],
            nResults: k,
            include: ['documents', 'metadatas', 'distances'],
          });

          const matches = [];
          if (results && results.documents && results.documents[0]) {
            const docs = results.documents[0];
            const metas = results.metadatas[0] || [];
            const distances = results.distances[0] || [];

            for (let i = 0; i < docs.length; i++) {
              const distance = distances[i] !== undefined ? distances[i] : 1.0;
              const similarity = Math.max(0, Math.min(1, 1 - distance));

              matches.push({
                pageContent: docs[i],
                metadata: metas[i] || {},
                distance,
                similarity: Number(similarity.toFixed(4)),
              });
            }
          }
          if (matches.length > 0) {
            return matches;
          }
        }
      } catch (err) {
        console.warn('[VectorStore] ChromaDB search error, falling back to In-Memory search:', err.message);
        this.useInMemoryFallback = true;
      }
    }

    // Fallback: In-Memory Cosine Similarity Search
    console.log(`[VectorStore] Executing In-Memory cosine search across ${this.inMemoryStore.length} chunks...`);
    const scored = this.inMemoryStore.map((item) => {
      const sim = cosineSimilarity(queryEmbedding, item.embedding);
      return {
        pageContent: item.document,
        metadata: item.metadata,
        distance: 1 - sim,
        similarity: Number(sim.toFixed(4)),
      };
    });

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, k);
  }

  /**
   * List all unique documents indexed
   */
  async listDocuments() {
    const docMap = new Map();

    if (!this.useInMemoryFallback) {
      try {
        const collection = await this.getCollection();
        if (collection) {
          const data = await collection.get({
            include: ['metadatas', 'documents'],
          });

          if (data && data.ids) {
            for (let i = 0; i < data.ids.length; i++) {
              const meta = data.metadatas[i] || {};
              const source = meta.source || 'Unknown';
              const docType = meta.docType || 'txt';
              const title = meta.title || source;
              const ingestedAt = meta.ingestedAt || '';

              if (!docMap.has(source)) {
                docMap.set(source, {
                  id: source,
                  source,
                  title,
                  docType,
                  ingestedAt,
                  chunkCount: 1,
                  sampleSnippet: (data.documents[i] || '').slice(0, 150),
                });
              } else {
                const item = docMap.get(source);
                item.chunkCount += 1;
              }
            }
            return Array.from(docMap.values());
          }
        }
      } catch (err) {
        this.useInMemoryFallback = true;
      }
    }

    // In-Memory list fallback
    for (const item of this.inMemoryStore) {
      const meta = item.metadata || {};
      const source = meta.source || 'Unknown';
      const docType = meta.docType || 'txt';
      const title = meta.title || source;
      const ingestedAt = meta.ingestedAt || '';

      if (!docMap.has(source)) {
        docMap.set(source, {
          id: source,
          source,
          title,
          docType,
          ingestedAt,
          chunkCount: 1,
          sampleSnippet: (item.document || '').slice(0, 150),
        });
      } else {
        const entry = docMap.get(source);
        entry.chunkCount += 1;
      }
    }

    return Array.from(docMap.values());
  }

  /**
   * Delete all chunks for a specific document source
   */
  async deleteDocumentBySource(source) {
    if (!this.useInMemoryFallback) {
      try {
        const collection = await this.getCollection();
        if (collection) {
          const data = await collection.get({
            where: { source: { $eq: source } },
          });

          if (data && data.ids && data.ids.length > 0) {
            await collection.delete({ ids: data.ids });
          }
        }
      } catch (err) {
        this.useInMemoryFallback = true;
      }
    }

    const initialLen = this.inMemoryStore.length;
    this.inMemoryStore = this.inMemoryStore.filter(item => item.metadata?.source !== source);
    const deletedCount = initialLen - this.inMemoryStore.length;

    return { deletedCount, source };
  }

  /**
   * Clear all records in the collection
   */
  async clearCollection() {
    this.inMemoryStore = [];
    if (!this.useInMemoryFallback) {
      try {
        const client = this.getClient();
        await client.deleteCollection({ name: this.collectionName });
        this.collection = null;
        await this.getCollection();
      } catch (err) {
        this.useInMemoryFallback = true;
      }
    }
    return { success: true };
  }

  /**
   * Collection statistics and health
   */
  async getStats() {
    try {
      const docs = await this.listDocuments();
      const totalChunks = this.useInMemoryFallback
        ? this.inMemoryStore.length
        : (await (await this.getCollection())?.count()) ?? this.inMemoryStore.length;

      return {
        connected: true,
        collectionName: this.collectionName,
        totalChunks,
        totalDocuments: docs.length,
        documents: docs,
        mode: this.useInMemoryFallback ? 'In-Memory Vector Engine' : 'ChromaDB Docker',
      };
    } catch (err) {
      const docs = await this.listDocuments();
      return {
        connected: true,
        error: err.message,
        totalChunks: this.inMemoryStore.length,
        totalDocuments: docs.length,
        documents: docs,
        mode: 'In-Memory Vector Engine (Fallback)',
      };
    }
  }
}

export const chromaService = new ChromaVectorService();
