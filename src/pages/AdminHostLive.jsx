import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { apiFetch, getSocket } from '../api';
import sound from '../soundEngine';
import SoundToggle from '../components/SoundToggle';
import { 
  Users, 
  Play, 
  SkipForward, 
  ArrowRight, 
  Trophy, 
  Flame, 
  Timer, 
  CheckCircle, 
  X, 
  Sparkles,
  Triangle,
  Diamond,
  Circle,
  Square,
  BarChart2,
  UserX,
  Search
} from 'lucide-react';

const SHAPES = [
  { icon: Triangle, color: 'color-red', label: 'Red Triangle', bg: '#e21b3c' },
  { icon: Diamond, color: 'color-blue', label: 'Blue Diamond', bg: '#1368ce' },
  { icon: Circle, color: 'color-yellow', label: 'Yellow Circle', bg: '#d89e00' },
  { icon: Square, color: 'color-green', label: 'Green Square', bg: '#26890c' }
];

export default function AdminHostLive({ sessionId }) {
  const [session, setSession] = useState(null);
  const [gameState, setGameState] = useState('lobby'); // 'lobby' | 'intro' | 'question' | 'result' | 'leaderboard' | 'podium'
  const [players, setPlayers] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [resultData, setResultData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const [podiumData, setPodiumData] = useState(null);

  // Players Management Modal state (available at all stages)
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [playerSearch, setPlayerSearch] = useState('');

  const socketRef = useRef(null);

  const handleKickPlayer = (playerId, nickname) => {
    if (window.confirm(`Kick "${nickname}" out of the quiz?`)) {
      sound.playTick();
      socketRef.current.emit('host-kick-player', { sessionId, playerId }, (res) => {
        if (res && res.success) {
          setPlayers(prev => prev.filter(p => p.id !== playerId));
        } else {
          alert(res?.error || 'Could not kick player');
        }
      });
    }
  };

  useEffect(() => {
    sound.init();
    const socket = getSocket();
    socketRef.current = socket;

    // Join room as Host
    socket.emit('host-join', { sessionId }, (res) => {
      if (res && res.success) {
        setSession(res.game);
        setPlayers(res.game.players || []);
        setGameState(res.game.state || 'lobby');
      } else {
        alert(res?.error || 'Could not connect to session as host');
        window.location.hash = '#/admin';
      }
    });

    socket.on('lobby-update', (data) => {
      setPlayers(data.players || []);
      if (session) {
        setSession(prev => ({ ...prev, pin: data.pin, title: data.quizTitle }));
      }
    });

    socket.on('question-intro', (data) => {
      setGameState('intro');
      setCurrentQuestion(data);
      setAnsweredCount(0);
      setResultData(null);
      sound.playSelect();
    });

    socket.on('intro-tick', () => {
      sound.playTick();
    });

    socket.on('question-start', (data) => {
      setGameState('question');
      setCurrentQuestion(data);
      setTimeLeft(data.timeLimit);
      setAnsweredCount(0);
      sound.playSelect();
    });

    socket.on('timer-tick', (data) => {
      setTimeLeft(data.timeLeft);
      if (data.timeLeft <= 5 && data.timeLeft > 0) {
        sound.playHurryTick();
      } else {
        sound.playTick();
      }
    });

    socket.on('answer-count-update', (data) => {
      setAnsweredCount(data.answeredCount);
    });

    socket.on('question-result', (data) => {
      setGameState('result');
      setResultData(data);
      sound.playCorrect();
    });

    socket.on('show-leaderboard', (data) => {
      setGameState('leaderboard');
      setLeaderboard(data.leaderboard || []);
      setIsLastQuestion(!!data.isLastQuestion);
      sound.playSelect();
    });

    socket.on('game-podium', (data) => {
      setGameState('podium');
      setPodiumData(data);
      sound.playFanfare();
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 }
      });
    });

    return () => {
      socket.off('lobby-update');
      socket.off('question-intro');
      socket.off('intro-tick');
      socket.off('question-start');
      socket.off('timer-tick');
      socket.off('answer-count-update');
      socket.off('question-result');
      socket.off('show-leaderboard');
      socket.off('game-podium');
    };
  }, [sessionId]);

  // Host Controls
  const handleStartQuiz = () => {
    sound.playSelect();
    socketRef.current.emit('host-start-quiz', { sessionId });
  };

  const handleNextQuestion = () => {
    sound.playSelect();
    socketRef.current.emit('host-next-question', { sessionId });
  };

  const handleSkipQuestion = () => {
    sound.playTick();
    socketRef.current.emit('host-skip-question', { sessionId });
  };

  const handleShowLeaderboard = () => {
    sound.playSelect();
    socketRef.current.emit('host-show-leaderboard', { sessionId });
  };

  const handleShowPodium = () => {
    sound.playFanfare();
    socketRef.current.emit('host-show-podium', { sessionId });
  };

  const handleEndSession = async () => {
    if (confirm('Are you sure you want to end this game session?')) {
      try {
        await apiFetch(`/api/sessions/${sessionId}/end`, { method: 'POST' });
        window.location.hash = '#/admin';
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const filteredPlayers = players.filter(p => 
    p.nickname.toLowerCase().includes(playerSearch.toLowerCase())
  );

  // Universal Player Management Modal (Callable from any stage)
  const renderPlayerModal = () => {
    if (!showPlayerModal) return null;
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
      }}>
        <div className="glass-panel animate-pop" style={{
          maxWidth: '560px', width: '100%', maxHeight: '85vh', background: '#1c0842',
          display: 'flex', flexDirection: 'column', padding: '1.75rem', overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Users size={22} color="#ffda6b" />
              <h3 style={{ fontSize: '1.35rem', fontWeight: '900' }}>Manage Players ({players.length})</h3>
            </div>
            <button
              onClick={() => setShowPlayerModal(false)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <X size={22} />
            </button>
          </div>

          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <Search size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={playerSearch}
              onChange={(e) => setPlayerSearch(e.target.value)}
              placeholder="Search player nickname..."
              className="form-input"
              style={{ paddingLeft: '2.5rem', fontSize: '0.95rem' }}
            />
          </div>

          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem', paddingRight: '0.3rem' }}>
            {filteredPlayers.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                {players.length === 0 ? 'No players have joined yet.' : `No players found matching "${playerSearch}"`}
              </div>
            ) : (
              filteredPlayers.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #1368ce, #46178f)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.9rem'
                    }}>
                      {p.nickname.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '1.05rem' }}>{p.nickname}</div>
                      <div style={{ fontSize: '0.75rem', color: '#ffda6b' }}>Score: {p.score || 0} pts</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleKickPlayer(p.id, p.nickname)}
                    className="btn btn-danger"
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', borderRadius: '6px' }}
                    title={`Kick ${p.nickname}`}
                  >
                    <UserX size={14} /> Kick
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!session) {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>Connecting to live session...</p>
      </div>
    );
  }

  // ==========================================
  // STAGE 1: LOBBY
  // ==========================================
  if (gameState === 'lobby') {
    return (
      <div className="app-container" style={{ justifyContent: 'space-between' }}>
        <header className="navbar" style={{ padding: '1rem 2.5rem' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Hosting Quiz</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '900' }}>{session.title}</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setShowPlayerModal(true)}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              <Users size={16} /> Players ({players.length})
            </button>
            <SoundToggle />
            <button onClick={handleEndSession} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              <X size={16} /> Cancel Game
            </button>
          </div>
        </header>

        {/* Big PIN Presentation Banner */}
        <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Open the website on your screen to join with Game PIN:
          </div>
          <div className="animate-pop" style={{
            display: 'inline-block',
            background: '#ffffff',
            color: '#130338',
            fontSize: '4.5rem',
            fontWeight: '900',
            padding: '1rem 3.5rem',
            borderRadius: '20px',
            boxShadow: 'var(--shadow-lg), 0 0 35px rgba(255,255,255,0.4)',
            letterSpacing: '6px'
          }}>
            {session.pin}
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', fontSize: '1.25rem', fontWeight: '800', color: '#ffda6b' }}>
            <Users size={24} />
            <span>{players.length} Players Joined</span>
          </div>
        </div>

        {/* Joined Players Grid with Kick Controls */}
        <main style={{ flex: 1, padding: '1rem 3rem', overflowY: 'auto' }}>
          {players.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '1.2rem', marginTop: '2rem' }}>
              Waiting for participants to join...
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              justifyContent: 'center',
              alignItems: 'center',
              maxWidth: '1100px',
              margin: '0 auto'
            }}>
              {players.map((p) => (
                <div
                  key={p.id}
                  className="animate-pop"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    padding: '0.65rem 1.25rem',
                    borderRadius: '25px',
                    fontSize: '1.25rem',
                    fontWeight: '800',
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <span>{p.nickname}</span>
                  <button
                    onClick={() => handleKickPlayer(p.id, p.nickname)}
                    style={{
                      background: 'rgba(226, 27, 60, 0.4)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '26px',
                      height: '26px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffaaaa',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title={`Kick ${p.nickname}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Footer with Start Quiz Button */}
        <footer style={{
          padding: '1.5rem 3rem',
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'rgba(0,0,0,0.3)',
          borderTop: '1px solid var(--card-border)'
        }}>
          <button
            onClick={handleStartQuiz}
            disabled={players.length === 0}
            className="btn btn-primary"
            style={{
              fontSize: '1.4rem',
              padding: '1rem 3rem',
              opacity: players.length === 0 ? 0.6 : 1
            }}
          >
            <Play size={24} fill="#25076b" /> Start Quiz
          </button>
        </footer>

        {renderPlayerModal()}
      </div>
    );
  }

  // ==========================================
  // STAGE 2: QUESTION INTRO
  // ==========================================
  if (gameState === 'intro') {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div className="animate-pop">
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ffda6b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>
            Question {currentQuestion?.questionIndex + 1} of {currentQuestion?.totalQuestions}
          </div>
          <h1 style={{ fontSize: '3.5rem', fontWeight: '900', maxWidth: '850px', lineHeight: '1.3' }}>
            {currentQuestion?.questionText}
          </h1>
        </div>
        {renderPlayerModal()}
      </div>
    );
  }

  // ==========================================
  // STAGE 3: LIVE QUESTION COUNTDOWN
  // ==========================================
  if (gameState === 'question') {
    const options = currentQuestion?.options || [];
    const isTwoChoice = options.length === 2;

    return (
      <div className="app-container">
        {/* Top Bar */}
        <header className="navbar" style={{ padding: '0.75rem 2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: '900' }}>
              Q{currentQuestion.questionIndex + 1} / {currentQuestion.totalQuestions}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <button
              onClick={() => setShowPlayerModal(true)}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
            >
              <Users size={16} /> Players ({players.length})
            </button>

            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#ffda6b' }}>
              Answers: <strong>{answeredCount}</strong> / {players.length}
            </div>

            <button onClick={handleSkipQuestion} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
              <SkipForward size={16} /> Skip Timer
            </button>
            <SoundToggle />
          </div>
        </header>

        {/* Question Prompt */}
        <div style={{ padding: '1.5rem 2rem 1rem', textAlign: 'center' }}>
          <div className="glass-panel" style={{ padding: '1.75rem 2rem', maxWidth: '1000px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: '900', lineHeight: '1.35' }}>
              {currentQuestion.questionText}
            </h1>
          </div>
        </div>

        {/* Central Timer & Answers Count */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '1rem 0' }}>
          <div style={{
            width: '90px',
            height: '90px',
            borderRadius: '50%',
            background: timeLeft <= 5 ? '#e21b3c' : '#1368ce',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            fontWeight: '900',
            color: '#fff',
            boxShadow: 'var(--shadow-lg)'
          }}>
            {timeLeft}
          </div>
        </div>

        {/* 4 Colored Options Cards Display */}
        <main style={{ flex: 1, padding: '1rem 2.5rem 2rem', display: 'flex' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isTwoChoice ? '1fr 1fr' : '1fr 1fr',
            gap: '1.25rem',
            flex: 1,
            maxWidth: '1100px',
            margin: '0 auto'
          }}>
            {options.map((opt, idx) => {
              const shapeObj = SHAPES[opt.color_index !== undefined ? opt.color_index : idx % 4];
              const ShapeIcon = shapeObj.icon;

              return (
                <div
                  key={opt.id}
                  className={`answer-card ${shapeObj.color}`}
                  style={{
                    padding: '1.5rem 2rem',
                    fontSize: '1.4rem',
                    fontWeight: '800',
                    cursor: 'default'
                  }}
                >
                  <div className="answer-shape-icon">
                    <ShapeIcon size={34} strokeWidth={2.5} />
                  </div>
                  <span style={{ wordBreak: 'break-word' }}>{opt.option_text}</span>
                </div>
              );
            })}
          </div>
        </main>

        {renderPlayerModal()}
      </div>
    );
  }

  // ==========================================
  // STAGE 4: QUESTION RESULT REVEAL (BAR CHART)
  // ==========================================
  if (gameState === 'result' && resultData) {
    const stats = resultData.answerStats || [0, 0, 0, 0];
    const maxVal = Math.max(...stats, 1);
    const correctIds = resultData.correctOptionIds || [];

    return (
      <div className="app-container">
        <header className="navbar" style={{ padding: '0.75rem 2.5rem' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: '900' }}>
            Question {resultData.questionIndex + 1} Results
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setShowPlayerModal(true)}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              <Users size={16} /> Players ({players.length})
            </button>
            <button onClick={handleShowLeaderboard} className="btn btn-primary" style={{ padding: '0.65rem 1.75rem', fontSize: '1.1rem' }}>
              <span>Show Leaderboard</span>
              <ArrowRight size={20} />
            </button>
            <SoundToggle />
          </div>
        </header>

        <div style={{ padding: '1rem 2rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '800', maxWidth: '850px', margin: '0 auto' }}>
            {resultData.questionText}
          </h2>
        </div>

        {/* Answer Distribution Bar Chart */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1rem 3rem' }}>
          <div className="stat-bar-container" style={{ maxWidth: '800px', width: '100%', margin: '0 auto' }}>
            {stats.map((count, idx) => {
              const shapeObj = SHAPES[idx];
              const ShapeIcon = shapeObj.icon;
              const heightPercent = Math.max((count / maxVal) * 100, 15);

              return (
                <div key={idx} className="stat-bar-column">
                  <div style={{ fontSize: '1.3rem', fontWeight: '900', marginBottom: '0.5rem', color: '#fff' }}>
                    {count}
                  </div>
                  <div
                    className={`stat-bar-fill ${shapeObj.color}`}
                    style={{ height: `${heightPercent}%` }}
                  >
                    <ShapeIcon size={28} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Correct Answers Revealed */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
            {(resultData.correctOptions || []).map((opt) => (
              <div
                key={opt.id}
                style={{
                  background: '#26890c',
                  border: '2px solid #ffffff',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '1.25rem',
                  fontWeight: '800',
                  boxShadow: 'var(--shadow-glow)'
                }}
              >
                <CheckCircle size={24} />
                <span>Correct: {opt.option_text}</span>
              </div>
            ))}
          </div>
        </main>

        {renderPlayerModal()}
      </div>
    );
  }

  // ==========================================
  // STAGE 5: SCOREBOARD / LEADERBOARD
  // ==========================================
  if (gameState === 'leaderboard') {
    return (
      <div className="app-container">
        <header className="navbar" style={{ padding: '0.75rem 2.5rem' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: '900' }}>
            Scoreboard
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setShowPlayerModal(true)}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              <Users size={16} /> Players ({players.length})
            </button>
            {isLastQuestion ? (
              <button onClick={handleShowPodium} className="btn btn-primary" style={{ padding: '0.65rem 2rem', fontSize: '1.15rem' }}>
                <Trophy size={20} /> Final Podium
              </button>
            ) : (
              <button onClick={handleNextQuestion} className="btn btn-primary" style={{ padding: '0.65rem 2rem', fontSize: '1.15rem' }}>
                <span>Next Question</span>
                <ArrowRight size={20} />
              </button>
            )}
            <SoundToggle />
          </div>
        </header>

        <main style={{ flex: 1, padding: '2rem', maxWidth: '800px', width: '100%', margin: '0 auto' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', textAlign: 'center', marginBottom: '2rem' }}>
            Top 5 Leaderboard
          </h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {leaderboard.map((p, idx) => (
              <div
                key={p.id}
                className="glass-panel animate-pop"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.25rem 2rem',
                  border: idx === 0 ? '2px solid #ffd700' : '1px solid var(--card-border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '50%',
                    background: idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'rgba(255,255,255,0.2)',
                    color: idx <= 2 ? '#111' : '#fff', fontWeight: '900', fontSize: '1.2rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {idx + 1}
                  </div>
                  <span style={{ fontSize: '1.4rem', fontWeight: '800' }}>
                    {p.nickname}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  {p.streak > 1 && (
                    <span className="streak-badge"><Flame size={14} /> Streak {p.streak}</span>
                  )}
                  <span style={{ fontSize: '1.6rem', fontWeight: '900', color: '#ffda6b' }}>
                    {p.score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </main>

        {renderPlayerModal()}
      </div>
    );
  }

  // ==========================================
  // STAGE 6: FINAL PODIUM (1ST, 2ND, 3RD)
  // ==========================================
  if (gameState === 'podium' && podiumData) {
    const podium = podiumData.podium || [];
    const first = podium[0];
    const second = podium[1];
    const third = podium[2];

    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 2rem' }}>
        <header style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="brand-logo">
            <span>PS SkillSift</span>
            <span className="brand-badge">Podium</span>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setShowPlayerModal(true)}
              className="btn btn-secondary"
              style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}
            >
              <Users size={16} /> Players ({players.length})
            </button>
            <SoundToggle />
            <button
              onClick={() => { window.location.hash = '#/admin'; }}
              className="btn btn-primary"
              style={{ padding: '0.6rem 1.5rem' }}
            >
              Back to Dashboard
            </button>
          </div>
        </header>

        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: '900', marginBottom: '0.5rem', letterSpacing: '-0.5px' }}>
            🎉 Championship Podium 🎉
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>
            {podiumData.quizTitle}
          </p>
        </div>

        {/* 3D-styled Podium Stairs */}
        <div className="podium-container">
          {/* 2nd Place */}
          <div className="podium-step podium-step-2 animate-pop">
            <div style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem' }}>🥈</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '800' }}>{second?.nickname || '-'}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#333' }}>{second?.score || 0} pts</div>
            </div>
            <div style={{ marginTop: 'auto', marginBottom: '1.5rem', fontSize: '2.5rem', fontWeight: '900' }}>2</div>
          </div>

          {/* 1st Place */}
          <div className="podium-step podium-step-1 animate-pop">
            <div style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem' }}>👑</div>
              <div style={{ fontSize: '1.45rem', fontWeight: '900' }}>{first?.nickname || '-'}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#442200' }}>{first?.score || 0} pts</div>
            </div>
            <div style={{ marginTop: 'auto', marginBottom: '1.5rem', fontSize: '3rem', fontWeight: '900' }}>1</div>
          </div>

          {/* 3rd Place */}
          <div className="podium-step podium-step-3 animate-pop">
            <div style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem' }}>🥉</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '800' }}>{third?.nickname || '-'}</div>
              <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#eee' }}>{third?.score || 0} pts</div>
            </div>
            <div style={{ marginTop: 'auto', marginBottom: '1.5rem', fontSize: '2.2rem', fontWeight: '900' }}>3</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '1rem' }}>
          Total Players Hosted: <strong>{podiumData.totalPlayers}</strong>
        </div>

        {renderPlayerModal()}
      </div>
    );
  }

  return null;
}
