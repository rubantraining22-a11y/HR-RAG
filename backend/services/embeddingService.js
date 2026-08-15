import { pipeline, env } from '@xenova/transformers';
import { Embeddings } from '@langchain/core/embeddings';

// Configure local cache directory if needed
env.allowLocalModels = false;
env.useBrowserCache = false;

class XenovaEmbeddings extends Embeddings {
  constructor(fields = {}) {
    super(fields);
    this.modelName = fields.modelName || process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';
    this.pipelineInstance = null;
    this.initPromise = null;
  }

  async getPipeline() {
    if (this.pipelineInstance) {
      return this.pipelineInstance;
    }
    if (!this.initPromise) {
      this.initPromise = (async () => {
        console.log(`[XenovaEmbeddings] Initializing pipeline with model: ${this.modelName}...`);
        const pipe = await pipeline('feature-extraction', this.modelName, {
          quantized: true,
        });
        console.log(`[XenovaEmbeddings] Model ${this.modelName} loaded successfully.`);
        this.pipelineInstance = pipe;
        return pipe;
      })();
    }
    return this.initPromise;
  }

  async embedDocuments(documents) {
    if (!documents || documents.length === 0) return [];
    const pipe = await this.getPipeline();
    const embeddings = [];

    // Process in batches for performance
    const batchSize = 16;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      for (const text of batch) {
        const cleanText = (text || '').replace(/\n+/g, ' ').trim();
        if (!cleanText) {
          embeddings.push(new Array(384).fill(0));
          continue;
        }
        const output = await pipe(cleanText, { pooling: 'mean', normalize: true });
        embeddings.push(Array.from(output.data));
      }
    }
    return embeddings;
  }

  async embedQuery(text) {
    const pipe = await this.getPipeline();
    const cleanText = (text || '').replace(/\n+/g, ' ').trim();
    if (!cleanText) {
      return new Array(384).fill(0);
    }
    const output = await pipe(cleanText, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }
}

export const embeddingService = new XenovaEmbeddings();
export { XenovaEmbeddings };
