import React, { useState } from 'react';
import { Trash2, Cpu, HardDrive, Cpu as GpuIcon, Disc, Layers, Zap, Box, Thermometer, FileText, Edit2 } from 'lucide-react';

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

export default function ComparisonGrid({ pcs, onDeletePc, onUpdatePc, highlightDifferences }) {
  const [editingPcId, setEditingPcId] = useState(null);
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

  const handleSaveNotes = (pcId) => {
    onUpdatePc(pcId, { notes: editingText });
    setEditingPcId(null);
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
                    <div className="pc-title-row">
                      <div>
                        <h3 className="pc-name">{pc.name}</h3>
                        <p className="pc-price">${pc.price || '0.00'}</p>
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

                    return (
                      <td
                        key={pc.id}
                        className={isDifferent ? 'diff-cell-highlight' : ''}
                      >
                        {isMbSize ? (
                          <span className={`badge ${getBadgeClass(rawVal)}`}>
                            {cleanVal}
                          </span>
                        ) : key === 'notes' ? (
                          editingPcId === pc.id ? (
                            <input
                              type="text"
                              className="form-input"
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onBlur={() => handleSaveNotes(pc.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveNotes(pc.id);
                                if (e.key === 'Escape') setEditingPcId(null);
                              }}
                              autoFocus
                              style={{
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.85rem',
                                width: '100%',
                                background: 'rgba(7, 9, 19, 0.8)'
                              }}
                            />
                          ) : (
                            <div
                              onClick={() => { setEditingPcId(pc.id); setEditingText(pc.notes || ''); }}
                              style={{
                                cursor: 'pointer',
                                minHeight: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                borderRadius: '6px',
                                padding: '0.25rem 0.5rem',
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px dashed rgba(255, 255, 255, 0.1)'
                              }}
                              title="Click to edit notes"
                            >
                              <span style={{
                                fontSize: '0.85rem',
                                color: pc.notes ? 'var(--text-primary)' : 'var(--text-muted)',
                                fontStyle: pc.notes ? 'normal' : 'italic',
                                wordBreak: 'break-word',
                                paddingRight: '0.5rem'
                              }}>
                                {pc.notes || 'Click to add notes...'}
                              </span>
                              <Edit2 size={12} style={{ color: 'var(--text-muted)', opacity: 0.5, flexShrink: 0 }} />
                            </div>
                          )
                        ) : (
                          cleanVal || <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
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
