import React, { useEffect, useState } from 'react';
import { adminAPI } from '../services/api';
import Layout from '../components/Layout';

export default function Admin() {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminAPI.getUsers(), adminAPI.getAuditLogs(), adminAPI.getStats()])
      .then(([u, l, s]) => { setUsers(u.data); setLogs(l.data); setStats(s.data); })
      .finally(() => setLoading(false));
  }, []);

  const toggleActive = async (id) => {
    const res = await adminAPI.toggleActive(id);
    setUsers(us => us.map(u => u.id === id ? { ...u, is_active: res.data.is_active } : u));
  };

  const toggleAdmin = async (id) => {
    const res = await adminAPI.toggleAdmin(id);
    setUsers(us => us.map(u => u.id === id ? { ...u, is_admin: res.data.is_admin } : u));
  };

  return (
    <Layout>
      <div style={styles.header}>
        <h1 style={styles.h1}>Admin Panel</h1>
        <p style={styles.sub}>Manage users, audit logs, and system activity</p>
      </div>

      {stats && (
        <div style={styles.statsRow}>
          {[
            { label: 'Total users', value: stats.total_users },
            { label: 'Active users', value: stats.active_users },
            { label: 'Total analyses', value: stats.total_analyses },
            { label: 'Power BI synced', value: stats.powerbi_synced },
          ].map(({ label, value }) => (
            <div key={label} style={styles.statCard}>
              <div style={styles.statLabel}>{label}</div>
              <div style={styles.statValue}>{value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={styles.tabs}>
        {['users', 'audit-logs'].map(t => (
          <button key={t} style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }} onClick={() => setTab(t)}>
            {t === 'users' ? `Users (${users.length})` : `Audit logs (${logs.length})`}
          </button>
        ))}
      </div>

      {loading && <div style={styles.empty}>Loading...</div>}

      {!loading && tab === 'users' && (
        <div style={styles.tableCard}>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['ID', 'Name', 'Email', 'Joined', 'Last login', 'Admin', 'Active', 'Actions'].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={styles.td}>{u.id}</td>
                    <td style={{ ...styles.td, fontWeight: 500 }}>{u.full_name}</td>
                    <td style={styles.td}>{u.email}</td>
                    <td style={styles.td}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td style={styles.td}>{u.last_login ? new Date(u.last_login).toLocaleDateString() : '—'}</td>
                    <td style={styles.td}>
                      <span style={u.is_admin ? styles.yes : styles.no}>{u.is_admin ? 'Yes' : 'No'}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={u.is_active ? styles.yes : styles.no}>{u.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button style={styles.actionBtn} onClick={() => toggleActive(u.id)}>
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button style={styles.actionBtn} onClick={() => toggleAdmin(u.id)}>
                          {u.is_admin ? 'Revoke admin' : 'Make admin'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && tab === 'audit-logs' && (
        <div style={styles.tableCard}>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['Time', 'User ID', 'Action', 'Detail', 'IP'].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={l.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>{new Date(l.timestamp).toLocaleString()}</td>
                    <td style={styles.td}>{l.user_id ?? '—'}</td>
                    <td style={styles.td}><span style={styles.actionTag}>{l.action}</span></td>
                    <td style={{ ...styles.td, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.detail || '—'}</td>
                    <td style={styles.td}>{l.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}

const styles = {
  header: { marginBottom: 24 },
  h1: { fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px' },
  sub: { fontSize: 14, color: '#888', margin: 0 },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 },
  statCard: { background: '#fff', borderRadius: 10, border: '1px solid #e5e5e3', padding: '16px 18px' },
  statLabel: { fontSize: 12, color: '#888', fontWeight: 500, marginBottom: 6 },
  statValue: { fontSize: 26, fontWeight: 700, color: '#185FA5' },
  tabs: { display: 'flex', gap: 0, marginBottom: 16, background: '#f0f0ee', borderRadius: 10, padding: 4, width: 'fit-content' },
  tab: { padding: '7px 20px', border: 'none', borderRadius: 7, background: 'transparent', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#666' },
  tabActive: { background: '#fff', color: '#185FA5', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  empty: { textAlign: 'center', color: '#888', padding: 40 },
  tableCard: { background: '#fff', borderRadius: 12, border: '1px solid #e5e5e3', overflow: 'hidden' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#555', borderBottom: '1px solid #e5e5e3', whiteSpace: 'nowrap', background: '#fafafa' },
  td: { padding: '10px 16px', color: '#333', borderBottom: '1px solid #f0f0ee' },
  yes: { background: '#F0FAF5', color: '#0F6E56', padding: '2px 8px', borderRadius: 8, fontSize: 12, fontWeight: 600 },
  no: { background: '#f5f5f3', color: '#888', padding: '2px 8px', borderRadius: 8, fontSize: 12, fontWeight: 600 },
  actionBtn: { padding: '4px 10px', border: '1px solid #e0e0de', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer', color: '#444', whiteSpace: 'nowrap' },
  actionTag: { background: '#EEF4FB', color: '#185FA5', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 },
};
