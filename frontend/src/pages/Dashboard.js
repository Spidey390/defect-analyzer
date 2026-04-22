import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, Legend, ResponsiveContainer } from 'recharts';
import { analysisAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const RISK_COLORS = { HIGH: '#E24B4A', MEDIUM: '#EF9F27', LOW: '#1D9E75' };

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState([]);
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analysisAPI.getHistory().then(res => {
      const data = res.data;
      setAnalyses(data);
      if (data.length > 0) setLatest(data[0]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const pieData = latest?.summary
    ? [
        { name: 'HIGH', value: latest.summary.high_count, fill: '#E24B4A' },
        { name: 'MEDIUM', value: latest.summary.medium_count, fill: '#EF9F27' },
        { name: 'LOW', value: latest.summary.low_count, fill: '#1D9E75' },
      ].filter(d => d.value > 0)
    : [];

  const barData = (latest?.results || [])
    .sort((a, b) => b.bug_count - a.bug_count)
    .slice(0, 12)
    .map(r => ({ name: r.module, bugs: r.bug_count, risk: r.risk_level }));

  return (
    <Layout>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Welcome, {user?.full_name?.split(' ')[0]}</h1>
          <p style={styles.sub}>Your defect risk overview</p>
        </div>
        <button style={styles.newBtn} onClick={() => navigate('/analyze')}>+ New Analysis</button>
      </div>

      {/* Summary stats */}
      <div style={styles.statsRow}>
        {[
          { label: 'Total analyses', value: analyses.length },
          { label: 'Latest modules', value: latest?.summary?.total_modules ?? '—' },
          { label: 'High risk', value: latest?.summary?.high_count ?? '—', color: '#E24B4A' },
          { label: 'Medium risk', value: latest?.summary?.medium_count ?? '—', color: '#EF9F27' },
          { label: 'Low risk', value: latest?.summary?.low_count ?? '—', color: '#1D9E75' },
        ].map(({ label, value, color }) => (
          <div key={label} style={styles.statCard}>
            <div style={styles.statLabel}>{label}</div>
            <div style={{ ...styles.statValue, color: color || '#1a1a1a' }}>{value}</div>
          </div>
        ))}
      </div>

      {loading && <div style={styles.empty}>Loading...</div>}
      {!loading && analyses.length === 0 && (
        <div style={styles.emptyCard}>
          <div style={styles.emptyIcon}>📊</div>
          <h3 style={styles.emptyTitle}>No analyses yet</h3>
          <p style={styles.emptySub}>Upload a CSV or connect Jira to get your first risk report</p>
          <button style={styles.newBtn} onClick={() => navigate('/analyze')}>Start your first analysis</button>
        </div>
      )}

      {latest && (
        <>
          <div style={styles.chartsRow}>
            <div style={styles.chartCard}>
              <div style={styles.chartTitle}>Risk distribution — {latest.project_name}</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={styles.chartCard}>
              <div style={styles.chartTitle}>Bug count by module (top 12)</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 4, right: 8, bottom: 40, left: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="bugs" radius={[3, 3, 0, 0]}>
                    {barData.map((entry, i) => <Cell key={i} fill={RISK_COLORS[entry.risk] || '#888'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Results table */}
          <div style={styles.tableCard}>
            <div style={styles.tableHeader}>
              <span style={styles.chartTitle}>Module risk table — {latest.project_name}</span>
              <button style={styles.dlBtn} onClick={() => downloadCSV(latest.id)}>Download CSV</button>
            </div>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>{['Module', 'Risk level', 'Bug count', 'Priority score', 'Severity score', 'Reopen count'].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {(latest.results || []).map((r, i) => (
                    <tr key={i} style={i % 2 === 0 ? {} : { background: '#fafafa' }}>
                      <td style={styles.td}>{r.module}</td>
                      <td style={styles.td}><RiskBadge level={r.risk_level} /></td>
                      <td style={styles.td}>{r.bug_count}</td>
                      <td style={styles.td}>{r.priority_score}</td>
                      <td style={styles.td}>{r.severity_score}</td>
                      <td style={styles.td}>{r.reopen_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}

function RiskBadge({ level }) {
  const colors = { HIGH: { bg: '#FFF0F0', color: '#A32D2D' }, MEDIUM: { bg: '#FFFBF0', color: '#854F0B' }, LOW: { bg: '#F0FAF5', color: '#0F6E56' } };
  const c = colors[level] || { bg: '#f0f0f0', color: '#555' };
  return <span style={{ background: c.bg, color: c.color, padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600 }}>{level}</span>;
}

function downloadCSV(id) {
  analysisAPI.downloadCSV(id).then(res => {
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a'); a.href = url; a.download = `risk_report_${id}.csv`; a.click();
    window.URL.revokeObjectURL(url);
  });
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  h1: { fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px' },
  sub: { fontSize: 14, color: '#888', margin: 0 },
  newBtn: { padding: '9px 20px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 },
  statCard: { background: '#fff', borderRadius: 10, border: '1px solid #e5e5e3', padding: '16px 18px' },
  statLabel: { fontSize: 12, color: '#888', fontWeight: 500, marginBottom: 6 },
  statValue: { fontSize: 26, fontWeight: 700 },
  empty: { textAlign: 'center', color: '#888', padding: 40 },
  emptyCard: { background: '#fff', borderRadius: 12, border: '1px solid #e5e5e3', padding: 48, textAlign: 'center' },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 600, color: '#1a1a1a', margin: '0 0 8px' },
  emptySub: { fontSize: 14, color: '#888', margin: '0 0 20px' },
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 20 },
  chartCard: { background: '#fff', borderRadius: 12, border: '1px solid #e5e5e3', padding: '20px 16px' },
  chartTitle: { fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 },
  tableCard: { background: '#fff', borderRadius: 12, border: '1px solid #e5e5e3', overflow: 'hidden' },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e5e5e3' },
  dlBtn: { padding: '6px 14px', border: '1px solid #e0e0de', borderRadius: 6, background: '#fff', fontSize: 13, cursor: 'pointer', color: '#444' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#555', borderBottom: '1px solid #e5e5e3', whiteSpace: 'nowrap', background: '#fafafa' },
  td: { padding: '10px 16px', color: '#333', borderBottom: '1px solid #f0f0ee' },
};
