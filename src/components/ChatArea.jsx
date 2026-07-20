import React, { useEffect, useRef } from 'react';
import { Cpu, User, AlertCircle, Database } from 'lucide-react';
import TraceDrawer from './TraceDrawer';

export default function ChatArea({ 
  messages, 
  loading, 
  expandedTraces, 
  toggleTrace 
}) {
  const messagesEndRef = useRef(null);

  // Automatically scroll to the bottom when messages list changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '24px 32px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      {messages.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          gap: '16px',
          maxWidth: '500px',
          margin: 'auto'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid var(--border-glass-glow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <Cpu size={32} style={{ color: 'var(--primary)' }} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '24px' }}>
            Enterprise SQL Agent
          </h1>
          <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-muted)' }}>
            Ask natural language questions about your datasets. The agent will classify intent, link the schema, resolve relationships, and execute correct SQL.
          </p>
        </div>
      ) : (
        messages.map((msg, index) => {
          const isUser = msg.sender === 'user';
          const isTraceExpanded = expandedTraces[msg.id];

          return (
            <div key={msg.id} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: isUser ? 'flex-end' : 'flex-start',
              maxWidth: isUser ? '85%' : '100%',
              width: isUser ? 'auto' : '100%',
              alignSelf: isUser ? 'flex-end' : 'flex-start',
              animation: 'fadeIn 0.3s ease-out'
            }}>
              
              {/* Message content bubble wrapper */}
              <div style={{
                display: 'flex',
                gap: '12px',
                flexDirection: isUser ? 'row-reverse' : 'column',
                alignItems: 'flex-start',
                width: '100%'
              }}>
                {/* Avatar Icon */}
                <div style={{
                  width: isUser ? '36px' : '28px',
                  height: isUser ? '36px' : '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: isUser ? 'var(--primary-gradient)' : 'var(--bg-glass)',
                  border: isUser ? 'none' : '1px solid var(--border-glass)',
                  boxShadow: isUser ? '0 4px 10px rgba(99, 102, 241, 0.25)' : 'none',
                  marginBottom: isUser ? '0px' : '4px'
                }}>
                  {isUser ? <User size={16} style={{ color: '#fff' }} /> : <Cpu size={14} style={{ color: 'var(--primary)' }} />}
                </div>

                {/* Message Bubble Card */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: isUser ? 'auto' : '100%' }}>
                  <div style={{
                    padding: '14px 18px',
                    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 16px',
                    background: isUser ? 'var(--primary-gradient)' : 'var(--bg-glass)',
                    border: isUser ? 'none' : '1px solid var(--border-glass)',
                    color: isUser ? '#fff' : 'var(--text-primary)',
                    boxShadow: isUser ? 'var(--shadow-glow)' : 'var(--shadow-panel)',
                    lineHeight: '1.6',
                    fontSize: '14px',
                    whiteSpace: 'pre-wrap',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}>
                    
                    {/* Render text with Markdown formatting if it's agent */}
                    {!isUser ? (
                      <div className="markdown-body">
                        {/* Cut query details from final_answer display in bubble to make it look clean */}
                        {msg.text.split('\n\n---\n### Query Details:')[0]}
                      </div>
                    ) : (
                      msg.text
                    )}
                  </div>
                  
                  {/* Timestamp and controls */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    padding: '2px 6px',
                    justifyContent: isUser ? 'flex-end' : 'flex-start'
                  }}>
                    <span>{formatTime(msg.timestamp)}</span>
                    {!isUser && msg.db_type && (
                      <>
                        <span>•</span>
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '3px',
                          color: 'var(--primary)'
                        }}>
                          <Database size={10} />
                          Startups (Postgres)
                        </span>
                      </>
                    )}
                    
                    {!isUser && (msg.total_results_count !== undefined || msg.results) && (
                      <>
                        <span>•</span>
                        <span style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '3px',
                          color: 'var(--secondary)',
                          fontWeight: 600
                        }}>
                          {msg.total_results_count !== undefined ? msg.total_results_count : (msg.results ? msg.results.length : 0)} results found
                        </span>
                      </>
                    )}
                    
                    {/* Expand Trace link */}
                    {!isUser && msg.steps && msg.steps.length > 0 && (
                      <>
                        <span>•</span>
                        <button 
                          onClick={() => toggleTrace(msg.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 500,
                            padding: 0,
                            textDecoration: 'underline'
                          }}
                        >
                          {isTraceExpanded ? 'Hide Trace Details' : 'Inspect Execution Trace'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Expandable step trace viewer */}
              {!isUser && isTraceExpanded && msg.steps && (
                <div style={{
                  width: '100%',
                  marginLeft: '0px',
                  marginTop: '12px',
                  animation: 'fadeIn 0.25s ease-out'
                }}>
                  <TraceDrawer msg={msg} />
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Loading active assistant indicator */}
      {loading && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          maxWidth: '100%',
          width: '100%',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-glass)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginBottom: '4px'
          }}>
            <Cpu size={14} style={{ color: 'var(--primary)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
            <div style={{
              padding: '12px 18px',
              borderRadius: '16px 16px 16px 16px',
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-glass)',
              boxShadow: 'var(--shadow-panel)',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              <div className="typing-indicator">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', paddingLeft: '6px' }}>
              LangGraph routing queries...
            </span>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
