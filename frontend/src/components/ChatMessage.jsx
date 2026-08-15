import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Car,
  User,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

export default function ChatMessage({ message, onInspectSource }) {
  const isBot = message.role === 'assistant';
  const [copied, setCopied] = useState(false);
  const [showCitations, setShowCitations] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`chat-msg-row ${isBot ? 'assistant' : 'user'} animate-fade-in`}>
      <div className={`msg-avatar ${isBot ? 'bot' : 'user'}`}>
        {isBot ? <Car size={20} /> : <User size={18} />}
      </div>

      <div className="msg-body-wrapper">
        <div className="msg-bubble">
          {/* Assistant Header status */}
          {isBot && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
                paddingBottom: '6px',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: 'var(--primary-800)',
                }}
              >
                <ShieldCheck size={15} style={{ color: '#16a34a' }} />
                <span>Automobile HR Policy Response</span>
              </div>
              <button
                onClick={handleCopy}
                style={{
                  color: 'var(--text-light)',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.7rem',
                }}
                title="Copy response"
              >
                {copied ? (
                  <>
                    <Check size={13} style={{ color: '#16a34a' }} />
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} style={{ color: '#64748b' }} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Markdown Content */}
          <div className="markdown-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Citations Accordion */}
          {isBot && message.citations && message.citations.length > 0 && (
            <div className="citations-section">
              <button
                className="citations-header-btn"
                onClick={() => setShowCitations(!showCitations)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={14} style={{ color: '#0284c7' }} />
                  <span>
                    Verified HR Policy Sources ({message.citations.length})
                  </span>
                </div>
                {showCitations ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showCitations && (
                <div className="citations-list animate-fade-in">
                  {message.citations.map((citation, idx) => (
                    <div key={idx} className="citation-card">
                      <div className="citation-meta-row">
                        <div className="citation-source-name" title={citation.source}>
                          <FileText size={13} style={{ color: '#0284c7' }} />
                          <span>{citation.source}</span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            (Chunk #{citation.chunkIndex})
                          </span>
                        </div>
                        <span className="similarity-pill" style={{ background: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' }}>
                          {citation.similarityPercentage} Match
                        </span>
                      </div>
                      <p className="citation-snippet">"{citation.excerpt}"</p>
                      {onInspectSource && (
                        <button
                          onClick={() => onInspectSource(citation)}
                          style={{
                            marginTop: '6px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#0284c7',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <ExternalLink size={12} style={{ color: '#0284c7' }} />
                          <span>View Policy Text Chunk</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
