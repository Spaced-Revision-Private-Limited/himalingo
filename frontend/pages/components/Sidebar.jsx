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
  onTogglePin
}) {

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    window.location.reload();
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-top">
        <div className="sidebar-header">
          {isOpen && <span className="brand">Himalingo</span>}
          <button className="toggle-btn" onClick={toggleSidebar}>
            {isOpen ? '◀' : '▶'}
          </button>
        </div>
        
        {/* We keep the components exactly as they were, but control visibility via className */}
        <button className={`new-chat-btn ${!loggedIn ? 'hidden-element' : ''}`} onClick={onNewChat}>
          <span className="plus-icon">+</span>
          {isOpen && "New Chat"}
        </button>

        {!loggedIn && (
          <button className="login-btn-top" onClick={() => setLoginOpen(true)}>
            <span className="icon">👤</span>
            {isOpen && "Log in"}
          </button>
        )}
      </div>

      {/* We keep this div active so logic doesn't break, but hide it visually */}
      <div className={`sidebar-history ${!loggedIn ? 'hidden-element' : ''}`}>
        <div className="history-header">
          {isOpen && <p className="history-label">Recent History</p>}
          {isOpen && history && history.length > 0 && (
            <button className="clear-btn" onClick={onClearHistory}>Clear All</button>
          )}
        </div>

        {isOpen && history && history.length > 0 ? (
          // Sort: pinned items first, then by date
          [...history].sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.updatedAt) - new Date(a.updatedAt);
          }).map((item, index) => (
            <div 
              key={index} 
              className={`history-item ${item.pinned ? 'pinned' : ''}`}
              onClick={() => onSelectItem(item)}
            >
              <span className="type-icon">{item.mode === 'chat' ? '💬' : '🌐'}</span>
              <span className="history-text" title={item.firstQuery || item.originalText}>
                {item.firstQuery || item.originalText}
              </span>
              
              {isOpen && (
                <div className="history-actions">
                  <button 
                    className="pin-item-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(e, item.chatId, item.pinned);
                    }}
                    title={item.pinned ? "Unpin" : "Pin to top"}
                  >
                    {item.pinned ? '📌' : '📍'}
                  </button>
                  <button 
                    className="delete-item-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteItem(e, item.chatId);
                    }}
                    title="Delete this history"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          isOpen && <p className="empty-msg">No history yet</p>
        )}
      </div>

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

      <style jsx>{`
        /* ADD THIS CLASS TO HIDE ELEMENTS WITHOUT REMOVING THEM FROM LOGIC */
        .hidden-element {
          display: none !important;
        }

        .sidebar {
          height: 100vh;
          // background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          border-right: 1px solid rgba(0, 0, 0, 0.08);
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 100;
          overflow: hidden;
          box-shadow: 0 0 25px rgba(0, 0, 0, 0.05);
          background-color:#F9FAFB;
        }
        .sidebar.open { width: 260px; }
        .sidebar.closed { width: 72px; }
        .sidebar-top { padding: 16px; display: flex; flex-direction: column; gap: 12px; flex-shrink: 0; }
        .sidebar-header { display: flex; align-items: center; justify-content: space-between; height: 40px; margin-bottom: 10px; }
        .brand { 
  font-weight: 800; 
  font-size: 1.5rem; 
  background: linear-gradient(135deg, black, #08030d 100%); 
  -webkit-background-clip: text; 
  -webkit-text-fill-color: transparent; 
}
        .toggle-btn { background: none; border: none; cursor: pointer; padding: 8px; border-radius: 8px; color: #6b7280; }
        .toggle-btn:hover { background: rgba(102, 126, 234, 0.1); color: #667eea; }
        .new-chat-btn, .login-btn-top {
          width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px;
          cursor: pointer; font-weight: 500; font-size: 14px; transition: all 0.3s ease; border: none;
        }
        // .new-chat-btn { background: #fff; border: 3px solid rgba(102, 126, 234, 0.2); color: #1a1a1a; }
        // .new-chat-btn:hover { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; transform: translateY(-2px); }
        .plus-icon{
  font-size: 24px;
  font-weight: 600;
  line-height: 1;
  margin-right: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
        .login-btn-top { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .sidebar-history { flex: 1; overflow-y: auto; padding: 0 16px; margin-top: 10px; }
        .history-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 4px; }
        .history-label { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
        .clear-btn { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border: none; color: white; font-size: 11px; cursor: pointer; padding: 4px 10px; border-radius: 10px; }
        .history-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 12px; cursor: pointer; font-size: 14px; transition: 0.3s; margin-bottom: 6px; background: rgba(255, 255, 255, 0.7); border: 1px solid rgba(0, 0, 0, 0.05); position: relative; }
        .history-item.pinned { background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: white; border-color: #f59e0b; }
        .history-item:hover { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; transform: translateX(5px); }
        .history-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #4b5563; flex: 1; }
        .history-item:hover .history-text { color: white; }
        .history-actions { display: flex; gap: 4px; }
        .pin-item-btn, .delete-item-btn { background: transparent; border: none; color: #9ca3af; font-size: 18px; cursor: pointer; padding: 0 5px; opacity: 0; transition: opacity 0.2s; }
        .history-item:hover .pin-item-btn, .history-item:hover .delete-item-btn { opacity: 1; color: white; }
        .pin-item-btn:hover, .delete-item-btn:hover { transform: scale(1.2); color: #ff4d4d !important; }
        .sidebar-bottom { padding: 16px; border-top: 1px solid rgba(0, 0, 0, 0.08); background: #f9f9f9; }
        .user-profile { display: flex; align-items: center; gap: 12px; }
        .user-avatar { width: 36px; height: 36px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; }
        .user-email { font-size: 12px; color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .signout-btn { background: none; border: none; color: #ef4444; font-size: 11px; cursor: pointer; padding: 0; font-weight: 600; }
        .sidebar-history::-webkit-scrollbar { width: 4px; }
        .sidebar-history::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .empty-msg { font-size: 13px; color: #9ca3af; text-align: center; margin-top: 20px; }
      `}</style>
    </div>
  );
}

export default Sidebar;