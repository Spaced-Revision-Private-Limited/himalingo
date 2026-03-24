"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown"; 
import Head from "next/head"; 
import Sidebar from "./components/Sidebar";
import SearchBox from "./components/SearchBox";
import Suggestions from "./components/Suggestions";
import LoginPopup from "./components/LoginPopup";
import { FaCopy, FaVolumeUp, FaCheck } from "react-icons/fa";

export default function Home() {
  // Get API URL from environment variable
  const apiUrl = process.env.REACT_APP_API_URL;
  if (!apiUrl) {
    console.error("ERROR: REACT_APP_API_URL environment variable is not set");
  }
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [history, setHistory] = useState([]);
  const [isChatting, setIsChatting] = useState(false);
  const [messages, setMessages] = useState([]);
  
  const [mode, setMode] = useState("translate"); 
  const [targetLanguage, setTargetLanguage] = useState("Nepali");
  
  const [showStatus, setShowStatus] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(null);

  const scrollRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("token");
    const email = localStorage.getItem("userEmail");
    if (token && email) {
      setLoggedIn(true);
      setUserEmail(email);
      fetchHistory(email);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchHistory = async (emailToFetch) => {
    const email = emailToFetch || userEmail;
    if (!email || !apiUrl) return;
    try {
      const response = await fetch(`${apiUrl}/history?email=${email}&t=${Date.now()}`);
      const data = await response.json();
      if (data.success) setHistory(data.history);
    } catch (err) { console.error("History fetch failed", err); }
  };

  const saveChatToHistory = async (currentMessages, chatIdToUse) => {
    if (!loggedIn || !userEmail || currentMessages.length === 0 || !apiUrl) return;
    
    try {
      const id = chatIdToUse || currentChatId;
      const firstUserMsg = currentMessages.find(m => m.role === "user")?.content || "New Chat";
      const title = firstUserMsg.length > 35 ? firstUserMsg.substring(0, 35) + "..." : firstUserMsg;
      
      await fetch(`${apiUrl}/history/save-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          chatId: id, 
          email: userEmail, 
          firstQuery: title, 
          finalResult: JSON.stringify(currentMessages), 
          mode 
        }),
      });
      fetchHistory(userEmail);
    } catch (err) { console.error("Save failed", err); }
  };

  const handleDeleteItem = async (e, chatId) => {
    if (!loggedIn || !userEmail || !apiUrl) return;
    try {
      const response = await fetch(`${apiUrl}/history/session/${chatId}?email=${userEmail}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (data.success) {
        if (currentChatId === chatId) handleNewChat();
        fetchHistory(userEmail);
      }
    } catch (err) { console.error("Failed to delete chat", err); }
  };

  const handleTogglePin = async (e, chatId, currentPinStatus) => {
    if (!loggedIn || !userEmail || !apiUrl) return;
    try {
      const response = await fetch(`${apiUrl}/history/session/${chatId}/pin?email=${userEmail}`, {
        method: "PATCH"
      });
      const data = await response.json();
      if (data.success) {
        fetchHistory(userEmail);
      }
    } catch (err) { console.error("Failed to toggle pin", err); }
  };

  const handleClearHistory = async () => {
    if (!loggedIn || !userEmail || !apiUrl) return;
    if (!window.confirm("Clear all history?")) return;
    try {
      await fetch(`${apiUrl}/history?email=${userEmail}`, { method: "DELETE" });
      setHistory([]);
      // MUST CLEAR STATE: Prevents old messages from ghosting into new chats
      setMessages([]);
      setCurrentChatId(null);
      setIsChatting(false);
    } catch (err) { console.error("Clear failed", err); }
  };

  // Text-to-Speech function
  const speakText = (text, lang) => {
    if (!('speechSynthesis' in window)) {
      alert('Your browser does not support text-to-speech');
      return;
    }
    
    // Cancel any ongoing speech first
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Wait for voices to load
    const setVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      let selectedVoice = null;
      
      console.log('[TTS] Available voices:', voices.map(v => `${v.name} (${v.lang})`));
      
      if (lang === 'Bhutia' || lang === 'Tibetan') {
        // Try Tibetan, then Hindi as fallback
        selectedVoice = voices.find(v => v.lang.includes('bo') || v.lang.includes('tib'));
        if (!selectedVoice) {
          selectedVoice = voices.find(v => v.lang.includes('hi'));
        }
      } else if (lang === 'Lepcha') {
        // Lepcha uses Hindi voice
        selectedVoice = voices.find(v => v.lang.includes('hi'));
      } else if (lang === 'Nepali') {
        selectedVoice = voices.find(v => v.lang.includes('ne'));
        if (!selectedVoice) {
          selectedVoice = voices.find(v => v.lang.includes('hi'));
        }
      } else if (lang === 'Limbu') {
        // Limbu uses Nepali or Hindi voice
        selectedVoice = voices.find(v => v.lang.includes('ne'));
        if (!selectedVoice) {
          selectedVoice = voices.find(v => v.lang.includes('hi'));
        }
      } else if (lang === 'Magar' || lang === 'Rai') {
        // Magar and Rai use Hindi voice (Devanagari script)
        selectedVoice = voices.find(v => v.lang.includes('hi'));
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('[TTS] Using voice:', selectedVoice.name);
      } else {
        console.log('[TTS] No specific voice found for', lang);
      }
      
      utterance.rate = 0.8; // Slower for clarity
      utterance.pitch = 1;
      
      window.speechSynthesis.speak(utterance);
    };
    
    // Check if voices are loaded
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      setVoiceAndSpeak();
    } else {
      // Wait for voices to load
      window.speechSynthesis.onvoiceschanged = () => {
        setVoiceAndSpeak();
      };
      // Fallback: just speak with default voice
      setTimeout(() => {
        utterance.rate = 0.8;
        window.speechSynthesis.speak(utterance);
      }, 100);
    }
  };

  // Copy to clipboard function
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  const [copiedText, setCopiedText] = useState(null);

  const handleNewChat = () => {
    setIsChatting(false);
    setMessages([]);      // MUST CLEAR: Prevents old chats from merging into new ones
    setCurrentChatId(null); // MUST CLEAR: Generates new ID for next chat
  };

  const handleSearchSubmit = async (textFromInput, imageFile, selectedLangFromSuggestion) => {
    if (!textFromInput && !imageFile) return;
    if (!loggedIn) { setLoginOpen(true); return; }
    
    // 1. FIXED MODE LOGIC - Check user intent based on query content
    let activeMode = mode;
    let currentTargetLanguage = targetLanguage;
    
    console.log('[DEBUG] handleSearchSubmit called with:', {
      textFromInput,
      selectedLangFromSuggestion,
      currentMode: mode,
      currentTargetLanguage
    });
    
    // If a suggestion was clicked, determine mode from the suggestion type
    if (selectedLangFromSuggestion !== null && selectedLangFromSuggestion !== undefined) {
      // User clicked a suggestion card - use its mode
      const isTranslation = textFromInput.toLowerCase().includes("translate");
      activeMode = isTranslation ? "translate" : "chat";
      console.log('[DEBUG] Suggestion clicked - determined mode:', { isTranslation, activeMode });
      setMode(activeMode);
      if (isTranslation) {
        setTargetLanguage(selectedLangFromSuggestion);
        currentTargetLanguage = selectedLangFromSuggestion; // Use immediately for this request
      }
    } else {
      // User typed directly - check the CURRENT MODE state
      // If mode is 'translate', ALWAYS use translate endpoint regardless of text
      activeMode = mode;
      console.log('[DEBUG] Direct input - using current mode:', activeMode);
      
      // Also ensure we're using the currently selected target language
      if (activeMode === "translate") {
        currentTargetLanguage = targetLanguage; // Use whatever is in dropdown
        console.log('[DEBUG] Using target language from state:', currentTargetLanguage);
      }
    }

    setIsChatting(true);
    const chatId = currentChatId || `chat_${Date.now()}`;
    if (!currentChatId) setCurrentChatId(chatId);

    // 2. IMAGE PREVIEW FIX
    let imagePreview = null;
    if (imageFile instanceof File || imageFile instanceof Blob) {
      try { imagePreview = URL.createObjectURL(imageFile); } catch (e) { imagePreview = null; }
    }

    const userMsg = { role: "user", content: textFromInput || "", imagePreview };
    const botPlaceholder = { role: "ai", content: "Thinking...", typing: true };
    
    // Filter out previous placeholders to prevent AI API errors
    const historyToUpload = messages.filter(m => !m.typing && m.content !== "Thinking...");
    
    const updatedMessagesWithUser = [...messages, userMsg];
    setMessages([...updatedMessagesWithUser, botPlaceholder]);

    try {
      const formData = new FormData();
      formData.append("text", textFromInput || "");
      formData.append("targetLanguage", currentTargetLanguage);
      formData.append("history", JSON.stringify(historyToUpload));
      if (imageFile instanceof File) formData.append("image", imageFile);
      
      console.log(`[DEBUG] Sending request:`, {
        text: textFromInput,
        targetLanguage: currentTargetLanguage,
        activeMode
      });
      
      // Debug what's in FormData
      console.log('[FormData] Entries:');
      for (let [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value.substring(0, 50)}...`);
      }
      
      const endpoint = activeMode === "chat" ? "/chat" : "/translate";
      console.log(`[DEBUG] Calling endpoint: ${endpoint}`);
      console.log(`[DEBUG] FormData contents:`, {
        text: textFromInput || "",
        targetLanguage: currentTargetLanguage,
        mode: activeMode
      });
      
      const response = await fetch(`${apiUrl}${endpoint}`, { 
        method: "POST", 
        body: formData 
      });
      
      const data = await response.json();
      const aiResponse = activeMode === "chat" ? data.response : data.translated;
      
      setMessages(prev => {
        const finalMessages = [...prev];
        finalMessages[finalMessages.length - 1] = { 
          role: "ai", content: aiResponse || "Error: No response.", typing: false 
        };
        saveChatToHistory(finalMessages, chatId);
        return finalMessages;
      });
    } catch (err) {
      console.error("AI Error:", err);
      setMessages(prev => {
        const errorMsgs = [...prev];
        errorMsgs[errorMsgs.length - 1] = { role: "ai", content: "AI Error: Check connection.", typing: false };
        return errorMsgs;
      });
    }
  };

  if (!mounted) return null;

  return (
    <div className="container">
      <Head><title>Himalingo</title></Head>
      <Sidebar 
        isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        loggedIn={loggedIn} userEmail={userEmail} onNewChat={handleNewChat} 
        history={history} onClearHistory={handleClearHistory}
        onDeleteItem={handleDeleteItem} onTogglePin={handleTogglePin} setLoginOpen={setLoginOpen}
        onSelectItem={(item) => { 
          setIsChatting(true); 
          setCurrentChatId(item.chatId);
          try {
            const raw = item.translatedText.trim();
            const parsed = (raw.startsWith("[") || raw.startsWith("{")) ? JSON.parse(raw) : [{role:"user", content: item.originalText}, {role:"ai", content: item.translatedText}];
            setMessages(parsed);
          } catch (e) { setMessages([{role:"user", content: item.originalText}, {role:"ai", content: item.translatedText}]); }
        }}
      />
      <main className="main">
        <div className={isChatting ? "chat-viewport" : "landing-view"} ref={scrollRef}>
          {!isChatting ? (
            <div className="landing-content">
              <h1 className="logo">Himalingo</h1>
              <div className="landing-input-wrapper">
                <SearchBox isLoggedIn={loggedIn} onSubmit={handleSearchSubmit} mode={mode} onFocus={() => setLoginOpen(true)} />
                <Suggestions 
                  onSelect={handleSearchSubmit} 
                  setMode={setMode} 
                  currentMode={mode} 
                  isChatting={false}
                  onLanguageChange={setTargetLanguage}
                />
              </div>
            </div>
          ) : (
            <div className="chat-content">
              {messages.map((msg, index) => (
                <div key={index} className={`msg-row ${msg.role === 'user' ? 'u-row' : 'a-row'}`}>
                  {msg.role === "ai" && <div className="ai-av">✨</div>}
                  <div className={msg.role === "user" ? "u-bubble" : "a-bubble"}>
                    {msg.imagePreview && <img src={msg.imagePreview} alt="upload" className="msg-img" />}
                    {msg.typing ? <div className="dots"><span></span><span></span><span></span></div> : <ReactMarkdown>{msg.content}</ReactMarkdown>}
                    
                    {/* Voice and Copy buttons for AI messages */}
                    {msg.role === "ai" && !msg.typing && (
                      <div className="action-buttons">
                        <button 
                          className="action-btn"
                          onClick={() => speakText(msg.content, targetLanguage)}
                          title="Listen to pronunciation"
                        >
                          <FaVolumeUp />
                        </button>
                        <button 
                          className="action-btn"
                          onClick={() => copyToClipboard(msg.content)}
                          title="Copy to clipboard"
                        >
                          {copiedText === msg.content ? <FaCheck style={{color: '#10b981'}} /> : <FaCopy />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {isChatting && (
          <div className="input-area-fixed">
            <div className="search-wrapper">
              <SearchBox isLoggedIn={loggedIn} onSubmit={handleSearchSubmit} mode={mode} onFocus={() => setLoginOpen(true)} />
              <p className="disclaimer">Himalingo may provide inaccurate info.</p>
            </div>
          </div>
        )}
        {loginOpen && <LoginPopup onLoginSuccess={() => { setLoggedIn(true); setLoginOpen(false); fetchHistory(); }} onClose={() => setLoginOpen(false)} />}
      </main>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Lepcha&family=Tibetan+Machine+Uni&family=Noto+Sans+Limbu&display=swap');
        
        .container { display: flex; height: 100vh; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); }
        .main { flex: 1; display: flex; flex-direction: column; margin-left: ${sidebarOpen ? '260px' : '72px'}; transition: 0.3s ease; position: relative; overflow: hidden; }
        .landing-view { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; }
        .chat-viewport { flex: 1; overflow-y: auto; display: flex; flex-direction: column; align-items: center; padding-top: 20px; }
        .landing-content { display: flex; flex-direction: column; align-items: center; width: 100%; }
        .landing-input-wrapper { width: 100%; max-width: 700px; padding: 0 20px; }
        .chat-content { width: 100%; max-width: 800px; display: flex; flex-direction: column; gap: 24px; padding: 40px 20px 180px 20px; }
        .msg-row { display: flex; gap: 12px; width: 100%; }
        .u-row { justify-content: flex-end; }
        .a-row { justify-content: flex-start; }
        .u-bubble { background: #667eea; color: white; padding: 14px 20px; border-radius: 22px 6px 22px 22px; max-width: 75%; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3); }
        .a-bubble { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); padding: 16px 20px; border-radius: 6px 22px 22px 22px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08); color: #1f2937; }
        /* Support for Bhutia (Tibetan), Lepcha, and Limbu scripts */
        .a-bubble:has(:lang(bt), :lang(lep), :lang(lif)) {
          font-family: 'Tibetan Machine Uni', 'Noto Sans Lepcha', 'Noto Sans Limbu', 'Segoe UI', sans-serif;
        }
        .input-area-fixed { position: absolute; bottom: 0; width: 100%; background: linear-gradient(transparent, #f5f7fa 50%); padding: 20px; display: flex; justify-content: center; }
        .search-wrapper { width: 100%; max-width: 720px; }
        .logo { font-size: 3.5rem; font-weight: 900; color: #1f2937; margin-bottom: 30px; }
        .disclaimer { font-size: 11px; color: #6b7280; text-align: center; margin-top: 10px; }
        .msg-img { max-width: 100%; border-radius: 10px; margin-bottom: 8px; }
        .dots span { width: 6px; height: 6px; background: #6b7280; border-radius: 50%; display: inline-block; animation: bounce 1.4s infinite; margin-right: 3px; }
        .ai-av { width: 32px; height: 32px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        
        /* Voice and Copy button styles */
        .action-buttons {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(0, 0, 0, 0.08);
        }
        .action-btn {
          background: rgba(102, 126, 234, 0.1);
          border: none;
          border-radius: 6px;
          padding: 6px 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 14px;
          color: #667eea;
          transition: all 0.2s;
        }
        .action-btn:hover {
          background: rgba(102, 126, 234, 0.2);
          transform: translateY(-1px);
        }
        .action-btn:active {
          transform: translateY(0);
        }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
      `}</style>
    </div>
  );
}