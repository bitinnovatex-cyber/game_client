import React, { useState, useEffect } from 'react';
import { apiFetch, clearToken, getUserFromToken } from '../api';
import sound from '../soundEngine';
import SoundToggle from '../components/SoundToggle';
import { 
  Plus, 
  Play, 
  Edit3, 
  Trash2, 
  LogOut, 
  FileText, 
  Layers, 
  Users, 
  Trophy, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  X,
  Sparkles,
  Shield,
  ShieldCheck,
  UserCheck,
  UserX,
  AlertTriangle
} from 'lucide-react';

export default function AdminDashboard() {
  const currentUser = getUserFromToken();
  const isSuperAdmin = currentUser?.role === 'superadmin';

  const [activeTab, setActiveTab] = useState(isSuperAdmin ? 'users' : 'quizzes'); // 'users' | 'quizzes' | 'history'
  const [quizzes, setQuizzes] = useState([]);
  const [history, setHistory] = useState([]);
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [updatingUserId, setUpdatingUserId] = useState(null);

  useEffect(() => {
    fetchQuizzes();
    fetchHistory();
    if (isSuperAdmin) {
      fetchUsers();
    }
  }, [isSuperAdmin]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/quizzes');
      const list = Array.isArray(data) ? data : (data?.quizzes || []);
      setQuizzes(list);
    } catch (err) {
      console.error('Failed to load quizzes:', err);
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const data = await apiFetch('/api/sessions/history');
      const list = Array.isArray(data) ? data : (data?.history || []);
      setHistory(list);
    } catch (err) {
      console.error('Failed to load history:', err);
      setHistory([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await apiFetch('/api/auth/users');
      const list = Array.isArray(data) ? data : (data?.users || []);
      setUserList(list);
    } catch (err) {
      console.error('Failed to load users:', err);
      setUserList([]);
    }
  };

  const handleUpdateUserStatus = async (userId, newStatus) => {
    sound.playSelect();
    setUpdatingUserId(userId);
    try {
      await apiFetch(`/api/auth/users/${userId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      sound.playCorrect();
      fetchUsers();
    } catch (err) {
      sound.playWrong();
      alert('Failed to update status: ' + err.message);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleHostQuiz = async (quizId) => {
    if (isSuperAdmin) {
      alert('Super Admin has read-only access. Please log in with a standard Admin account to host live quizzes.');
      return;
    }
    sound.init();
    sound.playSelect();
    try {
      const res = await apiFetch('/api/sessions/launch', {
        method: 'POST',
        body: JSON.stringify({ quiz_id: quizId })
      });
      if (res.session?.id) {
        window.location.hash = `#/admin/host/${res.session.id}`;
      }
    } catch (err) {
      alert(err.message || 'Failed to launch live quiz session');
    }
  };

  const handleDeleteQuiz = async (quizId, title) => {
    if (isSuperAdmin) {
      alert('Super Admin has read-only access. Quiz deletion is restricted to the quiz owner.');
      return;
    }
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await apiFetch(`/api/quizzes/${quizId}`, { method: 'DELETE' });
        sound.playTick();
        fetchQuizzes();
      } catch (err) {
        alert(err.message || 'Failed to delete quiz');
      }
    }
  };

  const handleViewReport = async (sessionId) => {
    sound.playSelect();
    try {
      const data = await apiFetch(`/api/sessions/${sessionId}/report`);
      setSelectedReport(data);
    } catch (err) {
      alert('Failed to load report: ' + err.message);
    }
  };

  const handleLogout = () => {
    sound.playTick();
    clearToken();
    window.location.hash = '#/login';
  };

  const safeUserList = Array.isArray(userList) ? userList : [];
  const safeQuizzes = Array.isArray(quizzes) ? quizzes : [];
  const safeHistory = Array.isArray(history) ? history : [];
  const pendingUsersCount = safeUserList.filter(u => u && u.status === 'pending').length;

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="navbar">
        <div className="brand-logo">
          <span>PS SkillSift</span>
          <span className="brand-badge">{isSuperAdmin ? 'Super Admin' : 'Admin Hub'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            background: isSuperAdmin ? 'linear-gradient(135deg, rgba(255,215,0,0.25), rgba(216,158,0,0.15))' : 'rgba(255,255,255,0.12)',
            border: isSuperAdmin ? '1px solid rgba(255,215,0,0.4)' : '1px solid rgba(255,255,255,0.15)',
            padding: '0.4rem 0.9rem',
            borderRadius: '20px', fontSize: '0.85rem', fontWeight: '800', color: isSuperAdmin ? '#ffd700' : '#ffda6b',
            display: 'flex', alignItems: 'center', gap: '0.4rem'
          }}>
            {isSuperAdmin ? <ShieldCheck size={16} /> : <Shield size={16} />}
            {isSuperAdmin ? '👑 Super Admin' : (currentUser?.email ? `👤 ${currentUser.email}` : '👤 Admin')}
          </div>

          <SoundToggle />

          <button
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
            title="Log Out"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, padding: '2rem', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '1rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {isSuperAdmin && (
            <button
              onClick={() => { setActiveTab('users'); sound.playTick(); }}
              className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.65rem 1.5rem', position: 'relative' }}
            >
              <Users size={18} /> Admin Access & Requests ({safeUserList.length})
              {pendingUsersCount > 0 && (
                <span style={{
                  background: '#e21b3c', color: '#fff', fontSize: '0.75rem', fontWeight: '900',
                  padding: '2px 8px', borderRadius: '10px', marginLeft: '6px'
                }}>
                  {pendingUsersCount} pending
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => { setActiveTab('quizzes'); sound.playTick(); }}
            className={`btn ${activeTab === 'quizzes' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.65rem 1.5rem' }}
          >
            <Layers size={18} /> {isSuperAdmin ? `All Quizzes (${safeQuizzes.length})` : `My Quizzes (${safeQuizzes.length})`}
          </button>

          <button
            onClick={() => { setActiveTab('history'); sound.playTick(); }}
            className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.65rem 1.5rem' }}
          >
            <FileText size={18} /> Reports & History ({safeHistory.length})
          </button>

          {!isSuperAdmin && (
            <div style={{ marginLeft: 'auto' }}>
              <a
                href="#/admin/create"
                onClick={() => sound.playSelect()}
                className="btn btn-accent"
                style={{ padding: '0.65rem 1.5rem' }}
              >
                <Plus size={18} /> Create New Quiz
              </a>
            </div>
          )}
        </div>

        {/* ===================================== */}
        {/* SUPER ADMIN: USER APPROVAL TAB */}
        {/* ===================================== */}
        {isSuperAdmin && activeTab === 'users' && (
          <div>
            <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(70, 23, 143, 0.35)', border: '1px solid rgba(134, 76, 191, 0.4)' }}>
              <ShieldCheck size={24} color="#ffd700" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#ffd700', fontSize: '1rem' }}>Super Admin Authorization Control</strong>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '2px 0 0' }}>
                  Review and approve or reject admin registration requests. Only approved users can log in and create quizzes.
                </p>
              </div>
            </div>

            {safeUserList.length === 0 ? (
              <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                <Users size={48} color="rgba(255,255,255,0.3)" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.5rem' }}>No Registered Admins Yet</h3>
                <p style={{ color: 'var(--text-muted)' }}>
                  Prospective quiz hosts can register via the Sign Up page. When they register, their requests will appear here for your review.
                </p>
              </div>
            ) : (
              <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.03)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.92rem' }}>
                  <thead style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <tr>
                      <th style={{ padding: '1rem 1.25rem' }}>Admin Email</th>
                      <th style={{ padding: '1rem 1.25rem' }}>Requested Date</th>
                      <th style={{ padding: '1rem 1.25rem' }}>Current Status</th>
                      <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeUserList.map((u) => {
                      const isPending = u.status === 'pending';
                      const isApproved = u.status === 'approved';
                      const isRejected = u.status === 'rejected';

                      return (
                        <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <td style={{ padding: '1rem 1.25rem', fontWeight: '700' }}>
                            {u.email}
                          </td>
                          <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            {new Date(u.created_at).toLocaleString()}
                          </td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            {isPending && (
                              <span style={{
                                background: 'rgba(216, 158, 0, 0.25)', color: '#ffda6b',
                                border: '1px solid #d89e00', padding: '0.25rem 0.75rem',
                                borderRadius: '12px', fontSize: '0.8rem', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
                              }}>
                                <Clock size={13} /> Waiting Approval
                              </span>
                            )}
                            {isApproved && (
                              <span style={{
                                background: 'rgba(38, 137, 12, 0.25)', color: '#66ee88',
                                border: '1px solid #26890c', padding: '0.25rem 0.75rem',
                                borderRadius: '12px', fontSize: '0.8rem', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
                              }}>
                                <CheckCircle size={13} /> Approved
                              </span>
                            )}
                            {isRejected && (
                              <span style={{
                                background: 'rgba(226, 27, 60, 0.25)', color: '#ff8899',
                                border: '1px solid #e21b3c', padding: '0.25rem 0.75rem',
                                borderRadius: '12px', fontSize: '0.8rem', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
                              }}>
                                <XCircle size={13} /> Rejected
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                              {!isApproved && (
                                <button
                                  disabled={updatingUserId === u.id}
                                  onClick={() => handleUpdateUserStatus(u.id, 'approved')}
                                  className="btn"
                                  style={{
                                    background: '#26890c', color: '#fff', padding: '0.45rem 0.85rem',
                                    fontSize: '0.85rem', borderRadius: '6px'
                                  }}
                                  title="Approve access"
                                >
                                  <UserCheck size={16} /> Approve
                                </button>
                              )}
                              {!isRejected && (
                                <button
                                  disabled={updatingUserId === u.id}
                                  onClick={() => handleUpdateUserStatus(u.id, 'rejected')}
                                  className="btn btn-secondary"
                                  style={{
                                    color: '#ff8899', borderColor: '#e21b3c', padding: '0.45rem 0.85rem',
                                    fontSize: '0.85rem', borderRadius: '6px'
                                  }}
                                  title="Reject access"
                                >
                                  <UserX size={16} /> Reject
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 1: QUIZZES */}
        {/* ===================================== */}
        {activeTab === 'quizzes' && (
          <div>
            {isSuperAdmin && (
              <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.65rem', background: 'rgba(19, 104, 206, 0.2)', border: '1px solid rgba(19, 104, 206, 0.4)' }}>
                <AlertTriangle size={20} color="#77b5fe" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.88rem', color: '#cfe3ff' }}>
                  <strong>Super Admin Read-Only Mode:</strong> You can view all quizzes and see who created each quiz. Direct editing and hosting is reserved for individual quiz owners.
                </span>
              </div>
            )}

            {safeQuizzes.length === 0 && !loading ? (
              <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                <Sparkles size={48} color="#ffda6b" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem' }}>
                  No Quizzes Found
                </h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  {isSuperAdmin ? 'No users have created any quizzes yet.' : 'Create your first quiz with custom questions or generate them with Gemini AI in seconds!'}
                </p>
                {!isSuperAdmin && (
                  <a href="#/admin/create" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
                    <Plus size={18} /> Create First Quiz
                  </a>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
                {safeQuizzes.map((quiz) => (
                  <div key={quiz.id} className="glass-panel animate-pop" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span style={{
                          background: 'rgba(255,255,255,0.15)', padding: '0.25rem 0.65rem',
                          borderRadius: '12px', fontSize: '0.8rem', fontWeight: '800', color: '#ffda6b'
                        }}>
                          {quiz.question_count || 0} Slides
                        </span>
                        {isSuperAdmin && (
                          <span style={{
                            background: 'rgba(134, 76, 191, 0.3)', border: '1px solid rgba(134, 76, 191, 0.5)',
                            padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700', color: '#e0b8ff'
                          }}>
                            👤 {quiz.creator_email || 'Admin'}
                          </span>
                        )}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(quiz.updated_at).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '0.5rem', lineHeight: '1.3' }}>
                        {quiz.title}
                      </h3>
                      {quiz.description && (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: '1.4' }}>
                          {quiz.description}
                        </p>
                      )}
                    </div>

                    {!isSuperAdmin ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                        <button
                          onClick={() => handleHostQuiz(quiz.id)}
                          className="btn btn-primary"
                          style={{ flex: 1, padding: '0.65rem 1rem', fontSize: '0.95rem' }}
                        >
                          <Play size={16} fill="#25076b" /> Host Live
                        </button>

                        <a
                          href={`#/admin/edit/${quiz.id}`}
                          onClick={() => sound.playSelect()}
                          className="btn btn-secondary"
                          style={{ padding: '0.65rem 0.9rem' }}
                          title="Edit Slides"
                        >
                          <Edit3 size={16} />
                        </a>

                        <button
                          onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                          className="btn btn-secondary"
                          style={{ padding: '0.65rem 0.9rem', color: '#ff7777' }}
                          title="Delete Quiz"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Created by: <strong style={{ color: '#ffda6b' }}>{quiz.creator_email || 'Admin'}</strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===================================== */}
        {/* TAB 2: REPORTS & STUDENT ATTENDANCE */}
        {/* ===================================== */}
        {activeTab === 'history' && (
          <div>
            {safeHistory.length === 0 ? (
              <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                <Trophy size={48} color="rgba(255,255,255,0.3)" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.5rem' }}>
                  No Completed Sessions Yet
                </h3>
                <p style={{ color: 'var(--text-muted)' }}>
                  Once a live quiz is hosted and finished, student attendance, choices, and scores will be stored here.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {safeHistory.map((h) => (
                  <div
                    key={h.id}
                    className="glass-panel"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1.25rem 1.75rem',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span>{h.quiz_title}</span>
                        {isSuperAdmin && h.creator_email && (
                          <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', background: 'rgba(134,76,191,0.3)', borderRadius: '10px', color: '#ffda6b', fontWeight: '700' }}>
                            by {h.creator_email}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                        <span>PIN: <strong>{h.pin}</strong></span>
                        <span>Date: {new Date(h.started_at).toLocaleString()}</span>
                        <span>Players: <strong>{h.total_players}</strong></span>
                        <span>Top Score: <strong>{h.top_score}</strong> pts</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleViewReport(h.id)}
                      className="btn btn-secondary"
                      style={{ padding: '0.55rem 1.25rem', fontSize: '0.9rem' }}
                    >
                      <Eye size={16} /> View Student Report
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Detailed Student Report Modal */}
      {selectedReport && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem'
        }}>
          <div className="glass-panel animate-pop" style={{
            maxWidth: '1000px', width: '100%', maxHeight: '90vh', background: '#1c0842',
            display: 'flex', flexDirection: 'column', padding: '2rem', overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: '900' }}>
                  Session Report: {selectedReport.session.quiz_title}
                </h2>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  PIN: {selectedReport.session.pin} • Total Players: {selectedReport.players.length} • Ended: {new Date(selectedReport.session.ended_at || selectedReport.session.started_at).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
              {/* Leaderboard Table */}
              <h4 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.75rem', color: '#ffda6b' }}>
                Student Leaderboard
              </h4>
              <div style={{ marginBottom: '2rem', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <tr>
                      <th style={{ padding: '0.75rem 1rem' }}>Rank</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Student Nickname</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Final Score</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Max Streak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReport.players.map((p, idx) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: '800' }}>#{idx + 1}</td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: '700' }}>{p.nickname}</td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: '800', color: '#ffda6b' }}>{p.score}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{p.streak} 🔥</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Individual Question Choices / Attendance Breakdown */}
              <h4 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.75rem', color: '#ffda6b' }}>
                Student Answers & Choices Detail
              </h4>
              <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--card-border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <tr>
                      <th style={{ padding: '0.75rem 1rem' }}>Student</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Question</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Choice Selected</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Result</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Time (s)</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReport.answers.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No individual answers logged for this session.
                        </td>
                      </tr>
                    ) : (
                      selectedReport.answers.map((ans) => (
                        <tr key={ans.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <td style={{ padding: '0.65rem 1rem', fontWeight: '700' }}>{ans.nickname}</td>
                          <td style={{ padding: '0.65rem 1rem', maxWidth: '280px' }}>{ans.question_text}</td>
                          <td style={{ padding: '0.65rem 1rem' }}>{ans.chosen_option_text || 'None'}</td>
                          <td style={{ padding: '0.65rem 1rem' }}>
                            {ans.is_correct ? (
                              <span style={{ color: '#44ff88', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <CheckCircle size={14} /> Correct
                              </span>
                            ) : (
                              <span style={{ color: '#ff6666', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <XCircle size={14} /> Wrong
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.65rem 1rem' }}>{(ans.time_taken_ms / 1000).toFixed(1)}s</td>
                          <td style={{ padding: '0.65rem 1rem', fontWeight: '800', color: '#ffda6b' }}>+{ans.points_awarded}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
