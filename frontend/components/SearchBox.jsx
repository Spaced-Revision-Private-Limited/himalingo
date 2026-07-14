import React, { useState, useRef } from "react";

function SearchBox({ onFocus, onSubmit, mode, effectiveMode = mode, isLoggedIn }) {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null); 
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    
    if (!text.trim() && !selectedFile) return;

    if (onSubmit) {
      onSubmit(text, selectedFile, null);
    }

    setText("");
    setSelectedFile(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const startSpeech = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Browser does not support speech recognition");
    const recognition = new SpeechRecognition();
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => setText(event.results[0][0].transcript);
    recognition.start();
  };

  return (
    <div className="search-container">
      {selectedFile && (
        <div className="file-preview-badge">
          <span>📎 {selectedFile.name}</span>
          <button className="remove-btn" onClick={() => setSelectedFile(null)}>×</button>
        </div>
      )}

      <div className="search-box">
        <button 
          className="icon-btn plus" 
          onClick={() => isLoggedIn ? fileInputRef.current.click() : onFocus()} 
          type="button"
        >
          <span className="plus-icon">+</span>
        </button>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*, .pdf, .txt" 
          onChange={handleFileChange} 
        />

        <input
          type="text"
          placeholder={effectiveMode === "chat" ? "Message Himalingo..." : "Enter text to translate..."} 
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => !isLoggedIn && onFocus?.()}
          onKeyDown={handleKeyDown}
        />

        <div className="action-buttons">
          {(!text.trim() && !selectedFile) ? (
            <button 
              className={`mic-btn ${isListening ? 'is-active' : ''}`} 
              onClick={startSpeech} 
              type="button"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            </button>
          ) : (
            <button className="send-btn" onClick={handleSubmit} type="button">➔</button>
          )}
        </div>
      </div>

      <style jsx>{`
        .search-container { width: 100%; max-width: 768px; margin: 0 auto; padding: 0 15px; }
        .file-preview-badge { align-self: flex-start; background: #f4f4f4; padding: 4px 12px; border-radius: 10px; font-size: 12px; display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .search-box { display: flex; align-items: center; background: #fff; border: 1px solid #e5e5e5; border-radius: 24px; padding: 8px 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.05); }
        input { flex: 1; min-width: 0; border: none; outline: none; padding: 8px; font-size: 16px; }
        .icon-btn { flex-shrink: 0; background: none; border: none; cursor: pointer; font-size: 20px; color: #666; margin-right: 8px; }
        .action-buttons { flex-shrink: 0; display: flex; align-items: center; margin-left: 8px; }
        .send-btn { flex-shrink: 0; background: #000; color: #fff; border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .mic-btn { flex-shrink: 0; background: none; border: none; color: #666; cursor: pointer; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; padding: 0; }
        .remove-btn { border: none; background: none; cursor: pointer; font-weight: bold; color: red; }

        @media (max-width: 480px) {
          .search-box { padding: 8px 12px; }
          input { font-size: 15px; padding: 6px; }
        }
      `}</style>
    </div>
  );
}

export default SearchBox;