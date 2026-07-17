import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import ChatInput from './components/ChatInput';
import { Cpu, RotateCcw, Plus, Sun, Moon } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

export default function App() {
  const [dbType, setDbType] = useState('postgres');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [schema, setSchema] = useState(null);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [expandedTraces, setExpandedTraces] = useState({});
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState('');
  const [activeTab, setActiveTab] = useState('chats');
  const [theme, setTheme] = useState(localStorage.getItem('app_theme') || 'light');
  const [localOnlySessions, setLocalOnlySessions] = useState(new Set());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const getSessionFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('session');
  };

  const updateUrl = (sessionId) => {
    const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?session=${sessionId}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  const cleanUrl = () => {
    const cleanUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    window.history.pushState({ path: cleanUrl }, '', cleanUrl);
  };

  const handleCreateSession = () => {
    const newSid = generateUUID();
    setLocalOnlySessions(prev => {
      const next = new Set(prev);
      next.add(newSid);
      return next;
    });
    setCurrentSessionId(newSid);
    localStorage.setItem('active_session_id', newSid);
    setMessages([]);
    cleanUrl();
    setActiveTab('chats');
    return newSid;
  };

  // Load session list on mount
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/sessions`);
        if (!res.ok) throw new Error('Sessions fetch failed');
        const data = await res.json();
        const loadedSessions = data.sessions || [];
        setSessions(loadedSessions);
        
        const urlSid = getSessionFromUrl();
        const savedSid = localStorage.getItem('active_session_id');
        
        if (urlSid) {
          setCurrentSessionId(urlSid);
          localStorage.setItem('active_session_id', urlSid);
          const loadedSessionIds = loadedSessions.map(s => s.session_id);
          if (!loadedSessionIds.includes(urlSid)) {
            setLocalOnlySessions(prev => {
              const next = new Set(prev);
              next.add(urlSid);
              return next;
            });
          }
        } else if (savedSid) {
          setCurrentSessionId(savedSid);
          const loadedSessionIds = loadedSessions.map(s => s.session_id);
          if (loadedSessionIds.includes(savedSid)) {
            updateUrl(savedSid);
          } else {
            setLocalOnlySessions(prev => {
              const next = new Set(prev);
              next.add(savedSid);
              return next;
            });
            cleanUrl();
          }
        } else {
          const newSid = generateUUID();
          setLocalOnlySessions(prev => {
            const next = new Set(prev);
            next.add(newSid);
            return next;
          });
          setCurrentSessionId(newSid);
          localStorage.setItem('active_session_id', newSid);
          cleanUrl();
        }
      } catch (err) {
        console.error('Error fetching sessions:', err);
      }
    };
    fetchSessions();
  }, []);

  // Fetch chat history for selected session
  useEffect(() => {
    if (!currentSessionId) return;
    if (localOnlySessions.has(currentSessionId)) {
      setMessages([]);
      return;
    }
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/session/${currentSessionId}/history`);
        if (!res.ok) throw new Error('History fetch failed');
        const data = await res.json();
        
        const historyMessages = data.messages.map((m, idx) => {
          const trace = m.trace_data || {};
          return {
            id: `${currentSessionId}-${idx}-${m.role}`,
            sender: m.role === 'user' ? 'user' : 'agent',
            text: m.content,
            timestamp: new Date().toISOString(),
            db_type: dbType,
            steps: trace.steps || [],
            generated_sql: trace.generated_sql || '',
            results: trace.execution_results || [],
            total_results_count: trace.total_results_count,
            validation: trace.validation_results || {},
            error_log: trace.error_log || []
          };
        });
        setMessages(historyMessages);
      } catch (err) {
        console.error('Error fetching session history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [currentSessionId]);

  const handleDeleteSession = async (sid) => {
    try {
      const res = await fetch(`${API_BASE}/api/session/${sid}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete session');
      const remaining = sessions.filter(s => s.session_id !== sid);
      setSessions(remaining);
      
      if (sid === currentSessionId) {
        if (remaining.length > 0) {
          setCurrentSessionId(remaining[0].session_id);
          localStorage.setItem('active_session_id', remaining[0].session_id);
          updateUrl(remaining[0].session_id);
        } else {
          handleCreateSession();
        }
      }
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  // Load schema metadata when database selection changes
  useEffect(() => {
    const fetchSchema = async () => {
      setLoadingSchema(true);
      try {
        const res = await fetch(`${API_BASE}/api/schema?db_type=${dbType}`);
        if (!res.ok) throw new Error('Schema fetch failed');
        const data = await res.json();
        setSchema(data);
      } catch (err) {
        console.error('Error fetching schema details:', err);
      } finally {
        setLoadingSchema(false);
      }
    };

    fetchSchema();
  }, [dbType]);

  const handleSend = async (question) => {
    const userMsgId = Date.now().toString();
    const userMessage = {
      id: userMsgId,
      sender: 'user',
      text: question,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, db_type: dbType, session_id: currentSessionId })
      });

      if (!response.ok) {
        throw new Error(`Server returned error status: ${response.status}`);
      }

      const resData = await response.json();
      
      updateUrl(currentSessionId);
      
      setLocalOnlySessions(prev => {
        const next = new Set(prev);
        next.delete(currentSessionId);
        return next;
      });
      
      setSessions(prev => {
        const sessionIds = prev.map(s => s.session_id);
        if (!sessionIds.includes(currentSessionId)) {
          return [{ session_id: currentSessionId, title: question }, ...prev];
        }
        return prev;
      });
      
      const agentMsgId = (Date.now() + 1).toString();
      const agentMessage = {
        id: agentMsgId,
        sender: 'agent',
        text: resData.final_answer || 'Successfully executed.',
        timestamp: new Date().toISOString(),
        db_type: dbType,
        steps: resData.steps,
        generated_sql: resData.generated_sql,
        results: resData.execution_results,
        total_results_count: resData.total_results_count !== undefined ? resData.total_results_count : (resData.execution_results ? resData.execution_results.length : 0),
        validation: resData.validation_results,
        error_log: resData.error_log
      };

      setMessages(prev => [...prev, agentMessage]);
      
      // Auto-expand the trace drawer if there is an validation/execution error
      const isFailed = !resData.validation_results?.valid || resData.execution_error;
      if (isFailed) {
        setExpandedTraces(prev => ({
          ...prev,
          [agentMsgId]: true
        }));
      }

    } catch (err) {
      console.error('API query execution failure:', err);
      
      const errorMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: errorMsgId,
        sender: 'agent',
        text: `Error connecting to agent pipeline backend server. Please verify api_server.py is running. Details: ${err.message}`,
        timestamp: new Date().toISOString(),
        db_type: dbType,
        steps: []
      }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleTrace = (msgId) => {
    setExpandedTraces(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  const clearChat = () => {
    setMessages([]);
    setExpandedTraces({});
  };

  return (
    <div className="app-container">
      
      {/* Collapsible Schema Browser Sidebar */}
      <Sidebar 
        dbType={dbType} 
        setDbType={setDbType} 
        schema={schema} 
        loadingSchema={loadingSchema} 
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={(sid) => {
          setCurrentSessionId(sid);
          localStorage.setItem('active_session_id', sid);
          updateUrl(sid);
        }}
        onDeleteSession={handleDeleteSession}
        onCreateSession={handleCreateSession}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main chat column */}
      <div className="main-content">
        
        {/* Chat top header */}
        <div style={{
          height: '64px',
          borderBottom: '1px solid var(--border-glass)',
          background: 'var(--bg-sidebar)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          zIndex: 5
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)'
            }}></div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>SQL Agent Online</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={toggleTheme}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-sidebar)',
                border: '1px solid var(--border-glass)',
                padding: '6px',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'var(--transition-smooth)',
                width: '32px',
                height: '32px'
              }}
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>

            <button
              onClick={handleCreateSession}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--primary-gradient)',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'var(--transition-smooth)'
              }}
            >
              <Plus size={13} />
              New Chat
            </button>

            {messages.length > 0 && (
              <button
                onClick={clearChat}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border-glass)',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)'
                }}
                className="btn-clear-hover"
              >
                <RotateCcw size={13} />
                Clear Chat
              </button>
            )}
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: 'var(--text-secondary)'
            }}>
              <span style={{
                background: 'rgba(99, 102, 241, 0.1)',
                color: 'var(--primary)',
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '11px',
                border: '1px solid var(--border-glass-glow)'
              }}>
                LangGraph v0.0.10
              </span>
            </div>
          </div>
        </div>

        {/* Conversation list area */}
        <ChatArea 
          messages={messages} 
          loading={loading} 
          expandedTraces={expandedTraces} 
          toggleTrace={toggleTrace} 
        />

        {/* Input box form container */}
        <ChatInput 
          onSend={handleSend} 
          dbType={dbType} 
          loading={loading}
          schema={schema}
          currentSessionId={currentSessionId}
        />
      </div>
    </div>
  );
}
