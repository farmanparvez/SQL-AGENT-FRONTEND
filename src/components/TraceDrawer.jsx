import React, { useState, useMemo, useRef } from 'react';
import { Play, CheckCircle, AlertTriangle, XCircle, Code, Table, Cpu, Copy, Check, Download, Maximize2 } from 'lucide-react';

// Simple regex-based SQL syntax highlighter
function highlightSQL(sql) {
  if (!sql) return '';
  const keywords = /\b(SELECT|FROM|JOIN|LEFT|INNER|ON|WHERE|AND|OR|GROUP|BY|ORDER|LIMIT|SUM|AVG|COUNT|AS|LIKE|ILIKE|NOT|IN|CREATE|TABLE)\b/gi;
  let highlighted = sql
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Highlight keywords
  highlighted = highlighted.replace(keywords, '<span style="color:#4f46e5; font-weight:600;">$1</span>');
  // Highlight strings
  highlighted = highlighted.replace(/('[^']*')/g, '<span style="color:#fb7185;">$1</span>');
  // Highlight numeric values (ignoring those inside HTML tags/attributes)
  highlighted = highlighted.replace(/\b(\d+)\b(?![^<]*>)/g, '<span style="color:#34d399;">$1</span>');
  // Highlight comments
  highlighted = highlighted.replace(/(--.*)/g, '<span style="color:#6b7280; font-style:italic;">$1</span>');
  
  return highlighted;
}

export default function TraceDrawer({ msg }) {
  const [activeTab, setActiveTab] = useState('pipeline'); // 'pipeline', 'sql', 'table'
  const [copied, setCopied] = useState(false);
  const [expandedNode, setExpandedNode] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterQuery, setFilterQuery] = useState('');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc', 'desc'
  const [activePopover, setActivePopover] = useState(null); // { content: string, title: string, colKey: string, rowIdx: number }

  const handleCellClick = (e, valStr, key, rowIdx) => {
    if (activePopover && activePopover.rowIdx === rowIdx && activePopover.colKey === key) {
      setActivePopover(null);
    } else {
      setActivePopover({
        content: valStr,
        title: key,
        colKey: key,
        rowIdx
      });
    }
  };

  const { steps, generated_sql, results, total_results_count, validation, intent, error_log } = msg;

  const handleFilterChange = (e) => {
    setFilterQuery(e.target.value);
    setCurrentPage(1);
  };

  const downloadCSV = () => {
    if (!results || results.length === 0) return;
    const headers = Object.keys(results[0]);
    const csvRows = [headers.join(',')];
    for (const row of results) {
      const values = headers.map(header => {
        const val = row[header];
        const stringVal = val === null || val === undefined ? '' : String(val);
        const escaped = stringVal.replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `query_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredResults = (results || []).filter(row => {
    if (!filterQuery.trim()) return true;
    const query = filterQuery.toLowerCase();
    return Object.values(row).some(val => 
      String(val).toLowerCase().includes(query)
    );
  });

  const sortedResults = useMemo(() => {
    if (!sortColumn) return filteredResults;
    
    return [...filteredResults].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];
      
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      // Try numeric comparison if both can be parsed as numbers
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      // Fallback to string comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredResults, sortColumn, sortDirection]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const totalRows = filteredResults.length;
  const totalPages = pageSize === 'all' ? 1 : Math.ceil(totalRows / pageSize);
  const slicedResults = pageSize === 'all' 
    ? sortedResults 
    : sortedResults.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleCopy = () => {
    navigator.clipboard.writeText(generated_sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStepStatus = (stepName) => {
    // If the step is in the steps array, it succeeded
    const foundStep = steps?.find(s => s.node === stepName);
    if (!foundStep) return 'pending';
    
    // Check for errors at this step
    if (stepName === 'validate_sql' && !foundStep.state.validation_results?.valid) {
      return 'error';
    }
    if (stepName === 'execute_sql' && foundStep.state.execution_error) {
      return 'error';
    }
    return 'success';
  };

  const getStepStateData = (stepName, state) => {
    switch (stepName) {
      case 'classify_intent':
        return { 'Classified Intent': state.intent };
      case 'link_schema':
        return { 'Identified Tables': state.target_tables?.join(', ') || 'None' };
      case 'resolve_joins':
        return { 
          'Target Tables': state.join_info?.tables?.join(', ') || 'None',
          'Join Paths Resolved': state.join_info?.joins?.length || 0 
        };
      case 'query_semantic_layer':
        return { 'Semantic Query SQL': state.generated_sql };
      case 'generate_sql':
        return { 'Generated SQL Query': state.generated_sql };
      case 'validate_sql':
        return { 
          'Validation Status': state.validation_results?.valid ? 'PASSED' : 'FAILED',
          'Validation Message': state.validation_results?.message || ''
        };
      case 'execute_sql':
        return { 
          'Status': state.execution_error ? 'ERROR' : 'SUCCESS',
          'Rows Returned': state.execution_results?.length || 0,
          'Error Message': state.execution_error || 'None'
        };
      case 'self_correct':
        return { 
          'Retry Count': state.retry_count,
          'Latest Error Logged': state.error_log?.[state.error_log.length - 1] || 'None'
        };
      case 'synthesize_answer':
        return { 'Final Output Length': state.final_answer?.length || 0 };
      default:
        return state;
    }
  };

  // Build full graph nodes list dynamically based on intent
  const getPipelineNodes = () => {
    const nodes = ['classify_intent'];
    if (intent === 'governed_metric') {
      nodes.push('query_semantic_layer');
    } else {
      nodes.push('link_schema', 'resolve_joins', 'generate_sql');
    }
    
    nodes.push('validate_sql');
    
    // Check if self_correct ran
    const hasSelfCorrect = steps?.some(s => s.node === 'self_correct');
    if (hasSelfCorrect) {
      nodes.push('self_correct');
    }
    
    nodes.push('execute_sql', 'synthesize_answer');
    return nodes;
  };

  const pipelineNodes = getPipelineNodes();

  return (
    <div className="glass-panel" style={{
      marginTop: '12px',
      background: 'var(--bg-canvas)',
      border: '1px solid var(--border-glass)',
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-glass)',
        background: 'var(--bg-sidebar)',
        padding: '0 8px'
      }}>
        <button
          onClick={() => setActiveTab('pipeline')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 16px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'pipeline' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'pipeline' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          <Cpu size={14} />
          LangGraph Timeline
        </button>
        <button
          onClick={() => setActiveTab('sql')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 16px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'sql' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'sql' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          <Code size={14} />
          SQL Preview
        </button>
        <button
          onClick={() => setActiveTab('table')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 16px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'table' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'table' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          <Table size={14} />
          Raw Results ({total_results_count !== undefined ? total_results_count : (results?.length || 0)})
        </button>
      </div>

      {/* Tabs panels */}
      <div style={{ padding: '16px' }}>
        
        {/* Pipeline Tab */}
        {activeTab === 'pipeline' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Execution Flow: {intent === 'governed_metric' ? 'Governed Metric Path' : 'Ad-hoc Query Path'}
            </div>
            
            {pipelineNodes.map((nodeName, idx) => {
              const status = getStepStatus(nodeName);
              const isExpanded = expandedNode === nodeName;
              const stepInfo = steps?.find(s => s.node === nodeName);

              return (
                <div 
                  key={nodeName} 
                  className={`pipeline-step ${status === 'active' ? 'active' : status}`}
                  style={{ cursor: stepInfo ? 'pointer' : 'default' }}
                  onClick={() => stepInfo && setExpandedNode(isExpanded ? null : nodeName)}
                >
                  <div className="pipeline-node-icon">
                    {status === 'success' && <CheckCircle size={14} style={{ color: '#fff' }} />}
                    {status === 'error' && <XCircle size={14} style={{ color: '#fff' }} />}
                    {status === 'pending' && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)' }}></div>}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        fontSize: '13px', 
                        fontWeight: 600,
                        color: status === 'pending' ? 'var(--text-muted)' : 'var(--text-primary)'
                      }}>
                        {nodeName.toUpperCase().replace(/_/g, ' ')}
                      </span>
                      {status === 'error' && (
                        <span style={{ 
                          fontSize: '10px', 
                          background: 'rgba(239, 68, 68, 0.1)', 
                          color: 'var(--error)', 
                          padding: '1px 6px', 
                          borderRadius: '10px',
                          border: '1px solid rgba(239,68,68,0.2)'
                        }}>
                          Failed
                        </span>
                      )}
                      {status === 'success' && (
                        <span style={{ 
                          fontSize: '10px', 
                          background: 'rgba(16, 185, 129, 0.1)', 
                          color: 'var(--secondary)', 
                          padding: '1px 6px', 
                          borderRadius: '10px',
                          border: '1px solid rgba(16,185,129,0.2)'
                        }}>
                          Completed
                        </span>
                      )}
                    </div>

                    {stepInfo && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {isExpanded ? 'Click to collapse details' : 'Click to inspect node variables'}
                      </span>
                    )}

                    {isExpanded && stepInfo && (
                      <div 
                        onClick={(e) => e.stopPropagation()} // Stop propagation so it doesn't close immediately
                        style={{
                          marginTop: '8px',
                          padding: '10px 12px',
                          background: 'var(--bg-glass)',
                          border: '1px solid var(--border-glass)',
                          borderRadius: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        {Object.entries(getStepStateData(nodeName, stepInfo.state)).map(([key, val]) => (
                          <div key={key} style={{ fontSize: '12px' }}>
                            <strong style={{ color: 'var(--text-secondary)' }}>{key}: </strong>
                            {typeof val === 'string' && val.includes('\n') ? (
                              <pre style={{
                                marginTop: '4px',
                                fontFamily: 'var(--font-mono)',
                                background: 'var(--bg-surface)',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                overflowX: 'auto',
                                border: '1px solid var(--border-glass)'
                              }}>{val}</pre>
                            ) : (
                              <span style={{ color: 'var(--text-primary)', fontFamily: typeof val === 'object' ? 'var(--font-mono)' : 'inherit' }}>
                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SQL Tab */}
        {activeTab === 'sql' && (
          <div style={{ position: 'relative' }}>
            {generated_sql ? (
              <>
                <button
                  onClick={handleCopy}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '6px',
                    color: 'var(--text-secondary)',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'var(--transition-smooth)'
                  }}
                  title="Copy SQL"
                >
                  {copied ? <Check size={14} style={{ color: 'var(--secondary)' }} /> : <Copy size={14} />}
                </button>
                <pre style={{
                  fontFamily: 'var(--font-mono)',
                  background: 'var(--bg-surface)',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-glass)',
                  fontSize: '13px',
                  overflowX: 'auto',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }} dangerouslySetInnerHTML={{ __html: highlightSQL(generated_sql) }} />
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '16px 0' }}>
                No SQL query generated for this query.
              </div>
            )}
          </div>
        )}

        {/* Results Table Tab */}
        {activeTab === 'table' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
            {results && results.length > 0 ? (
              <>
                {/* Results Explorer Toolbar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                  background: 'var(--bg-sidebar)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-glass)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Show:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPageSize(val === 'all' ? 'all' : Number(val));
                        setCurrentPage(1);
                      }}
                      style={{
                        background: 'var(--bg-canvas)',
                        border: '1px solid var(--border-glass)',
                        color: 'var(--text-primary)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '12px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value={10}>10 rows</option>
                      <option value={25}>25 rows</option>
                      <option value={50}>50 rows</option>
                      <option value={100}>100 rows</option>
                      <option value="all">All rows</option>
                    </select>
                    
                    <input
                      type="text"
                      placeholder="Filter records..."
                      value={filterQuery}
                      onChange={handleFilterChange}
                      style={{
                        background: 'var(--bg-canvas)',
                        border: '1px solid var(--border-glass)',
                        color: 'var(--text-primary)',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '12px',
                        outline: 'none',
                        width: '180px'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {filterQuery 
                        ? `${totalRows} records found (filtered)` 
                        : (total_results_count !== undefined ? `${total_results_count} records found` : `${totalRows} records found`)
                      }
                      {total_results_count !== undefined && total_results_count > (results?.length || 0) && !filterQuery && ` (showing first ${results.length})`}
                    </span>
                    <button
                      onClick={downloadCSV}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'var(--primary-gradient)',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'var(--transition-smooth)'
                      }}
                    >
                      <Download size={12} />
                      Download CSV
                    </button>
                  </div>
                </div>

                {/* Table display */}
                {slicedResults.length > 0 ? (
                  <div style={{ 
                    overflowX: 'auto', 
                    position: 'relative',
                    minHeight: (slicedResults.length > 0 && slicedResults.length <= 2) ? '250px' : 'auto'
                  }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '13px',
                      textAlign: 'left',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '8px'
                    }}>
                      <thead>
                        <tr style={{
                          background: 'var(--bg-sidebar)',
                          borderBottom: '1px solid var(--border-glass)'
                        }}>
                           {Object.keys(slicedResults[0]).map(key => (
                             <th 
                               key={key} 
                               onClick={() => handleSort(key)}
                               style={{
                                 padding: '12px 16px',
                                 color: 'var(--primary)',
                                 fontWeight: 600,
                                 cursor: 'pointer',
                                 userSelect: 'none',
                                 transition: 'background 0.2s',
                                 minWidth: '120px'
                               }}
                               className="sortable-header"
                               title={`Click to sort by ${key}`}
                             >
                               <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                 {key}
                                 {sortColumn === key && (
                                   <span style={{ fontSize: '10px', color: 'var(--primary)' }}>
                                     {sortDirection === 'asc' ? '▲' : '▼'}
                                   </span>
                                 )}
                               </div>
                             </th>
                           ))}
                        </tr>
                      </thead>
                      <tbody>
                        {slicedResults.map((row, idx) => (
                          <tr 
                            key={idx} 
                            className="interactive-row"
                            style={{
                              borderBottom: '1px solid var(--border-glass)',
                              background: idx % 2 === 0 ? 'transparent' : 'var(--bg-glass)'
                            }}
                          >
                            {Object.entries(row).map(([key, val], cellIdx) => {
                               const valStr = val === null || val === undefined ? '' : String(val);
                               const isLong = valStr.length > 40;
                               const isPopoverOpen = activePopover && activePopover.rowIdx === idx && activePopover.colKey === key;

                               return (
                                 <td 
                                   key={cellIdx} 
                                   onClick={(e) => isLong && handleCellClick(e, valStr, key, idx)}
                                   className={isLong ? "expand-trigger" : ""}
                                   style={{
                                     padding: '10px 16px',
                                     color: 'var(--text-primary)',
                                     fontFamily: typeof val === 'number' ? 'var(--font-mono)' : 'inherit',
                                     minWidth: '120px',
                                     maxWidth: '300px',
                                     position: 'relative',
                                     overflow: 'visible',
                                     cursor: isLong ? 'pointer' : 'default',
                                     background: isLong && isPopoverOpen ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                                     transition: 'background-color 0.15s ease'
                                   }} 
                                 >
                                   {val === null || val === undefined ? (
                                     <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>null</span>
                                   ) : (
                                     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%' }}>
                                       <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, display: 'block' }}>
                                         {valStr}
                                       </span>
                                       {isLong && (
                                         <span className="expand-icon" style={{
                                           display: 'inline-flex',
                                           alignItems: 'center',
                                           justifyContent: 'center',
                                           background: 'var(--primary-gradient)',
                                           borderRadius: '4px',
                                           padding: '4px',
                                           color: '#fff',
                                           boxShadow: 'var(--shadow-glow)',
                                           flexShrink: 0
                                         }}>
                                           <Maximize2 size={10} />
                                         </span>
                                       )}
                                     </div>
                                   )}
                                   
                                   {/* Floating popover locally attached to cell */}
                                   {isLong && isPopoverOpen && (() => {
                                     const isNearBottom = slicedResults.length > 2 && (slicedResults.length - idx <= 5);
                                     return (
                                       <div 
                                         style={{
                                           position: 'absolute',
                                           top: isNearBottom ? 'auto' : '100%',
                                           bottom: isNearBottom ? '100%' : 'auto',
                                           left: 0,
                                           width: '320px',
                                           background: 'var(--bg-glass)',
                                           border: '1px solid var(--border-glass-glow)',
                                           boxShadow: 'var(--shadow-glow), 0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                                           borderRadius: '8px',
                                           padding: '12px 16px',
                                           color: 'var(--text-primary)',
                                           fontSize: '13px',
                                           lineHeight: '1.5',
                                           whiteSpace: 'normal',
                                           wordBreak: 'break-word',
                                           zIndex: 1000,
                                           backdropFilter: 'blur(12px)',
                                           marginTop: isNearBottom ? '0px' : '6px',
                                           marginBottom: isNearBottom ? '6px' : '0px',
                                           animation: 'fadeIn 0.1s ease-out'
                                         }}
                                         onClick={e => e.stopPropagation()}
                                       >
                                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                           <div style={{
                                             fontWeight: 600,
                                             color: 'var(--primary)',
                                             fontSize: '11px',
                                             textTransform: 'uppercase'
                                           }}>
                                             {activePopover.title}
                                           </div>
                                           <button 
                                             onClick={(e) => {
                                               e.stopPropagation();
                                               setActivePopover(null);
                                             }}
                                             style={{
                                               background: 'none',
                                               border: 'none',
                                               color: 'var(--text-secondary)',
                                               cursor: 'pointer',
                                               display: 'flex',
                                               alignItems: 'center',
                                               justifyContent: 'center',
                                               padding: '2px',
                                               borderRadius: '50%',
                                               transition: 'background 0.2s'
                                             }}
                                             onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-glass)'}
                                             onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                           >
                                             <XCircle size={14} style={{ color: 'var(--text-secondary)' }} />
                                           </button>
                                         </div>
                                         {activePopover.content}
                                       </div>
                                     );
                                   })()}
                                 </td>
                               );
                             })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '24px 0' }}>
                    No records matching active search filters.
                  </div>
                )}

                {/* Pagination footer */}
                {pageSize !== 'all' && totalPages > 1 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 4px',
                    borderTop: '1px solid var(--border-glass)',
                    marginTop: '8px',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Showing {totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalRows)} of {totalRows} records
                    </span>

                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(1)}
                        style={{
                          background: 'var(--bg-sidebar)',
                          border: '1px solid var(--border-glass)',
                          color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                          opacity: currentPage === 1 ? 0.5 : 1
                        }}
                      >
                        &lt;&lt; First
                      </button>
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        style={{
                          background: 'var(--bg-sidebar)',
                          border: '1px solid var(--border-glass)',
                          color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                          opacity: currentPage === 1 ? 0.5 : 1
                        }}
                      >
                        &lt; Prev
                      </button>
                      <span style={{ fontSize: '12px', color: 'var(--text-primary)', padding: '0 8px' }}>
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        style={{
                          background: 'var(--bg-sidebar)',
                          border: '1px solid var(--border-glass)',
                          color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                          opacity: currentPage === totalPages ? 0.5 : 1
                        }}
                      >
                        Next &gt;
                      </button>
                      <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        style={{
                          background: 'var(--bg-sidebar)',
                          border: '1px solid var(--border-glass)',
                          color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                          opacity: currentPage === totalPages ? 0.5 : 1
                        }}
                      >
                        Last &gt;&gt;
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '16px 0' }}>
                No database query execution rows returned.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
