import React, { useState } from 'react';

function LoginPopup({ onLoginSuccess, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Use 3002 to match your backend
    const endpoint = isLogin ? "/api/login" : "/api/signup";
    const url = `http://localhost:3002${endpoint}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }), // Sending as JSON object
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userEmail", email);
        onLoginSuccess();
      } else {
        setError(data.message || "Authentication failed");
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError("Server is offline. Please ensure backend is running on port 3002.");
    }
  };

  return (
    <div className="popup-overlay">
      <div className="popup-card">
        <button className="close-x" onClick={onClose}>&times;</button>
        <h2>{isLogin ? "Welcome Back" : "Create Account"}</h2>
        <form onSubmit={handleSubmit}>
          <input 
            type="email" 
            placeholder="Email Address" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
             <input 
            type="Confirm password" 
            placeholder=" Confirm Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="submit-btn">
            {isLogin ? "Login" : "Sign Up"}
          </button>
        </form>
        <p className="toggle-text">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <span onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? " Sign Up" : " Login"}
          </span>
        </p>
      </div>

      <style jsx>{`
        .popup-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.5); display: flex; align-items: center;
          justify-content: center; z-index: 1000; backdrop-filter: blur(4px);
        }
        .popup-card {
          background: white; padding: 40px; border-radius: 20px;
          width: 100%; max-width: 400px; position: relative;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }
        .close-x {
          position: absolute; top: 15px; right: 20px; background: none;
          border: none; font-size: 24px; cursor: pointer; color: #666;
        }
        h2 { margin-bottom: 20px; text-align: center; color: #1a1a1a; }
        input {
          width: 100%; padding: 12px; margin-bottom: 15px;
          border: 1px solid #ddd; border-radius: 10px; font-size: 16px;
        }
        .submit-btn {
          width: 100%; padding: 12px; border-radius: 10px; border: none;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white; font-weight: 600; cursor: pointer; transition: 0.3s;
        }
        .submit-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .error-msg { color: #ef4444; font-size: 13px; margin-bottom: 10px; text-align: center; }
        .toggle-text { text-align: center; margin-top: 20px; font-size: 14px; color: #666; }
        .toggle-text span { color: #667eea; cursor: pointer; font-weight: 600; }
      `}</style>
    </div>
  );
}

export default LoginPopup;