import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { analysisAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

export default function Analyze() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [mode, setMode] = useState('csv'); // 'csv' | 'jira' | 'git'
  const [projectName, setProjectName] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Git state
  const [gitUrl, setGitUrl] = useState('');

  // Jira state
  const [jiraConfig, setJiraConfig] = useState({ jira_base_url: '', jira_email: '', jira_api_token: '' });
  const [jiraProjects, setJiraProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [jiraStep, setJiraStep] = useState('config'); // 'config' | 'select'

  useEffect(() => {
    if (user && user.jira_base_url && user.jira_email && user.jira_api_token) {
      setJiraConfig({
        jira_base_url: user.jira_base_url,
        jira_email: user.jira_email,
        jira_api_token: user.jira_api_token,
      });
      // Optionally auto-fetch projects if configured
      const fetchProjects = async () => {
        try {
          const res = await analysisAPI.getJiraProjects();
          setJiraProjects(res.data.projects);
          setJiraStep('select');
        } catch (e) {
          // If auto-fetch fails (e.g. token expired), stay on config step
          console.error("Auto-fetch projects failed", e);
        }
      };
      fetchProjects();
    }
  }, [user]);

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles[0]) setFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'text/csv': ['.csv'] }, maxFiles: 1,
  });

  const handleCSVSubmit = async () => {
    if (!file) { setError('Please select a CSV file'); return; }
    if (!projectName.trim()) { setError('Please enter a project name'); return; }
    setError(''); setLoading(true);
    try {
      const res = await analysisAPI.uploadCSV(file, projectName);
      navigate(`/results/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed');
    } finally { setLoading(false); }
  };

  const handleJiraConnect = async () => {
    if (!jiraConfig.jira_base_url || !jiraConfig.jira_email || !jiraConfig.jira_api_token) {
      setError('Fill in all Jira fields'); return;
    }
    setError(''); setLoading(true);
    try {
      const resConfig = await authAPI.saveJiraConfig(jiraConfig);
      updateUser(resConfig.data);
      const res = await analysisAPI.getJiraProjects();
      setJiraProjects(res.data.projects);
      setJiraStep('select');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to connect to Jira');
    } finally { setLoading(false); }
  };

  const handleJiraAnalyze = async () => {
    if (!selectedProject) { setError('Select a project'); return; }
    setError(''); setLoading(true);
    try {
      const proj = jiraProjects.find(p => p.key === selectedProject);
      const res = await analysisAPI.analyzeJira(selectedProject, proj?.name || selectedProject);
      navigate(`/results/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Jira analysis failed');
    } finally { setLoading(false); }
  };

  const handleGitSubmit = async () => {
    if (!gitUrl.trim()) { setError('Please enter a Git repository URL'); return; }
    if (!projectName.trim()) { setError('Please enter a project name'); return; }
    setError(''); setLoading(true);
    try {
      const res = await analysisAPI.analyzeGit(gitUrl, projectName);
      navigate(`/results/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Git analysis failed');
    } finally { setLoading(false); }
  };

  return (
    <Layout>
      <div style={styles.header}>
        <h1 style={styles.h1}>New Analysis</h1>
        <p style={styles.sub}>Choose your data source to get started</p>
      </div>

      <div style={styles.tabs}>
        <button style={{ ...styles.tab, ...(mode === 'csv' ? styles.tabActive : {}) }} onClick={() => setMode('csv')}>
          Upload CSV
        </button>
        <button style={{ ...styles.tab, ...(mode === 'jira' ? styles.tabActive : {}) }} onClick={() => { setMode('jira'); setError(''); }}>
          Connect Jira
        </button>
        <button style={{ ...styles.tab, ...(mode === 'git' ? styles.tabActive : {}) }} onClick={() => { setMode('git'); setError(''); }}>
          Git Repository
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {mode === 'csv' && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Upload a CSV file</h2>
          <p style={styles.cardSub}>Your CSV should have columns: <code>module</code>, <code>bug_count</code>, <code>priority</code>, <code>severity</code>, <code>reopen_count</code></p>

          <div {...getRootProps()} style={{ ...styles.dropzone, ...(isDragActive ? styles.dropzoneActive : {}), ...(file ? styles.dropzoneDone : {}) }}>
            <input {...getInputProps()} />
            {file ? (
              <div style={styles.fileInfo}>
                <span style={styles.fileIcon}>📄</span>
                <span style={styles.fileName}>{file.name}</span>
                <button style={styles.clearBtn} onClick={(e) => { e.stopPropagation(); setFile(null); }}>✕</button>
              </div>
            ) : (
              <div style={styles.dropText}>
                <div style={styles.dropIcon}>⬆</div>
                <p style={styles.dropMain}>{isDragActive ? 'Drop your CSV here' : 'Drag & drop your CSV here'}</p>
                <p style={styles.dropSub}>or click to browse</p>
              </div>
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Project name</label>
            <input style={styles.input} value={projectName} onChange={e => setProjectName(e.target.value)}
              placeholder="e.g. Payment Service Q2 2024" />
          </div>

          <div style={styles.csvHint}>
            <strong>Example CSV format:</strong>
            <pre style={styles.pre}>{`module,bug_count,priority,severity,reopen_count\nAuthService,12,High,major,3\nPaymentGateway,8,Critical,blocker,1\nUserProfile,2,Low,minor,0`}</pre>
          </div>

          <button style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }} onClick={handleCSVSubmit} disabled={loading}>
            {loading ? 'Running analysis...' : 'Run Analysis'}
          </button>
        </div>
      )}

      {mode === 'jira' && jiraStep === 'config' && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Connect your Jira workspace</h2>
          <p style={styles.cardSub}>Generate an API token at <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" style={styles.link}>id.atlassian.com</a></p>

          {[
            { k: 'jira_base_url', label: 'Jira base URL', ph: 'https://yourcompany.atlassian.net' },
            { k: 'jira_email', label: 'Jira email', ph: 'you@company.com' },
            { k: 'jira_api_token', label: 'API token', ph: 'Your Jira API token' },
          ].map(({ k, label, ph }) => (
            <div key={k} style={styles.field}>
              <label style={styles.label}>{label}</label>
              <input style={styles.input} type={k === 'jira_api_token' ? 'password' : 'text'}
                value={jiraConfig[k]} onChange={e => setJiraConfig(c => ({ ...c, [k]: e.target.value }))} placeholder={ph} />
            </div>
          ))}
          <button style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }} onClick={handleJiraConnect} disabled={loading}>
            {loading ? 'Connecting...' : 'Connect & fetch projects'}
          </button>
        </div>
      )}

      {mode === 'jira' && jiraStep === 'select' && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Select a project</h2>
          <p style={styles.cardSub}>{jiraProjects.length} projects found in your workspace</p>
          <div style={styles.projectList}>
            {jiraProjects.map(p => (
              <div key={p.key}
                style={{ ...styles.projectItem, ...(selectedProject === p.key ? styles.projectItemActive : {}) }}
                onClick={() => setSelectedProject(p.key)}>
                <div style={styles.projectKey}>{p.key}</div>
                <div style={styles.projectName}>{p.name}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button style={styles.backBtn} onClick={() => { setJiraStep('config'); setSelectedProject(''); }}>Back</button>
            <button style={{ ...styles.submitBtn, flex: 1, opacity: loading ? 0.7 : 1 }} onClick={handleJiraAnalyze} disabled={loading}>
              {loading ? 'Fetching issues & running ML...' : `Analyze ${selectedProject || 'selected project'}`}
            </button>
          </div>
        </div>
      )}

      {mode === 'git' && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Analyze a Git repository</h2>
          <p style={styles.cardSub}>Provide a public repository URL to analyze code complexity and risk.</p>

          <div style={styles.field}>
            <label style={styles.label}>Repository URL</label>
            <input style={styles.input} value={gitUrl} onChange={e => setGitUrl(e.target.value)}
              placeholder="e.g. https://github.com/django/django" />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Project name</label>
            <input style={styles.input} value={projectName} onChange={e => setProjectName(e.target.value)}
              placeholder="e.g. Django Core Analysis" />
          </div>

          <div style={styles.csvHint}>
            <strong>What we analyze:</strong>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#666' }}>
              We clone the repository and calculate the <strong>Cyclomatic Complexity</strong> of each module. Modules with high complexity are flagged as high risk.
            </p>
          </div>

          <button style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }} onClick={handleGitSubmit} disabled={loading}>
            {loading ? 'Cloning & analyzing...' : 'Run Git Analysis'}
          </button>
        </div>
      )}
    </Layout>
  );
}

const styles = {
  header: { marginBottom: 24 },
  h1: { fontSize: 24, fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px' },
  sub: { fontSize: 14, color: '#888', margin: 0 },
  tabs: { display: 'flex', gap: 0, marginBottom: 24, background: '#f0f0ee', borderRadius: 10, padding: 4, width: 'fit-content' },
  tab: { padding: '8px 24px', border: 'none', borderRadius: 7, background: 'transparent', fontSize: 14, fontWeight: 500, cursor: 'pointer', color: '#666' },
  tabActive: { background: '#fff', color: '#185FA5', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  card: { background: '#fff', borderRadius: 12, border: '1px solid #e5e5e3', padding: 32, maxWidth: 600 },
  cardTitle: { fontSize: 17, fontWeight: 600, color: '#1a1a1a', margin: '0 0 8px' },
  cardSub: { fontSize: 13, color: '#888', margin: '0 0 24px' },
  error: { background: '#fff2f2', border: '1px solid #fca5a5', color: '#b91c1c', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16, maxWidth: 600 },
  dropzone: { border: '2px dashed #d0d0ce', borderRadius: 10, padding: 32, textAlign: 'center', cursor: 'pointer', marginBottom: 20, transition: 'all .15s' },
  dropzoneActive: { border: '2px dashed #185FA5', background: '#EEF4FB' },
  dropzoneDone: { border: '2px solid #1D9E75', background: '#F0FAF5' },
  dropText: {},
  dropIcon: { fontSize: 28, marginBottom: 8 },
  dropMain: { fontSize: 14, fontWeight: 500, color: '#444', margin: '0 0 4px' },
  dropSub: { fontSize: 13, color: '#888', margin: 0 },
  fileInfo: { display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' },
  fileIcon: { fontSize: 20 },
  fileName: { fontSize: 14, fontWeight: 500, color: '#1D9E75' },
  clearBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 14 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#444', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #e0e0de', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
  csvHint: { background: '#f9f9f7', borderRadius: 8, padding: '12px 14px', marginBottom: 20, fontSize: 13 },
  pre: { margin: '6px 0 0', fontSize: 12, color: '#555', fontFamily: 'monospace', overflowX: 'auto' },
  submitBtn: { width: '100%', padding: 12, background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  link: { color: '#185FA5' },
  projectList: { display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' },
  projectItem: { display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', border: '1px solid #e5e5e3', borderRadius: 8, cursor: 'pointer', transition: 'all .12s' },
  projectItemActive: { border: '2px solid #185FA5', background: '#EEF4FB' },
  projectKey: { background: '#f0f0ee', color: '#555', fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 6 },
  projectName: { fontSize: 14, fontWeight: 500, color: '#333' },
  backBtn: { padding: '11px 20px', border: '1px solid #e0e0de', borderRadius: 8, background: '#fff', fontSize: 14, cursor: 'pointer', color: '#555' },
};
