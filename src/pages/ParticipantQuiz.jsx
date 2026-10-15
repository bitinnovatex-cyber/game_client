import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { apiFetch, getSocket } from '../api';
import sound from '../soundEngine';
import SoundToggle from '../components/SoundToggle';
import { 
  Triangle, 
  Diamond, 
  Circle, 
  Square, 
  Radio, 
  CheckCircle2, 
  XCircle, 
  Flame, 
  Trophy, 
  Users,
  Timer as TimerIcon,
  RefreshCw,
  Award,
  KeyRound,
  ArrowRight
} from 'lucide-react';

const SHAPES = [
  { icon: Triangle, color: 'color-red', label: 'Red Triangle', bg: '#e21b3c' },
  { icon: Diamond, color: 'color-blue', label: 'Blue Diamond', bg: '#1368ce' },
  { icon: Circle, color: 'color-yellow', label: 'Yellow Circle', bg: '#d89e00' },
  { icon: Square, color: 'color-green', label: 'Green Square', bg: '#26890c' }
];

export default function ParticipantQuiz() {
  // Extract initial PIN from URL query param if present (?pin=123456)
  const queryParams = new URLSearchParams(window.location.search);
  const initialPinParam = queryParams.get('pin') || '';

  const [pinInput, setPinInput] = useState(initialPinParam);
  const [activeQuizInfo, setActiveQuizInfo] = useState(null);
  const [checkingPin, setCheckingPin] = useState(false);
  const [pinError, setPinError] = useState('');

  const [nickname, setNickname] = useState(localStorage.getItem('skillsift_player_nick') || '');
  const [nicknameError, setNicknameError] = useState('');

  // Try restoring existing joined player from sessionStorage
  const [joinedPlayer, setJoinedPlayer] = useState(() => {
    try {
      const saved = sessionStorage.getItem('skillsift_active_player');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Game state: 'pin' | 'nickname' | 'lobby' | 'intro' | 'question' | 'answered' | 'result' | 'leaderboard' | 'podium' | 'kicked'
  const [gameState, setGameState] = useState(() => {
    const saved = sessionStorage.getItem('skillsift_active_player');
    return saved ? 'lobby' : 'pin';
  });

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [podiumData, setPodiumData] = useState(null);
  const [lobbyPlayers, setLobbyPlayers] = useState([]);

  const socketRef = useRef(null);
  const activeQuizRef = useRef(null);
  const joinedPlayerRef = useRef(joinedPlayer);

  useEffect(() => {
    activeQuizRef.current = activeQuizInfo;
  }, [activeQuizInfo]);

  useEffect(() => {
    joinedPlayerRef.current = joinedPlayer;
    if (joinedPlayer) {
      sessionStorage.setItem('skillsift_active_player', JSON.stringify(joinedPlayer));
    } else {
      sessionStorage.removeItem('skillsift_active_player');
    }
  }, [joinedPlayer]);

  // If initial PIN param was passed in URL, automatically validate it
  useEffect(() => {
    if (initialPinParam && /^\d{6}$/.test(initialPinParam.trim()) && !joinedPlayer) {
      validateAndLookupPin(initialPinParam.trim());
    }
  }, [initialPinParam]);

  // Validate 6-digit game PIN
  const validateAndLookupPin = async (pinToTest) => {
    const clean = (pinToTest || pinInput).trim();
    if (!/^\d{6}$/.test(clean)) {
      setPinError('Please enter a valid 6-digit Game PIN.');
      sound.playWrong();
      return;
    }

    setPinError('');
    setCheckingPin(true);
    sound.init();

    try {
      const res = await apiFetch(`/api/sessions/pin/${clean}`);
      if (res.valid && res.session) {
        setActiveQuizInfo(res.session);
        setGameState('nickname');
        sound.playCorrect();
      } else {
        setPinError(res.error || 'No active quiz found with this PIN.');
        sound.playWrong();
      }
    } catch (err) {
      setPinError(err.message || 'Game PIN not found or game has already ended.');
      sound.playWrong();
    } finally {
      setCheckingPin(false);
    }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    validateAndLookupPin();
  };

  // Setup Socket.io listeners
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const handleConnect = () => {
      console.log('[Socket] Connected / Reconnected');
      const saved = joinedPlayerRef.current;
      if (saved) {
        socket.emit('join-lobby', {
          sessionId: saved.sessionId,
          pin: saved.pin,
          nickname: saved.nickname,
          playerId: saved.id
        }, (res) => {
          if (res && res.success) {
            console.log('[Socket] Re-attached successfully:', res);
            setJoinedPlayer(res.player);
            setGameState(res.gameState || 'lobby');
            if (res.currentQuestion) {
              setCurrentQuestion(res.currentQuestion);
              setTimeLeft(res.timeLeft || 0);
              if (res.answered) {
                setGameState('answered');
              }
            }
          } else {
            console.log('[Socket] Saved session is expired or inactive:', res?.error);
            sessionStorage.removeItem('skillsift_active_player');
            setJoinedPlayer(null);
            setGameState('pin');
          }
        });
      }
    };

    socket.on('connect', handleConnect);
    if (socket.connected) {
      handleConnect();
    }

    socket.on('lobby-update', (data) => {
      setLobbyPlayers(data.players || []);
      if (data.quizTitle) {
        setActiveQuizInfo(prev => prev ? ({ ...prev, quizTitle: data.quizTitle }) : { quizTitle: data.quizTitle });
      }
    });

    socket.on('question-intro', (data) => {
      setGameState('intro');
      setCurrentQuestion(data);
      setSelectedOptionId(null);
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
      setSelectedOptionId(null);
      setResultData(null);
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

    socket.on('player-question-result', (data) => {
      setGameState('result');
      setResultData(data);
      if (data.isCorrect) {
        sound.playCorrect();
      } else {
        sound.playWrong();
      }
    });

    socket.on('show-leaderboard', (data) => {
      setGameState('leaderboard');
      setLeaderboardData(data.leaderboard);
      sound.playSelect();
    });

    socket.on('game-podium', (data) => {
      setGameState('podium');
      setPodiumData(data);
      sound.playFanfare();
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 }
      });
    });

    socket.on('player-kicked', (data) => {
      console.log('Kicked from game:', data);
      setGameState('kicked');
      setJoinedPlayer(null);
      sessionStorage.removeItem('skillsift_active_player');
      sound.playWrong();
    });

    // When the host ends the quiz: automatically refresh participants back to initial PIN screen
    socket.on('game-ended', () => {
      console.log('[Socket] Quiz has concluded by host. Resetting back to Game PIN.');
      sessionStorage.removeItem('skillsift_active_player');
      setJoinedPlayer(null);
      setActiveQuizInfo(null);
      setGameState('pin');
      window.location.reload();
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('lobby-update');
      socket.off('question-intro');
      socket.off('intro-tick');
      socket.off('question-start');
      socket.off('timer-tick');
      socket.off('player-question-result');
      socket.off('show-leaderboard');
      socket.off('game-podium');
      socket.off('player-kicked');
      socket.off('game-ended');
    };
  }, []);

  // Join the game with nickname
  const handleJoinGame = (e) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setNicknameError('Please enter a nickname!');
      return;
    }
    setNicknameError('');
    sound.init();

    const socket = getSocket();
    const cleanNick = nickname.trim();
    localStorage.setItem('skillsift_player_nick', cleanNick);

    const targetSessionId = activeQuizInfo?.id;
    const targetPin = activeQuizInfo?.pin;

    socket.emit('join-lobby', {
      sessionId: targetSessionId,
      pin: targetPin,
      nickname: cleanNick,
      playerId: joinedPlayerRef.current?.id
    }, (res) => {
      if (res && res.success) {
        setJoinedPlayer(res.player);
        setGameState(res.gameState || 'lobby');
        if (res.currentQuestion) {
          setCurrentQuestion(res.currentQuestion);
          setTimeLeft(res.timeLeft || 0);
          if (res.answered) {
            setGameState('answered');
          }
        }
        sound.playSelect();
      } else {
        setNicknameError(res?.error || 'Failed to join game');
      }
    });
  };

  // Submit Answer
  const handleAnswerClick = (optionId) => {
    if (gameState !== 'question' || selectedOptionId) return;
    setSelectedOptionId(optionId);
    setGameState('answered');
    sound.playSelect();

    const socket = getSocket();
    socket.emit('submit-answer', {
      sessionId: activeQuizInfo?.id || joinedPlayer?.sessionId,
      playerId: joinedPlayer?.id,
      optionId
    }, (res) => {
      if (!res?.success) {
        console.error('Answer submission note:', res?.error);
      }
    });
  };

  // ==========================================
  // RENDER: KICKED OUT BY HOST
  // ==========================================
  if (gameState === 'kicked') {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
        <div className="glass-panel animate-pop" style={{ maxWidth: '440px', width: '100%', padding: '3rem 2rem', background: '#250720' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%', background: '#e21b3c',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
            boxShadow: '0 0 25px rgba(226, 27, 60, 0.6)'
          }}>
            <XCircle size={44} color="#fff" />
          </div>

          <h2 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '0.75rem', color: '#ff6677' }}>
            Removed by Host
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: '1.5' }}>
            You have been removed from this live session by the quiz host.
          </p>

          <button
            onClick={() => {
              setGameState('pin');
              setJoinedPlayer(null);
              setActiveQuizInfo(null);
              sessionStorage.removeItem('skillsift_active_player');
            }}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.9rem' }}
          >
            Back to PIN Entry
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: 1. ENTER GAME PIN (INITIAL SCREEN)
  // ==========================================
  if (!joinedPlayer && (gameState === 'pin' || !activeQuizInfo)) {
    return (
      <div className="app-container" style={{ justifyContent: 'space-between' }}>
        <header className="navbar">
          <div className="brand-logo">
            <span>PS SkillSift</span>
            <span className="brand-badge">Live</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <SoundToggle />
            <a href="#/login" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textDecoration: 'none', fontWeight: '600' }}>
              Host Login
            </a>
          </div>
        </header>

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
          <div className="glass-panel animate-pop" style={{ maxWidth: '440px', width: '100%', padding: '3rem 2rem' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #1368ce, #46178f)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem', boxShadow: 'var(--shadow-glow)'
            }}>
              <KeyRound size={36} color="#fff" />
            </div>

            <h1 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '0.5rem', letterSpacing: '-0.5px' }}>
              Enter Game PIN
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1.75rem' }}>
              Enter the 6-digit PIN displayed on the host's screen
            </p>

            {pinError && (
              <div style={{
                background: 'rgba(226, 27, 60, 0.25)', border: '1px solid #e21b3c',
                color: '#ff99aa', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem',
                fontSize: '0.88rem'
              }}>
                {pinError}
              </div>
            )}

            <form onSubmit={handlePinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="text"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Game PIN"
                className="form-input"
                style={{
                  fontSize: '1.8rem',
                  textAlign: 'center',
                  fontWeight: '900',
                  letterSpacing: '4px',
                  height: '64px'
                }}
                autoFocus
              />

              <button 
                type="submit" 
                disabled={checkingPin || pinInput.length < 6}
                className="btn btn-primary"
                style={{ height: '56px', fontSize: '1.2rem', marginTop: '0.5rem' }}
              >
                {checkingPin ? (
                  <>
                    <RefreshCw size={20} className="spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <span>Enter</span>
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>
          </div>
        </main>

        <footer style={{ textAlign: 'center', padding: '1.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
          PS SkillSift • Real-Time Isolated Quiz Rooms
        </footer>
      </div>
    );
  }

  // ==========================================
  // RENDER: 2. ENTER NICKNAME (STEP 2)
  // ==========================================
  if (!joinedPlayer && gameState === 'nickname' && activeQuizInfo) {
    return (
      <div className="app-container">
        <header className="navbar">
          <div className="brand-logo">
            <span>PS SkillSift</span>
            <span className="brand-badge">PIN: {activeQuizInfo.pin}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <SoundToggle />
            <button
              onClick={() => {
                setActiveQuizInfo(null);
                setGameState('pin');
              }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              Change PIN
            </button>
          </div>
        </header>

        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="glass-panel animate-pop" style={{ maxWidth: '440px', width: '100%', padding: '2.5rem 2rem', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ffda6b' }}>
                🎯 {activeQuizInfo.quizTitle || 'Live Quiz'}
              </span>
            </div>

            <h2 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '0.5rem' }}>
              Join the Game!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.75rem' }}>
              Enter your name or nickname to display on the leaderboard
            </p>

            {nicknameError && (
              <div style={{ background: 'rgba(226, 27, 60, 0.25)', border: '1px solid #e21b3c', color: '#ff99aa', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {nicknameError}
              </div>
            )}

            <form onSubmit={handleJoinGame} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <input
                  type="text"
                  maxLength={25}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Enter your Name"
                  className="form-input"
                  style={{ fontSize: '1.2rem', textAlign: 'center', fontWeight: '700', height: '56px' }}
                  autoFocus
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ height: '56px', fontSize: '1.2rem', marginTop: '0.5rem' }}
              >
                OK, Go!
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // RENDER: 3. LOBBY WAITING SCREEN
  // ==========================================
  if (gameState === 'lobby' || (joinedPlayer && gameState === 'idle')) {
    return (
      <div className="app-container">
        <header className="navbar">
          <div className="brand-logo">
            <span>PS SkillSift</span>
            <span className="brand-badge">Lobby</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontWeight: '700', color: '#ffda6b' }}>👤 {joinedPlayer?.nickname}</span>
            <SoundToggle />
          </div>
        </header>

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
          <div className="glass-panel animate-pop" style={{ maxWidth: '500px', width: '100%', padding: '2.5rem 2rem' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%', background: '#26890c',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem',
              boxShadow: '0 0 20px rgba(38, 137, 12, 0.5)'
            }}>
              <CheckCircle2 size={44} color="#fff" />
            </div>

            <h2 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '0.5rem' }}>
              You're in!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '1.5rem' }}>
              See your nickname on the big screen?
            </p>

            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ffffff' }}>
                {joinedPlayer?.nickname}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Game PIN: <strong>{activeQuizInfo?.pin || joinedPlayer?.pin || '---'}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#ffda6b', fontWeight: '700', fontSize: '0.95rem' }}>
              <Users size={18} />
              <span>{lobbyPlayers.length || 1} players in lobby</span>
            </div>

            <div style={{ marginTop: '1.5rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', fontStyle: 'italic' }}>
              Waiting for the host to start the quiz...
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // RENDER: 4. QUESTION INTRO (3-2-1 GET READY)
  // ==========================================
  if (gameState === 'intro') {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
        <div className="animate-pop">
          <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffda6b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>
            Question {currentQuestion ? currentQuestion.questionIndex + 1 : 1} of {currentQuestion ? currentQuestion.totalQuestions : ''}
          </div>
          <h1 style={{ fontSize: '2.8rem', fontWeight: '900', marginBottom: '1.5rem' }}>
            Get Ready!
          </h1>
          <div style={{
            width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
            fontSize: '2.5rem', fontWeight: '900', border: '3px solid #ffffff'
          }}>
            ⚡
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: 5. ACTIVE QUESTION (4 OR 2 BUTTONS)
  // ==========================================
  if (gameState === 'question' || gameState === 'active') {
    const options = currentQuestion?.options || [];
    const isTwoChoice = options.length === 2;

    return (
      <div className="app-container">
        {/* Top Header */}
        <header className="navbar" style={{ padding: '0.75rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontWeight: '800', fontSize: '1.1rem' }}>Q{(currentQuestion?.questionIndex || 0) + 1}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>/ {currentQuestion?.totalQuestions || ''}</span>
          </div>

          {/* Central Timer Ring */}
          <div style={{
            background: timeLeft <= 5 ? '#e21b3c' : 'rgba(255,255,255,0.18)',
            padding: '0.4rem 1.1rem', borderRadius: '25px', display: 'flex',
            alignItems: 'center', gap: '0.5rem', fontWeight: '900', fontSize: '1.2rem',
            border: timeLeft <= 5 ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.3)',
            transition: 'all 0.2s'
          }}>
            <TimerIcon size={18} />
            <span>{timeLeft}s</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontWeight: '700', color: '#ffda6b' }}>{joinedPlayer?.nickname}</span>
            <SoundToggle />
          </div>
        </header>

        {/* Question Prompt */}
        <div style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
          <div className="glass-panel" style={{ padding: '1.25rem', maxWidth: '850px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: '800', lineHeight: '1.4' }}>
              {currentQuestion?.questionText || 'Look at the main screen for the question!'}
            </h2>
          </div>
        </div>

        {/* Answer Buttons Grid */}
        <main style={{ flex: 1, padding: '1rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isTwoChoice ? '1fr 1fr' : '1fr 1fr',
            gap: '1rem',
            flex: 1,
            maxWidth: '900px',
            width: '100%',
            margin: '0 auto'
          }}>
            {options.map((opt, idx) => {
              const shapeObj = SHAPES[opt.color_index !== undefined ? opt.color_index : idx % 4];
              const ShapeIcon = shapeObj.icon;

              return (
                <button
                  key={opt.id}
                  onClick={() => handleAnswerClick(opt.id)}
                  className={`participant-answer-btn ${shapeObj.color}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    padding: '1.5rem',
                    borderRadius: '16px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-card)',
                    position: 'relative'
                  }}
                >
                  <ShapeIcon size={44} color="#ffffff" />
                  <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff', textAlign: 'center' }}>
                    {opt.option_text}
                  </span>
                </button>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // RENDER: 6. ANSWER SUBMITTED WAITING SCREEN
  // ==========================================
  if (gameState === 'answered') {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
        <div className="glass-panel animate-pop" style={{ maxWidth: '440px', width: '100%', padding: '3rem 2rem' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem'
          }}>
            <CheckCircle2 size={44} color="#ffda6b" />
          </div>

          <h2 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '0.5rem' }}>
            Answer Locked In!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginBottom: '1.5rem' }}>
            Waiting for time to run out or other players to answer...
          </p>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#ffda6b', fontWeight: '700' }}>
            <TimerIcon size={18} />
            <span>Time Left: {timeLeft}s</span>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: 7. QUESTION RESULT
  // ==========================================
  if (gameState === 'result' && resultData) {
    const isCorrect = resultData.isCorrect;

    return (
      <div className="app-container" style={{
        alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem',
        background: isCorrect ? 'radial-gradient(circle at center, #1b5e20, #0a260d)' : 'radial-gradient(circle at center, #b71c1c, #400707)'
      }}>
        <div className="animate-pop" style={{ maxWidth: '440px', width: '100%' }}>
          <div style={{
            width: '90px', height: '90px', borderRadius: '50%',
            background: isCorrect ? '#26890c' : '#e21b3c',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
            boxShadow: isCorrect ? '0 0 30px rgba(38, 137, 12, 0.6)' : '0 0 30px rgba(226, 27, 60, 0.6)'
          }}>
            {isCorrect ? <CheckCircle2 size={54} color="#fff" /> : <XCircle size={54} color="#fff" />}
          </div>

          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '0.5rem' }}>
            {isCorrect ? 'Correct!' : 'Incorrect'}
          </h1>

          {isCorrect && (
            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#ffda6b', marginBottom: '1rem' }}>
              +{resultData.pointsAwarded} pts
            </div>
          )}

          {!isCorrect && resultData.correctOptions && resultData.correctOptions.length > 0 && (
            <div style={{
              background: 'rgba(38, 137, 12, 0.25)',
              border: '1px solid #26890c',
              borderRadius: '12px',
              padding: '0.65rem 1rem',
              color: '#4ade80',
              fontWeight: '700',
              fontSize: '1.05rem',
              marginBottom: '1rem'
            }}>
              Correct Choice: {resultData.correctOptions.map(o => o.option_text).join(', ')}
            </div>
          )}

          {resultData.streak > 1 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              background: 'rgba(255, 107, 0, 0.25)', border: '1px solid #ff6b00',
              padding: '0.4rem 1rem', borderRadius: '20px', color: '#ff8c37',
              fontWeight: '800', marginBottom: '1.5rem'
            }}>
              <Flame size={20} /> Streak of {resultData.streak}!
            </div>
          )}

          <div className="glass-panel" style={{ padding: '1.25rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rank</div>
                <div style={{ fontSize: '1.6rem', fontWeight: '900' }}>#{resultData.rank || 1}</div>
              </div>
              <div style={{ width: '1px', height: '35px', background: 'rgba(255,255,255,0.1)' }} />
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Score</div>
                <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#ffda6b' }}>{resultData.totalScore}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: 8. LEADERBOARD
  // ==========================================
  if (gameState === 'leaderboard') {
    return (
      <div className="app-container">
        <header className="navbar">
          <div className="brand-logo">
            <span>PS SkillSift</span>
            <span className="brand-badge">Scoreboard</span>
          </div>
          <SoundToggle />
        </header>

        <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '600px', width: '100%', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '900', textAlign: 'center', marginBottom: '1.5rem' }}>
            Top Scorers
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(leaderboardData || []).map((p, idx) => {
              const isMe = p.id === joinedPlayer?.id;
              return (
                <div
                  key={p.id}
                  className="glass-panel"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 1.25rem',
                    border: isMe ? '2px solid #ffda6b' : '1px solid var(--card-border)',
                    background: isMe ? 'rgba(255, 218, 107, 0.15)' : 'rgba(255,255,255,0.06)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: '900', width: '28px' }}>
                      #{idx + 1}
                    </span>
                    <span style={{ fontSize: '1.1rem', fontWeight: '800' }}>
                      {p.nickname} {isMe && '(You)'}
                    </span>
                  </div>

                  <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#ffda6b' }}>
                    {p.score} pts
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-muted)' }}>
            Next question starting soon...
          </div>
        </main>
      </div>
    );
  }

  // ==========================================
  // RENDER: 9. FINAL PODIUM / GAME OVER (NO NEXT BUTTON!)
  // ==========================================
  if (gameState === 'podium' || gameState === 'finished') {
    const myRank = podiumData?.podium?.findIndex(p => p.id === joinedPlayer?.id);
    const placedOnPodium = myRank !== -1 && myRank !== undefined;

    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
        <div className="animate-pop" style={{ maxWidth: '520px', width: '100%' }}>
          <div style={{
            width: '90px', height: '90px', borderRadius: '50%', background: '#ffd700',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
            color: '#111', boxShadow: '0 0 30px rgba(255, 215, 0, 0.6)'
          }}>
            <Trophy size={50} />
          </div>

          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '0.5rem' }}>
            {placedOnPodium ? 'Podium Finish! 🏆' : 'Quiz Complete! 🌟'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '2rem' }}>
            {podiumData?.quizTitle || 'Live Quiz'}
          </p>

          <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffda6b', marginBottom: '0.5rem' }}>
              {joinedPlayer?.nickname}
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '1rem' }}>
              {placedOnPodium ? `Place #${myRank + 1} on the Podium!` : 'Great participation!'}
            </div>
            <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
              Out of {podiumData?.totalPlayers || 1} total players
            </div>
          </div>

          <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontStyle: 'italic' }}>
            Waiting for host to conclude the session...
          </div>
        </div>
      </div>
    );
  }

  // Fallback safety
  return (
    <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
      <div className="glass-panel animate-pop" style={{ maxWidth: '440px', width: '100%', padding: '2.5rem 2rem' }}>
        <RefreshCw size={36} className="spin" style={{ color: '#ffda6b', margin: '0 auto 1.25rem' }} />
        <h2 style={{ fontSize: '1.6rem', fontWeight: '900', marginBottom: '0.5rem' }}>
          Connecting to Game...
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
          {joinedPlayer ? `Joined as ${joinedPlayer.nickname}. Waiting for host...` : 'Connecting to host session...'}
        </p>
        <button 
          onClick={() => {
            sessionStorage.removeItem('skillsift_active_player');
            setJoinedPlayer(null);
            setGameState('pin');
          }}
          className="btn btn-secondary"
          style={{ width: '100%' }}
        >
          Back to PIN Entry
        </button>
      </div>
    </div>
  );
}
