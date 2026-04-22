import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analysisAPI } from '../services/api';
import Layout from '../components/Layout';

export default function History() {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    analysisAPI.getHistory()
      .then(r => setAnalyses(r.data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = analyses.filter(a =>
    a.project_name.toLowerCase().includes(search.toLowerCase()) ||
    a.source.toLowerCase().includes(search.toLowerCase())
  );

  const handleDownload = (e, id, name) => {
    e.stopPropagation();
    analysisAPI.downloadCSV(id).then(res => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url;
      a.download = `risk_report_${name}_${id}.csv`; a.click();
      window.URL.revokeObjectURL(url);
    });
  };

  return (
    <Layout>
      <div style={styles.header}>
        <div>
          <h1 style={styles.h1}>Analysis History</h1>
          <p style={styles.sub}>{analyses.length} total analyses</p>
        </div>
        <button style={styles.newBtn} onClick={() => navigate('/analyze')}>+ New Analysis</button>
      </div>

      <div style={styles.toolbar}>
        <input style={styles.search} placeholder="Search by project name or source..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading && <div style={styles.empty}>Loading...</div>}
      {!loading && filtered.length === 0 && (
        <div style={styles.empty}>{search ? 'No results matching your search' : 'No analyses yet'}</div>
      )}

      <div style={styles.list}>
        {filtered.map(a => (
          <div key={a.id} style={styles.row} onClick={() => navigate(`/results/${a.id}`)}>
            <div style={styles.rowLeft}>
              <div style={styles.rowTitle}>{a.project_name}</div>
              <div style={styles.rowMeta}>
                <span style={{ ...styles.sourceBadge, ...(a.source === 'jira' ? styles.jiraBadge : {}) }}>
                  {a.source.toUpperCase()}
                </span>
                <span style={styles.date}>{new Date(a.created_at).toLocaleString()}</span>
                {a.powerbi_synced && <span style={styles.pbiTag}>PBI synced</span>}
              </div>
            </div>
            <div style={styles.rowStats}>
              {a.summary && (
                <>
                  <span style={styles.statChip}>{a.summary.total_modules} modules</span>
                  {a.summary.high_count > 0 && <span style={{ ...styles.riskChip, background: '#FFF0F0', color: '#A32D2D' }}>H:{a.summary.high_count}</span>}
                  {a.summary.medium_count > 0 && <span style={{ ...styles.riskChip, background: '#FFFBF0', color: '#854F0B' }}>M:{a.summary.medium_count}</span>}
                  {a.summary.low_count > 0 && <span style={{ ...styles.riskChip, background: '#F0FAF5', color: '#0F6E56' }}>L:{a.summary.low_count}</span>}
                </>
              )}
            </div>
            <div style={styles.rowActions}>
              <button style={styles.dlBtn} onClick={e => handleDownload(e, a.id, a.project_name)}>CSV</button>
              <span style={styles.arrow}>→</span>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  h1: { fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px' },
  sub: { fontSize: 14, color: '#888', margin: 0 },
  newBtn: { padding: '9px 20px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  toolbar: { marginBottom: 16 },
  search: { padding: '9px 14px', border: '1px solid #e0e0de', borderRadius: 8, fontSize: 14, width: '100%', maxWidth: 400, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
  empty: { textAlign: 'center', color: '#888', padding: '48px 0' },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  row: { background: '#fff', border: '1px solid #e5e5e3', borderRadius: 10, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'border-color .12s' },
  rowLeft: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 },
  rowMeta: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  sourceBadge: { background: '#EEF4FB', color: '#185FA5', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8 },
  jiraBadge: { background: '#EEF0FF', color: '#3730a3' },
  date: { fontSize: 12, color: '#aaa' },
  pbiTag: { background: '#e8f5e9', color: '#2e7d32', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 8 },
  rowStats: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  statChip: { background: '#f5f5f3', color: '#555', fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 8 },
  riskChip: { fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 8 },
  rowActions: { display: 'flex', alignItems: 'center', gap: 10 },
  dlBtn: { padding: '5px 12px', border: '1px solid #e0e0de', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer', color: '#555' },
  arrow: { color: '#aaa', fontSize: 16 },
};
