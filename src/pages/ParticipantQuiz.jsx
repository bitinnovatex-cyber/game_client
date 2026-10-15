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
  Sparkles, 
  Radio, 
  CheckCircle2, 
  XCircle, 
  Flame, 
  Trophy, 
  Users,
  Timer as TimerIcon,
  RefreshCw,
  Award
} from 'lucide-react';

const SHAPES = [
  { icon: Triangle, color: 'color-red', label: 'Red Triangle', bg: '#e21b3c' },
  { icon: Diamond, color: 'color-blue', label: 'Blue Diamond', bg: '#1368ce' },
  { icon: Circle, color: 'color-yellow', label: 'Yellow Circle', bg: '#d89e00' },
  { icon: Square, color: 'color-green', label: 'Green Square', bg: '#26890c' }
];

const FUN_NAMES = [
  'SpeedyCheetah', 'BrainyFalcon', 'CosmicOtter', 'QuantumFox', 
  'NeonTiger', 'PixelPanda', 'TurboEagle', 'HyperKoala', 
  'MegaDolphin', 'AstroWolf', 'SonicHawk', 'SolarGecko'
];

export default function ParticipantQuiz() {
  const [activeQuizInfo, setActiveQuizInfo] = useState(null);
  const [loadingActive, setLoadingActive] = useState(true);
  const [nickname, setNickname] = useState(localStorage.getItem('kahoot_player_nick') || '');
  
  // Try restoring existing joined player from sessionStorage
  const [joinedPlayer, setJoinedPlayer] = useState(() => {
    try {
      const saved = sessionStorage.getItem('kahoot_active_player');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  
  // Game state: 'idle' | 'lobby' | 'intro' | 'question' | 'answered' | 'result' | 'leaderboard' | 'podium'
  const [gameState, setGameState] = useState(() => {
    const saved = sessionStorage.getItem('kahoot_active_player');
    return saved ? 'lobby' : 'idle';
  });
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [podiumData, setPodiumData] = useState(null);
  const [lobbyPlayers, setLobbyPlayers] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  const socketRef = useRef(null);
  const activeQuizRef = useRef(null);
  const joinedPlayerRef = useRef(joinedPlayer);

  useEffect(() => {
    activeQuizRef.current = activeQuizInfo;
  }, [activeQuizInfo]);

  useEffect(() => {
    joinedPlayerRef.current = joinedPlayer;
    if (joinedPlayer) {
      sessionStorage.setItem('kahoot_active_player', JSON.stringify(joinedPlayer));
    } else {
      sessionStorage.removeItem('kahoot_active_player');
    }
  }, [joinedPlayer]);

  // 1. Check for active quiz (Only when not in a game)
  const checkActiveQuiz = async () => {
    // If player is already actively in a session, don't interfere
    if (joinedPlayerRef.current) return;

    try {
      setLoadingActive(true);
      const data = await apiFetch('/api/sessions/active');
      if (data.active && data.session) {
        setActiveQuizInfo(data.session);
        setGameState(prev => (prev === 'idle' ? 'lobby' : prev));
      } else {
        setActiveQuizInfo(null);
        setGameState('idle');
      }
    } catch (err) {
      console.error('Active quiz check:', err.message);
    } finally {
      setLoadingActive(false);
    }
  };

  useEffect(() => {
    checkActiveQuiz();
    const interval = setInterval(checkActiveQuiz, 5000);
    return () => clearInterval(interval);
  }, []);

  // 2. Setup Socket.io listeners (Stable setup, runs once)
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const handleConnect = () => {
      console.log('[Socket] Connected / Reconnected');
      // If we have a saved player, auto-rejoin/re-attach immediately
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
            sessionStorage.removeItem('kahoot_active_player');
            setJoinedPlayer(null);
            setGameState('idle');
            checkActiveQuiz();
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
      sessionStorage.removeItem('kahoot_active_player');
      sound.playWrong();
    });

    socket.on('game-ended', () => {
      setGameState('idle');
      setJoinedPlayer(null);
      setActiveQuizInfo(null);
      sessionStorage.removeItem('kahoot_active_player');
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
      setErrorMessage('Please enter a nickname!');
      return;
    }
    setErrorMessage('');
    sound.init();

    const socket = getSocket();
    const cleanNick = nickname.trim();
    localStorage.setItem('kahoot_player_nick', cleanNick);

    const saved = joinedPlayerRef.current;
    socket.emit('join-lobby', {
      sessionId: activeQuizInfo?.id,
      pin: activeQuizInfo?.pin,
      nickname: cleanNick,
      playerId: saved?.id
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
        setErrorMessage(res?.error || 'Failed to join game');
      }
    });
  };

  const handleRandomName = () => {
    const randomPick = FUN_NAMES[Math.floor(Math.random() * FUN_NAMES.length)] + Math.floor(Math.random() * 99);
    setNickname(randomPick);
    sound.playTick();
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
              setGameState('idle');
              sessionStorage.removeItem('kahoot_active_player');
            }}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.9rem' }}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: 1. NO ACTIVE QUIZ
  // ==========================================
  if (!joinedPlayer && !activeQuizInfo && !loadingActive) {
    return (
      <div className="app-container" style={{ justifyContent: 'space-between' }}>
        <header className="navbar">
          <div className="brand-logo">
            <span>Kahoot!</span>
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
          <div className="glass-panel animate-pop" style={{ maxWidth: '480px', width: '100%', padding: '3rem 2rem', position: 'relative' }}>
            <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 1.5rem' }}>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(134, 76, 191, 0.4)',
                animation: 'radarPing 2s infinite ease-out'
              }} />
              <div style={{
                position: 'relative', width: '100%', height: '100%', borderRadius: '50%',
                background: 'linear-gradient(135deg, #e21b3c, #1368ce)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-glow)'
              }}>
                <Radio size={36} color="#fff" />
              </div>
            </div>

            <h1 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '0.75rem', letterSpacing: '-0.5px' }}>
              No Active Quiz Right Now
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.5', marginBottom: '2rem' }}>
              Listening for games... When your teacher or quiz host starts a live game, it will appear right here automatically!
            </p>

            <button 
              onClick={checkActiveQuiz}
              disabled={loadingActive}
              className="btn btn-primary" 
              style={{ width: '100%', padding: '0.9rem' }}
            >
              <RefreshCw size={18} className={loadingActive ? 'spin' : ''} />
              {loadingActive ? 'Searching for Live Game...' : 'Scan for Live Quiz'}
            </button>
          </div>
        </main>

        <footer style={{ textAlign: 'center', padding: '1.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
          Kahoot! Real-Time Engine • High Performance WebSockets
        </footer>
      </div>
    );
  }

  // Loading state while checking active quiz
  if (!joinedPlayer && !activeQuizInfo && loadingActive) {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
        <div className="glass-panel animate-pop" style={{ maxWidth: '440px', width: '100%', padding: '3rem 2rem' }}>
          <RefreshCw size={36} className="spin" style={{ color: '#ffda6b', margin: '0 auto 1.25rem' }} />
          <h2 style={{ fontSize: '1.6rem', fontWeight: '900', marginBottom: '0.5rem' }}>
            Looking for Live Quiz...
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Connecting to host session...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: 2. ENTER NICKNAME TO JOIN
  // ==========================================
  if (!joinedPlayer) {
    return (
      <div className="app-container">
        <header className="navbar">
          <div className="brand-logo">
            <span>Kahoot!</span>
            <span className="brand-badge">PIN: {activeQuizInfo?.pin || '---'}</span>
          </div>
          <SoundToggle />
        </header>

        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="glass-panel animate-pop" style={{ maxWidth: '440px', width: '100%', padding: '2.5rem 2rem', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '20px', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ffda6b' }}>
                🎯 Live Quiz: {activeQuizInfo?.quizTitle || 'Live Quiz'}
              </span>
            </div>

            <h2 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '0.5rem' }}>
              Join the Game!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.75rem' }}>
              Choose a nickname to display on the leaderboard
            </p>

            {errorMessage && (
              <div style={{ background: 'rgba(226, 27, 60, 0.25)', border: '1px solid #e21b3c', color: '#ff99aa', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleJoinGame} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  maxLength={25}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Enter your Nickname"
                  className="form-input"
                  style={{ fontSize: '1.2rem', textAlign: 'center', fontWeight: '700', height: '56px' }}
                  autoFocus
                />
              </div>

              <button
                type="button"
                onClick={handleRandomName}
                style={{ background: 'none', border: 'none', color: '#ffda6b', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
              >
                <Sparkles size={16} /> Generate funny name
              </button>

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
            <span>Kahoot!</span>
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
                    padding: '1.5rem',
                    gap: '0.75rem'
                  }}
                >
                  <ShapeIcon size={38} strokeWidth={2.5} />
                  <span style={{ fontSize: '1.25rem', textAlign: 'center', wordBreak: 'break-word' }}>
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
  // RENDER: 6. ANSWER LOCKED IN (WAITING FOR TIME)
  // ==========================================
  if (gameState === 'answered') {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
        <div className="glass-panel animate-pop" style={{ maxWidth: '440px', width: '100%', padding: '3rem 2rem' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%', background: '#1368ce',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
            boxShadow: '0 0 25px rgba(19, 104, 206, 0.6)'
          }}>
            <CheckCircle2 size={44} color="#fff" />
          </div>

          <h2 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '0.75rem' }}>
            Answer Locked In!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginBottom: '1.5rem' }}>
            Hold on... Waiting for timer to finish or other players to answer.
          </p>

          <div style={{ fontSize: '0.9rem', color: '#ffda6b', fontWeight: '700' }}>
            ⚡ Speed counts for points!
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: 7. QUESTION RESULT REVEAL
  // ==========================================
  if (gameState === 'result') {
    if (!resultData) {
      return (
        <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
          <div className="glass-panel animate-pop" style={{ maxWidth: '440px', width: '100%', padding: '3rem 2rem' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '0.75rem' }}>Time's Up!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Calculating scores...</p>
          </div>
        </div>
      );
    }

    const isCorrect = resultData.isCorrect;

    return (
      <div className="app-container" style={{
        background: isCorrect 
          ? 'radial-gradient(circle at 50% 20%, #26890c 0%, #155406 60%, #0d3004 100%)' 
          : 'radial-gradient(circle at 50% 20%, #e21b3c 0%, #941026 60%, #4a0611 100%)',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem'
      }}>
        <div className="animate-pop" style={{ maxWidth: '480px', width: '100%' }}>
          <div style={{
            width: '100px', height: '100px', borderRadius: '50%', background: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
            boxShadow: 'var(--shadow-lg)'
          }}>
            {isCorrect ? (
              <CheckCircle2 size={60} color="#26890c" strokeWidth={2.5} />
            ) : (
              <XCircle size={60} color="#e21b3c" strokeWidth={2.5} />
            )}
          </div>

          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '0.5rem', letterSpacing: '-0.5px' }}>
            {isCorrect ? 'Correct!' : 'Incorrect'}
          </h1>

          <div style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '1.5rem', color: '#ffda6b' }}>
            {isCorrect ? `+${resultData.pointsAwarded} pts` : '+0 pts'}
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Total Score</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#fff' }}>{resultData.totalScore}</div>
            </div>

            <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.2)' }} />

            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Current Rank</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#ffda6b' }}>#{resultData.rank}</div>
            </div>

            {resultData.streak > 1 && (
              <>
                <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.2)' }} />
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Streak</div>
                  <div className="streak-badge" style={{ marginTop: '0.2rem' }}>
                    <Flame size={14} /> {resultData.streak}
                  </div>
                </div>
              </>
            )}
          </div>

          <div style={{ marginTop: '2rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
            Waiting for host to continue...
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: 8. SCOREBOARD / LEADERBOARD
  // ==========================================
  if (gameState === 'leaderboard') {
    if (!leaderboardData) {
      return (
        <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
          <div className="glass-panel animate-pop" style={{ maxWidth: '440px', width: '100%', padding: '3rem 2rem' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '0.75rem' }}>Scoreboard</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Updating standings...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="app-container">
        <header className="navbar">
          <div className="brand-logo">
            <span>Kahoot!</span>
            <span className="brand-badge">Scoreboard</span>
          </div>
          <SoundToggle />
        </header>

        <main style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '650px', width: '100%', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '900', textAlign: 'center', marginBottom: '1.75rem' }}>
            Top Players
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {leaderboardData.map((p, idx) => {
              const isMe = p.id === joinedPlayer?.id;
              return (
                <div
                  key={p.id}
                  className="glass-panel animate-pop"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 1.5rem',
                    border: isMe ? '2px solid #ffda6b' : '1px solid var(--card-border)',
                    background: isMe ? 'rgba(255, 218, 107, 0.15)' : 'var(--card-bg)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{
                      width: '34px', height: '34px', borderRadius: '50%',
                      background: idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'rgba(255,255,255,0.2)',
                      color: idx <= 2 ? '#111' : '#fff', fontWeight: '900', display: 'flex',
                      alignItems: 'center', justifyContent: 'center'
                    }}>
                      {idx + 1}
                    </span>
                    <span style={{ fontSize: '1.15rem', fontWeight: '800' }}>
                      {p.nickname} {isMe && '(You)'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {p.streak > 1 && (
                      <span className="streak-badge"><Flame size={12} /> {p.streak}</span>
                    )}
                    <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#ffda6b' }}>
                      {p.score}
                    </span>
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
  // RENDER: 9. FINAL PODIUM / GAME OVER
  // ==========================================
  if (gameState === 'podium' || gameState === 'finished') {
    if (!podiumData) {
      return (
        <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
          <div className="glass-panel animate-pop" style={{ maxWidth: '440px', width: '100%', padding: '3rem 2rem' }}>
            <Trophy size={48} color="#ffd700" style={{ margin: '0 auto 1.25rem' }} />
            <h2 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '0.75rem' }}>Quiz Finished!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Look at the big screen for final podium winners!</p>
          </div>
        </div>
      );
    }

    const myRank = podiumData.podium?.findIndex(p => p.id === joinedPlayer?.id);
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
            {podiumData.quizTitle}
          </p>

          <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffda6b', marginBottom: '0.5rem' }}>
              {joinedPlayer?.nickname}
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '1rem' }}>
              {placedOnPodium ? `Place #${myRank + 1} on the Podium!` : 'Great participation!'}
            </div>
            <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
              Out of {podiumData.totalPlayers} total players
            </div>
          </div>

          <button
            onClick={() => {
              sessionStorage.removeItem('kahoot_active_player');
              setGameState('idle');
              setJoinedPlayer(null);
            }}
            className="btn btn-primary"
            style={{ padding: '0.85rem 2rem' }}
          >
            Play Another Game
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // UNIVERSAL FALLBACK: NEVER RENDER BLANK PURPLE SCREEN
  // ==========================================
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
            sessionStorage.removeItem('kahoot_active_player');
            setJoinedPlayer(null);
            setGameState('idle');
            checkActiveQuiz();
          }}
          className="btn btn-secondary"
          style={{ width: '100%' }}
        >
          Reset Connection
        </button>
      </div>
    </div>
  );
}
