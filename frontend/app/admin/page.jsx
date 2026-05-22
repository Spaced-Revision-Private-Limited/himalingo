"use client";
import React, { useEffect, useState } from 'react';
import axios from 'axios';
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export default function AdminDashboard() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchData = async () => {
        try {
            const res = await axios.get(`${apiUrl}/admin/all-data`);
            if (res.data.success) setData(res.data.translations);
        } catch (err) {
            console.error("Fetch failed", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        try {
            const res = await axios.post(`${apiUrl}/admin/sync-json`);
            alert(res.data.message);
            fetchData(); // Refresh table
        } catch (err) {
            alert("Sync failed");
        }
    };

    useEffect(() => { fetchData(); }, []);

    const toggleStatus = async (item) => {
        try {
            const res = await axios.post(`${apiUrl}/admin/toggle-status/${item._id}`);
            if (res.data.success) {
                setData(prev => prev.map(t => 
                    t._id === item._id ? { ...t, isChecked: res.data.isChecked } : t
                ));
            }
        } catch (err) {
            console.error("Update failed", err.response?.data || err.message);
        }
    };

    const filteredData = data.filter(item => 
        item.english?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.transliteration?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <p style={{padding: '40px'}}>Loading Admin Panel...</p>;

    return (
        <div style={styles.container}>
            {/* Sidebar */}
            <div style={styles.sidebar}>
                <div style={styles.logo}>Himalingo</div>
                <div style={styles.navActive}>Dashboard</div>
            </div>

            {/* Main Content */}
            <div style={styles.main}>
                <div style={styles.header}>
                    <h1 style={{fontSize: '24px', fontWeight: 'bold'}}>Translation Management</h1>
                    <button onClick={handleSync} style={styles.btnSync}>Sync JSON Files</button>
                </div>

                <div style={styles.card}>
                    <input 
                        type="text" 
                        placeholder="Search translations..." 
                        style={styles.search}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />

                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>English</th>
                                <th style={styles.th}>Bhutia (Transliteration)</th>
                                <th style={styles.th}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((item) => (
                                <tr key={item._id}>
                                    <td style={styles.td}>{item.english}</td>
                                    <td style={styles.td}>{item.transliteration}</td>
                                    <td style={styles.td}>
                                        <input 
                                            type="checkbox" 
                                            checked={item.isChecked || false} 
                                            onChange={() => toggleStatus(item)}
                                            style={{cursor: 'pointer', width: '18px', height: '18px'}}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// THE STYLES OBJECT (Must be applied using style={styles.xyz})
const styles = {
    container: { display:'flex', background:'#F2F5F9', minHeight:'100vh', fontFamily: 'sans-serif' },
    sidebar: { width:'240px', background:'#fff', padding:'30px', borderRight:'1px solid #e5eaef', position:'fixed', height:'100vh' },
    logo: { fontSize:'24px', fontWeight:'bold', marginBottom:'40px', color: '#5D87FF' },
    navActive: { background:'#ECF2FF', color:'#5D87FF', padding:'12px', borderRadius:'8px', fontWeight:'600' },
    main: { flex:1, padding:'40px', marginLeft:'240px' },
    header: { display:'flex', justifyContent:'space-between', alignItems: 'center', marginBottom:'30px' },
    btnSync: { background:'#5D87FF', color:'#fff', border:'none', padding:'10px 20px', borderRadius:'8px', cursor:'pointer', fontWeight: '600' },
    card: { background:'#fff', borderRadius:'12px', padding:'25px', boxShadow:'0 5px 20px rgba(0,0,0,0.05)' },
    search: { width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid #dfe5ef', marginBottom:'20px', boxSizing: 'border-box' },
    table: { width:'100%', borderCollapse:'collapse' },
    th: { textAlign:'left', padding:'15px', color:'#7C8FAC', borderBottom:'1px solid #f2f5f9', fontSize: '14px' },
    td: { padding:'15px', borderBottom:'1px solid #f2f5f9', color: '#2A3547' }
};