
"use client";
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const apiUrl = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api`
    : "http://localhost:5000/api";

export default function AdminDashboard() {
    const [currentView, setCurrentView] = useState("dashboard");
    const [data, setData] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [authLoading, setAuthLoading] = useState(false);

    // Login form
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [authError, setAuthError] = useState("");
    const [sessionError, setSessionError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });

    // Add Member form — independent state, never shares with login
    const [newMemberEmail, setNewMemberEmail] = useState("");
    const [newMemberPassword, setNewMemberPassword] = useState("");
    const [addMemberError, setAddMemberError] = useState("");

    // Sync feedback shown in the UI instead of alert()
    const [syncMessage, setSyncMessage] = useState(null); // { type: 'success'|'error', text: string }

    // Tracks which row IDs are checked (client-side selection only)
    const [checkedIds, setCheckedIds] = useState(new Set());

    useEffect(() => {
        const token = localStorage.getItem("adminToken");
        setIsLoggedIn(!!token);
        setLoading(false);
    }, []);

    // Clears token and sends user to login with an explanatory message
    const forceLogout = (reason) => {
        localStorage.removeItem("adminToken");
        setIsLoggedIn(false);
        setSessionError(reason || "Your session has expired. Please log in again.");
    };

    // Fetches translation records from /admin/all-data
    const fetchData = async () => {
        const token = localStorage.getItem("adminToken");
        try {
            const res = await axios.get(`${apiUrl}/admin/all-data`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('[fetchData] raw response:', res.data);
            // Accept either key name the API might use
            const records =
                Array.isArray(res.data.translations) ? res.data.translations :
                Array.isArray(res.data.data) ? res.data.data :
                [];
            setData(records);
            setCheckedIds(new Set()); // Clear selection on every load
        } catch (err) {
            const status = err.response?.status;
            const msg = err.response?.data?.message || err.message;
            console.error('[fetchData] error', status, msg);
            if (status === 401 || status === 403) forceLogout(msg);
        }
    };

    const fetchMembers = async () => {
        const token = localStorage.getItem("adminToken");
        try {
            const res = await axios.get(`${apiUrl}/admin/members`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('[fetchMembers] raw response:', res.data);
            if (res.data.success) setMembers(res.data.members ?? []);
        } catch (err) {
            const status = err.response?.status;
            const msg = err.response?.data?.message || err.message;
            console.error('[fetchMembers] error', status, msg);
            if (status === 401 || status === 403) forceLogout(msg);
        }
    };

    useEffect(() => {
        if (isLoggedIn) {
            fetchData();
            fetchMembers();
        }
    }, [isLoggedIn]);

    const validateLoginFields = () => {
        const errors = { email: "", password: "" };
        if (!email.trim()) errors.email = "Email is required";
        if (!password) errors.password = "Password is required";
        setFieldErrors(errors);
        return !errors.email && !errors.password;
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setAuthError("");
        setSessionError("");
        if (!validateLoginFields()) return;

        setAuthLoading(true);
        try {
            const res = await axios.post(`${apiUrl}/admin/login`, { email, password });
            if (res.data.success && res.data.token) {
                localStorage.setItem("adminToken", res.data.token);
                setIsLoggedIn(true);
                setEmail("");
                setPassword("");
            } else {
                setAuthError("Invalid credentials.");
            }
        } catch (err) {
            setAuthError(err.response?.data?.message || "Login failed. Please try again.");
        } finally {
            setAuthLoading(false);
        }
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setAddMemberError("");
        setAuthLoading(true);
        try {
            const token = localStorage.getItem("adminToken");
            await axios.post(`${apiUrl}/auth/signup`, {
                name: "Admin Staff",
                email: newMemberEmail,
                password: newMemberPassword
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNewMemberEmail("");
            setNewMemberPassword("");
            await fetchMembers(); // Refresh list immediately before navigating
            setCurrentView("members");
        } catch (err) {
            setAddMemberError(err.response?.data?.message || "Failed to add member.");
        } finally {
            setAuthLoading(false);
        }
    };

    const handleSync = async () => {
        const token = localStorage.getItem("adminToken");
        setSyncMessage({ type: 'loading', text: 'Syncing data...' });
        try {
            const res = await axios.post(`${apiUrl}/admin/sync-json`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('[handleSync] raw response:', res.data);
            if (res.data.success) {
                await fetchData(); // Reload count after successful sync
                setSyncMessage({ type: 'success', text: res.data.message });
            } else {
                setSyncMessage({ type: 'error', text: res.data.message || 'No data found to sync.' });
            }
        } catch (err) {
            const status = err.response?.status;
            const msg = err.response?.data?.message || err.message;
            console.error('[handleSync] error', status, msg);
            if (status === 401 || status === 403) {
                forceLogout(msg);
            } else {
                setSyncMessage({ type: 'error', text: 'Sync failed: ' + msg });
            }
        }
    };

    const handleToggleCheck = (id) => {
        setCheckedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleDelete = async (id) => {
        const token = localStorage.getItem("adminToken");
        try {
            const res = await axios.delete(`${apiUrl}/admin/delete-record/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                // Optimistic: remove from local state immediately, no full refetch needed
                setData(prev => prev.filter(item => item._id !== id));
                setCheckedIds(prev => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
            }
        } catch (err) {
            const status = err.response?.status;
            const msg = err.response?.data?.message || err.message;
            console.error('[handleDelete] error', status, msg);
            if (status === 401 || status === 403) forceLogout(msg);
            else setSyncMessage({ type: 'error', text: 'Delete failed: ' + msg });
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("adminToken");
        setSessionError("");
        setIsLoggedIn(false);
    };

    const filteredData = data.filter((item) =>
        (item.english || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.transliteration || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div style={styles.loginScreen}>Loading...</div>;

    if (!isLoggedIn) {
        return (
            <div style={styles.loginScreen}>
                <div style={styles.loginCard}>
                    <div style={styles.logo}>Himalingo Admin</div>
                    {sessionError && <div style={styles.sessionAlert}>{sessionError}</div>}
                    {authError && <div style={styles.errorAlert}>{authError}</div>}
                    <form style={styles.formContainer} onSubmit={handleLoginSubmit}>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Email</label>
                            <input
                                type="email"
                                style={styles.loginInput}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            {fieldErrors.email && <div style={styles.inlineFieldError}>{fieldErrors.email}</div>}
                        </div>
                        <div style={styles.inputGroup}>
                            <label style={styles.label}>Password</label>
                            <input
                                type="password"
                                style={styles.loginInput}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            {fieldErrors.password && <div style={styles.inlineFieldError}>{fieldErrors.password}</div>}
                        </div>
                        <button type="submit" style={styles.btnLogin} disabled={authLoading}>
                            {authLoading ? "Logging in..." : "Log In"}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.sidebar}>
                <div style={styles.logo}>Himalingo</div>
                <nav style={styles.nav}>
                    <div
                        onClick={() => setCurrentView("dashboard")}
                        style={currentView === "dashboard" ? styles.navActive : styles.navInactive}
                    >
                        Dashboard
                    </div>
                    <div
                        onClick={() => setCurrentView("members")}
                        style={currentView === "members" ? styles.navActive : styles.navInactive}
                    >
                        View Members
                    </div>
                    <div
                        onClick={() => { setAddMemberError(""); setCurrentView("add-member"); }}
                        style={currentView === "add-member" ? styles.navActive : styles.navInactive}
                    >
                        Add New Member
                    </div>
                </nav>
                <button onClick={handleLogout} style={styles.btnLogout}>Log Out</button>
            </div>

            <main style={styles.main}>
                {currentView === "dashboard" && (
                    <div style={styles.card}>
                        <div style={styles.header}>
                            <h2 style={styles.cardTitle}>Dashboard</h2>
                            <button onClick={handleSync} style={styles.btnSync}>
                                {syncMessage?.type === 'loading' ? 'Syncing...' : 'Sync Data'}
                            </button>
                        </div>

                        {syncMessage && syncMessage.type !== 'loading' && (
                            <div style={syncMessage.type === 'success' ? styles.successAlert : styles.errorAlert}>
                                {syncMessage.text}
                            </div>
                        )}

                        <input
                            type="text"
                            placeholder="Search translations..."
                            style={styles.search}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />

                        <p style={styles.recordCount}>
                            {searchTerm
                                ? `${filteredData.length} of ${data.length} records match`
                                : `${data.length} translation records loaded`}
                        </p>

                        {filteredData.length > 0 && (
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.thCheck}></th>
                                        <th style={styles.th}>English</th>
                                        <th style={styles.th}>Transliteration</th>
                                        <th style={styles.thAction}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredData.slice(0, 50).map((item) => (
                                        <tr
                                            key={item._id}
                                            style={checkedIds.has(item._id) ? styles.rowChecked : undefined}
                                        >
                                            <td style={styles.tdCheck}>
                                                <input
                                                    type="checkbox"
                                                    style={styles.checkbox}
                                                    checked={checkedIds.has(item._id)}
                                                    onChange={() => handleToggleCheck(item._id)}
                                                />
                                            </td>
                                            <td style={styles.td}>{item.english}</td>
                                            <td style={styles.td}>{item.transliteration}</td>
                                            <td style={styles.tdAction}>
                                                <button
                                                    style={styles.btnDelete}
                                                    onClick={() => handleDelete(item._id)}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {currentView === "members" && (
                    <div style={styles.card}>
                        <h2 style={styles.cardTitle}>Registered Admin Members</h2>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Email</th>
                                    <th style={styles.th}>Joined</th>
                                </tr>
                            </thead>
                            <tbody>
                                {members.length === 0
                                    ? <tr><td style={styles.td} colSpan={2}>No members found.</td></tr>
                                    : members.map((m) => (
                                        <tr key={m._id}>
                                            <td style={styles.td}>{m.email}</td>
                                            <td style={styles.td}>{new Date(m.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                        </table>
                    </div>
                )}

                {currentView === "add-member" && (
                    <div style={styles.formCard}>
                        <h2 style={styles.cardTitle}>Add New Admin Member</h2>
                        {addMemberError && <div style={styles.errorAlert}>{addMemberError}</div>}
                        <form style={styles.formContainer} onSubmit={handleRegisterSubmit}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Email</label>
                                <input
                                    type="email"
                                    style={styles.loginInput}
                                    value={newMemberEmail}
                                    onChange={(e) => setNewMemberEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Password</label>
                                <input
                                    type="password"
                                    style={styles.loginInput}
                                    value={newMemberPassword}
                                    onChange={(e) => setNewMemberPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <button type="submit" style={styles.btnLogin} disabled={authLoading}>
                                {authLoading ? "Adding..." : "Add Member"}
                            </button>
                        </form>
                    </div>
                )}
            </main>
        </div>
    );
}

const styles = {
    container: { display: 'flex', background: '#F2F5F9', minHeight: '100vh', fontFamily: 'sans-serif' },
    sidebar: { width: '240px', background: '#fff', padding: '30px', borderRight: '1px solid #e5eaef', position: 'fixed', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' },
    logo: { fontSize: '24px', fontWeight: 'bold', marginBottom: '40px', color: '#5D87FF' },
    nav: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 },
    navActive: { background: '#ECF2FF', color: '#5D87FF', padding: '12px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
    navInactive: { color: '#7C8FAC', padding: '12px', borderRadius: '8px', fontWeight: '500', cursor: 'pointer' },
    main: { flex: 1, padding: '40px', marginLeft: '240px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    cardTitle: { margin: 0, fontSize: '20px', color: '#2A3547' },
    btnSync: { background: '#5D87FF', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
    card: { background: '#fff', borderRadius: '12px', padding: '25px', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' },
    formCard: { background: '#fff', borderRadius: '12px', padding: '40px', boxShadow: '0 5px 20px rgba(0,0,0,0.05)', maxWidth: '450px', margin: '0 auto' },
    search: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #dfe5ef', marginBottom: '12px', boxSizing: 'border-box', fontSize: '14px' },
    recordCount: { color: '#7C8FAC', fontSize: '14px', margin: '0 0 20px 0' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '12px 15px', color: '#7C8FAC', borderBottom: '2px solid #f2f5f9', fontSize: '13px', fontWeight: '600' },
    thCheck: { width: '40px', padding: '12px 8px 12px 15px', borderBottom: '2px solid #f2f5f9' },
    thAction: { width: '90px', textAlign: 'center', padding: '12px 15px', color: '#7C8FAC', borderBottom: '2px solid #f2f5f9', fontSize: '13px', fontWeight: '600' },
    td: { padding: '12px 15px', borderBottom: '1px solid #f2f5f9', color: '#2A3547', fontSize: '14px' },
    tdCheck: { padding: '12px 8px 12px 15px', borderBottom: '1px solid #f2f5f9', verticalAlign: 'middle' },
    tdAction: { padding: '12px 15px', borderBottom: '1px solid #f2f5f9', textAlign: 'center', verticalAlign: 'middle' },
    checkbox: { width: '15px', height: '15px', cursor: 'pointer', accentColor: '#5D87FF' },
    rowChecked: { background: '#F5F8FF' },
    btnDelete: { background: 'none', border: '1px solid #E02424', color: '#E02424', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' },
    loginScreen: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F2F5F9' },
    loginCard: { background: '#fff', padding: '40px', borderRadius: '12px', width: '380px', boxSizing: 'border-box', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' },
    formContainer: { marginTop: '20px' },
    inputGroup: { marginBottom: '18px', display: 'flex', flexDirection: 'column' },
    label: { fontSize: '13px', fontWeight: '600', color: '#2A3547', marginBottom: '6px' },
    loginInput: { padding: '12px', borderRadius: '8px', border: '1px solid #dfe5ef', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
    inlineFieldError: { color: '#E02424', fontSize: '11px', marginTop: '5px', fontWeight: '500' },
    errorAlert: { background: '#FDF2F2', color: '#E02424', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', fontWeight: '500' },
    successAlert: { background: '#F0FDF4', color: '#15803D', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', fontWeight: '500' },
    sessionAlert: { background: '#FFF8E1', color: '#B45309', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', fontWeight: '500' },
    btnLogin: { background: '#5D87FF', color: '#fff', width: '100%', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', marginTop: '8px', fontSize: '14px' },
    btnLogout: { background: '#FFF0F0', color: '#D63939', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', width: '100%', fontSize: '14px' },
};
