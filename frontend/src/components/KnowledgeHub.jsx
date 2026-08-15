import React, { useState, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  Globe,
  Trash2,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  File,
  Image as ImageIcon,
  Link2,
  FolderLock,
  Plus,
  Sparkles,
} from 'lucide-react';

export default function KnowledgeHub({
  isOpen,
  documents,
  loading,
  onUploadFiles,
  onIngestUrl,
  onLoadSamples,
  onDeleteDoc,
  onClearAll,
}) {
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const showNotification = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(files);
  };

  const processFiles = async (files) => {
    setUploadLoading(true);
    try {
      const res = await onUploadFiles(files);
      showNotification('success', res.message || `Uploaded ${files.length} HR policy file(s).`);
    } catch (err) {
      showNotification('error', err.message || 'Failed to upload HR policy files.');
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setUrlLoading(true);
    try {
      const res = await onIngestUrl(urlInput.trim());
      showNotification('success', res.message || 'Web HR link ingested successfully!');
      setUrlInput('');
      setShowUrlInput(false);
    } catch (err) {
      showNotification('error', err.message || 'Failed to ingest web HR link.');
    } finally {
      setUrlLoading(false);
    }
  };

  const handleLoadSamples = async () => {
    setSampleLoading(true);
    try {
      const res = await onLoadSamples();
      showNotification('success', res.message || 'Default Automobile HR policies loaded!');
    } catch (err) {
      showNotification('error', err.message || 'Failed to load sample policies.');
    } finally {
      setSampleLoading(false);
    }
  };

  const getDocIcon = (docType) => {
    switch ((docType || '').toLowerCase()) {
      case 'pdf':
        return <FileText size={16} style={{ color: '#dc2626' }} />;
      case 'docx':
      case 'doc':
        return <FileText size={16} style={{ color: '#2563eb' }} />;
      case 'image':
      case 'png':
      case 'jpg':
      case 'jpeg':
        return <ImageIcon size={16} style={{ color: '#d97706' }} />;
      case 'url':
        return <Link2 size={16} style={{ color: '#4f46e5' }} />;
      default:
        return <File size={16} style={{ color: '#475569' }} />;
    }
  };

  return (
    <aside className={`knowledge-sidebar ${isOpen ? '' : 'collapsed'}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-title-wrap">
          <FolderLock size={18} style={{ color: '#0284c7' }} />
          <span className="sidebar-title">HR Policies</span>
          <span className="doc-count-badge">{documents.length} Files</span>
        </div>
      </div>

      {/* Feedback Notification */}
      {feedback && (
        <div
          style={{
            margin: '10px 16px 0',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: feedback.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          }}
          className="animate-fade-in"
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 size={14} style={{ color: '#16a34a' }} />
          ) : (
            <AlertCircle size={14} style={{ color: '#dc2626' }} />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="sidebar-content">
        {/* Direct Upload Zone for HR Policies */}
        <div
          className={`dropzone-card ${isDragging ? 'dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept=".pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg,.webp"
            style={{ display: 'none' }}
          />
          <div className="dropzone-icon-wrap" style={{ color: '#0284c7' }}>
            {uploadLoading ? (
              <Loader2 size={22} className="animate-spin" style={{ color: '#0284c7' }} />
            ) : (
              <UploadCloud size={24} style={{ color: '#0284c7' }} />
            )}
          </div>
          <div>
            <div className="dropzone-text-bold">Upload HR Policy File</div>
            <div className="dropzone-text-sub">
              Drag & drop or click to upload PDF, DOCX, TXT, or Image
            </div>
          </div>
          <div className="format-tags">
            <span className="format-tag" style={{ color: '#dc2626', borderColor: '#fca5a5' }}>PDF</span>
            <span className="format-tag" style={{ color: '#2563eb', borderColor: '#93c5fd' }}>DOCX</span>
            <span className="format-tag" style={{ color: '#475569', borderColor: '#cbd5e1' }}>TXT</span>
            <span className="format-tag" style={{ color: '#d97706', borderColor: '#fcd34d' }}>OCR</span>
          </div>
        </div>

        {/* Quick Action Buttons: Web Link & Sample HR Policies */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn-secondary"
            style={{ flex: 1, fontSize: '0.75rem', padding: '7px 10px' }}
            onClick={handleLoadSamples}
            disabled={sampleLoading}
          >
            {sampleLoading ? (
              <Loader2 size={13} className="animate-spin" style={{ color: '#0284c7' }} />
            ) : (
              <BookOpen size={13} style={{ color: '#0284c7' }} />
            )}
            <span>Load Default HR SOPs</span>
          </button>

          <button
            className="btn-secondary"
            style={{ fontSize: '0.75rem', padding: '7px 10px' }}
            onClick={() => setShowUrlInput(!showUrlInput)}
          >
            <Globe size={13} style={{ color: '#4f46e5' }} />
            <span>Web Link</span>
          </button>
        </div>

        {/* URL Input Bar */}
        {showUrlInput && (
          <form onSubmit={handleUrlSubmit} className="url-ingest-box animate-fade-in">
            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--primary-900)' }}>
              Add HR Policy Web URL
            </div>
            <input
              type="url"
              className="input-field"
              placeholder="https://company.com/hr-policy..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              disabled={urlLoading}
              required
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={urlLoading || !urlInput.trim()}
              style={{ fontSize: '0.78rem', padding: '7px 12px' }}
            >
              {urlLoading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Ingesting...</span>
                </>
              ) : (
                <>
                  <Plus size={13} />
                  <span>Add URL</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Indexed HR Policies List */}
        <div style={{ marginTop: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              ACTIVE HR POLICIES ({documents.length})
            </span>
            {documents.length > 0 && (
              <button
                onClick={onClearAll}
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--error)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
                title="Remove all HR policies"
              >
                <Trash2 size={12} style={{ color: '#ef4444' }} />
                <span>Clear All</span>
              </button>
            )}
          </div>

          {documents.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '24px 10px',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                border: '1px dashed var(--border-light)',
                borderRadius: '8px',
                background: '#ffffff',
              }}
            >
              No HR policy documents uploaded yet. Upload a policy document or click "Load Default HR SOPs" above.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {documents.map((doc) => (
                <div key={doc.id || doc.source} className="doc-item-card animate-fade-in">
                  <div className="doc-item-main">
                    <div className={`doc-type-icon ${doc.docType || 'txt'}`}>
                      {getDocIcon(doc.docType)}
                    </div>
                    <div className="doc-info-wrap">
                      <div className="doc-item-title" title={doc.title || doc.source}>
                        {doc.title || doc.source}
                      </div>
                      <div className="doc-item-meta">
                        <span className="chunk-badge" style={{ color: '#0369a1', borderColor: '#bae6fd', background: '#f0f9ff' }}>
                          {doc.chunkCount} chunks
                        </span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            color: 'var(--text-light)',
                            textTransform: 'uppercase',
                            fontWeight: 600,
                          }}
                        >
                          {doc.docType}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn-icon-delete"
                    onClick={() => onDeleteDoc(doc.source)}
                    title={`Delete ${doc.source}`}
                  >
                    <Trash2 size={14} style={{ color: '#ef4444' }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
