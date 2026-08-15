# 🚗 AutoHR AI - Production-Ready Advanced Automobile HR RAG Assistant

A production-grade, full-stack **Automobile HR Assistant** built with **LangChain JavaScript**, **Xenova Hugging Face Local Embeddings**, **ChromaDB**, **OpenAI `gpt-4o-mini`**, and a modern **Bright Blue & White React UI**.

---

## 🌟 Key Features

1. **Multi-Format Document Ingestion Engine**:
   - 📄 **PDF**: Extracted via `pdf-parse` with metadata retention.
   - 📝 **DOCX / Word**: Extracted via `mammoth`.
   - 📑 **TXT / Markdown**: Clean text parsing and semantic chunking.
   - 🖼️ **Image OCR**: Text extraction from badge scans, certificates, and plant notices via `tesseract.js`.
   - 🌐 **Web URLs**: Scraped and structured using `cheerio` & `axios`.

2. **100% Free & Local Embeddings**:
   - Powered by Hugging Face's `@xenova/transformers` (`Xenova/all-MiniLM-L6-v2`).
   - Runs locally in Node.js on ONNX runtime (0 API cost, fast CPU inference, 384 dimensions).

3. **ChromaDB Vector Store (Docker)**:
   - Persistent vector collection `automobile_hr_kb` running on `http://localhost:8000`.
   - Cosine similarity metric with metadata filtering and document source management.

4. **Strict Automobile HR Persona & Guardrails**:
   - Powered by **OpenAI `gpt-4o-mini`** through `@langchain/openai`.
   - **Absolute Grounding**: Answers only from indexed Automobile HR documents.
   - **Strict Out-of-Domain Rejection**: Instantly refuses general trivia, code writing, or non-HR queries.
   - **Source Attribution**: Highlights verified document sources, chunk numbers, similarity scores, and excerpts.

5. **Premium Bright Blue & White React UI**:
   - Dual-pane layout: Knowledge Hub sidebar & Interactive Chat Arena.
   - Live health monitors for ChromaDB, Xenova Embeddings, and OpenAI LLM.
   - Drag-and-drop file upload, URL scraper, and 1-click sample Automobile HR policy loader.
   - Interactive prompt suggestions, markdown tables, copy button, and raw chunk inspector.

---

## 📁 Project Structure

```
HR RAG/
├── backend/
│   ├── samples/                                    # Pre-built Automobile HR Policies
│   │   ├── Automobile_Plant_Shift_Safety_Policy.txt
│   │   ├── Automotive_Technician_Overtime_and_Leave_Rules.txt
│   │   ├── Dealership_Staff_Conduct_and_Benefits_Handbook.txt
│   │   └── EV_Assembly_Line_Hazard_and_Certification_Guidelines.txt
│   ├── services/
│   │   ├── embeddingService.js                     # Xenova Hugging Face ONNX Embeddings
│   │   ├── chromaService.js                        # ChromaDB Vector Store Client
│   │   ├── documentLoaders.js                      # PDF, DOCX, TXT, OCR, URL Loaders
│   │   └── ragPipeline.js                          # LangChain Automobile HR RAG Pipeline
│   ├── .env                                        # Environment Configuration
│   ├── package.json
│   ├── server.js                                   # Express REST API Server
│   ├── test_rag.js                                 # RAG Pipeline Verification Script
│   └── test_api_suite.js                           # End-to-End API Test Suite
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx                          # Top Navbar with Live Status Indicators
│   │   │   ├── KnowledgeHub.jsx                    # Ingestion Hub (Dropzone, URL, Samples)
│   │   │   ├── ChatInterface.jsx                   # Chat Stream & Suggested Prompts
│   │   │   ├── ChatMessage.jsx                     # Markdown Renderer & Citation Cards
│   │   │   └── SourcesModal.jsx                    # Raw Vector Chunk Inspector
│   │   ├── services/
│   │   │   └── api.js                              # REST API Client
│   │   ├── App.jsx
│   │   ├── App.css                                 # Modern Bright Blue & White Stylesheet
│   │   ├── index.css                               # Design Tokens & Utilities
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **Docker**: ChromaDB running on port 8000 (`docker run -p 8000:8000 chromadb/chroma`)

### 2. Start Backend
```bash
cd backend
npm install
npm start
```
*Backend runs on `http://localhost:5000`*

### 3. Start Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`*

---

## 📡 REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | System health (ChromaDB, Xenova, OpenAI) |
| `POST` | `/api/documents/upload` | Upload & chunk PDF, DOCX, TXT, or Image files |
| `POST` | `/api/documents/url` | Scrape & index web page content |
| `POST` | `/api/documents/sample` | Load 4 pre-built Automobile HR sample policies |
| `GET` | `/api/documents` | List all indexed documents with chunk statistics |
| `DELETE`| `/api/documents?source=...`| Remove a document source from ChromaDB |
| `POST` | `/api/documents/clear` | Wipe all documents from the vector database |
| `POST` | `/api/chat` | Query RAG pipeline (`question`, `chatHistory`, `topK`) |
