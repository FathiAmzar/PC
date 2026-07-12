import React, { useState } from 'react';
import { Trash2, Cpu, HardDrive, Cpu as GpuIcon, Disc, Layers, Zap, Box, Thermometer, FileText, Edit2, Sparkles } from 'lucide-react';

const SPEC_ROWS = [
  { key: 'cpu', label: 'CPU', icon: Cpu },
  { key: 'gpu', label: 'GPU', icon: GpuIcon },
  { key: 'ram', label: 'RAM', icon: Disc },
  { key: 'storage', label: 'Storage', icon: HardDrive },
  { key: 'motherboardSize', label: 'Motherboard Size', icon: Layers },
  { key: 'motherboardName', label: 'Motherboard Model', icon: Layers },
  { key: 'psu', label: 'Power Supply', icon: Zap },
  { key: 'case', label: 'Case / Chassis', icon: Box },
  { key: 'cooling', label: 'CPU Cooler', icon: Thermometer },
  { key: 'notes', label: 'Personal Notes', icon: FileText },
];

export default function ComparisonGrid({ 
  pcs, 
  onDeletePc, 
  onUpdatePc, 
  highlightDifferences, 
  baselinePcId, 
  onSetBaseline, 
  analysisResults 
}) {
  const [editingCell, setEditingCell] = useState(null); // { pcId, key }
  const [editingText, setEditingText] = useState('');

  const getBadgeClass = (size = '') => {
    const s = size.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (s.includes('miniitx') || s.includes('itx')) return 'badge-itx';
    if (s.includes('microatx') || s.includes('matx') || s.includes('m-atx')) return 'badge-matx';
    if (s.includes('eatx') || s.includes('extendedatx')) return 'badge-eatx';
    if (s.includes('atx')) return 'badge-atx';
    return '';
  };

  const getCleanSizeLabel = (size = '') => {
    const s = size.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (s.includes('miniitx') || s.includes('itx')) return 'Mini-ITX';
    if (s.includes('microatx') || s.includes('matx') || s.includes('m-atx')) return 'Micro-ATX';
    if (s.includes('eatx') || s.includes('extendedatx')) return 'E-ATX';
    if (s.includes('atx')) return 'ATX';
    return size || 'Unknown';
  };

  // Helper to determine if a spec is different across all active PCs
  const checkRowDifference = (key) => {
    if (pcs.length <= 1) return false;
    const values = pcs.map(pc => {
      let val = pc[key];
      if (key === 'motherboardSize') {
        val = getCleanSizeLabel(val);
      }
      return (val || '').toString().trim().toLowerCase();
    });
    return new Set(values).size > 1;
  };

  const handleCellClick = (pcId, key, currentVal) => {
    setEditingCell({ pcId, key });
    setEditingText(currentVal || '');
  };

  const handleSaveCell = (pcId, key) => {
    onUpdatePc(pcId, { [key]: editingText.trim() });
    setEditingCell(null);
  };

  if (pcs.length === 0) {
    return (
      <div className="empty-state glass-card">
        <Box size={48} className="empty-icon" />
        <h3 className="empty-title">No PCs Added Yet</h3>
        <p className="empty-desc">
          Add some PC configurations to compare them side-by-side! You can enter specs manually or let Gemini AI parse them automatically.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="comparison-container glass-card">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Specification</th>
              {pcs.map((pc) => (
                <th key={pc.id} className="pc-header-cell">
                  <div className="pc-card-header">
                    <div className="pc-image-container">
                      {pc.image ? (
                        <img src={pc.image} alt={pc.name} className="pc-image" />
                      ) : (
                        <div className="pc-image-placeholder">
                          <Box size={32} />
                          <span style={{ fontSize: '0.8rem' }}>No Build Photo</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Baseline Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem', width: '100%', justifyContent: 'flex-start' }}>
                      {baselinePcId === pc.id ? (
                        <span 
                          style={{ 
                            fontSize: '0.7rem', 
                            background: 'rgba(245, 158, 11, 0.15)', 
                            color: '#f59e0b', 
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            cursor: 'default'
                          }}
                        >
                          ★ Baseline
                        </span>
                      ) : (
                        <button
                          onClick={() => onSetBaseline(pc.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            fontSize: '0.7rem',
                            padding: '2px 8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            borderRadius: '6px',
                            border: '1px dashed var(--border-glass)',
                            transition: 'all 0.2s'
                          }}
                          title="Set as baseline for value comparison"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#f59e0b';
                            e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.4)';
                            e.currentTarget.style.background = 'rgba(245, 158, 11, 0.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--text-muted)';
                            e.currentTarget.style.borderColor = 'var(--border-glass)';
                            e.currentTarget.style.background = 'none';
                          }}
                        >
                          ☆ Set Baseline
                        </button>
                      )}
                    </div>

                    <div className="pc-title-row">
                      <div style={{ flex: 1 }}>
                        {/* PC Name Inline Edit */}
                        {editingCell?.pcId === pc.id && editingCell?.key === 'name' ? (
                          <input
                            type="text"
                            className="form-input"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onBlur={() => handleSaveCell(pc.id, 'name')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveCell(pc.id, 'name');
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            autoFocus
                            style={{
                              padding: '0.25rem 0.5rem',
                              fontSize: '1rem',
                              fontWeight: 700,
                              background: 'rgba(7, 9, 19, 0.8)',
                              color: '#fff',
                              marginBottom: '0.25rem',
                              width: '90%'
                            }}
                          />
                        ) : (
                          <h3 
                            className="pc-name"
                            onClick={() => handleCellClick(pc.id, 'name', pc.name)}
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                            title="Click to edit name"
                          >
                            {pc.name}
                            <Edit2 size={10} style={{ opacity: 0.3 }} />
                          </h3>
                        )}

                        {/* PC Price Inline Edit */}
                        {editingCell?.pcId === pc.id && editingCell?.key === 'price' ? (
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ color: 'var(--secondary)', marginRight: '4px', fontWeight: 800 }}>$</span>
                            <input
                              type="text"
                              className="form-input"
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onBlur={() => handleSaveCell(pc.id, 'price')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveCell(pc.id, 'price');
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              autoFocus
                              style={{
                                padding: '0.15rem 0.35rem',
                                fontSize: '0.9rem',
                                background: 'rgba(7, 9, 19, 0.8)',
                                color: 'var(--secondary)',
                                fontWeight: 800,
                                width: '70%'
                              }}
                            />
                          </div>
                        ) : (
                          <p 
                            className="pc-price"
                            onClick={() => handleCellClick(pc.id, 'price', pc.price)}
                            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                            title="Click to edit price"
                          >
                            ${pc.price || '0.00'}
                            <Edit2 size={10} style={{ opacity: 0.3 }} />
                          </p>
                        )}
                      </div>
                      <button
                        className="delete-pc-btn"
                        onClick={() => onDeletePc(pc.id)}
                        title="Delete PC Configuration"
                        aria-label={`Delete ${pc.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Direct comparison rows */}
            {SPEC_ROWS.map(({ key, label, icon: Icon }) => {
              const isDifferent = highlightDifferences && checkRowDifference(key);
              return (
                <tr key={key}>
                  <th>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Icon size={16} style={{ color: 'var(--primary)' }} />
                      <span>{label}</span>
                    </div>
                  </th>
                  {pcs.map((pc) => {
                    const isMbSize = key === 'motherboardSize';
                    const rawVal = pc[key];
                    const cleanVal = isMbSize ? getCleanSizeLabel(rawVal) : rawVal;
                    const isEditing = editingCell?.pcId === pc.id && editingCell?.key === key;

                    return (
                      <td
                        key={pc.id}
                        className={isDifferent ? 'diff-cell-highlight' : ''}
                      >
                        {isEditing ? (
                          isMbSize ? (
                            <select
                              className="form-input"
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onBlur={() => handleSaveCell(pc.id, 'motherboardSize')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveCell(pc.id, 'motherboardSize');
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              autoFocus
                              style={{
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.85rem',
                                width: '100%',
                                background: 'rgba(7, 9, 19, 0.8)',
                                color: '#fff'
                              }}
                            >
                              <option value="Mini-ITX">Mini-ITX</option>
                              <option value="Micro-ATX">Micro-ATX</option>
                              <option value="ATX">ATX</option>
                              <option value="E-ATX">E-ATX</option>
                            </select>
                          ) : (
                            <input
                              type="text"
                              className="form-input"
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onBlur={() => handleSaveCell(pc.id, key)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveCell(pc.id, key);
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              autoFocus
                              style={{
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.85rem',
                                width: '100%',
                                background: 'rgba(7, 9, 19, 0.8)',
                                color: '#fff'
                              }}
                            />
                          )
                        ) : (
                          <div
                            onClick={() => handleCellClick(pc.id, key, rawVal)}
                            style={{
                              cursor: 'pointer',
                              minHeight: '28px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              borderRadius: '6px',
                              padding: '0.25rem 0.5rem',
                              background: 'rgba(255, 255, 255, 0.02)',
                              border: '1px dashed rgba(255, 255, 255, 0.06)'
                            }}
                            title={`Click to edit ${label}`}
                          >
                            {isMbSize ? (
                              <span className={`badge ${getBadgeClass(rawVal)}`}>
                                {cleanVal}
                              </span>
                            ) : (
                              <span style={{
                                fontSize: '0.85rem',
                                color: rawVal ? 'var(--text-primary)' : 'var(--text-muted)',
                                fontStyle: rawVal ? 'normal' : 'italic',
                                wordBreak: 'break-word',
                                paddingRight: '0.5rem'
                              }}>
                                {rawVal || 'Click to edit...'}
                              </span>
                            )}
                            <Edit2 size={10} style={{ color: 'var(--text-muted)', opacity: 0.4, flexShrink: 0 }} />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* AI Analysis Row 1: Score */}
            {pcs.length >= 2 && (
              <tr>
                <th>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={16} style={{ color: '#c084fc' }} />
                    <span>AI Value Score</span>
                  </div>
                </th>
                {pcs.map((pc) => {
                  const result = analysisResults[pc.id];
                  const hasScore = result?.score !== undefined;
                  const score = hasScore ? parseFloat(result.score) : 0;
                  return (
                    <td key={pc.id}>
                      {hasScore ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', fontWeight: 800 }}>
                          <span style={{ 
                            fontSize: '1.15rem', 
                            color: score >= 8.0 ? '#34d399' : score >= 6.5 ? '#60a5fa' : score >= 5.0 ? '#fbbf24' : '#f87171'
                          }}>
                            {score.toFixed(1)}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>/ 10</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            )}

            {/* AI Analysis Row 2: Verdict */}
            {pcs.length >= 2 && (
              <tr>
                <th>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={16} style={{ color: '#c084fc' }} />
                    <span>AI Value Verdict</span>
                  </div>
                </th>
                {pcs.map((pc) => {
                  const result = analysisResults[pc.id];
                  let badgeStyle = {};
                  if (result?.verdict) {
                    const v = result.verdict.toLowerCase();
                    if (v.includes('great')) {
                      badgeStyle = { background: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' };
                    } else if (v.includes('fair')) {
                      badgeStyle = { background: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' };
                    } else if (v.includes('slight')) {
                      badgeStyle = { background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' };
                    } else if (v.includes('overpriced')) {
                      badgeStyle = { background: 'rgba(239, 68, 68, 0.12)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' };
                    }
                  }
                  return (
                    <td key={pc.id}>
                      {result?.verdict ? (
                        <span 
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            letterSpacing: '0.02em',
                            textTransform: 'uppercase',
                            ...badgeStyle
                          }}
                        >
                          {result.verdict}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            )}

            {/* AI Analysis Row 3: Explanation */}
            {pcs.length >= 2 && (
              <tr>
                <th>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={16} style={{ color: '#c084fc' }} />
                    <span>AI Analysis Details</span>
                  </div>
                </th>
                {pcs.map((pc) => {
                  const result = analysisResults[pc.id];
                  return (
                    <td key={pc.id} style={{ verticalAlign: 'top' }}>
                      {result?.reason ? (
                        <p style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-secondary)',
                          lineHeight: '1.45',
                          textAlign: 'left',
                          maxWidth: '280px',
                          margin: '0.25rem auto 0 auto',
                          wordBreak: 'break-word'
                        }}>
                          {result.reason}
                        </p>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>
                          Click 'Analyze Value with AI' above to compare.
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Motherboard Dimension Quick-Guide Section */}
      <div className="glass-card" style={{ padding: '1.5rem 2rem' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={16} style={{ color: 'var(--secondary)' }} />
          Motherboard Form Factor Comparison
        </h4>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          fontSize: '0.85rem'
        }}>
          <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', borderLeft: '3px solid var(--itx-color)' }}>
            <strong style={{ color: 'var(--itx-color)' }}>Mini-ITX</strong>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>170 x 170 mm</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Ultra-compact builds, limited PCI-e slots.</p>
          </div>
          <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', borderLeft: '3px solid var(--matx-color)' }}>
            <strong style={{ color: 'var(--matx-color)' }}>Micro-ATX</strong>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>244 x 244 mm</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Compact/Mid-tower, great value sweetspot.</p>
          </div>
          <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', borderLeft: '3px solid var(--atx-color)' }}>
            <strong style={{ color: 'var(--atx-color)' }}>ATX</strong>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>305 x 244 mm</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Standard full-size size, maximum expansion.</p>
          </div>
          <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', borderLeft: '3px solid var(--eatx-color)' }}>
            <strong style={{ color: 'var(--eatx-color)' }}>E-ATX</strong>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>305 x 330 mm</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Extended enthusiast sizes, dual socket support.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
