import React, { useState } from 'react';
import { apiFetch } from '../api';
import sound from '../soundEngine';
import SoundToggle from '../components/SoundToggle';
import { Lock, Mail, ArrowRight, Shield, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function AdminSignup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      sound.playWrong();
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      sound.playWrong();
      return;
    }

    setLoading(true);
    sound.init();

    try {
      await apiFetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      setSuccess(true);
      sound.playCorrect();
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      sound.playWrong();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="navbar">
        <a href="#/" className="brand-logo">
          <span>PS SkillSift</span>
          <span className="brand-badge">Admin Registration</span>
        </a>
        <SoundToggle />
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div className="glass-panel animate-pop" style={{ maxWidth: '440px', width: '100%', padding: '2.5rem 2rem' }}>
          {success ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '68px', height: '68px', borderRadius: '50%', background: 'linear-gradient(135deg, #d89e00, #ffda6b)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem',
                color: '#111', boxShadow: '0 0 25px rgba(216, 158, 0, 0.4)'
              }}>
                <Clock size={36} />
              </div>

              <h2 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '0.75rem', color: '#ffda6b' }}>
                Registration Submitted!
              </h2>

              <div style={{
                background: 'rgba(216, 158, 0, 0.15)', border: '1px solid rgba(216, 158, 0, 0.35)',
                borderRadius: '12px', padding: '1.25rem', marginBottom: '1.75rem', textAlign: 'left'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: '700', color: '#ffda6b' }}>
                  <CheckCircle size={18} />
                  <span>Account Status: Pending Approval</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
                  Your account for <strong style={{ color: '#fff' }}>{email}</strong> has been created. The Super Admin must review and approve your account before you can log in and create quizzes.
                </p>
              </div>

              <a
                href="#/login"
                className="btn btn-primary"
                style={{ width: '100%', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
              >
                Go to Sign In
              </a>
            </div>
          ) : (
            <>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #864cbf, #1368ce)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem',
                boxShadow: 'var(--shadow-glow)'
              }}>
                <Shield size={32} color="#fff" />
              </div>

              <h1 style={{ fontSize: '1.8rem', fontWeight: '900', textAlign: 'center', marginBottom: '0.35rem' }}>
                Request Admin Access
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', marginBottom: '1.75rem' }}>
                Sign up as a Quiz Host / Admin. Your request will be reviewed by the Super Admin.
              </p>

              {error && (
                <div style={{
                  background: 'rgba(226, 27, 60, 0.25)', border: '1px solid #e21b3c',
                  color: '#ff99aa', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem',
                  fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}>
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>
                    Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="form-input"
                      placeholder="teacher@example.com"
                      style={{ paddingLeft: '2.5rem' }}
                    />
                    <Mail size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
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
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="form-input"
                      placeholder="••••••••"
                      style={{ paddingLeft: '2.5rem' }}
                    />
                    <Lock size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>
                    Confirm Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
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
                  <span>{loading ? 'Submitting Request...' : 'Register for Access'}</span>
                  <ArrowRight size={18} />
                </button>
              </form>

              <div style={{ marginTop: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <a href="#/login" style={{ color: '#ffda6b', fontSize: '0.9rem', fontWeight: '700', textDecoration: 'none' }}>
                  Already have an approved account? Sign In →
                </a>
                <a href="#/" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none' }}>
                  ← Return to Participant Screen
                </a>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
