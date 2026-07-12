import React, { useState, useEffect } from 'react';
import { LayoutGrid, Settings, Plus, Sparkles, Loader2 } from 'lucide-react';
import SettingsModal from './components/SettingsModal';
import AddPCModal from './components/AddPCModal';
import ComparisonGrid from './components/ComparisonGrid';
import { supabase } from './supabaseClient';

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

// Map DB row keys to client PC build state keys
const mapDbToPc = (dbBuild) => ({
  id: dbBuild.id,
  name: dbBuild.name,
  price: dbBuild.price || '',
  cpu: dbBuild.cpu || '',
  gpu: dbBuild.gpu || '',
  ram: dbBuild.ram || '',
  storage: dbBuild.storage || '',
  motherboardSize: dbBuild.motherboard_size || 'ATX',
  motherboardName: dbBuild.motherboard_name || '',
  psu: dbBuild.psu || '',
  case: dbBuild.case || '',
  cooling: dbBuild.cooling || '',
  image: dbBuild.image || '',
  notes: dbBuild.notes || ''
});

// Map client PC build state keys to DB columns
const mapPcToDb = (pcBuild, userId) => ({
  user_id: userId,
  name: pcBuild.name,
  price: pcBuild.price,
  cpu: pcBuild.cpu,
  gpu: pcBuild.gpu,
  ram: pcBuild.ram,
  storage: pcBuild.storage,
  motherboard_size: pcBuild.motherboardSize,
  motherboard_name: pcBuild.motherboardName,
  psu: pcBuild.psu,
  case: pcBuild.case,
  cooling: pcBuild.cooling,
  image: pcBuild.image,
  notes: pcBuild.notes
});

export default function App() {
  const [pcs, setPcs] = useState([]);
  const [apiKey, setApiKey] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [highlightDifferences, setHighlightDifferences] = useState(false);

  // AI Value Analysis States
  const [baselinePcId, setBaselinePcId] = useState(null);
  const [analysisResults, setAnalysisResults] = useState({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Load builds depending on current user login state
  const loadBuilds = async (user) => {
    if (user) {
      try {
        const { data, error } = await supabase
          .from('pc_builds')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          setPcs(data.map(mapDbToPc));
        } else {
          // Cloud is empty. Check if there are any local custom builds to migrate
          const localBuildsStr = localStorage.getItem('pc_comparison_builds');
          if (localBuildsStr) {
            try {
              const localBuilds = JSON.parse(localBuildsStr);
              // Filter out the default builds so we only migrate actual custom builds
              const customBuilds = localBuilds.filter(b => !b.id.startsWith('default-'));
              
              if (customBuilds.length > 0) {
                const buildsToUpload = customBuilds.map(b => mapPcToDb(b, user.id));
                const { error: insertErr } = await supabase.from('pc_builds').insert(buildsToUpload);
                
                if (!insertErr) {
                  // Successful migration! Clear local builds and reload from cloud
                  localStorage.removeItem('pc_comparison_builds');
                  loadBuilds(user);
                  return;
                }
              }
            } catch (jsonErr) {
              console.error('Error parsing local storage builds for sync:', jsonErr);
            }
          }
          // Default to empty state if no custom builds to migrate
          setPcs([]);
        }
      } catch (err) {
        console.error('Error loading builds from Supabase:', err.message);
        setPcs([]);
      }
    } else {
      // Guest / Offline mode
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
    }
  };

  // Initialize Auth session and Listen for changes
  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setCurrentUser(user);
      loadBuilds(user);
    });

    // 2. Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setCurrentUser(user);
      loadBuilds(user);
    });

    // 3. Load Gemini API Key
    const savedKey = localStorage.getItem('pc_comparison_gemini_key');
    if (savedKey) {
      setApiKey(savedKey);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleAddPc = async (newPc) => {
    if (currentUser) {
      try {
        const dbPc = mapPcToDb(newPc, currentUser.id);
        const { data, error } = await supabase
          .from('pc_builds')
          .insert(dbPc)
          .select();

        if (error) throw error;
        if (data && data[0]) {
          setPcs([...pcs, mapDbToPc(data[0])]);
        }
      } catch (err) {
        alert('Error saving build to database: ' + err.message);
      }
    } else {
      // Guest mode: save to local state and localStorage
      const pcWithId = {
        ...newPc,
        id: 'custom-' + Date.now().toString(),
      };
      const updated = [...pcs, pcWithId];
      setPcs(updated);
      localStorage.setItem('pc_comparison_builds', JSON.stringify(updated));
    }
  };

  const handleDeletePc = async (id) => {
    if (currentUser) {
      try {
        // If it's a default build that isn't in DB, delete it locally
        if (id.startsWith('default-')) {
          setPcs(pcs.filter((pc) => pc.id !== id));
          return;
        }

        const { error } = await supabase
          .from('pc_builds')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setPcs(pcs.filter((pc) => pc.id !== id));
      } catch (err) {
        alert('Error deleting build: ' + err.message);
      }
    } else {
      // Guest mode
      const filtered = pcs.filter((pc) => pc.id !== id);
      setPcs(filtered);
      localStorage.setItem('pc_comparison_builds', JSON.stringify(filtered));
    }
  };

  const handleUpdatePc = async (id, updatedFields) => {
    if (currentUser) {
      try {
        // Default builds that aren't in DB: update locally in state only
        if (id.startsWith('default-')) {
          setPcs(pcs.map(pc => pc.id === id ? { ...pc, ...updatedFields } : pc));
          return;
        }

        const dbUpdates = {};
        if ('name' in updatedFields) dbUpdates.name = updatedFields.name;
        if ('price' in updatedFields) dbUpdates.price = updatedFields.price;
        if ('cpu' in updatedFields) dbUpdates.cpu = updatedFields.cpu;
        if ('gpu' in updatedFields) dbUpdates.gpu = updatedFields.gpu;
        if ('ram' in updatedFields) dbUpdates.ram = updatedFields.ram;
        if ('storage' in updatedFields) dbUpdates.storage = updatedFields.storage;
        if ('motherboardSize' in updatedFields) dbUpdates.motherboard_size = updatedFields.motherboardSize;
        if ('motherboardName' in updatedFields) dbUpdates.motherboard_name = updatedFields.motherboardName;
        if ('psu' in updatedFields) dbUpdates.psu = updatedFields.psu;
        if ('case' in updatedFields) dbUpdates.case = updatedFields.case;
        if ('cooling' in updatedFields) dbUpdates.cooling = updatedFields.cooling;
        if ('image' in updatedFields) dbUpdates.image = updatedFields.image;
        if ('notes' in updatedFields) dbUpdates.notes = updatedFields.notes;

        const { error } = await supabase
          .from('pc_builds')
          .update(dbUpdates)
          .eq('id', id);

        if (error) throw error;
        setPcs(pcs.map(pc => pc.id === id ? { ...pc, ...updatedFields } : pc));
      } catch (err) {
        alert('Error updating build: ' + err.message);
      }
    } else {
      // Guest mode
      const updated = pcs.map(pc => pc.id === id ? { ...pc, ...updatedFields } : pc);
      setPcs(updated);
      localStorage.setItem('pc_comparison_builds', JSON.stringify(updated));
    }
  };

  // Sync baseline selection when PC list changes
  useEffect(() => {
    if (pcs.length > 0) {
      const exists = pcs.some(pc => pc.id === baselinePcId);
      if (!exists) {
        // Fallback to first PC if baseline is invalid/unset
        setBaselinePcId(pcs[0].id);
      }
    } else {
      setBaselinePcId(null);
    }
  }, [pcs, baselinePcId]);

  const handleAnalyzeValue = async () => {
    if (!apiKey) {
      alert('AI API Key is missing! Please configure your API key in the settings panel first.');
      setIsSettingsOpen(true);
      return;
    }
    if (pcs.length < 2) {
      alert('You need at least 2 PC configurations to perform a value comparison.');
      return;
    }

    const baselinePc = pcs.find(pc => pc.id === baselinePcId) || pcs[0];
    const otherPcs = pcs.filter(pc => pc.id !== baselinePc.id);

    setIsAnalyzing(true);

    // Strip heavy base64 image data to keep payloads tiny and prevent Vercel 4.5MB limits
    const stripImage = (pc) => {
      const { image, ...cleanPc } = pc;
      return cleanPc;
    };

    const cleanBaseline = stripImage(baselinePc);
    const cleanOthers = otherPcs.map(stripImage);

    const systemPrompt = `You are a professional PC hardware value evaluator and pricing analyst.
Your task is to analyze the price-to-performance ratio of several comparison PCs against a specific 'baseline' PC.

CRITICAL EVALUATION RULES:
1. Anti-cheap bias: Do NOT favor the cheapest build just because of price. A low price with very weak components (e.g., an outdated quad-core CPU and entry-level GPU) for that price bracket represents poor value.
2. Anti-overspec bias: Do NOT favor the highest-spec build just because it has the best components. If a build costs 50% more than the baseline but only offers minor performance gains, it represents poor value.
3. Market sanity check: Assess whether the buyer could get significantly better components (e.g. better GPU/CPU) at that price point.
4. Balanced build check: Flag systems that are heavily bottlenecked (e.g. a high-end RTX 4080 paired with a low-end Core i3).
5. The baseline itself can also be evaluated. Evaluate its absolute value in your reasoning.

For each comparison PC (including the baseline PC itself), you must provide:
- A value score from 1 to 10 (where 10 is absolute best value, and 1 is heavily overpriced/terrible value).
- A verdict badge. Choose EXACTLY one of these strings: "Great Value", "Fair Price", "Slightly Overpriced", "Overpriced".
- A short 1-line reason explaining your rating (highlighting GPU/CPU power vs the cost difference compared to the baseline).

You MUST return a JSON object matching this exact schema:
{
  "pc_build_id_here": {
    "score": 8.5,
    "verdict": "Great Value",
    "reason": "Explain details here."
  }
}
Return results for ALL active PCs (including the baseline PC itself, so the user sees a score for the baseline as well!).
Respond ONLY with the JSON object. Do not include markdown wraps like \`\`\`json or explanations outside the JSON.`;

    const userPrompt = `Baseline PC details:\n${JSON.stringify(cleanBaseline, null, 2)}\n\nOther PCs to evaluate:\n${JSON.stringify(cleanOthers, null, 2)}`;

    try {
      let responseText = '';
      const isGeminiKey = apiKey.startsWith('AIzaSy');
      const isOpenRouterKey = apiKey.startsWith('sk-or-');
      const isClineKey = apiKey.startsWith('sk_');
      const isOpenAIKey = apiKey.startsWith('sk-') && !isOpenRouterKey && !isClineKey;

      if (isGeminiKey) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemPrompt}\n\nInputs:\n${userPrompt}` }] }],
              generationConfig: { responseMimeType: 'application/json' }
            })
          }
        );

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          throw new Error(errJson.error?.message || `Google API failed with status ${response.status}`);
        }

        const resData = await response.json();
        responseText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      } 
      else if (isOpenRouterKey || isOpenAIKey || isClineKey) {
        const endpoint = isOpenRouterKey 
          ? 'https://openrouter.ai/api/v1/chat/completions' 
          : isClineKey 
            ? '/api/cline'
            : 'https://api.openai.com/v1/chat/completions';
        
        const model = isOpenRouterKey 
          ? 'google/gemini-2.5-flash' 
          : isClineKey 
            ? 'deepseek/deepseek-v4-pro' 
            : 'gpt-4o-mini';

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            ...(isOpenRouterKey ? {
              'HTTP-Referer': window.location.href,
              'X-Title': 'VibeCompare'
            } : {})
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            ...((isOpenRouterKey || isOpenAIKey) ? { response_format: { type: 'json_object' } } : {})
          })
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          let errMsg = `API failed with status ${response.status}`;
          try {
            const errJson = JSON.parse(errText);
            if (errJson.error?.message) {
              errMsg += `: ${errJson.error.message}`;
            } else if (errJson.message) {
              errMsg += `: ${errJson.message}`;
            }
          } catch {
            if (errText) errMsg += `: ${errText.substring(0, 150)}`;
          }
          throw new Error(errMsg);
        }

        const resData = await response.json();
        responseText = resData.choices?.[0]?.message?.content || resData.data?.choices?.[0]?.message?.content;
      } 
      else {
        throw new Error('Unrecognized API key format. Ensure you use a Gemini key (starts with AIzaSy) or an OpenRouter/OpenAI key (starts with sk-).');
      }

      if (!responseText) {
        throw new Error('Could not get a valid response from the AI assistant.');
      }

      const cleanJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedResults = JSON.parse(cleanJsonStr);
      setAnalysisResults(parsedResults);
    } catch (err) {
      console.error(err);
      alert('AI Value Analysis failed: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveApiKey = (key) => {
    setApiKey(key);
    if (key) {
      localStorage.setItem('pc_comparison_gemini_key', key);
    } else {
      localStorage.removeItem('pc_comparison_gemini_key');
    }
  };

  const handleAuthChange = (user) => {
    setCurrentUser(user);
    loadBuilds(user);
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
          {/* Cloud sync indicator */}
          <div className="glass-card status-indicator" style={{ padding: '0.5rem 1rem', borderRadius: '10px' }}>
            <span className={`status-dot ${currentUser ? 'green' : 'red'}`} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              Cloud: {currentUser ? 'Synced' : 'Guest Mode'}
            </span>
          </div>

          {/* Settings button */}
          <button
            className="btn btn-secondary"
            onClick={() => setIsSettingsOpen(true)}
            title="Settings & Accounts"
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            {pcs.length >= 2 && (
              <button
                className="btn btn-secondary animate-pulse"
                onClick={handleAnalyzeValue}
                disabled={isAnalyzing}
                style={{
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  color: '#f3e8ff',
                  boxShadow: '0 0 12px rgba(168, 85, 247, 0.1)',
                  gap: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.5rem 1rem',
                  fontSize: '0.85rem'
                }}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    AI Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} style={{ color: '#c084fc' }} />
                    Analyze Value with AI
                  </>
                )}
              </button>
            )}

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
        </div>
      )}

      {/* Main comparison table */}
      <main style={{ flex: 1 }}>
        <ComparisonGrid
          pcs={pcs}
          onDeletePc={handleDeletePc}
          onUpdatePc={handleUpdatePc}
          highlightDifferences={highlightDifferences}
          baselinePcId={baselinePcId}
          onSetBaseline={setBaselinePcId}
          analysisResults={analysisResults}
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
        onSaveApiKey={handleSaveApiKey}
        savedApiKey={apiKey}
        currentUser={currentUser}
        onAuthChange={handleAuthChange}
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
