"use client";

import React, { useEffect, useRef } from "react";
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
import { useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

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

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("token");
    const email = localStorage.getItem("userEmail");
    if (token && email) {
      dispatch(loginUser({ email }));
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
      const contentType = response.headers.get("content-type");
      if (!response.ok || !contentType?.includes("application/json")) return;
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
        body: JSON.stringify({ chatId: id, email: userEmail, firstQuery: title, finalResult: JSON.stringify(currentMessages), mode }),
      });
      fetchHistory(userEmail);
    } catch (err) { console.error("Save failed", err); }
  };

  const handleDeleteItem = async (e, chatId) => {
    if (!loggedIn || !userEmail || !apiUrl) return;
    try {
      const res = await fetch(`${apiUrl}/history/session/${chatId}?email=${userEmail}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { if (currentChatId === chatId) handleNewChat(); fetchHistory(userEmail); }
    } catch (err) { console.error("Delete failed", err); }
  };

  const handleTogglePin = async (e, chatId) => {
    if (!loggedIn || !userEmail || !apiUrl) return;
    try {
      const res = await fetch(`${apiUrl}/history/session/${chatId}/pin?email=${userEmail}`, { method: "PATCH" });
      const data = await res.json();
      if (data.success) fetchHistory(userEmail);
    } catch (err) { console.error("Pin failed", err); }
  };

  const handleClearHistory = async () => {
    if (!loggedIn || !userEmail || !apiUrl) return;
    if (!window.confirm("Clear all history?")) return;
    try {
      await fetch(`${apiUrl}/history?email=${userEmail}`, { method: "DELETE" });
      setHistory([]);
      dispatch(resetChat());
    } catch (err) { console.error("Clear failed", err); }
  };

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
      const formData = new FormData();
      formData.append("text", textFromInput || "");
      formData.append("targetLanguage", "Bhutia");
      formData.append("mode", resolvedMode);
      formData.append("history", JSON.stringify(messages.filter(m => !m.typing)));
      if (imageFile) formData.append("image", imageFile);

      const endpoint = resolvedMode === "chat" ? "/chat" : "/translate";
      const response = await fetch(`${apiUrl}${endpoint}`, { method: "POST", body: formData });

      const contentType = response.headers.get("content-type");
      if (!response.ok || !contentType?.includes("application/json")) {
        throw new Error("Server returned non-JSON response.");
      }

      const data = await response.json();
      const aiResponse = resolvedMode === "chat" ? data.response : data.translated;

      dispatch(updateLastMessage({ role: "ai", content: aiResponse || "No response.", typing: false }));
      saveChatToHistory([...messages.filter(m => !m.typing), { role: "user", content: textFromInput }, { role: "ai", content: aiResponse }], chatId);

    } catch (err) {
      console.error("Submission error:", err);
      dispatch(updateLastMessage({ role: "ai", content: "Server connection failed. Make sure your backend is running on port 5000.", typing: false }));
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

          {/* ── LANDING PAGE ── */}
          {!isChatting ? (
            <div className="landing-content">

              {/* Logo + subtitle */}
              <h1 className="logo">Himalingo</h1>
              <p className="subtitle">English to Bhutia translation</p>

              {/* Search bar */}
              <div className="landing-input-wrapper">
                <SearchBox
                  isLoggedIn={loggedIn}
                  onSubmit={handleSearchSubmit}
                  mode={mode}
                  effectiveMode={mode}
                  onFocus={() => !loggedIn && setLoginOpen(true)}
                />

                {/* Chips only — no inline result */}
                <Suggestions
                  onSelect={handleSearchSubmit}
                  setMode={(m) => dispatch(setMode(m))}
                  currentMode={mode}
                  isChatting={false}
                />
              </div>
            </div>

          /* ── CHAT VIEW ── */
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

        {/* Fixed input bar while chatting */}
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
              fetchHistory(localStorage.getItem("userEmail"));
            }}
            onClose={() => setLoginOpen(false)}
          />
        )}
      </main>

      <style jsx>{`
        /* ── Layout ── */
        .container {
          display: flex;
          height: 100vh;
          background: #f8f7f4;  /* warm off-white from screenshot */
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

        /* ── Landing ── */
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

        /* ── Chat ── */
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

        /* User bubble — purple from screenshot */
        .u-bubble {
          background: #5b52e8;
          color: white;
          padding: 12px 20px;
          border-radius: 22px 6px 22px 22px;
          max-width: 72%;
          font-size: 15px;
          box-shadow: 0 3px 12px rgba(91,82,232,0.25);
        }

        /* AI bubble — white card */
        .a-bubble {
          background: #ffffff;
          padding: 14px 18px;
          border-radius: 6px 22px 22px 22px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.07);
          color: #1f2937;
          border: 0.5px solid #e5e7eb;
        }

        /* Fixed input */
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

        /* Misc */
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
