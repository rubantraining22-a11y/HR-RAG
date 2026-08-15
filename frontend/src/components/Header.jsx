import React from 'react';
import { Car, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';

export default function Header({ onRefreshHealth, totalDocs }) {
  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-logo-icon">
          <Car size={22} strokeWidth={2.2} />
        </div>
        <div>
          <div className="brand-title">
            <span>AutoHR Assistant</span>
            <span className="brand-badge">HR Policy AI</span>
          </div>
          <div className="brand-subtitle">
            Automobile Enterprise HR Policy & Operations Assistant
          </div>
        </div>
      </div>

      <div className="header-status-group">
        <div className="status-pill connected" style={{ background: '#f0f9ff', borderColor: '#bae6fd', color: '#0369a1' }}>
          <ShieldCheck size={15} style={{ color: '#0284c7' }} />
          <span>Active HR Knowledge ({totalDocs} Policies)</span>
        </div>
      </div>

      <div className="header-actions">
        <button
          className="btn-header"
          onClick={onRefreshHealth}
          title="Refresh HR Knowledge Base"
        >
          <RefreshCw size={14} style={{ color: '#0ea5e9' }} />
          <span>Sync</span>
        </button>
      </div>
    </header>
  );
}
