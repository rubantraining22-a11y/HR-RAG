import React from 'react';
import { X, FileText, CheckCircle, Database } from 'lucide-react';

export default function SourcesModal({ citation, onClose }) {
  if (!citation) return null;

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} style={{ color: '#0284c7' }} />
            <div>
              <div className="modal-title">{citation.source}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Chunk #{citation.chunkIndex} &bull; Similarity Match: {citation.similarityPercentage}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-light)', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div
            style={{
              padding: '10px 14px',
              background: 'var(--primary-50)',
              border: '1px solid var(--primary-200)',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '0.76rem',
              color: 'var(--primary-900)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Database size={15} style={{ color: '#0284c7' }} />
            <span>Retrieved from indexed Automobile HR Policy Knowledge Base.</span>
          </div>

          <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
            POLICY CHUNK CONTENT:
          </div>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'var(--font-main)',
              fontSize: '0.85rem',
              background: '#f8fafc',
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid var(--border-light)',
              color: 'var(--text-main)',
              lineHeight: '1.6',
            }}
          >
            {citation.fullText || citation.excerpt}
          </pre>
        </div>
      </div>
    </div>
  );
}
