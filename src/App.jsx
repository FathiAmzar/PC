import React, { useState, useEffect } from 'react';
import { LayoutGrid, Settings, Plus, Sparkles } from 'lucide-react';
import SettingsModal from './components/SettingsModal';
import AddPCModal from './components/AddPCModal';
import ComparisonGrid from './components/ComparisonGrid';

const INITIAL_BUILDS = [
  {
    id: 'default-1',
    name: 'Neon Corsair Titan',
    price: '3299',
    cpu: 'Intel Core i9-14900K',
    gpu: 'NVIDIA RTX 4090 24GB',
    ram: '64GB DDR5 6400MHz',
    storage: '4TB NVMe SSD PCIe 5.0',
    motherboardSize: 'ATX',
    motherboardName: 'ASUS ROG Maximus Z790 Hero',
    psu: '1200W 80+ Platinum',
    case: 'Lian Li O11 Dynamic EVO XL',
    cooling: 'Corsair iCUE Link H150i AIO',
    image: '/pc_gaming.png'
  },
  {
    id: 'default-2',
    name: 'Mini Walnut Zen',
    price: '1650',
    cpu: 'AMD Ryzen 7 7800X3D',
    gpu: 'NVIDIA RTX 4070 Super 12GB',
    ram: '32GB DDR5 6000MHz',
    storage: '2TB NVMe SSD PCIe 4.0',
    motherboardSize: 'Mini-ITX',
    motherboardName: 'ASUS ROG Strix B650-I Gaming Wifi',
    psu: '750W SFX 80+ Gold',
    case: 'Fractal Design Terra (Walnut)',
    cooling: 'Noctua NH-L9a-AM5 Low Profile',
    image: '/pc_compact.png'
  }
];

export default function App() {
  const [pcs, setPcs] = useState([]);
  const [apiKey, setApiKey] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [highlightDifferences, setHighlightDifferences] = useState(false);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedPcs = localStorage.getItem('pc_comparison_builds');
    if (savedPcs) {
      try {
        setPcs(JSON.parse(savedPcs));
      } catch (e) {
        setPcs(INITIAL_BUILDS);
      }
    } else {
      setPcs(INITIAL_BUILDS);
    }

    const savedKey = localStorage.getItem('pc_comparison_gemini_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  // Save PCs to localStorage when they change
  const savePcs = (newPcs) => {
    setPcs(newPcs);
    localStorage.setItem('pc_comparison_builds', JSON.stringify(newPcs));
  };

  const handleAddPc = (newPc) => {
    const pcWithId = {
      ...newPc,
      id: Date.now().toString(),
    };
    savePcs([...pcs, pcWithId]);
  };

  const handleDeletePc = (id) => {
    const filtered = pcs.filter((pc) => pc.id !== id);
    savePcs(filtered);
  };

  const handleSaveApiKey = (key) => {
    setApiKey(key);
    if (key) {
      localStorage.setItem('pc_comparison_gemini_key', key);
    } else {
      localStorage.removeItem('pc_comparison_gemini_key');
    }
  };

  return (
    <div className="container">
      {/* Header bar */}
      <header className="header-section">
        <div className="logo-container">
          <LayoutGrid className="logo-icon" size={28} />
          <h1 className="logo-text">VibeCompare</h1>
        </div>

        <div className="controls-bar">
          {/* Key status indicator */}
          <div className="glass-card status-indicator" style={{ padding: '0.5rem 1rem', borderRadius: '10px' }}>
            <span className={`status-dot ${apiKey ? 'green' : 'red'}`} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              Gemini AI: {apiKey ? 'Ready' : 'Not Configured'}
            </span>
          </div>

          {/* Settings button */}
          <button
            className="btn btn-secondary"
            onClick={() => setIsSettingsOpen(true)}
            title="Open Settings"
          >
            <Settings size={18} />
            Settings
          </button>

          {/* Add build button */}
          <button
            className="btn btn-primary"
            onClick={() => setIsAddOpen(true)}
          >
            <Plus size={18} />
            Add PC Build
          </button>
        </div>
      </header>

      {/* Toolbar / control row */}
      {pcs.length > 0 && (
        <div className="glass-card" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.5rem',
          marginBottom: '2rem',
          borderRadius: '16px',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Comparing <strong>{pcs.length}</strong> {pcs.length === 1 ? 'configuration' : 'configurations'}
          </span>

          <div
            className={`toggle-container ${highlightDifferences ? 'toggle-active' : ''}`}
            onClick={() => setHighlightDifferences(!highlightDifferences)}
          >
            <div className="toggle-track">
              <div className="toggle-thumb" />
            </div>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Highlight Differences</span>
          </div>
        </div>
      )}

      {/* Main comparison table */}
      <main style={{ flex: 1 }}>
        <ComparisonGrid
          pcs={pcs}
          onDeletePc={handleDeletePc}
          highlightDifferences={highlightDifferences}
        />
      </main>

      {/* Footer */}
      <footer style={{ marginTop: '4rem', padding: '2rem 0', textAlign: 'center', borderTop: '1px solid var(--border-glass)' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          VibeCompare PC Spec Comparison Engine. Powered by Gemini AI.
        </p>
      </footer>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveApiKey}
        savedKey={apiKey}
      />

      <AddPCModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={handleAddPc}
        apiKey={apiKey}
      />
    </div>
  );
}
