import React, { useState, useEffect } from 'react';
import { MdTranslate } from "react-icons/md";
import { FaComments } from "react-icons/fa";

function Suggestions({ onSelect, setMode, currentMode, isChatting, onLanguageChange }) {
  const [selectedLang, setSelectedLang] = useState("Nepali");
  
  // Force re-render when language changes (for visual confirmation)
  useEffect(() => {
    console.log('[Suggestions] Language changed to:', selectedLang);
  }, [selectedLang]);

  const suggestions = [
    {
      title: "Translate",
      desc: `English to ${selectedLang}`,
      icon: <MdTranslate />,
      mode: "translate",
      getPrompt: () => `Translate 'Hello, how are you?' to ${selectedLang}`
    },
    {
      title: "Chat",
      desc: "Ask anything",
      icon: <FaComments />,
      mode: "chat",
      prompt: "" // Empty - user will type their own question
    }
  ];

  if (isChatting) return null;

  return (
    <div className="suggestions-grid">
      {suggestions.map((item, index) => (
        <div 
          key={index} 
          className={`suggestion-card ${currentMode === item.mode ? 'active' : ''}`}
          onClick={() => {
            // Update the global mode state
            setMode(item.mode);
            
            console.log('[Suggestions] Card clicked:', item.title);
            
            // Get the prompt - use function if available (for dynamic language)
            const promptText = typeof item.getPrompt === 'function' ? item.getPrompt() : item.prompt;
            
            console.log('[Suggestions] Current selectedLang state:', selectedLang);
            
            // FIXED: Only pass the language string if the card is a 'translate' card.
            // If it's a 'chat' card, we pass null so Home doesn't force translation.
            const languageValue = item.mode === "translate" ? selectedLang : null;
            
            console.log('[Suggestions] Passing language:', languageValue, 'Prompt:', promptText);
            
            onSelect(promptText, null, languageValue); 
          }}
        >
          <div className="s-icon">{item.icon}</div>
          <div className="s-content">
            <div className="s-title">
              {item.title === "Translate" ? (
                <div className="lang-header" onClick={(e) => e.stopPropagation()}>
                  <span>Translate to </span>
                  <select 
                    className="lang-select"
                    value={selectedLang}
                    onChange={(e) => {
                      const newLang = e.target.value;
                      console.log('[Dropdown] Changing language from', selectedLang, 'to', newLang);
                      setSelectedLang(newLang);
                      // Also update parent component's targetLanguage
                      if (onLanguageChange) {
                        onLanguageChange(newLang);
                      }
                      // Force immediate re-render
                      setTimeout(() => {}, 0);
                    }}
                    title="Select language for translation"
                  >
                    <option value="Nepali">Nepali</option>
                    <option value="Bhutia">Bhutia</option>
                    <option value="Lepcha">Lepcha</option>
                    <option value="Limbu">Limbu</option>
                    <option value="Magar">Magar</option>
                    <option value="Rai">Rai</option>
                  </select>
                  <span style={{fontSize: '10px', marginLeft: '4px'}}>→ {selectedLang}</span>
                </div>
              ) : (
                <>
                  <span>{item.title}</span>
                </>
              )}
            </div>
            <p className="s-desc">{item.desc}</p>
          </div>
        </div>
      ))}

      <style jsx>{`
        .suggestions-grid {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-top: 20px;
          width: 100%;
        }
        .lang-header {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .lang-select {
          background: #f1f3f7;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
          color: #4b5563;
          padding: 1px 4px;
          cursor: pointer;
          outline: none;
        }
        .suggestion-card.active .lang-select {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border-color: rgba(255, 255, 255, 0.3);
        }
        .suggestion-card {
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(8px);
          padding: 8px 16px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1.5px solid transparent;
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 190px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }
        .suggestion-card:hover {
          background: #fff;
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
        }
        .suggestion-card.active {
          background: #fff;
          border-color: #667eea;
          transform: scale(1.03);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
        }
        .suggestion-card.active .s-title {
          color: #667eea;
        }
        .suggestion-card.active .s-icon {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .lang-header {
          display: flex !important;
          align-items: center;
          gap: 6px;
          visibility: visible !important;
        }
        .lang-select {
          display: inline-block !important;
          visibility: visible !important;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          color: white;
          padding: 4px 28px 4px 8px;
          cursor: pointer;
          outline: none;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
          transition: all 0.2s ease;
          appearance: auto !important;
          -webkit-appearance: auto !important;
        }
        .lang-select:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .lang-select option {
          background: #1f2937;
          color: white;
          padding: 8px;
          font-size: 12px;
        }
        .suggestion-card.active .lang-select {
          background: rgba(159, 16, 16, 0.2);
          color: white;
          border-color: rgba(255, 255, 255, 0.3);
        }
        .s-icon {
          font-size: 16px;
          background: #f1f3f7;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.2s ease;
        }
        .s-title {
          font-size: 13px;
          font-weight: 700;
          font-family: 'Inter', sans-serif;
          margin: 0;
          color: #374151;
        }
        .s-desc {
          font-size: 10px;
          color: #9ca3af;
          margin: 0;
        }
        @media (max-width: 480px) {
          .suggestions-grid {
            flex-direction: column;
            align-items: center;
          }
          .suggestion-card { width: 80%; }
        }
      `}</style>
    </div>
  );
}

export default Suggestions;