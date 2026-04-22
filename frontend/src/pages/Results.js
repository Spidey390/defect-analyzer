import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, ResponsiveContainer } from 'recharts';
import { analysisAPI } from '../services/api';
import Layout from '../components/Layout';

const RISK_COLORS = { HIGH: '#E24B4A', MEDIUM: '#EF9F27', LOW: '#1D9E75' };
const BADGE_STYLES = {
  HIGH: { background: '#FFF0F0', color: '#A32D2D' },
  MEDIUM: { background: '#FFFBF0', color: '#854F0B' },
  LOW: { background: '#F0FAF5', color: '#0F6E56' },
};

function formatNumber(value) {
  return typeof value === 'number' ? value.toFixed(2).replace(/\.00$/, '') : value;
}

function getRiskExplanation(results, row) {
  const totalBugCount = results.reduce((sum, item) => sum + (Number(item.bug_count) || 0), 0);
  const usesComplexity = totalBugCount === 0;
  const complexityValues = results.map((item) => Number(item.complexity_score) || 0);
  const maxComplexity = complexityValues.length ? Math.max(...complexityValues) : 0;
  const minComplexity = complexityValues.length ? Math.min(...complexityValues) : 0;
  const rowComplexity = Number(row.complexity_score) || 0;
  const priority = Number(row.priority_score) || 0;
  const severity = Number(row.severity_score) || 0;
  const reopenCount = Number(row.reopen_count) || 0;
  const bugCount = Number(row.bug_count) || 0;

  if (usesComplexity) {
    let comparison = 'in the middle of the modules analyzed';
    if (rowComplexity === maxComplexity) comparison = 'the highest in this analysis';
    else if (rowComplexity === minComplexity) comparison = 'among the lowest in this analysis';

    const parts = [
      `This result was labeled ${row.risk_level} mainly because this Git analysis had no bug history, so the app ranked modules by code complexity.`,
      `This module's complexity score is ${formatNumber(rowComplexity)}, which is ${comparison}.`,
    ];

    if (typeof row.max_complexity === 'number') {
      parts.push(`Its highest single code block complexity is ${formatNumber(row.max_complexity)}.`);
    }

    return {
      title: `${row.risk_level} because of complexity`,
      description: parts.join(' '),
    };
  }

  const factors = [];
  if (bugCount > 0) factors.push(`bug count ${bugCount}`);
  if (priority > 0) factors.push(`priority score ${formatNumber(priority)}`);
  if (severity > 0) factors.push(`severity score ${formatNumber(severity)}`);
  if (reopenCount > 0) factors.push(`reopen count ${reopenCount}`);
  if (rowComplexity > 0) factors.push(`complexity score ${formatNumber(rowComplexity)}`);

  return {
    title: `${row.risk_level} from scoring factors`,
    description: `This result was assigned by clustering modules using bug count, priority, severity, reopen count, and complexity, then labeling the clusters by risk. For this module, the main contributing values are ${factors.join(', ')}.`,
  };
}

export default function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [error, setError] = useState('');
  const [selectedRisk, setSelectedRisk] = useState(null);

  useEffect(() => {
    analysisAPI.getAnalysis(id)
      .then(r => setAnalysis(r.data))
      .catch(() => setError('Analysis not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSync = async () => {
    setSyncing(true); setSyncMsg('');
    try {
      await analysisAPI.syncPowerBI(id);
      setSyncMsg('Synced to Power BI successfully!');
      setAnalysis(a => ({ ...a, powerbi_synced: true }));
    } catch (err) {
      setSyncMsg(err.response?.data?.detail || 'Sync failed');
    } finally { setSyncing(false); }
  };

  const handleDownload = () => {
    analysisAPI.downloadCSV(id).then(res => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url;
      a.download = `risk_report_${analysis.project_name}_${id}.csv`; a.click();
      window.URL.revokeObjectURL(url);
    });
  };

  if (loading) return <Layout><div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading results...</div></Layout>;
  if (error) return <Layout><div style={{ padding: 40, textAlign: 'center', color: '#b91c1c' }}>{error}</div></Layout>;

  const results = analysis.results || [];
  const summary = analysis.summary || {};
  const pieData = [
    { name: 'HIGH', value: summary.high_count, fill: '#E24B4A' },
    { name: 'MEDIUM', value: summary.medium_count, fill: '#EF9F27' },
    { name: 'LOW', value: summary.low_count, fill: '#1D9E75' },
  ].filter(d => d.value > 0);
  const barData = [...results].sort((a, b) => b.bug_count - a.bug_count).slice(0, 15);
  const selectedRiskInfo = selectedRisk ? getRiskExplanation(results, selectedRisk) : null;

  return (
    <Layout>
      <div style={styles.header}>
        <div>
          <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>← Dashboard</button>
          <h1 style={styles.h1}>{analysis.project_name}</h1>
          <div style={styles.meta}>
            <span style={styles.sourceBadge}>{analysis.source.toUpperCase()}</span>
            <span style={styles.date}>{new Date(analysis.created_at).toLocaleString()}</span>
            {analysis.powerbi_synced && <span style={styles.pbiSynced}>Power BI synced</span>}
          </div>
        </div>
        <div style={styles.actions}>
          <button style={styles.dlBtn} onClick={handleDownload}>Download CSV</button>
          <button
            style={{ ...styles.pbiBtn, opacity: syncing ? 0.7 : 1 }}
            onClick={handleSync} disabled={syncing || analysis.powerbi_synced}>
            {syncing ? 'Syncing...' : analysis.powerbi_synced ? 'Power BI synced ✓' : 'Sync to Power BI'}
          </button>
        </div>
      </div>

      {syncMsg && (
        <div style={{ ...styles.syncMsg, background: syncMsg.includes('success') ? '#f0faf5' : '#fff2f2', color: syncMsg.includes('success') ? '#0F6E56' : '#b91c1c', borderColor: syncMsg.includes('success') ? '#6ee7b7' : '#fca5a5' }}>
          {syncMsg}
        </div>
      )}

      {/* Summary cards */}
      <div style={styles.statsRow}>
        {[
          { label: 'Total modules', value: summary.total_modules, color: '#185FA5' },
          { label: 'High risk', value: summary.high_count, color: '#E24B4A' },
          { label: 'Medium risk', value: summary.medium_count, color: '#EF9F27' },
          { label: 'Low risk', value: summary.low_count, color: '#1D9E75' },
        ].map(({ label, value, color }) => (
          <div key={label} style={styles.statCard}>
            <div style={styles.statLabel}>{label}</div>
            <div style={{ ...styles.statValue, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={styles.chartsRow}>
        <div style={styles.chartCard}>
          <div style={styles.chartTitle}>Risk distribution</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={75} dataKey="value"
                label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}>
                {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={styles.chartCard}>
          <div style={styles.chartTitle}>Bug count by module (top 15)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 4, right: 8, bottom: 44, left: 0 }}>
              <XAxis dataKey="module" tick={{ fontSize: 10 }} angle={-40} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="bug_count" radius={[3, 3, 0, 0]}>
                {barData.map((e, i) => <Cell key={i} fill={RISK_COLORS[e.risk_level] || '#888'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Full table */}
      <div style={styles.tableCard}>
        <div style={styles.tableTitle}>All modules ({results.length})</div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Module', 'Risk level', 'Bug count', 'Priority score', 'Severity score', 'Reopen count', 'Cluster'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ ...styles.td, fontWeight: 500 }}>{r.module}</td>
                  <td style={styles.td}>
                    <div style={styles.riskCell}>
                      <span style={{ ...styles.badge, ...BADGE_STYLES[r.risk_level] }}>{r.risk_level}</span>
                      <button
                        type="button"
                        style={styles.riskInfoBtn}
                        onClick={() => setSelectedRisk(r)}
                      >
                        Why?
                      </button>
                    </div>
                  </td>
                  <td style={styles.td}>{r.bug_count}</td>
                  <td style={styles.td}>{r.priority_score}</td>
                  <td style={styles.td}>{r.severity_score}</td>
                  <td style={styles.td}>{r.reopen_count}</td>
                  <td style={{ ...styles.td, color: '#888', fontSize: 12 }}>{r.cluster}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRisk && selectedRiskInfo && (
        <div style={styles.modalOverlay} onClick={() => setSelectedRisk(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.modalEyebrow}>Risk explanation</div>
                <h2 style={styles.modalTitle}>{selectedRisk.module}</h2>
              </div>
              <button type="button" style={styles.modalCloseBtn} onClick={() => setSelectedRisk(null)}>Close</button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.modalRiskRow}>
                <span style={{ ...styles.badge, ...BADGE_STYLES[selectedRisk.risk_level] }}>{selectedRisk.risk_level}</span>
                <span style={styles.modalRiskTitle}>{selectedRiskInfo.title}</span>
              </div>
              <p style={styles.modalText}>{selectedRiskInfo.description}</p>
              <p style={styles.modalText}>
                This module has priority score <strong>{selectedRisk.priority_score}</strong>, severity score <strong>{selectedRisk.severity_score}</strong>, bug count <strong>{selectedRisk.bug_count}</strong>, reopen count <strong>{selectedRisk.reopen_count}</strong>{typeof selectedRisk.complexity_score === 'number' && <> , and complexity score <strong>{formatNumber(selectedRisk.complexity_score)}</strong></>}.
              </p>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 },
  backBtn: { background: 'none', border: 'none', color: '#185FA5', fontSize: 13, cursor: 'pointer', padding: '0 0 8px', display: 'block', fontWeight: 500 },
  h1: { fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: '0 0 8px' },
  meta: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  sourceBadge: { background: '#EEF4FB', color: '#185FA5', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10 },
  date: { fontSize: 13, color: '#888' },
  pbiSynced: { background: '#e8f5e9', color: '#2e7d32', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 10 },
  actions: { display: 'flex', gap: 10 },
  dlBtn: { padding: '8px 16px', border: '1px solid #e0e0de', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer', color: '#444', fontWeight: 500 },
  pbiBtn: { padding: '8px 16px', border: 'none', borderRadius: 8, background: '#185FA5', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 500 },
  syncMsg: { border: '1px solid', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 },
  statCard: { background: '#fff', borderRadius: 10, border: '1px solid #e5e5e3', padding: '16px 18px' },
  statLabel: { fontSize: 12, color: '#888', fontWeight: 500, marginBottom: 6 },
  statValue: { fontSize: 26, fontWeight: 700 },
  chartsRow: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 20 },
  chartCard: { background: '#fff', borderRadius: 12, border: '1px solid #e5e5e3', padding: '18px 14px' },
  chartTitle: { fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 10 },
  tableCard: { background: '#fff', borderRadius: 12, border: '1px solid #e5e5e3', overflow: 'hidden' },
  tableTitle: { padding: '16px 20px', fontWeight: 600, fontSize: 14, color: '#1a1a1a', borderBottom: '1px solid #e5e5e3' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#555', borderBottom: '1px solid #e5e5e3', whiteSpace: 'nowrap', background: '#fafafa' },
  td: { padding: '10px 16px', color: '#333', borderBottom: '1px solid #f0f0ee' },
  badge: { padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600 },
  riskCell: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  riskInfoBtn: { border: '1px solid #d8dee8', background: '#fff', color: '#185FA5', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 1000 },
  modalCard: { width: '100%', maxWidth: 560, background: '#fff', borderRadius: 16, boxShadow: '0 24px 80px rgba(15, 23, 42, 0.2)', padding: 24 },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 18 },
  modalEyebrow: { fontSize: 12, fontWeight: 700, color: '#185FA5', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 },
  modalTitle: { margin: 0, fontSize: 22, lineHeight: 1.2, color: '#1a1a1a' },
  modalCloseBtn: { border: '1px solid #d8dee8', background: '#fff', color: '#444', borderRadius: 10, padding: '8px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  modalBody: { display: 'grid', gap: 14 },
  modalRiskRow: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  modalRiskTitle: { fontSize: 16, fontWeight: 700, color: '#1f2937' },
  modalText: { margin: 0, fontSize: 14, lineHeight: 1.6, color: '#475467' },
};
