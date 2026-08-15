import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import KnowledgeHub from './components/KnowledgeHub';
import ChatInterface from './components/ChatInterface';
import SourcesModal from './components/SourcesModal';
import { api } from './services/api';

export default function App() {
  const [health, setHealth] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [totalChunks, setTotalChunks] = useState(0);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedCitation, setSelectedCitation] = useState(null);

  // Fetch health and documents list
  const refreshData = async () => {
    try {
      const healthData = await api.getHealth();
      setHealth(healthData);

      const docsData = await api.getDocuments();
      setDocuments(docsData.documents || []);
      setTotalChunks(docsData.totalChunks || 0);
    } catch (err) {
      console.error('Failed to refresh data:', err);
    }
  };

  useEffect(() => {
    refreshData();
    // Auto refresh data periodically
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle uploading files
  const handleUploadFiles = async (files) => {
    const res = await api.uploadDocuments(files);
    await refreshData();
    return res;
  };

  // Handle URL ingestion
  const handleIngestUrl = async (url) => {
    const res = await api.ingestUrl(url);
    await refreshData();
    return res;
  };

  // Handle loading sample HR policies
  const handleLoadSamples = async () => {
    const res = await api.loadSampleDocs();
    await refreshData();
    return res;
  };

  // Handle deleting a document
  const handleDeleteDoc = async (source) => {
    try {
      await api.deleteDocument(source);
      await refreshData();
    } catch (err) {
      alert(`Failed to delete document: ${err.message}`);
    }
  };

  // Handle clearing all documents
  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear all indexed documents from ChromaDB?')) {
      try {
        await api.clearDocuments();
        await refreshData();
      } catch (err) {
        alert(`Failed to clear database: ${err.message}`);
      }
    }
  };

  // Handle sending a chat message
  const handleSendMessage = async (userText) => {
    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Build previous chat history for contextualization
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await api.sendChatMessage(userText, historyPayload, 4);

      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: response.answer,
          citations: response.citations || [],
          grounded: response.grounded,
        },
      ]);
    } catch (err) {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: `⚠️ **Error communicating with Automobile HR Assistant:** ${err.message}`,
          citations: [],
          grounded: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Handle clearing chat history
  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <Header
        health={health}
        onRefreshHealth={refreshData}
        totalDocs={documents.length}
        totalChunks={totalChunks}
      />

      {/* Main Split Layout */}
      <div className="app-main">
        {/* Left: Ingestion Hub / Sidebar */}
        <KnowledgeHub
          isOpen={isSidebarOpen}
          documents={documents}
          totalChunks={totalChunks}
          onUploadFiles={handleUploadFiles}
          onIngestUrl={handleIngestUrl}
          onLoadSamples={handleLoadSamples}
          onDeleteDoc={handleDeleteDoc}
          onClearAll={handleClearAll}
        />

        {/* Right: Interactive Automobile HR Chat */}
        <ChatInterface
          messages={messages}
          loading={loading}
          onSendMessage={handleSendMessage}
          onClearChat={handleClearChat}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onInspectSource={(citation) => setSelectedCitation(citation)}
        />
      </div>

      {/* Source Citation Raw Chunk Modal */}
      <SourcesModal
        citation={selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />
    </div>
  );
}
