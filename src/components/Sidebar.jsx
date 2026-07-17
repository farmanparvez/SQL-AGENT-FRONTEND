import React, { useState } from 'react';
import { Database, Search, ChevronDown, ChevronRight, Share2, Server, HelpCircle, MessageSquare, Trash2, Plus } from 'lucide-react';

export default function Sidebar({ 
  dbType, 
  setDbType, 
  schema, 
  loadingSchema,
  sessions = [],
  currentSessionId = "",
  onSelectSession = () => {},
  onDeleteSession = () => {},
  onCreateSession = () => {},
  activeTab = 'tables',
  setActiveTab = () => {}
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTables, setExpandedTables] = useState({});

  const toggleTable = (tableName) => {
    setExpandedTables(prev => ({
      ...prev,
      [tableName]: !prev[tableName]
    }));
  };

  const schemaDict = schema?.schema_dict || {};
  const edges = schema?.edges || [];

  // Filter tables based on query
  const filteredTables = Object.keys(schemaDict).filter(tableName => {
    if (!searchQuery) return true;
    if (tableName.includes(searchQuery.toLowerCase())) return true;
    const columns = schemaDict[tableName] || [];
    return columns.some(col => col.includes(searchQuery.toLowerCase()));
  });

  return (
    <div className="glass-panel" style={{
      width: 'var(--sidebar-width)',
      height: 'calc(100vh - 24px)',
      margin: '12px 0 12px 12px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      borderRight: '1px solid var(--border-glass)',
      zIndex: 10
    }}>
      {/* Database Selector Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid var(--border-glass)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={20} className="glow-text-primary" style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontSize: '18px', color: 'var(--text-primary)' }}>Dataset</h2>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--primary-gradient)',
          padding: '8px 12px',
          borderRadius: '8px',
          color: '#fff',
          fontWeight: 600,
          fontSize: '13px',
          boxShadow: '0 0 12px rgba(99, 102, 241, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          Startups (Postgres)
        </div>

        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          fontSize: '11px', 
          color: 'var(--text-muted)' 
        }}>
          <Server size={12} />
          <span>PostgreSQL Server: postgres@127.0.0.1</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-glass)',
        background: 'var(--bg-canvas)'
      }}>
        <button
          onClick={() => setActiveTab('tables')}
          style={{
            flex: 1,
            padding: '12px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'tables' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'tables' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          Tables ({Object.keys(schemaDict).length})
        </button>
        <button
          onClick={() => setActiveTab('relations')}
          style={{
            flex: 1,
            padding: '12px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'relations' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'relations' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          Relationships ({edges.length})
        </button>
        <button
          onClick={() => setActiveTab('chats')}
          style={{
            flex: 1,
            padding: '12px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'chats' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'chats' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          Chats ({sessions.length})
        </button>
      </div>

      {/* Search Bar (only for Tables tab) */}
      {activeTab === 'tables' && (
        <div style={{
          padding: '12px 16px',
          position: 'relative'
        }}>
          <Search size={14} style={{
            position: 'absolute',
            left: '26px',
            top: '22px',
            color: 'var(--text-muted)'
          }} />
          <input 
            type="text" 
            placeholder="Search schema..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>
      )}

      {/* Explorer Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0 16px 16px 16px'
      }}>
        {activeTab === 'chats' ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginTop: '16px'
          }}>
            <button
              onClick={onCreateSession}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px',
                borderRadius: '8px',
                background: 'var(--primary-gradient)',
                border: 'none',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(99, 102, 241, 0.25)',
                transition: 'var(--transition-smooth)'
              }}
            >
              <Plus size={14} />
              New Chat Session
            </button>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginTop: '8px'
            }}>
              {sessions.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 0',
                  color: 'var(--text-muted)',
                  fontSize: '13px'
                }}>
                  No chat sessions. Click 'New Chat' to start.
                </div>
              ) : (
                sessions.map(s => {
                  const sid = s.session_id;
                  const isActive = sid === currentSessionId;
                  const shortId = sid.split('-')[0].toUpperCase();
                  const title = s.title || `Chat ${shortId}`;
                  return (
                    <div
                      key={sid}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                        border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-glass)',
                        cursor: 'pointer',
                        transition: 'var(--transition-smooth)'
                      }}
                      onClick={() => onSelectSession(sid)}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: isActive ? '#fff' : 'var(--text-secondary)',
                        fontSize: '13px',
                        fontWeight: isActive ? 600 : 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '80%'
                      }}>
                        <MessageSquare size={14} style={{ color: isActive ? 'var(--primary)' : 'var(--text-muted)' }} />
                        <span title={title}>{title}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(sid);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '4px',
                          transition: 'var(--transition-smooth)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : loadingSchema ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100px',
            gap: '8px',
            color: 'var(--text-secondary)',
            fontSize: '13px'
          }}>
            <div className="typing-indicator">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </div>
            <span>Fetching metadata...</span>
          </div>
        ) : activeTab === 'tables' ? (
          filteredTables.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '24px 0',
              color: 'var(--text-muted)',
              fontSize: '13px'
            }}>
              No matching tables
            </div>
          ) : (
            filteredTables.map(tblName => {
              const isExpanded = expandedTables[tblName];
              const cols = schemaDict[tblName] || [];
              return (
                <div key={tblName} style={{
                  marginBottom: '8px',
                  borderRadius: '8px',
                  background: isExpanded ? 'var(--bg-surface)' : 'transparent',
                  border: isExpanded ? '1px solid var(--border-glass)' : '1px solid transparent',
                  overflow: 'hidden',
                  transition: 'var(--transition-smooth)'
                }}>
                  <div 
                    onClick={() => toggleTable(tblName)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 10px',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      userSelect: 'none',
                      transition: 'var(--transition-smooth)'
                    }}
                    className="table-header-hover"
                  >
                    {isExpanded ? <ChevronDown size={14} style={{ marginRight: '6px' }} /> : <ChevronRight size={14} style={{ marginRight: '6px' }} />}
                    <Database size={13} style={{ marginRight: '8px', color: 'var(--text-secondary)' }} />
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: isExpanded ? 'var(--primary)' : 'var(--text-primary)'
                    }}>{tblName}</span>
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: '11px',
                      background: 'var(--border-glass)',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      color: 'var(--text-muted)'
                    }}>{cols.length}</span>
                  </div>
                  
                  {isExpanded && (
                    <div style={{
                      padding: '4px 10px 8px 30px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      borderLeft: '1px dashed var(--border-glass)',
                      marginLeft: '20px',
                      marginBottom: '4px'
                    }}>
                      {cols.map(col => (
                        <div key={col} style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '2px 0'
                        }}>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>{col}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : (
          /* Relations Tab */
          edges.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '24px 0',
              color: 'var(--text-muted)',
              fontSize: '13px'
            }}>
              No relations defined
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {edges.map((edge, index) => {
                const [source, target, clause] = edge;
                return (
                  <div key={index} style={{
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-glass)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
                      <span style={{ color: 'var(--primary)' }}>{source}</span>
                      <Share2 size={10} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ color: 'var(--secondary)' }}>{target}</span>
                    </div>
                    <div style={{ 
                      fontFamily: 'var(--font-mono)', 
                      fontSize: '11px', 
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-canvas)',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      wordBreak: 'break-all'
                    }}>
                      {clause}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Schema Help Footer */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid var(--border-glass)',
        background: 'var(--bg-sidebar)',
        fontSize: '12px',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px'
      }}>
        <HelpCircle size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Query Guidance</strong>
          <p style={{ marginTop: '4px', fontSize: '11px', lineHeight: '1.4', color: 'var(--text-muted)' }}>
            Ask questions using columns and relationships listed above. The agent will resolve joins automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
