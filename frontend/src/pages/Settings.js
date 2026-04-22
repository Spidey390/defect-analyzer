import React, { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [jira, setJira] = useState({ jira_base_url: '', jira_email: '', jira_api_token: '' });
  const [jiraMsg, setJiraMsg] = useState('');
  const [jiraLoading, setJiraLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setJira({
        jira_base_url: user.jira_base_url || '',
        jira_email: user.jira_email || '',
        jira_api_token: user.jira_api_token || '',
      });
      console.log("Jira config loaded from user context:", user);
    }
  }, [user]);

  const setJ = (k) => (e) => setJira(j => ({ ...j, [k]: e.target.value }));

  const saveJira = async () => {
    if (!jira.jira_base_url || !jira.jira_email || !jira.jira_api_token) {
      setJiraMsg('Please fill in all Jira fields');
      return;
    }
    console.log("Saving Jira config:", jira);
    setJiraLoading(true); setJiraMsg('');
    try {
      const res = await authAPI.saveJiraConfig(jira);
      console.log("Jira config saved response:", res.data);
      updateUser(res.data);
      setJiraMsg('Jira credentials saved successfully');
    } catch (err) {
      setJiraMsg(err.response?.data?.detail || 'Failed to save');
    } finally { setJiraLoading(false); }
  };

  return (
    <Layout>
      <div style={styles.header}>
        <h1 style={styles.h1}>Settings</h1>
        <p style={styles.sub}>Manage your integrations and account</p>
      </div>

      {/* Profile card */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Account</div>
        <div style={styles.card}>
          <div style={styles.profileRow}>
            <div style={styles.avatar}>{user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</div>
            <div>
              <div style={styles.profileName}>{user?.full_name}</div>
              <div style={styles.profileEmail}>{user?.email}</div>
              {user?.is_admin && <span style={styles.adminBadge}>Admin</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Jira config */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Jira integration</div>
        <div style={styles.card}>
          <p style={styles.cardDesc}>
            Connect your Jira workspace to fetch bug data directly. Generate an API token at{' '}
            <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" style={styles.link}>
              Atlassian account settings
            </a>.
          </p>
          {[
            { k: 'jira_base_url', label: 'Jira base URL', ph: 'https://yourcompany.atlassian.net', type: 'text' },
            { k: 'jira_email', label: 'Email address', ph: 'you@company.com', type: 'email' },
            { k: 'jira_api_token', label: 'API token', ph: 'Your Jira API token', type: 'password' },
          ].map(({ k, label, ph, type }) => (
            <div key={k} style={styles.field}>
              <label style={styles.label}>{label}</label>
              <input style={styles.input} type={type} value={jira[k]} onChange={setJ(k)} placeholder={ph} />
            </div>
          ))}
          {jiraMsg && (
            <div style={{ ...styles.msg, background: jiraMsg.includes('success') ? '#f0faf5' : '#fff2f2', color: jiraMsg.includes('success') ? '#0F6E56' : '#b91c1c', borderColor: jiraMsg.includes('success') ? '#6ee7b7' : '#fca5a5' }}>
              {jiraMsg}
            </div>
          )}
          <button style={{ ...styles.saveBtn, opacity: jiraLoading ? 0.7 : 1 }} onClick={saveJira} disabled={jiraLoading}>
            {jiraLoading ? 'Saving...' : 'Save Jira credentials'}
          </button>
        </div>
      </div>

      {/* Power BI info */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Power BI integration</div>
        <div style={styles.card}>
          <p style={styles.cardDesc}>Power BI credentials are configured server-side via environment variables. Ask your admin to set these in the <code>.env</code> file.</p>
          <div style={styles.envList}>
            {['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'POWERBI_WORKSPACE_ID', 'POWERBI_DATASET_ID'].map(k => (
              <div key={k} style={styles.envRow}>
                <code style={styles.envKey}>{k}</code>
                <span style={styles.envDesc}>{envDescriptions[k]}</span>
              </div>
            ))}
          </div>
          <p style={{ ...styles.cardDesc, marginTop: 16 }}>
            Once configured, use the <strong>Sync to Power BI</strong> button on any results page to push that analysis to your Power BI push dataset.
          </p>
        </div>
      </div>
    </Layout>
  );
}

const envDescriptions = {
  AZURE_TENANT_ID: 'Your Azure AD Directory (tenant) ID',
  AZURE_CLIENT_ID: 'App registration client ID',
  AZURE_CLIENT_SECRET: 'App registration client secret',
  POWERBI_WORKSPACE_ID: 'Power BI workspace (group) ID',
  POWERBI_DATASET_ID: 'Push dataset ID (created on first sync)',
};

const styles = {
  header: { marginBottom: 28 },
  h1: { fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px' },
  sub: { fontSize: 14, color: '#888', margin: 0 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 },
  card: { background: '#fff', borderRadius: 12, border: '1px solid #e5e5e3', padding: '24px 28px', maxWidth: 600 },
  cardDesc: { fontSize: 13, color: '#666', marginBottom: 18, lineHeight: 1.6 },
  profileRow: { display: 'flex', alignItems: 'center', gap: 16 },
  avatar: { width: 48, height: 48, borderRadius: 12, background: '#185FA5', color: '#fff', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  profileName: { fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 2 },
  profileEmail: { fontSize: 13, color: '#888' },
  adminBadge: { background: '#FFF3E0', color: '#E65100', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 8, display: 'inline-block', marginTop: 4 },
  field: { marginBottom: 14 },
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#444', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #e0e0de', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
  msg: { border: '1px solid', borderRadius: 8, padding: '9px 13px', fontSize: 13, marginBottom: 14 },
  saveBtn: { padding: '10px 22px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  envList: { display: 'flex', flexDirection: 'column', gap: 8 },
  envRow: { display: 'flex', alignItems: 'baseline', gap: 12, padding: '8px 12px', background: '#f9f9f7', borderRadius: 6 },
  envKey: { fontSize: 12, fontFamily: 'monospace', color: '#185FA5', whiteSpace: 'nowrap', minWidth: 220 },
  envDesc: { fontSize: 12, color: '#666' },
  link: { color: '#185FA5' },
};
