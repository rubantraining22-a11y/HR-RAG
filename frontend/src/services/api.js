const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')}/api`
  : '/api';

export const api = {
  // Check health and connection status
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  // Upload documents (PDF, DOCX, TXT, Images)
  async uploadDocuments(files) {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to upload documents');
    return data;
  },

  // Ingest Web URL
  async ingestUrl(url) {
    const res = await fetch(`${API_BASE}/documents/url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to ingest URL');
    return data;
  },

  // Load sample Automobile HR policies
  async loadSampleDocs() {
    const res = await fetch(`${API_BASE}/documents/sample`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load sample policies');
    return data;
  },

  // Get all indexed documents
  async getDocuments() {
    const res = await fetch(`${API_BASE}/documents`);
    if (!res.ok) throw new Error('Failed to fetch indexed documents');
    return res.json();
  },

  // Delete a document by source
  async deleteDocument(source) {
    const res = await fetch(`${API_BASE}/documents?source=${encodeURIComponent(source)}`, {
      method: 'DELETE',
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete document');
    return data;
  },

  // Clear all indexed documents
  async clearDocuments() {
    const res = await fetch(`${API_BASE}/documents/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to clear knowledge base');
    return data;
  },

  // Query Automobile HR RAG Chat
  async sendChatMessage(question, chatHistory = [], topK = 4) {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, chatHistory, topK }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to process chat query');
    return data;
  },
};
