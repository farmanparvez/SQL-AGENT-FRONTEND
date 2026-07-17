import React, { useState, useEffect, useRef } from 'react';
import { Send, CornerDownLeft, Sparkles, Database } from 'lucide-react';

const SAMPLE_QUERIES = [
  "Which organizations are in San Francisco?",
  "Show funding rounds for organizations in the technology sector",
  "List investors who participated in funding rounds"
];

export default function ChatInput({
  onSend,
  dbType,
  loading,
  schema,
  currentSessionId
}) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef(null);

  // Clear input and focus when session changes
  useEffect(() => {
    setInputValue('');
    inputRef.current?.focus();
  }, [currentSessionId]);

  // ADD THIS NEW EFFECT HERE — auto-resize + fix scroll offset on paste/type
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
    el.scrollTop = 0;
  }, [inputValue]);

  const samples = SAMPLE_QUERIES;
  const schemaDict = schema?.schema_dict || {};
  const tableNames = Object.keys(schemaDict);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [dbType]);

  // Compute table name autocomplete suggestions based on the last typed word
  useEffect(() => {
    if (!inputValue) {
      setSuggestions([]);
      return;
    }

    // Get last typed word
    const words = inputValue.trim().split(/\s+/);
    const lastWord = words[words.length - 1]?.toLowerCase() || '';

    if (lastWord.length >= 2) {
      const matches = tableNames.filter(tbl =>
        tbl.startsWith(lastWord) && tbl !== lastWord
      );
      setSuggestions(matches.slice(0, 3));
    } else {
      setSuggestions([]);
    }
  }, [inputValue, schema]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!inputValue.trim() || loading) return;
    onSend(inputValue.trim());
    setInputValue('');
    setSuggestions([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ADD THIS
  const handlePaste = () => {
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 100) + 'px';
      el.scrollTop = 0;
    });
  };

  const handleSuggestionClick = (tableName) => {
    const words = inputValue.trim().split(/\s+/);
    words[words.length - 1] = tableName + ' ';
    const newValue = words.join(' ');
    setInputValue(newValue);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const runSample = (sampleText) => {
    if (loading) return;
    onSend(sampleText);
  };

  return (
    <div style={{
      padding: '0 32px 24px 32px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>

      {/* Autocomplete table suggestions */}
      {suggestions.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Autocomplete:</span>
          {suggestions.map(tbl => (
            <button
              key={tbl}
              onClick={() => handleSuggestionClick(tbl)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid var(--border-glass-glow)',
                color: 'var(--primary)',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'var(--transition-smooth)'
              }}
            >
              <Database size={10} />
              {tbl}
            </button>
          ))}
        </div>
      )}

      {/* Helper Chips / Suggestion Cards */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        alignItems: 'center'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          marginRight: '4px'
        }}>
          <Sparkles size={12} style={{ color: 'var(--warning)' }} />
          <span>Try asking:</span>
        </div>
        {samples.map((sample, idx) => (
          <button
            key={idx}
            onClick={() => runSample(sample)}
            disabled={loading}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: '1px solid var(--border-glass)',
              background: 'var(--bg-glass)',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'var(--transition-smooth)',
              whiteSpace: 'nowrap'
            }}
            className="sample-chip-hover"
          >
            {sample}
          </button>
        ))}
      </div>

      {/* Main chat input panel */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'var(--bg-glass)',
          border: '1px solid var(--border-glass)',
          padding: '10px 14px',
          borderRadius: '14px',
          boxShadow: 'var(--shadow-panel)'
        }}
      >
        <textarea
          ref={inputRef}
          rows={1}
          placeholder="Ask about the Startups dataset..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}          // ADD THIS
          disabled={loading}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: '14px',
            fontFamily: 'var(--font-sans)',
            resize: 'none',
            lineHeight: '1.5',
            minHeight: '24px',           // CHANGED (was not present)
            maxHeight: '100px',
            overflowY: 'auto',           // ADDED
            padding: '4px 0'
          }}
        />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--text-muted)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            fontSize: '10px',
            background: 'var(--bg-canvas)',
            padding: '3px 6px',
            borderRadius: '4px',
            border: '1px solid var(--border-glass)'
          }}>
            <CornerDownLeft size={8} />
            <span>Enter</span>
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim() || loading}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: inputValue.trim() && !loading ? 'var(--primary-gradient)' : 'var(--border-glass)',
              border: 'none',
              color: inputValue.trim() && !loading ? '#fff' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: inputValue.trim() && !loading ? 'pointer' : 'not-allowed',
              transition: 'var(--transition-smooth)',
              boxShadow: inputValue.trim() && !loading ? '0 4px 10px rgba(99, 102, 241, 0.25)' : 'none'
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
