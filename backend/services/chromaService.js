import { ChromaClient } from 'chromadb';
import { embeddingService } from './embeddingService.js';
import crypto from 'crypto';

class ChromaVectorService {
  constructor() {
    this.client = null;
    this.collection = null;
    this.chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';
    this.collectionName = process.env.CHROMA_COLLECTION || 'automobile_hr_kb';
  }

  getClient() {
    if (!this.client) {
      // Parse Chroma URL
      const url = new URL(this.chromaUrl);
      this.client = new ChromaClient({
        path: this.chromaUrl,
      });
    }
    return this.client;
  }

  async getCollection() {
    if (this.collection) {
      return this.collection;
    }
    const client = this.getClient();
    try {
      this.collection = await client.getOrCreateCollection({
        name: this.collectionName,
        metadata: {
          description: 'Automobile HR Knowledge Base with Xenova Embeddings',
          'hnsw:space': 'cosine',
        },
      });
      console.log(`[ChromaService] Connected to collection '${this.collectionName}' successfully.`);
      return this.collection;
    } catch (err) {
      console.error(`[ChromaService] Error getting or creating collection:`, err.message);
      throw err;
    }
  }

  /**
   * Add chunked documents to ChromaDB
   */
  async addDocuments(documents) {
    if (!documents || documents.length === 0) return { count: 0 };
    const collection = await this.getCollection();

    const ids = [];
    const texts = [];
    const metadatas = [];

    documents.forEach((doc, idx) => {
      const uniqueId = `doc_${crypto.createHash('md5').update(doc.metadata.source + '_' + (doc.metadata.chunkIndex ?? idx) + '_' + doc.pageContent.slice(0, 50)).digest('hex')}`;
      ids.push(uniqueId);
      texts.push(doc.pageContent);

      // Clean metadata: Chroma metadata only supports string, number, boolean
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

    console.log(`[ChromaService] Generating embeddings for ${texts.length} chunks via Xenova...`);
    const embeddings = await embeddingService.embedDocuments(texts);

    console.log(`[ChromaService] Upserting ${ids.length} chunks into ChromaDB...`);
    await collection.upsert({
      ids,
      embeddings,
      metadatas,
      documents: texts,
    });

    return { count: documents.length, ids };
  }

  /**
   * Perform vector similarity search
   */
  async similaritySearch(query, k = 4) {
    const collection = await this.getCollection();
    const queryEmbedding = await embeddingService.embedQuery(query);

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
        // For cosine distance: cosine_similarity = 1 - distance
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

    return matches;
  }

  /**
   * List all unique documents indexed in ChromaDB
   */
  async listDocuments() {
    const collection = await this.getCollection();
    const data = await collection.get({
      include: ['metadatas', 'documents'],
    });

    const docMap = new Map();

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
    }

    return Array.from(docMap.values());
  }

  /**
   * Delete all chunks for a specific document source
   */
  async deleteDocumentBySource(source) {
    const collection = await this.getCollection();
    const data = await collection.get({
      where: { source: { $eq: source } },
    });

    if (data && data.ids && data.ids.length > 0) {
      await collection.delete({
        ids: data.ids,
      });
      return { deletedCount: data.ids.length, source };
    }

    return { deletedCount: 0, source };
  }

  /**
   * Clear all records in the collection
   */
  async clearCollection() {
    const client = this.getClient();
    try {
      await client.deleteCollection({ name: this.collectionName });
      this.collection = null;
      await this.getCollection();
      return { success: true };
    } catch (err) {
      console.error(`[ChromaService] Error clearing collection:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Collection statistics and health
   */
  async getStats() {
    try {
      const collection = await this.getCollection();
      const count = await collection.count();
      const docs = await this.listDocuments();
      return {
        connected: true,
        collectionName: this.collectionName,
        totalChunks: count,
        totalDocuments: docs.length,
        documents: docs,
      };
    } catch (err) {
      return {
        connected: false,
        error: err.message,
        totalChunks: 0,
        totalDocuments: 0,
        documents: [],
      };
    }
  }
}

export const chromaService = new ChromaVectorService();
