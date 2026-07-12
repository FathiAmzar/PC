import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, AlertTriangle, Upload, Eye, Image as ImageIcon, CheckCircle, Loader2 } from 'lucide-react';

const INITIAL_FORM = {
  name: '',
  price: '',
  cpu: '',
  gpu: '',
  ram: '',
  storage: '',
  motherboardSize: 'ATX',
  motherboardName: '',
  psu: '',
  case: '',
  cooling: '',
  image: '',
  notes: ''
};

export default function AddPCModal({ isOpen, onClose, onAdd, apiKey }) {
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' or 'ai'
  const [aiSubTab, setAiSubTab] = useState('text'); // 'text' or 'image'
  const [formData, setFormData] = useState(INITIAL_FORM);
  
  // AI related states
  const [descText, setDescText] = useState('');
  const [aiImageBase64, setAiImageBase64] = useState('');
  const [aiImagePreview, setAiImagePreview] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fileInputRef = useRef(null);
  const pcImageInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setFormData(INITIAL_FORM);
      setDescText('');
      setAiImageBase64('');
      setAiImagePreview('');
      setErrorMsg('');
      setSuccessMsg('');
      setActiveTab('manual');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handler for direct image upload for the PC build preview
  const handlePcImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handler for uploading image to analyze with Gemini
  const handleAiImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result.split(',')[1];
        setAiImageBase64(base64Data);
        setAiImagePreview(reader.result);
        setErrorMsg('');
      };
      reader.readAsDataURL(file);
    }
  };

  const parseWithGemini = async () => {
    if (!apiKey) {
      setErrorMsg('API Key is missing. Please set your API Key in the settings first.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const systemPrompt = `You are a specialized PC Hardware Expert assistant.
Analyze the user's input (which can be a text description of a PC or an image of a PC spec sheet / invoices / hardware photo) and extract the technical specifications.
Translate any terms to match standard industry definitions. For the motherboard size, choose ONLY from these values: "Mini-ITX", "Micro-ATX", "ATX", "E-ATX" based on standard motherboard specs (if unclear, make a highly educated guess based on the motherboard model name, e.g. B650M is Micro-ATX, B650-I is Mini-ITX, X670E Hero is ATX).
Return the specifications as a JSON object matching this exact schema:
{
  "name": "A short descriptive name of this build (e.g. RTX 4070 Ti Gaming PC)",
  "price": "Price as a clean number (e.g. 1850 or 0 if not provided/found)",
  "cpu": "CPU processor name (e.g. AMD Ryzen 7 7800X3D)",
  "gpu": "GPU graphics card (e.g. NVIDIA RTX 4080 Super)",
  "ram": "RAM size and speed/type (e.g. 32GB DDR5 6000MHz CL30)",
  "storage": "Storage capacity and type (e.g. 2TB NVMe SSD)",
  "motherboardSize": "Must be one of: 'Mini-ITX', 'Micro-ATX', 'ATX', 'E-ATX'",
  "motherboardName": "Full motherboard model name (e.g. ASUS ROG STRIX B650E-E GAMING WIFI)",
  "psu": "PSU wattage and rating (e.g. Corsair RM850x 850W 80+ Gold)",
  "case": "PC Case model (e.g. Lian Li O11 Dynamic EVO)",
  "cooling": "CPU cooling setup (e.g. NZXT Kraken Elite 360 AIO)",
  "notes": "Any special notes or status info parsed from listing description (e.g. 'sold', 'pickup only', 'negotiable', or empty if none)"
}
Respond ONLY with the JSON object. Do not include markdown formatting like \`\`\`json or explanations.`;

    try {
      let responseText = '';
      const isGeminiKey = apiKey.startsWith('AIzaSy');
      const isOpenRouterKey = apiKey.startsWith('sk-or-');
      const isAnthropicKey = apiKey.startsWith('sk-ant-');
      const isClineKey = apiKey.startsWith('sk_');
      const isOpenAIKey = apiKey.startsWith('sk-') && !isOpenRouterKey && !isAnthropicKey;

      if (isGeminiKey) {
        // Direct Google Gemini API Call
        let contents = [];
        if (aiSubTab === 'text') {
          if (!descText.trim()) throw new Error('Please type or paste some PC description text first.');
          contents = [{ parts: [{ text: `${systemPrompt}\n\nUser text input:\n${descText}` }] }];
        } else {
          if (!aiImageBase64) throw new Error('Please upload an image for analysis first.');
          contents = [
            {
              parts: [
                { text: systemPrompt },
                { inlineData: { mimeType: 'image/jpeg', data: aiImageBase64 } }
              ]
            }
          ];
        }

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
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
        // OpenRouter, OpenAI, or Cline API Call
        let endpoint = '';
        let model = '';

        if (isOpenRouterKey) {
          endpoint = 'https://openrouter.ai/api/v1/chat/completions';
          model = 'google/gemini-2.5-flash';
        } else if (isClineKey) {
          endpoint = 'https://corsproxy.io/?https://api.cline.bot/api/v1/chat/completions';
          model = 'deepseek/deepseek-v4-pro';
        } else {
          endpoint = 'https://api.openai.com/v1/chat/completions';
          model = 'gpt-4o-mini';
        }

        let messagesContent = [];
        if (aiSubTab === 'text') {
          if (!descText.trim()) throw new Error('Please type or paste some PC description text first.');
          messagesContent.push({ type: 'text', text: `${systemPrompt}\n\nUser text input:\n${descText}` });
        } else {
          if (!aiImageBase64) throw new Error('Please upload an image for analysis first.');
          messagesContent.push({ type: 'text', text: systemPrompt });
          messagesContent.push({
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${aiImageBase64}` }
          });
        }

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
            messages: [{ role: 'user', content: messagesContent }],
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
            if (errText) {
              errMsg += `: ${errText.substring(0, 150)}`;
            }
          }
          throw new Error(errMsg);
        }

        const resData = await response.json();
        responseText = resData.choices?.[0]?.message?.content;
        
        if (!responseText) {
          console.warn('AI Response Data (no content choices):', resData);
          throw new Error(`Could not get a valid response content from the AI. Response structure: ${JSON.stringify(resData).substring(0, 180)}`);
        }
      } 
      else if (isAnthropicKey) {
        throw new Error('Anthropic Claude API keys (sk-ant-...) cannot be used directly in the browser due to CORS security restrictions. Please use a Gemini key (starting with AIzaSy) or an OpenRouter key (starting with sk-or-).');
      } 
      else {
        throw new Error('Unrecognized API key format. Ensure you use a Gemini key (starts with AIzaSy) or an OpenRouter/OpenAI key (starts with sk-).');
      }

      if (!responseText) {
        throw new Error('Could not get a valid response from the AI assistant.');
      }

      // Safe JSON parse
      let parsedSpecs = {};
      try {
        const cleanJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedSpecs = JSON.parse(cleanJsonStr);
      } catch (parseErr) {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedSpecs = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Failed to parse specification JSON from AI response.');
        }
      }

      // Populate form data
      setFormData((prev) => ({
        ...prev,
        name: parsedSpecs.name || prev.name || 'AI Generated PC',
        price: parsedSpecs.price || prev.price || '',
        cpu: parsedSpecs.cpu || prev.cpu || '',
        gpu: parsedSpecs.gpu || prev.gpu || '',
        ram: parsedSpecs.ram || prev.ram || '',
        storage: parsedSpecs.storage || prev.storage || '',
        motherboardSize: ['Mini-ITX', 'Micro-ATX', 'ATX', 'E-ATX'].includes(parsedSpecs.motherboardSize)
          ? parsedSpecs.motherboardSize
          : prev.motherboardSize,
        motherboardName: parsedSpecs.motherboardName || prev.motherboardName || '',
        psu: parsedSpecs.psu || prev.psu || '',
        case: parsedSpecs.case || prev.case || '',
        cooling: parsedSpecs.cooling || prev.cooling || '',
        notes: parsedSpecs.notes || prev.notes || '',
      }));

      setSuccessMsg('Specs successfully generated! Switched to Manual tab for review.');
      setTimeout(() => {
        setActiveTab('manual');
        setSuccessMsg('');
      }, 1000);

    } catch (err) {
      setErrorMsg(err.message || 'An unknown error occurred during parsing.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('PC Name is required.');
      setActiveTab('manual');
      return;
    }
    onAdd(formData);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add PC Build</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close add PC modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ paddingBottom: '1rem' }}>
          {/* Main Modal Tabs */}
          <div className="ai-tabs" style={{ marginBottom: '1.5rem' }}>
            <button
              type="button"
              className={`ai-tab ${activeTab === 'manual' ? 'active' : ''}`}
              onClick={() => setActiveTab('manual')}
            >
              Manual Specifications
            </button>
            <button
              type="button"
              className={`ai-tab ${activeTab === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
            >
              <Sparkles size={14} style={{ color: 'var(--primary)' }} />
              Gemini AI Auto-fill
            </button>
          </div>

          {/* AI tab Content */}
          {activeTab === 'ai' && (
            <div className="ai-section animate-scaleIn">
              {!apiKey ? (
                <div className="alert-banner alert-banner-warning" style={{ margin: 0 }}>
                  <AlertTriangle size={18} className="alert-banner-icon" />
                  <div>
                    <strong>API Key Missing:</strong> You must configure a Gemini API key in the settings panel (top right) before using the AI features.
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    <button
                      type="button"
                      className={`btn btn-secondary btn-sm ${aiSubTab === 'text' ? 'btn-primary' : ''}`}
                      onClick={() => setAiSubTab('text')}
                      style={{ flex: 1 }}
                    >
                      Text Description
                    </button>
                    <button
                      type="button"
                      className={`btn btn-secondary btn-sm ${aiSubTab === 'image' ? 'btn-primary' : ''}`}
                      onClick={() => setAiSubTab('image')}
                      style={{ flex: 1 }}
                    >
                      Spec Photo / Screenshot
                    </button>
                  </div>

                  {aiSubTab === 'text' ? (
                    <div className="form-group">
                      <label htmlFor="ai-text-desc" className="form-label">
                        Paste build specs or description
                      </label>
                      <textarea
                        id="ai-text-desc"
                        rows={4}
                        className="form-input"
                        placeholder="Example: Gaming rig with Ryzen 5 7600X, MSI B650 motherboard (ATX), G.Skill 32GB RAM, Corsair 4000D case, RTX 4070, cost around $1300..."
                        value={descText}
                        onChange={(e) => setDescText(e.target.value)}
                        disabled={isLoading}
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                  ) : (
                    <div className="form-group">
                      <label className="form-label">Upload image (Invoice, spec sheet, or build photo)</label>
                      {!aiImagePreview ? (
                        <div
                          className="dropzone"
                          onClick={() => fileInputRef.current?.click()}
                          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('active'); }}
                          onDragLeave={(e) => e.currentTarget.classList.remove('active')}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove('active');
                            const file = e.dataTransfer.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setAiImageBase64(reader.result.split(',')[1]);
                                setAiImagePreview(reader.result);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        >
                          <Upload size={32} style={{ color: 'var(--text-muted)' }} />
                          <span className="dropzone-text">Drag and drop spec photo, or click to browse</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Supports JPG, PNG</span>
                          <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept="image/*"
                            onChange={handleAiImageUpload}
                          />
                        </div>
                      ) : (
                        <div className="image-preview-container">
                          <img src={aiImagePreview} alt="Spec sheet to analyze" className="image-preview" />
                          <button
                            type="button"
                            className="remove-preview-btn"
                            onClick={() => {
                              setAiImagePreview('');
                              setAiImageBase64('');
                            }}
                            title="Remove image"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {errorMsg && (
                    <div style={{ color: 'var(--error)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', gap: '0.375rem', alignItems: 'center', marginBottom: '1rem' }}>
                      <AlertTriangle size={14} />
                      {errorMsg}
                    </div>
                  )}

                  {successMsg && (
                    <div style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', gap: '0.375rem', alignItems: 'center', marginBottom: '1rem' }}>
                      <CheckCircle size={14} />
                      {successMsg}
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: '100%', gap: '0.5rem' }}
                    onClick={parseWithGemini}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Analyzing specs with Gemini...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Parse with Gemini AI
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Form manual inputs */}
          <form onSubmit={handleSubmit}>
            {activeTab === 'manual' && (
              <div className="animate-scaleIn" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="pc-name-input" className="form-label">
                      Build Name *
                    </label>
                    <input
                      id="pc-name-input"
                      name="name"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Cyberpunk Overlord V2"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="pc-price-input" className="form-label">
                      Price ($ USD)
                    </label>
                    <input
                      id="pc-price-input"
                      name="price"
                      type="text"
                      className="form-input"
                      placeholder="e.g. 1499"
                      value={formData.price}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="pc-mb-size" className="form-label">
                      Motherboard Size
                    </label>
                    <select
                      id="pc-mb-size"
                      name="motherboardSize"
                      className="form-input"
                      value={formData.motherboardSize}
                      onChange={handleInputChange}
                    >
                      <option value="Mini-ITX">Mini-ITX (Compact, 17x17cm)</option>
                      <option value="Micro-ATX">Micro-ATX (Medium, 24.4x24.4cm)</option>
                      <option value="ATX">ATX (Standard, 30.5x24.4cm)</option>
                      <option value="E-ATX">E-ATX (Enthusiast, 30.5x33cm)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="pc-mb-name" className="form-label">
                      Motherboard Model
                    </label>
                    <input
                      id="pc-mb-name"
                      name="motherboardName"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Gigabyte B650 Aorus Elite AX"
                      value={formData.motherboardName}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="pc-cpu" className="form-label">
                      CPU
                    </label>
                    <input
                      id="pc-cpu"
                      name="cpu"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Intel Core i7-14700K"
                      value={formData.cpu}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="pc-gpu" className="form-label">
                      GPU
                    </label>
                    <input
                      id="pc-gpu"
                      name="gpu"
                      type="text"
                      className="form-input"
                      placeholder="e.g. RTX 4070 Ti Super"
                      value={formData.gpu}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="pc-ram" className="form-label">
                      RAM
                    </label>
                    <input
                      id="pc-ram"
                      name="ram"
                      type="text"
                      className="form-input"
                      placeholder="e.g. 32GB DDR5 6000MHz"
                      value={formData.ram}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="pc-storage" className="form-label">
                      Storage
                    </label>
                    <input
                      id="pc-storage"
                      name="storage"
                      type="text"
                      className="form-input"
                      placeholder="e.g. 2TB Gen4 M.2 NVMe SSD"
                      value={formData.storage}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="pc-psu" className="form-label">
                      Power Supply (PSU)
                    </label>
                    <input
                      id="pc-psu"
                      name="psu"
                      type="text"
                      className="form-input"
                      placeholder="e.g. 850W 80+ Gold Modular"
                      value={formData.psu}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="pc-cooling" className="form-label">
                      Cooling
                    </label>
                    <input
                      id="pc-cooling"
                      name="cooling"
                      type="text"
                      className="form-input"
                      placeholder="e.g. 360mm AIO Liquid Cooler"
                      value={formData.cooling}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="pc-case" className="form-label">
                      Case / Chassis
                    </label>
                    <input
                      id="pc-case"
                      name="case"
                      type="text"
                      className="form-input"
                      placeholder="e.g. HYTE Y70 Touch"
                      value={formData.case}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="pc-image-upload" className="form-label">
                      Build Photo
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="file"
                        ref={pcImageInputRef}
                        style={{ display: 'none' }}
                        accept="image/*"
                        onChange={handlePcImageUpload}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, height: '40px' }}
                        onClick={() => pcImageInputRef.current?.click()}
                      >
                        <Upload size={16} />
                        Upload Build Photo
                      </button>
                      {formData.image && (
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid var(--border-glass)',
                          display: 'flex',
                          alignItems: 'center',
                          justify: 'center',
                          background: '#0f1222'
                        }} title="Photo Preview">
                          <img src={formData.image} alt="uploaded build preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                  <label htmlFor="pc-notes-input" className="form-label">
                    Personal Notes (e.g. Location, Availability, Seller status)
                  </label>
                  <textarea
                    id="pc-notes-input"
                    name="notes"
                    rows={2}
                    className="form-input"
                    placeholder="e.g. Sold already, or too far away in the city"
                    value={formData.notes}
                    onChange={handleInputChange}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>
            )}

            <div className="modal-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                Add Build
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
