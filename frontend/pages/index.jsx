"use client";

import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setTargetLanguage,
  setMode,
  addMessage,
  updateLastMessage,
  setMessages,
  setIsChatting,
  setCurrentChatId,
  loginUser,
  resetChat,
} from "../appSlice";
import ReactMarkdown from "react-markdown";
import Head from "next/head";
import Sidebar from "../components/Sidebar";
import SearchBox from "../components/SearchBox";
import Suggestions from "../components/Suggestions";
import LoginPopup from "../components/LoginPopup";
import { FaCopy, FaVolumeUp, FaCheck } from "react-icons/fa";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function Home() {
  const dispatch = useDispatch();

  const targetLanguage = useSelector(s => s.app.targetLanguage);
  const mode           = useSelector(s => s.app.mode);
  const messages       = useSelector(s => s.app.messages);
  const isChatting     = useSelector(s => s.app.isChatting);
  const currentChatId  = useSelector(s => s.app.currentChatId);
  const loggedIn       = useSelector(s => s.app.loggedIn);
  const userEmail      = useSelector(s => s.app.userEmail);

  const [mounted, setMounted]         = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loginOpen, setLoginOpen]     = useState(false);
  const [history, setHistory]         = useState([]);
  const [copiedText, setCopiedText]   = useState(null);

  const scrollRef = useRef(null);

  // ── 1. Initial Application Setup ─────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("token");
    const email = localStorage.getItem("userEmail");
    if (token && email) {
      dispatch(loginUser({ email }));
      fetchHistory(); 
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ── 2. Secure History Database Sync ─────────────────────────────────────
  const fetchHistory = async () => {
    if (!apiUrl) return;
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`${apiUrl}/api/history?t=${Date.now()}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok || !contentType?.includes("application/json")) return;
      
      const data = await response.json();
      if (data.success) {
        setHistory(data.history || []);
      }
    } catch (err) { 
      console.error("History fetch failed", err); 
    }
  };

  // ── 3. Session Management Triggers ──────────────────────────────────────
  const handleDeleteItem = async (e, chatId) => {
    if (!loggedIn || !apiUrl) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiUrl}/api/history/session/${chatId}`, { 
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) { 
        if (currentChatId === chatId) handleNewChat(); 
        fetchHistory(); 
      }
    } catch (err) { console.error("Delete failed", err); }
  };

  const handleTogglePin = async (e, chatId) => {
    if (!loggedIn || !apiUrl) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiUrl}/api/history/session/${chatId}/pin`, { 
        method: "PATCH",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) fetchHistory();
    } catch (err) { console.error("Pin failed", err); }
  };

  const handleClearHistory = async () => {
    if (!loggedIn || !apiUrl) return;
    if (!window.confirm("Clear all history?")) return;
    try {
      const token = localStorage.getItem("token");
      await fetch(`${apiUrl}/api/history`, { 
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      setHistory([]);
      dispatch(resetChat());
    } catch (err) { console.error("Clear failed", err); }
  };

  // ── 4. Form Submission Flow ─────────────────────────────────────────────
  const handleSearchSubmit = async (textFromInput, imageFile, selectedLangFromSuggestion) => {
    if (!textFromInput && !imageFile) return;
    if (!loggedIn) { setLoginOpen(true); return; }

    const resolvedLang = selectedLangFromSuggestion || targetLanguage || "Bhutia";
    const isTranslate  = textFromInput?.toLowerCase().includes("translate") || mode === "translate";
    const resolvedMode = isTranslate ? "translate" : "chat";

    dispatch(setIsChatting(true));
    const chatId = currentChatId || `chat_${Date.now()}`;
    if (!currentChatId) dispatch(setCurrentChatId(chatId));

    dispatch(addMessage({ role: "user", content: textFromInput || "" }));
    dispatch(addMessage({ role: "ai", content: "Thinking...", typing: true }));

    try {
      const token = localStorage.getItem("token"); 

      const formData = new FormData();
      formData.append("text", textFromInput || "");
      formData.append("targetLanguage", resolvedLang);
      formData.append("mode", resolvedMode);
      formData.append("chatId", chatId); 
      formData.append("history", JSON.stringify(messages.filter(m => !m.typing)));
      if (imageFile) formData.append("image", imageFile);

      const endpoint = resolvedMode === "chat" ? "/api/chat" : "/api/translate"; 
      const response = await fetch(`${apiUrl}${endpoint}`, { 
        method: "POST", 
        body: formData,
        headers: { "Authorization": `Bearer ${token}` }
      });

      // 1. Parse JSON first safely inside scope
      const data = await response.json();

      // 2. Evaluate backend middleware schema outcome
      if (!response.ok || data.success === false) {
        const backendError = data.error || "Validation failed on server.";
        
        dispatch(updateLastMessage({ 
          role: "ai", 
          content: `⚠️ **Validation Error:** ${backendError}`, 
          typing: false 
        }));
        
        dispatch(setIsChatting(false)); 
        return; 
      }

      // 3. Render content block if validation passes
      const aiResponse = resolvedMode === "chat" ? data.response : data.translated;
      dispatch(updateLastMessage({ role: "ai", content: aiResponse || "No response.", typing: false }));
      fetchHistory();

    } catch (err) {
      console.error("Submission error:", err);
      dispatch(updateLastMessage({ role: "ai", content: "Server connection failed.", typing: false }));
    }
  };

  // ── 5. Accessibility Audio/Text Helpers ─────────────────────────────────
  const speakText = (text) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.includes("hi") || v.lang.includes("ne"));
    if (voice) utterance.voice = voice;
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    });
  };

  const handleNewChat = () => { dispatch(resetChat()); };

  if (!mounted) return null;

  return (
    <div className="container">
      <Head><title>Himalingo</title></Head>

      <Sidebar
        isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        loggedIn={loggedIn} userEmail={userEmail} onNewChat={handleNewChat}
        history={history} onClearHistory={handleClearHistory}
        onDeleteItem={handleDeleteItem} onTogglePin={handleTogglePin}
        setLoginOpen={setLoginOpen}
        onSelectItem={(item) => {
          dispatch(setIsChatting(true));
          dispatch(setCurrentChatId(item.chatId));
          dispatch(setMode(item.mode || "chat"));
          try {
            const raw = item.translatedText.trim();
            const parsed = (raw.startsWith("[") || raw.startsWith("{"))
              ? JSON.parse(raw)
              : [{ role: "user", content: item.originalText }, { role: "ai", content: item.translatedText }];
            dispatch(setMessages(parsed));
          } catch {
            dispatch(setMessages([{ role: "user", content: item.originalText }, { role: "ai", content: item.translatedText }]));
          }
        }}
      />

      <main className="main">
        <div className={isChatting ? "chat-viewport" : "landing-view"} ref={scrollRef}>

          {/* ── LANDING PAGE VIEW ── */}
          {!isChatting ? (
            <div className="landing-content">
              <h1 className="logo">Himalingo</h1>
              <p className="subtitle">English to Bhutia translation</p>

              <div className="landing-input-wrapper">
                <SearchBox
                  isLoggedIn={loggedIn}
                  onSubmit={handleSearchSubmit}
                  mode={mode}
                  effectiveMode={mode}
                  onFocus={() => !loggedIn && setLoginOpen(true)}
                />

                <Suggestions
                  onSelect={handleSearchSubmit}
                  setMode={(m) => dispatch(setMode(m))}
                  currentMode={mode}
                  isChatting={false}
                />
              </div>
            </div>

          /* ── ACTIVE CHAT SCREEN VIEW ── */
          ) : (
            <div className="chat-content">
              {messages.map((msg, index) => (
                <div key={index} className={`msg-row ${msg.role === "user" ? "u-row" : "a-row"}`}>
                  {msg.role === "ai" && <div className="ai-av">✨</div>}
                  <div className={msg.role === "user" ? "u-bubble" : "a-bubble"}>
                    {msg.imagePreview && <img src={msg.imagePreview} alt="upload" className="msg-img" />}
                    {msg.typing
                      ? <div className="dots"><span/><span/><span/></div>
                      : <ReactMarkdown>{msg.content}</ReactMarkdown>}
                    {msg.role === "ai" && !msg.typing && (
                      <div className="action-buttons">
                        <button className="action-btn" onClick={() => speakText(msg.content)} title="Listen"><FaVolumeUp /></button>
                        <button className="action-btn" onClick={() => copyToClipboard(msg.content)} title="Copy">
                          {copiedText === msg.content ? <FaCheck style={{ color: "#10b981" }} /> : <FaCopy />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Floating Bottom Input Dock */}
        {isChatting && (
          <div className="input-area-fixed">
            <div className="search-wrapper">
              <SearchBox
                isLoggedIn={loggedIn}
                onSubmit={handleSearchSubmit}
                mode={mode}
                effectiveMode={mode}
                onFocus={() => !loggedIn && setLoginOpen(true)}
              />
              <p className="disclaimer">Himalingo may provide inaccurate info.</p>
            </div>
          </div>
        )}

        {loginOpen && (
          <LoginPopup
            onLoginSuccess={() => {
              dispatch(loginUser({ email: localStorage.getItem("userEmail") }));
              setLoginOpen(false);
              fetchHistory();
            }}
            onClose={() => setLoginOpen(false)}
          />
        )}
      </main>

      <style jsx>{`
        .container {
          display: flex;
          height: 100vh;
          background: #f8f7f4; 
        }
        .main {
          flex: 1;
          display: flex;
          flex-direction: column;
          margin-left: ${sidebarOpen ? "260px" : "72px"};
          transition: margin-left 0.3s ease;
          position: relative;
          overflow: hidden;
          background: #f8f7f4;
        }
        .landing-view {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
        }
        .landing-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
        }
        .logo {
          font-size: 3.8rem;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 8px;
          letter-spacing: -1px;
        }
        .subtitle {
          font-size: 15px;
          color: #6b7280;
          margin-bottom: 28px;
          font-weight: 400;
        }
        .landing-input-wrapper {
          width: 100%;
          max-width: 600px;
          padding: 0 20px;
        }
        .chat-viewport {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 20px;
        }
        .chat-content {
          width: 100%;
          max-width: 760px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 40px 20px 180px 20px;
        }
        .msg-row { display: flex; gap: 12px; width: 100%; }
        .u-row   { justify-content: flex-end; }
        .a-row   { justify-content: flex-start; }

        .u-bubble {
          background: #5b52e8;
          color: white;
          padding: 12px 20px;
          border-radius: 22px 6px 22px 22px;
          max-width: 72%;
          font-size: 15px;
          box-shadow: 0 3px 12px rgba(91,82,232,0.25);
        }
        .a-bubble {
          background: #ffffff;
          padding: 14px 18px;
          border-radius: 6px 22px 22px 22px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.07);
          color: #1f2937;
          border: 0.5px solid #e5e7eb;
        }
        .input-area-fixed {
          position: absolute;
          bottom: 0;
          width: 100%;
          background: linear-gradient(transparent, #f8f7f4 55%);
          padding: 20px;
          display: flex;
          justify-content: center;
        }
        .search-wrapper { width: 100%; max-width: 700px; }
        .disclaimer { font-size: 11px; color: #9ca3af; text-align: center; margin-top: 8px; }
        .msg-img { max-width: 100%; border-radius: 10px; margin-bottom: 8px; }
        .ai-av {
          width: 30px; height: 30px;
          background: white;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
          flex-shrink: 0;
          font-size: 14px;
        }
        .action-buttons {
          display: flex; gap: 8px;
          margin-top: 10px; padding-top: 10px;
          border-top: 1px solid #f3f4f6;
        }
        .action-btn {
          background: #f3f4f6;
          border: none; border-radius: 6px;
          padding: 5px 10px; cursor: pointer;
          display: flex; align-items: center; gap: 4px;
          font-size: 13px; color: #667eea;
          transition: all 0.2s;
        }
        .action-btn:hover { background: #ede9fe; transform: translateY(-1px); }
        .dots span {
          width: 6px; height: 6px; background: #9ca3af;
          border-radius: 50%; display: inline-block;
          animation: bounce 1.4s infinite; margin-right: 3px;
        }
        .dots span:nth-child(2) { animation-delay: 0.2s; }
        .dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-5px); }
        }

        @media (max-width: 768px) {
          .main { margin-left: ${sidebarOpen ? "260px" : "0"}; }
          .chat-content { padding: 20px 12px 160px 12px; }
        }
      `}</style>
    </div>
  );
}