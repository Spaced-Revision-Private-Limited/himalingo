
"use client";
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api` || "http://localhost:5000";

export default function AdminDashboard() {
    const [currentView, setCurrentView] = useState("dashboard");
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    
    const [authError, setAuthError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });
    const [authLoading, setAuthLoading] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("adminToken");
        if (token) {
            setIsLoggedIn(true);
        } else {
            setIsLoggedIn(false);
            setLoading(false);
        }
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem("adminToken");
            const res = await axios.get(`${apiUrl}/admin/all-data`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) setData(res.data.translations);
        } catch (err) {
            console.error("Fetch failed", err);
            if (err.response?.status === 401 || err.response?.status === 403) {
                handleLogout();
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        try {
            const token = localStorage.getItem("adminToken");
            const res = await axios.post(`${apiUrl}/admin/sync-json`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(res.data.message);
            fetchData();
        } catch (err) {
            alert("Sync failed");
        }
    };

    useEffect(() => {
        if (isLoggedIn) fetchData();
    }, [isLoggedIn]);

    const validateForm = (isSignup) => {
        let isValid = true;
        let errors = { email: "", password: "" };
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim()) {
            errors.email = "Email address is required.";
            isValid = false;
        } else if (!emailRegex.test(email)) {
            errors.email = "Please enter a valid email format.";
            isValid = false;
        }
        if (!password) {
            errors.password = "Password is required.";
            isValid = false;
        } else if (isSignup && (password.length < 8 || password.length > 16)) {
            errors.password = "Password must be between 8 and 16 characters.";
            isValid = false;
        }
        setFieldErrors(errors);
        return isValid;
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setAuthError("");
        if (!validateForm(false)) return;
        setAuthLoading(true);
        try {
            const res = await axios.post(`${apiUrl}/admin/login`, { email, password });
            if (res.data.success && res.data.token) {
                localStorage.setItem("adminToken", res.data.token);
                setIsLoggedIn(true);
                setEmail("");
                setPassword("");
                setFieldErrors({ email: "", password: "" });
            }
        } catch (err) {
            console.error("Auth failed", err);
            setAuthError(err.response?.data?.message || "Invalid credentials.");
        } finally {
            setAuthLoading(false);
        }
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setAuthError("");
        if (!validateForm(true)) return;
        setAuthLoading(true);
        try {
            const token = localStorage.getItem("adminToken");
            const res = await axios.post(`${apiUrl}/auth/signup`, {
                name: "Himalingo Admin Staff",
                email,
                password
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                alert("New Admin registration successful!");
                setEmail("");
                setPassword("");
                setFieldErrors({ email: "", password: "" });
                setCurrentView("dashboard");
            }
        } catch (err) {
            console.error("Registration failed", err);
            setAuthError(err.response?.data?.message || "Failed to register.");
        } finally {
            setAuthLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("adminToken");
        setIsLoggedIn(false);
        setCurrentView("dashboard");
    };

    const toggleStatus = async (item) => {
        try {
            const token = localStorage.getItem("adminToken");
            const res = await axios.post(`${apiUrl}/admin/toggle-status/${item._id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setData(prev => prev.map(t => t._id === item._id ? { ...t, isChecked: res.data.isChecked } : t));
            }
        } catch (err) {
            console.error("Update failed", err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this translation?")) return;
        try {
            const token = localStorage.getItem("adminToken");
            const res = await axios.delete(`${apiUrl}/admin/delete/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) setData(prev => prev.filter(item => item._id !== id));
        } catch (err) {
            console.error("Delete failed", err);
        }
    };

    const filteredData = data.filter(item =>
        item.english?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.transliteration?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F2F5F9', fontFamily: 'sans-serif', color: '#7C8FAC' }}>
                <p style={{ fontSize: '16px', fontWeight: '500' }}>Verifying session status...</p>
            </div>
        );
    }

    if (!isLoggedIn) {
        return (
            <div style={styles.loginScreen}>
                <div style={styles.loginCard}>
                    <h2 style={{ color: '#5D87FF', marginBottom: '5px', fontSize: '28px' }}>Himalingo</h2>
                    <p style={{ color: '#7C8FAC', marginBottom: '25px', fontSize: '14px' }}>Admin Authentication Panel</p>

                    {authError && <div style={styles.errorAlert}>{authError}</div>}

                    <form onSubmit={handleLoginSubmit} style={styles.formContainer} noValidate>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Email Address</label>
                            <input type="email" placeholder="admin@himalingo.com" style={{ ...styles.loginInput, borderColor: fieldErrors.email ? '#E02424' : '#dfe5ef' }} value={email} onChange={(e) => setEmail(e.target.value)} />
                            {fieldErrors.email && <span style={styles.inlineFieldError}>{fieldErrors.email}</span>}
                        </div>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Password</label>
                            <input type="password" placeholder="••••••••" style={{ ...styles.loginInput, borderColor: fieldErrors.password ? '#E02424' : '#dfe5ef' }} value={password} onChange={(e) => setPassword(e.target.value)} />
                            {fieldErrors.password && <span style={styles.inlineFieldError}>{fieldErrors.password}</span>}
                        </div>
                        <button type="submit" disabled={authLoading} style={styles.btnLogin}>
                            {authLoading ? "Logging in..." : "Log In to Dashboard"}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.sidebar}>
                <div>
                    <div style={styles.logo}>Himalingo</div>
                    <div onClick={() => setCurrentView("dashboard")} style={currentView === "dashboard" ? styles.navActive : styles.navInactive}>Dashboard</div>
                    <div onClick={() => setCurrentView("add-member")} style={currentView === "add-member" ? styles.navActive : styles.navInactive}>➕ Add New Member</div>
                </div>
                <button onClick={handleLogout} style={styles.btnLogout}>Log Out</button>
            </div>

            <div style={styles.main}>
                {currentView === "dashboard" ? (
                    <>
                        <div style={styles.header}>
                            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#2A3547' }}>Translation Management</h1>
                            <button onClick={handleSync} style={styles.btnSync}>Sync JSON Files</button>
                        </div>
                        <div style={styles.card}>
                            <input type="text" placeholder="Search translations..." style={styles.search} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>English</th>
                                        <th style={styles.th}>Bhutia (Transliteration)</th>
                                        <th style={styles.th}>Status</th>
                                        <th style={{ ...styles.th, textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredData.map((item) => (
                                        <tr key={item._id}>
                                            <td style={styles.td}>{item.english}</td>
                                            <td style={styles.td}>{item.transliteration}</td>
                                            <td style={styles.td}>
                                                <div style={styles.checkboxWrapper} onClick={() => toggleStatus(item)}>
                                                    <input type="checkbox" checked={item.isChecked || false} readOnly style={styles.checkboxInput} />
                                                    <span style={{ ...styles.statusBadge, background: item.isChecked ? '#E6FFFA' : '#FDF2F2', color: item.isChecked ? '#007A64' : '#E02424' }}>
                                                        {item.isChecked ? 'Verified' : 'Pending'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ ...styles.td, textAlign: 'center' }}>
                                                <button onClick={() => handleDelete(item._id)} style={styles.btnDelete}>Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <div style={{ maxWidth: '500px' }}>
                        <div style={styles.header}>
                            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#2A3547' }}>Add New Admin Member</h1>
                        </div>
                        <div style={styles.card}>
                            <form onSubmit={handleRegisterSubmit} style={styles.formContainer} noValidate>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Email Address</label>
                                    <input type="email" placeholder="team.member@himalingo.com" style={styles.loginInput} value={email} onChange={(e) => setEmail(e.target.value)} />
                                    {fieldErrors.email && <span style={styles.inlineFieldError}>{fieldErrors.email}</span>}
                                </div>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Password</label>
                                    <input type="password" placeholder="••••••••" style={styles.loginInput} value={password} onChange={(e) => setPassword(e.target.value)} />
                                    {fieldErrors.password && <span style={styles.inlineFieldError}>{fieldErrors.password}</span>}
                                </div>
                                <button type="submit" disabled={authLoading} style={styles.btnSync}>
                                    {authLoading ? "Registering..." : "Confirm Registration"}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: { display: 'flex', background: '#F2F5F9', minHeight: '100vh', fontFamily: 'sans-serif' },
    sidebar: { width: '240px', background: '#fff', padding: '30px', borderRight: '1px solid #e5eaef', position: 'fixed', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' },
    logo: { fontSize: '24px', fontWeight: 'bold', marginBottom: '40px', color: '#5D87FF' },
    navActive: { background: '#ECF2FF', color: '#5D87FF', padding: '12px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', marginBottom: '8px' },
    navInactive: { color: '#7C8FAC', padding: '12px', borderRadius: '8px', fontWeight: '500', cursor: 'pointer', marginBottom: '8px' },
    main: { flex: 1, padding: '40px', marginLeft: '240px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
    btnSync: { background: '#5D87FF', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
    card: { background: '#fff', borderRadius: '12px', padding: '25px', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' },
    search: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #dfe5ef', marginBottom: '20px', boxSizing: 'border-box' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '15px', color: '#7C8FAC', borderBottom: '1px solid #f2f5f9', fontSize: '14px', fontWeight: '600' },
    td: { padding: '15px', borderBottom: '1px solid #f2f5f9', color: '#2A3547', verticalAlign: 'middle' },
    loginScreen: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F2F5F9' },
    loginCard: { background: '#fff', padding: '40px', borderRadius: '12px', width: '380px', boxSizing: 'border-box', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' },
    formContainer: { textAlign: 'left', marginTop: '15px' },
    inputGroup: { marginBottom: '18px', display: 'flex', flexDirection: 'column' },
    label: { fontSize: '13px', fontWeight: '600', color: '#2A3547', marginBottom: '6px' },
    loginInput: { padding: '12px', borderRadius: '8px', border: '1px solid #dfe5ef', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
    inlineFieldError: { color: '#E02424', fontSize: '11px', marginTop: '5px', fontWeight: '500' },
    errorAlert: { background: '#FDF2F2', color: '#E02424', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px', textAlign: 'center', fontWeight: '500' },
    btnLogin: { background: '#5D87FF', color: '#fff', width: '100%', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', marginTop: '10px' },
    btnLogout: { background: '#FFF0F0', color: '#D63939', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', width: '100%' },
    checkboxWrapper: { display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: '8px' },
    checkboxInput: { width: '16px', height: '16px' },
    statusBadge: { padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' },
    btnDelete: { background: 'none', border: '1px solid #E02424', color: '#E02424', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }
};
