import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/analyze', label: 'New Analysis' },
  { path: '/history', label: 'History' },
  { path: '/settings', label: 'Settings' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={styles.root}>
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <Link to="/dashboard" style={styles.brand}>
            <div style={styles.brandIcon}>DA</div>
            <span style={styles.brandText}>Defect Analyzer</span>
          </Link>
          <div style={styles.navLinks}>
            {NAV.map(({ path, label }) => (
              <Link key={path} to={path}
                style={{ ...styles.navLink, ...(location.pathname === path ? styles.navLinkActive : {}) }}>
                {label}
              </Link>
            ))}
            {user?.is_admin && (
              <Link to="/admin"
                style={{ ...styles.navLink, ...(location.pathname.startsWith('/admin') ? styles.navLinkActive : {}) }}>
                Admin
              </Link>
            )}
          </div>
          <div style={styles.userArea}>
            <span style={styles.userName}>{user?.full_name}</span>
            {user?.is_admin && <span style={styles.adminBadge}>Admin</span>}
            <button style={styles.logoutBtn} onClick={handleLogout}>Sign out</button>
          </div>
        </div>
      </nav>
      <main style={styles.main}>{children}</main>
    </div>
  );
}

const styles = {
  root: { minHeight: '100vh', background: '#f5f5f3', fontFamily: 'system-ui, -apple-system, sans-serif' },
  nav: { background: '#fff', borderBottom: '1px solid #e5e5e3', position: 'sticky', top: 0, zIndex: 100 },
  navInner: { maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 8 },
  brand: { display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginRight: 24 },
  brandIcon: { width: 32, height: 32, borderRadius: 8, background: '#185FA5', color: '#fff', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  brandText: { fontSize: 15, fontWeight: 600, color: '#1a1a1a' },
  navLinks: { display: 'flex', gap: 2, flex: 1 },
  navLink: { padding: '6px 12px', borderRadius: 6, fontSize: 14, color: '#666', textDecoration: 'none', fontWeight: 500 },
  navLinkActive: { background: '#EEF4FB', color: '#185FA5' },
  userArea: { display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' },
  userName: { fontSize: 13, color: '#555', fontWeight: 500 },
  adminBadge: { background: '#FFF3E0', color: '#E65100', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10 },
  logoutBtn: { padding: '5px 12px', border: '1px solid #e0e0de', borderRadius: 6, background: '#fff', color: '#666', fontSize: 13, cursor: 'pointer', fontWeight: 500 },
  main: { maxWidth: 1100, margin: '0 auto', padding: '32px 24px' },
};
