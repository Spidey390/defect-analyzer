import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>DA</div>
          <h1 style={styles.title}>Defect Analyzer</h1>
          <p style={styles.subtitle}>ML-powered risk classification</p>
        </div>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input style={styles.input} type="email" value={email}
              onChange={e => setEmail(e.target.value)} required placeholder="you@company.com" />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input style={styles.input} type="password" value={password}
              onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          <button style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p style={styles.foot}>
          No account? <Link to="/register" style={styles.link}>Create one</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f3' },
  card: { background: '#fff', borderRadius: 16, border: '1px solid #e5e5e3', padding: '40px 36px', width: '100%', maxWidth: 400 },
  logo: { textAlign: 'center', marginBottom: 28 },
  logoIcon: { width: 48, height: 48, borderRadius: 12, background: '#185FA5', color: '#fff', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' },
  title: { fontSize: 22, fontWeight: 600, color: '#1a1a1a', margin: '0 0 4px' },
  subtitle: { fontSize: 13, color: '#888', margin: 0 },
  error: { background: '#fff2f2', border: '1px solid #fca5a5', color: '#b91c1c', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: '#444' },
  input: { padding: '10px 12px', border: '1px solid #e0e0de', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit' },
  btn: { padding: '11px', background: '#185FA5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
  foot: { textAlign: 'center', fontSize: 13, color: '#888', marginTop: 20, marginBottom: 0 },
  link: { color: '#185FA5', textDecoration: 'none', fontWeight: 500 },
};
