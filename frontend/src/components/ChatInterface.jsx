import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Loader2,
  ShieldCheck,
  RotateCcw,
  Car,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowRight,
  Info,
  Clock,
  Briefcase,
  Zap,
  Tag,
} from 'lucide-react';
import ChatMessage from './ChatMessage';

const SUGGESTED_PROMPTS = [
  {
    category: 'Shift & Attendance Policy',
    text: 'What are the plant shift timings and attendance grace period rules defined in the HR policy?',
    icon: <Clock size={16} style={{ color: '#0284c7' }} />,
  },
  {
    category: 'Overtime & Leave Policy',
    text: 'How is technician overtime calculated on weekends and holidays according to HR policy?',
    icon: <Briefcase size={16} style={{ color: '#16a34a' }} />,
  },
  {
    category: 'EV Division & Safety SOP',
    text: 'What are the certification levels and skill pay differentials for EV battery technicians?',
    icon: <Zap size={16} style={{ color: '#d97706' }} />,
  },
  {
    category: 'Dealership & Benefits Policy',
    text: 'Explain the employee vehicle purchase discount program and medical health coverage in the HR policy.',
    icon: <Tag size={16} style={{ color: '#9333ea' }} />,
  },
];

export default function ChatInterface({
  messages,
  loading,
  onSendMessage,
  onClearChat,
  isSidebarOpen,
  onToggleSidebar,
  onInspectSource,
}) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!inputText.trim() || loading) return;
    onSendMessage(inputText.trim());
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handlePromptClick = (text) => {
    onSendMessage(text);
  };

  return (
    <main className="chat-container">
      {/* Floating Sidebar Toggle Button */}
      <button
        className="sidebar-toggle-floating"
        onClick={onToggleSidebar}
        title={isSidebarOpen ? 'Hide HR Policies Panel' : 'Show HR Policies Panel'}
      >
        {isSidebarOpen ? <PanelLeftClose size={18} style={{ color: '#0284c7' }} /> : <PanelLeftOpen size={18} style={{ color: '#0284c7' }} />}
      </button>

      {/* Messages Scroll Area */}
      <div className="messages-scroll-area">
        {messages.length === 0 ? (
          /* Welcome Screen focusing on HR Policies */
          <div className="welcome-hero animate-fade-in">
            <div className="welcome-logo-large">
              <Car size={34} strokeWidth={2.2} />
            </div>
            <h1 className="welcome-title">Automobile HR Policy Assistant</h1>
            <p className="welcome-desc">
              Your dedicated AI assistant for Automobile HR policies, employee rules, leave entitlements, plant safety SOPs, and dealership guidelines.
            </p>

            <div className="guardrail-pill" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#15803d' }}>
              <ShieldCheck size={16} style={{ color: '#16a34a' }} />
              <span>Strictly Grounded to Uploaded Automobile HR Documents</span>
            </div>

            <div className="suggested-prompts-grid">
              {SUGGESTED_PROMPTS.map((prompt, index) => (
                <button
                  key={index}
                  className="prompt-chip-card"
                  onClick={() => handlePromptClick(prompt.text)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {prompt.icon}
                      <span className="prompt-chip-category">{prompt.category}</span>
                    </div>
                    <ArrowRight size={14} style={{ color: '#0284c7' }} />
                  </div>
                  <span className="prompt-chip-text">{prompt.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages Stream */
          <>
            {messages.map((msg, index) => (
              <ChatMessage
                key={index}
                message={msg}
                onInspectSource={onInspectSource}
              />
            ))}

            {loading && (
              <div className="chat-msg-row assistant animate-fade-in">
                <div className="msg-avatar bot">
                  <Car size={20} />
                </div>
                <div className="msg-body-wrapper">
                  <div
                    className="msg-bubble"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      color: 'var(--primary-700)',
                      fontWeight: 600,
                      fontSize: '0.84rem',
                    }}
                  >
                    <Loader2 size={16} className="animate-spin" style={{ color: '#0284c7' }} />
                    <span>Searching Automobile HR policies & generating response...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="chat-input-container">
        <form onSubmit={handleSubmit} className="chat-input-wrapper">
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            placeholder="Ask anything about Automobile HR policies, technician overtime, leave rules, plant safety..."
            rows={1}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <div className="chat-controls-row">
            <div className="input-hint-text">
              <Info size={13} style={{ color: '#0284c7' }} />
              <span>Answers strictly derived from indexed Automobile HR policy documents</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {messages.length > 0 && (
                <button
                  type="button"
                  className="btn-header"
                  onClick={onClearChat}
                  title="Clear conversation history"
                  style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                >
                  <RotateCcw size={13} style={{ color: '#64748b' }} />
                  <span>Reset Chat</span>
                </button>
              )}
              <button
                type="submit"
                className="btn-send"
                disabled={loading || !inputText.trim()}
                title="Send query"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
