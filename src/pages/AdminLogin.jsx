import React, { useState } from 'react';
import { apiFetch, setToken } from '../api';
import sound from '../soundEngine';
import SoundToggle from '../components/SoundToggle';
import { Lock, User, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    sound.init();

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      if (res.token) {
        setToken(res.token);
        sound.playCorrect();
        window.location.hash = '#/admin';
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
      sound.playWrong();
    } finally {
      setLoading(false);
    }
  };

  const isPendingError = error.toLowerCase().includes('pending') || error.toLowerCase().includes('approval');

  return (
    <div className="app-container">
      <header className="navbar">
        <a href="#/" className="brand-logo">
          <span>PS SkillSift</span>
          <span className="brand-badge">Admin Portal</span>
        </a>
        <SoundToggle />
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div className="glass-panel animate-pop" style={{ maxWidth: '420px', width: '100%', padding: '2.5rem 2rem' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #1368ce, #46178f)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <ShieldCheck size={32} color="#fff" />
          </div>

          <h1 style={{ fontSize: '1.8rem', fontWeight: '900', textAlign: 'center', marginBottom: '0.35rem' }}>
            Host & Admin Login
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', marginBottom: '1.75rem' }}>
            Protected with Secure JWT Authentication
          </p>

          {error && (
            <div style={{
              background: isPendingError ? 'rgba(216, 158, 0, 0.2)' : 'rgba(226, 27, 60, 0.25)',
              border: `1px solid ${isPendingError ? '#d89e00' : '#e21b3c'}`,
              color: isPendingError ? '#ffda6b' : '#ff99aa',
              padding: '0.85rem', borderRadius: '8px', marginBottom: '1.25rem',
              fontSize: '0.88rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', lineHeight: '1.4'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>
                Email or Username
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-input"
                  placeholder="admin or user@example.com"
                  style={{ paddingLeft: '2.5rem' }}
                />
                <User size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="••••••••"
                  style={{ paddingLeft: '2.5rem' }}
                />
                <Lock size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ marginTop: '0.5rem', height: '48px' }}
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <a href="#/signup" style={{ color: '#ffda6b', fontSize: '0.9rem', fontWeight: '700', textDecoration: 'none' }}>
              Need an Admin Account? Request Access →
            </a>
            <a href="#/" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none' }}>
              ← Return to Participant Screen
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
