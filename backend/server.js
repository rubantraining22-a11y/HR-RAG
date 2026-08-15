import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

import { documentLoaderService } from './services/documentLoaders.js';
import { chromaService } from './services/chromaService.js';
import { embeddingService } from './services/embeddingService.js';
import { ragPipeline } from './services/ragPipeline.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (req, file, cb) => {
    const allowedExts = [
      '.pdf',
      '.docx',
      '.doc',
      '.txt',
      '.md',
      '.png',
      '.jpg',
      '.jpeg',
      '.webp',
      '.bmp',
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Unsupported file format: ${ext}. Supported: PDF, DOCX, TXT, MD, PNG, JPG, JPEG, WEBP`
        )
      );
    }
  },
});

// ==========================================
// ROUTES
// ==========================================

/**
 * 1. Health Check
 */
app.get('/api/health', async (req, res) => {
  try {
    const stats = await chromaService.getStats();
    res.json({
      status: 'online',
      service: 'Automobile HR RAG Assistant Backend',
      chroma: {
        connected: stats.connected,
        collection: stats.collectionName,
        totalChunks: stats.totalChunks,
        totalDocuments: stats.totalDocuments,
      },
      embedding: {
        model: process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2',
        framework: 'Xenova HuggingFace ONNX',
        type: 'Free & Local',
      },
      llm: {
        provider: 'OpenAI',
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        configured: Boolean(process.env.OPENAI_API_KEY),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      status: 'degraded',
      error: err.message,
    });
  }
});

/**
 * 2. Upload Document (PDF, DOCX, TXT, Image OCR)
 */
app.post('/api/documents/upload', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files were uploaded.' });
    }

    const results = [];
    for (const file of req.files) {
      console.log(`[Server] Ingesting uploaded file: ${file.originalname} (${file.mimetype})...`);
      const chunkedDocs = await documentLoaderService.loadFromFile(file.path, file.originalname);

      // Add to ChromaDB
      const insertResult = await chromaService.addDocuments(chunkedDocs);

      results.push({
        filename: file.originalname,
        chunksIndexed: insertResult.count,
        docType: path.extname(file.originalname).replace('.', '').toLowerCase(),
        size: file.size,
      });

      // Cleanup local uploaded temp file
      try {
        fs.unlinkSync(file.path);
      } catch (cleanupErr) {
        console.warn('File cleanup error:', cleanupErr.message);
      }
    }

    const totalChunks = results.reduce((acc, curr) => acc + curr.chunksIndexed, 0);

    res.json({
      success: true,
      message: `Successfully indexed ${results.length} document(s) with ${totalChunks} chunks into ChromaDB.`,
      documents: results,
    });
  } catch (err) {
    console.error('[Server] Document Upload Error:', err);
    res.status(500).json({ error: err.message || 'Failed to process document upload.' });
  }
});

/**
 * 3. Ingest Web URL
 */
app.post('/api/documents/url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return res.status(400).json({ error: 'A valid http/https URL is required.' });
    }

    console.log(`[Server] Ingesting web link: ${url}...`);
    const chunkedDocs = await documentLoaderService.loadURL(url);
    const insertResult = await chromaService.addDocuments(chunkedDocs);

    res.json({
      success: true,
      message: `Successfully scraped and indexed ${url} with ${insertResult.count} chunks.`,
      url,
      chunksIndexed: insertResult.count,
      title: chunkedDocs[0]?.metadata?.title || url,
    });
  } catch (err) {
    console.error('[Server] URL Ingest Error:', err);
    res.status(500).json({ error: err.message || 'Failed to scrape and index URL.' });
  }
});

/**
 * 4. Load Sample Automobile HR Policies
 */
app.post('/api/documents/sample', async (req, res) => {
  try {
    const samplesDir = path.join(__dirname, 'samples');
    if (!fs.existsSync(samplesDir)) {
      return res.status(404).json({ error: 'Samples directory not found.' });
    }

    const files = fs.readdirSync(samplesDir);
    const results = [];

    for (const fileName of files) {
      const filePath = path.join(samplesDir, fileName);
      if (fs.statSync(filePath).isFile()) {
        console.log(`[Server] Ingesting sample HR policy: ${fileName}...`);
        const chunkedDocs = await documentLoaderService.loadTXT(filePath, fileName);
        const insertResult = await chromaService.addDocuments(chunkedDocs);

        results.push({
          filename: fileName,
          chunksIndexed: insertResult.count,
          docType: 'txt',
        });
      }
    }

    res.json({
      success: true,
      message: `Successfully loaded ${results.length} Automobile HR sample policies into knowledge base.`,
      documents: results,
    });
  } catch (err) {
    console.error('[Server] Sample Ingest Error:', err);
    res.status(500).json({ error: err.message || 'Failed to load sample policies.' });
  }
});

/**
 * 5. List All Indexed Documents
 */
app.get('/api/documents', async (req, res) => {
  try {
    const stats = await chromaService.getStats();
    res.json({
      success: true,
      totalDocuments: stats.totalDocuments,
      totalChunks: stats.totalChunks,
      documents: stats.documents,
    });
  } catch (err) {
    console.error('[Server] List Documents Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 6. Delete Document by Source / ID
 */
app.delete('/api/documents', async (req, res) => {
  try {
    const { source } = req.query;
    if (!source) {
      return res.status(400).json({ error: 'Query parameter "source" is required.' });
    }

    const result = await chromaService.deleteDocumentBySource(source);
    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} chunks for source "${source}".`,
      ...result,
    });
  } catch (err) {
    console.error('[Server] Delete Document Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 7. Clear All Documents
 */
app.post('/api/documents/clear', async (req, res) => {
  try {
    const result = await chromaService.clearCollection();
    res.json({
      success: true,
      message: 'Automobile HR Knowledge Base cleared successfully.',
      ...result,
    });
  } catch (err) {
    console.error('[Server] Clear Collection Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 8. Chat Query Endpoint (Strict Automobile HR RAG)
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { question, chatHistory = [], topK = 4 } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question is required.' });
    }

    console.log(`[Server] Processing chat query: "${question.slice(0, 100)}..."`);
    const ragResponse = await ragPipeline.query({
      question,
      chatHistory,
      topK: Number(topK) || 4,
    });

    res.json({
      success: true,
      ...ragResponse,
    });
  } catch (err) {
    console.error('[Server] Chat Processing Error:', err);
    res.status(500).json({
      error: err.message || 'An error occurred while processing the Automobile HR query.',
    });
  }
});

// Serve frontend dist assets in production if available
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    }
  });
}

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Automobile HR RAG Server running on port ${PORT}`);
  console.log(`🔗 ChromaDB Target: ${process.env.CHROMA_URL || 'http://localhost:8000'}`);
  console.log(`🧠 Local Embeddings: ${process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2'}`);
  console.log(`🤖 OpenAI Model: ${process.env.OPENAI_MODEL || 'gpt-4o-mini'}`);
  console.log(`=======================================================`);
});
