
import React from 'react';

function Sidebar({
  isOpen,
  toggleSidebar,
  loggedIn,
  userEmail,
  onNewChat,
  history,
  onSelectItem,
  setLoginOpen,
  onClearHistory,
  onDeleteItem,
  onTogglePin,
}) {

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    window.location.reload();
  };

  return (
    <>
      {isOpen && <div className="backdrop" onClick={toggleSidebar} />}

      <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>

        {/* TOP BAR — ChatGPT style */}
        <div className="sidebar-top">
          <div className="top-row">
            <button className="icon-btn" onClick={toggleSidebar} title="Toggle sidebar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            {isOpen && <span className="brand">Himalingo</span>}
            {isOpen && (
              <button className="icon-btn" onClick={onNewChat} title="New chat">
                {/* <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg> */}
              </button>
            )}
          </div>
          {!isOpen && (
            <button className="icon-btn centered" onClick={onNewChat} title="New chat">
              {/* <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14"/>
              </svg> */}
            </button>
          )}
          {!loggedIn && isOpen && (
            <button className="login-btn-top" onClick={() => setLoginOpen(true)}>
              <span>👤</span>
              Log in
            </button>
          )}
        </div>

        {/* HISTORY — keep exactly as before */}
        <div className={`sidebar-history ${!loggedIn ? 'hidden-element' : ''}`}>
          <div className="history-header">
            {isOpen && <p className="history-label">Recent History</p>}
            {isOpen && history && history.length > 0 && (
              <button className="clear-btn" onClick={onClearHistory}>Clear All</button>
            )}
          </div>

          {isOpen && history && history.length > 0 ? (
            [...history].sort((a, b) => {
              if (a.pinned && !b.pinned) return -1;
              if (!a.pinned && b.pinned) return 1;
              return new Date(b.updatedAt) - new Date(a.updatedAt);
            }).map((item, index) => (
              <div
                key={item.chatId || index}
                className={`history-item ${item.pinned ? 'pinned' : ''}`}
                onClick={() => onSelectItem(item)}
              >
                <span className="history-text" title={item.firstQuery || item.originalText}>
                  {item.firstQuery || item.originalText}
                </span>
                <div className="history-actions">
                  <button
                    className="pin-btn"
                    onClick={(e) => { e.stopPropagation(); onTogglePin(e, item.chatId, item.pinned); }}
                    title={item.pinned ? "Unpin" : "Pin"}
                  >📌</button>
                  <button
                    className="delete-btn"
                    onClick={(e) => { e.stopPropagation(); onDeleteItem(e, item.chatId); }}
                    title="Delete"
                  >🗑️</button>
                </div>
              </div>
            ))
          ) : (
            isOpen && <p className="empty-msg">No history yet</p>
          )}
        </div>

        {/* BOTTOM — user profile */}
        {loggedIn && (
          <div className="sidebar-bottom">
            <div className="user-profile">
              <div className="user-avatar">{userEmail?.charAt(0).toUpperCase()}</div>
              {isOpen && (
                <div className="user-details">
                  <span className="user-email">{userEmail}</span>
                  <button className="signout-btn" onClick={handleSignOut}>Sign out</button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      <style jsx>{`
        .hidden-element { display: none !important; }

        .backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.3);
          z-index: 150;
        }

        /* Sidebar — white like before */
        .sidebar {
          height: 100vh;
          border-right: 1px solid rgba(0,0,0,0.08);
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          z-index: 200;
          background: #F9FAFB;
          transition: width 0.3s ease;
          overflow: hidden;
          box-shadow: 0 0 25px rgba(0,0,0,0.05);
        }
        .sidebar.open  { width: 260px; }
        .sidebar.closed { width: 60px; }

        /* TOP BAR */
        .sidebar-top {
          padding: 10px 8px;
          flex-shrink: 0;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          background: #F9FAFB;
        }
        .top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 40px;
        }

        /* Icon buttons */
        .icon-btn {
          background: none;
          border: none;
          color: #374151;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .icon-btn:hover { background: rgba(0,0,0,0.06); color: #111827; }
        .icon-btn.centered {
          width: 100%;
          margin-top: 6px;
        }

        .brand {
          font-weight: 800;
          font-size: 1.2rem;
          background: linear-gradient(135deg, #111827, #374151);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          flex: 1;
          padding-left: 10px;
        }

        .login-btn-top {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          margin-top: 8px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          border: none;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .login-btn-top:hover { opacity: 0.9; }

        /* HISTORY */
        .sidebar-history {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }
        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 4px;
          margin-bottom: 4px;
        }
        .history-label {
          font-size: 11px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .clear-btn {
          background: none;
          border: none;
          color: #6b7280;
          font-size: 11px;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 6px;
        }
        .clear-btn:hover { color: #ef4444; background: #fee2e2; }

        .history-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 12px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 13px;
          color: #4b5563;
          transition: all 0.2s;
          margin-bottom: 2px;
          background: rgba(255,255,255,0.7);
          border: 1px solid rgba(0,0,0,0.04);
        }
        .history-item:hover {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          transform: translateX(4px);
          border-color: transparent;
        }
        .history-item.pinned {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: white;
          border-color: transparent;
        }
        .history-text {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .history-actions { display: none; gap: 2px; }
        .history-item:hover .history-actions { display: flex; }
        .history-item.pinned .history-actions { display: flex; }
        .pin-btn, .delete-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 12px;
          padding: 2px 3px;
          border-radius: 4px;
          opacity: 0.8;
        }
        .pin-btn:hover, .delete-btn:hover { opacity: 1; }

        .empty-msg {
          font-size: 13px;
          color: #9ca3af;
          text-align: center;
          margin-top: 20px;
        }

        /* BOTTOM */
        .sidebar-bottom {
          padding: 12px;
          border-top: 1px solid rgba(0,0,0,0.08);
          background: #f9f9f9;
        }
        .user-profile {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          border-radius: 8px;
          cursor: pointer;
        }
        .user-profile:hover { background: rgba(0,0,0,0.05); }
        .user-avatar {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 13px;
          flex-shrink: 0;
        }
        .user-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow: hidden;
        }
        .user-email {
          font-size: 12px;
          color: #374151;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .signout-btn {
          background: none;
          border: none;
          color: #ef4444;
          font-size: 11px;
          cursor: pointer;
          padding: 0;
          font-weight: 600;
        }

        .session-stat {
          margin: 0 12px 8px 12px;
          padding: 8px 12px;
          background: linear-gradient(135deg, #faf5ff, #f0f9ff);
          border: 1px solid #e9d5ff;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          color: #7c3aed;
          text-align: center;
        }

        .sidebar-history::-webkit-scrollbar { width: 4px; }
        .sidebar-history::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

        @media (max-width: 768px) {
          .sidebar.closed { width: 0; }
        }
        @media (max-width: 480px) {
          .sidebar.open { width: 85vw; }
        }
      `}</style>
    </>
  );
}

export default Sidebar;
