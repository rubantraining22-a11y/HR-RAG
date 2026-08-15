import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { Document } from '@langchain/core/documents';

/**
 * Robust Text Splitter with recursive separation and overlap
 */
export class TextChunkSplitter {
  constructor({ chunkSize = 800, chunkOverlap = 150 } = {}) {
    this.chunkSize = chunkSize;
    this.chunkOverlap = chunkOverlap;
  }

  splitText(text) {
    if (!text || typeof text !== 'string') return [];
    const clean = text.replace(/\r\n/g, '\n').trim();
    if (clean.length <= this.chunkSize) {
      return [clean];
    }

    const separators = ['\n\n', '\n', '. ', ' '];
    const chunks = [];
    let currentStart = 0;

    while (currentStart < clean.length) {
      let currentEnd = currentStart + this.chunkSize;
      if (currentEnd >= clean.length) {
        const lastChunk = clean.slice(currentStart).trim();
        if (lastChunk) chunks.push(lastChunk);
        break;
      }

      // Look for a natural boundary in the window
      let splitPos = -1;
      const minSplit = currentStart + Math.floor(this.chunkSize * 0.4);
      const searchSubstring = clean.slice(currentStart, currentEnd);

      for (const sep of separators) {
        const idx = searchSubstring.lastIndexOf(sep);
        if (idx !== -1 && (currentStart + idx) >= minSplit) {
          splitPos = currentStart + idx + sep.length;
          break;
        }
      }

      if (splitPos === -1 || splitPos <= currentStart) {
        splitPos = currentEnd;
      }

      const chunk = clean.slice(currentStart, splitPos).trim();
      if (chunk) {
        chunks.push(chunk);
      }

      // Advance ensuring forward progress
      const nextStart = splitPos - this.chunkOverlap;
      currentStart = nextStart > currentStart ? nextStart : splitPos;
    }

    return chunks;
  }

  splitDocuments(docs) {
    const chunkedDocs = [];
    for (const doc of docs) {
      const chunks = this.splitText(doc.pageContent);
      chunks.forEach((chunk, index) => {
        chunkedDocs.push(
          new Document({
            pageContent: chunk,
            metadata: {
              ...doc.metadata,
              chunkIndex: index,
              totalChunks: chunks.length,
            },
          })
        );
      });
    }
    return chunkedDocs;
  }
}

/**
 * Multi-Format Document Loader Service
 */
export class DocumentLoaderService {
  constructor() {
    this.splitter = new TextChunkSplitter({ chunkSize: 800, chunkOverlap: 150 });
  }

  /**
   * Load and parse PDF file
   */
  async loadPDF(filePath, originalFilename = '') {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text || '';
    const filename = originalFilename || path.basename(filePath);

    const doc = new Document({
      pageContent: text,
      metadata: {
        source: filename,
        title: filename,
        docType: 'pdf',
        totalPages: pdfData.numpages || 1,
        ingestedAt: new Date().toISOString(),
      },
    });

    return this.splitter.splitDocuments([doc]);
  }

  /**
   * Load and parse DOCX file
   */
  async loadDOCX(filePath, originalFilename = '') {
    const dataBuffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    const text = result.value || '';
    const filename = originalFilename || path.basename(filePath);

    const doc = new Document({
      pageContent: text,
      metadata: {
        source: filename,
        title: filename,
        docType: 'docx',
        ingestedAt: new Date().toISOString(),
      },
    });

    return this.splitter.splitDocuments([doc]);
  }

  /**
   * Load and parse TXT / Markdown file
   */
  async loadTXT(filePath, originalFilename = '') {
    const text = fs.readFileSync(filePath, 'utf-8');
    const filename = originalFilename || path.basename(filePath);

    const doc = new Document({
      pageContent: text,
      metadata: {
        source: filename,
        title: filename,
        docType: 'txt',
        ingestedAt: new Date().toISOString(),
      },
    });

    return this.splitter.splitDocuments([doc]);
  }

  /**
   * Load and parse Image using Tesseract OCR
   */
  async loadImage(filePath, originalFilename = '') {
    console.log(`[DocumentLoader] Running OCR on image: ${filePath}...`);
    const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
    const filename = originalFilename || path.basename(filePath);

    const doc = new Document({
      pageContent: text || 'No text extracted from image.',
      metadata: {
        source: filename,
        title: filename,
        docType: 'image',
        isOCR: true,
        ingestedAt: new Date().toISOString(),
      },
    });

    return this.splitter.splitDocuments([doc]);
  }

  /**
   * Load and extract text from Web URL
   */
  async loadURL(url) {
    console.log(`[DocumentLoader] Scraping URL: ${url}...`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);

    // Remove script, style, noscript, nav, footer, header tags
    $('script, style, noscript, nav, footer, iframe, svg').remove();

    const pageTitle = $('title').text().trim() || url;
    
    // Extract main text content
    let extractedText = '';
    const mainContent = $('main, article, #content, .content, body');
    if (mainContent.length > 0) {
      extractedText = mainContent.first().text();
    } else {
      extractedText = $('body').text();
    }

    // Clean up whitespace
    extractedText = extractedText
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n+/g, '\n\n')
      .trim();

    const doc = new Document({
      pageContent: extractedText || `Scraped content from ${url}`,
      metadata: {
        source: url,
        title: pageTitle,
        docType: 'url',
        ingestedAt: new Date().toISOString(),
      },
    });

    return this.splitter.splitDocuments([doc]);
  }

  /**
   * Auto-dispatch loader based on file extension
   */
  async loadFromFile(filePath, originalFilename = '') {
    const filename = originalFilename || path.basename(filePath);
    const ext = path.extname(filename).toLowerCase();

    switch (ext) {
      case '.pdf':
        return await this.loadPDF(filePath, filename);
      case '.docx':
      case '.doc':
        return await this.loadDOCX(filePath, filename);
      case '.txt':
      case '.md':
      case '.csv':
      case '.json':
        return await this.loadTXT(filePath, filename);
      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.webp':
      case '.bmp':
      case '.tiff':
        return await this.loadImage(filePath, filename);
      default:
        return await this.loadTXT(filePath, filename);
    }
  }
}

export const documentLoaderService = new DocumentLoaderService();
