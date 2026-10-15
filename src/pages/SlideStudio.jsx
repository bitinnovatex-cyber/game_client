import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';
import sound from '../soundEngine';
import SoundToggle from '../components/SoundToggle';
import { 
  Plus, 
  Trash2, 
  Copy, 
  ChevronUp, 
  ChevronDown, 
  Sparkles, 
  Save, 
  ArrowLeft, 
  Clock, 
  Award, 
  HelpCircle,
  Triangle,
  Diamond,
  Circle,
  Square,
  CheckCircle,
  Image as ImageIcon,
  Loader2,
  X
} from 'lucide-react';

const SHAPES = [
  { icon: Triangle, color: 'color-red', label: 'Red Triangle', bg: '#e21b3c' },
  { icon: Diamond, color: 'color-blue', label: 'Blue Diamond', bg: '#1368ce' },
  { icon: Circle, color: 'color-yellow', label: 'Yellow Circle', bg: '#d89e00' },
  { icon: Square, color: 'color-green', label: 'Green Square', bg: '#26890c' }
];

const DEFAULT_QUESTION = () => ({
  question_text: '',
  type: 'quiz_4',
  time_limit: 20,
  points: 1000,
  media_url: '',
  options: [
    { option_text: '', is_correct: true, color_index: 0 },
    { option_text: '', is_correct: false, color_index: 1 },
    { option_text: '', is_correct: false, color_index: 2 },
    { option_text: '', is_correct: false, color_index: 3 }
  ]
});

export default function SlideStudio({ quizId }) {
  const [title, setTitle] = useState('New Quiz');
  const [description, setDescription] = useState('');
  const [slides, setSlides] = useState([DEFAULT_QUESTION()]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // AI Modal State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState(5);
  const [aiType, setAiType] = useState('quiz_4');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Load existing quiz if editing
  useEffect(() => {
    if (quizId && quizId !== 'new') {
      loadQuiz(quizId);
    }
  }, [quizId]);

  const loadQuiz = async (id) => {
    try {
      setLoading(true);
      const data = await apiFetch(`/api/quizzes/${id}`);
      setTitle(data.title || 'Untitled Quiz');
      setDescription(data.description || '');
      if (data.questions && data.questions.length > 0) {
        setSlides(data.questions);
      }
    } catch (err) {
      setErrorMsg('Failed to load quiz: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentSlide = slides[activeSlideIndex] || slides[0] || DEFAULT_QUESTION();

  // Slide mutations
  const updateCurrentSlide = (updates) => {
    setSlides(prev => {
      const copy = [...prev];
      copy[activeSlideIndex] = { ...copy[activeSlideIndex], ...updates };
      return copy;
    });
  };

  const handleAddSlide = () => {
    sound.playSelect();
    const newSlide = DEFAULT_QUESTION();
    setSlides(prev => [...prev, newSlide]);
    setActiveSlideIndex(slides.length);
  };

  const handleDuplicateSlide = (index, e) => {
    e.stopPropagation();
    sound.playSelect();
    const slideToCopy = JSON.parse(JSON.stringify(slides[index]));
    setSlides(prev => {
      const copy = [...prev];
      copy.splice(index + 1, 0, slideToCopy);
      return copy;
    });
    setActiveSlideIndex(index + 1);
  };

  const handleDeleteSlide = (index, e) => {
    e.stopPropagation();
    if (slides.length <= 1) {
      alert('A quiz must have at least one slide!');
      return;
    }
    sound.playTick();
    setSlides(prev => prev.filter((_, i) => i !== index));
    if (activeSlideIndex >= slides.length - 1) {
      setActiveSlideIndex(Math.max(0, slides.length - 2));
    }
  };

  const handleMoveSlide = (index, direction, e) => {
    e.stopPropagation();
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= slides.length) return;
    sound.playTick();
    setSlides(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
    setActiveSlideIndex(targetIndex);
  };

  // Option mutations
  const handleOptionTextChange = (optIndex, text) => {
    const updatedOptions = [...(currentSlide.options || [])];
    if (updatedOptions[optIndex]) {
      updatedOptions[optIndex].option_text = text;
      updateCurrentSlide({ options: updatedOptions });
    }
  };

  const handleToggleCorrect = (optIndex) => {
    sound.playSelect();
    const updatedOptions = (currentSlide.options || []).map((opt, i) => ({
      ...opt,
      is_correct: i === optIndex // Single correct choice
    }));
    updateCurrentSlide({ options: updatedOptions });
  };

  // Change Question Type (4 Choices vs 2 Choices True/False)
  const handleTypeChange = (newType) => {
    sound.playSelect();
    if (newType === 'quiz_2') {
      const trueFalseOptions = [
        { option_text: 'True', is_correct: true, color_index: 1 },
        { option_text: 'False', is_correct: false, color_index: 0 }
      ];
      updateCurrentSlide({ type: 'quiz_2', options: trueFalseOptions });
    } else {
      const fourOptions = [
        { option_text: '', is_correct: true, color_index: 0 },
        { option_text: '', is_correct: false, color_index: 1 },
        { option_text: '', is_correct: false, color_index: 2 },
        { option_text: '', is_correct: false, color_index: 3 }
      ];
      updateCurrentSlide({ type: 'quiz_4', options: fourOptions });
    }
  };

  // Save Quiz to DB
  const handleSaveQuiz = async () => {
    if (!title.trim()) {
      alert('Please provide a quiz title!');
      return;
    }
    sound.init();
    setSaving(true);
    setErrorMsg('');
    setSaveSuccess(false);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        questions: slides
      };

      if (quizId && quizId !== 'new') {
        await apiFetch(`/api/quizzes/${quizId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        const res = await apiFetch('/api/quizzes', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        if (res.quiz?.id) {
          window.location.hash = `#/admin/edit/${res.quiz.id}`;
        }
      }

      sound.playCorrect();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      sound.playWrong();
      setErrorMsg(err.message || 'Failed to save quiz');
    } finally {
      setSaving(false);
    }
  };

  // AI Question Generation
  const handleGenerateAi = async () => {
    if (!aiTopic.trim()) {
      setAiError('Please enter a topic or text prompt');
      return;
    }
    setAiError('');
    setAiLoading(true);
    sound.init();

    try {
      const res = await apiFetch('/api/quizzes/generate-ai', {
        method: 'POST',
        body: JSON.stringify({
          topic: aiTopic.trim(),
          count: aiCount,
          type: aiType
        })
      });

      if (res.questions && res.questions.length > 0) {
        sound.playFanfare();
        // Append generated questions to slides
        setSlides(prev => [...prev, ...res.questions]);
        setActiveSlideIndex(slides.length);
        setShowAiModal(false);
        setAiTopic('');
      } else {
        setAiError('No questions were generated. Please try again.');
      }
    } catch (err) {
      sound.playWrong();
      setAiError(err.message || 'AI Generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={40} className="spin" color="#fff" />
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading presentation slides...</p>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Top Studio Header */}
      <header className="navbar" style={{ padding: '0.6rem 1.5rem', background: '#11022e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a href="#/admin" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
            <ArrowLeft size={16} /> Dashboard
          </a>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter Quiz Title..."
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: '2px solid rgba(255,255,255,0.3)',
              color: '#fff',
              fontSize: '1.25rem',
              fontWeight: '800',
              padding: '0.2rem 0.5rem',
              outline: 'none',
              width: '320px'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {saveSuccess && (
            <span style={{ color: '#44ff88', fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <CheckCircle size={16} /> Saved!
            </span>
          )}

          <button
            onClick={() => { setShowAiModal(true); sound.playSelect(); }}
            className="btn"
            style={{
              background: 'linear-gradient(135deg, #8a2be2, #4158d0)',
              color: '#fff',
              padding: '0.55rem 1.1rem',
              fontSize: '0.9rem',
              boxShadow: '0 4px 12px rgba(138, 43, 226, 0.4)'
            }}
          >
            <Sparkles size={16} /> AI Slide Creator
          </button>

          <button
            onClick={handleSaveQuiz}
            disabled={saving}
            className="btn btn-accent"
            style={{ padding: '0.55rem 1.25rem', fontSize: '0.9rem' }}
          >
            <Save size={16} /> {saving ? 'Saving...' : 'Save Quiz'}
          </button>

          <SoundToggle />
        </div>
      </header>

      {errorMsg && (
        <div style={{ background: '#e21b3c', color: '#fff', padding: '0.5rem 1.5rem', fontSize: '0.85rem', fontWeight: '700' }}>
          {errorMsg}
        </div>
      )}

      {/* Main Studio Body: PowerPoint Layout */}
      <div className="slide-studio-container">
        {/* Left Thumbnails Panel */}
        <aside className="slide-sidebar">
          <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Slides ({slides.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {slides.map((s, idx) => (
              <div
                key={idx}
                onClick={() => { setActiveSlideIndex(idx); sound.playTick(); }}
                className={`slide-thumb ${activeSlideIndex === idx ? 'active' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#ffda6b' }}>
                    Slide {idx + 1}
                  </span>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button
                      onClick={(e) => handleMoveSlide(idx, -1, e)}
                      disabled={idx === 0}
                      style={{ background: 'none', border: 'none', color: idx === 0 ? 'rgba(255,255,255,0.2)' : '#fff', cursor: 'pointer' }}
                      title="Move Up"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={(e) => handleMoveSlide(idx, 1, e)}
                      disabled={idx === slides.length - 1}
                      style={{ background: 'none', border: 'none', color: idx === slides.length - 1 ? 'rgba(255,255,255,0.2)' : '#fff', cursor: 'pointer' }}
                      title="Move Down"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      onClick={(e) => handleDuplicateSlide(idx, e)}
                      style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                      title="Duplicate"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteSlide(idx, e)}
                      style={{ background: 'none', border: 'none', color: '#ff6666', cursor: 'pointer' }}
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Mini Preview Box */}
                <div style={{
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '4px',
                  padding: '0.5rem',
                  fontSize: '0.75rem',
                  height: '52px',
                  overflow: 'hidden',
                  color: 'rgba(255,255,255,0.85)'
                }}>
                  {s.question_text || <em>Empty Question</em>}
                </div>

                {/* Mini Colors Indicator */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', height: '8px' }}>
                  <div style={{ background: '#e21b3c', borderRadius: '1px' }} />
                  <div style={{ background: '#1368ce', borderRadius: '1px' }} />
                  {s.type !== 'quiz_2' && (
                    <>
                      <div style={{ background: '#d89e00', borderRadius: '1px' }} />
                      <div style={{ background: '#26890c', borderRadius: '1px' }} />
                    </>
                  )}
                </div>
              </div>
            ))}

            <button
              onClick={handleAddSlide}
              className="btn btn-secondary"
              style={{
                border: '2px dashed rgba(255,255,255,0.3)',
                padding: '0.75rem',
                fontSize: '0.9rem',
                width: '100%',
                marginTop: '0.5rem'
              }}
            >
              <Plus size={16} /> Add Slide
            </button>
          </div>
        </aside>

        {/* Center Canvas: Question & 4/2 Colored Answer Boxes */}
        <main className="slide-editor-main">
          {/* Settings Top Bar for active slide */}
          <div className="slide-settings-bar">
            {/* Question Type */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Type:</span>
              <button
                onClick={() => handleTypeChange('quiz_4')}
                className={`btn ${currentSlide.type === 'quiz_4' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              >
                4 Choices
              </button>
              <button
                onClick={() => handleTypeChange('quiz_2')}
                className={`btn ${currentSlide.type === 'quiz_2' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              >
                True / False (2)
              </button>
            </div>

            {/* Time Limit */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} color="#ffda6b" />
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Time:</span>
              <select
                value={currentSlide.time_limit || 20}
                onChange={(e) => updateCurrentSlide({ time_limit: parseInt(e.target.value, 10) })}
                className="form-input"
                style={{ width: '90px', padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
              >
                <option value={10}>10 sec</option>
                <option value={20}>20 sec</option>
                <option value={30}>30 sec</option>
                <option value={60}>60 sec</option>
                <option value={90}>90 sec</option>
              </select>
            </div>

            {/* Points */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={16} color="#ffda6b" />
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)' }}>Points:</span>
              <select
                value={currentSlide.points || 1000}
                onChange={(e) => updateCurrentSlide({ points: parseInt(e.target.value, 10) })}
                className="form-input"
                style={{ width: '110px', padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
              >
                <option value={1000}>Standard (1000)</option>
                <option value={2000}>Double (2000)</option>
                <option value={0}>No Points (0)</option>
              </select>
            </div>
          </div>

          {/* Question Headline Input */}
          <div className="question-input-card">
            <textarea
              rows={2}
              value={currentSlide.question_text || ''}
              onChange={(e) => updateCurrentSlide({ question_text: e.target.value })}
              placeholder="Start typing your question..."
              className="question-textarea"
            />
          </div>

          {/* Media / Image URL optional input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
            <ImageIcon size={18} color="rgba(255,255,255,0.6)" />
            <input
              type="text"
              value={currentSlide.media_url || ''}
              onChange={(e) => updateCurrentSlide({ media_url: e.target.value })}
              placeholder="Image URL for this question (optional)"
              className="form-input"
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
            />
          </div>

          {/* 4 or 2 Colored Answers Grid */}
          <div className="answers-grid" style={{ gridTemplateColumns: currentSlide.type === 'quiz_2' ? '1fr 1fr' : '1fr 1fr' }}>
            {(currentSlide.options || []).map((opt, idx) => {
              const shapeObj = SHAPES[opt.color_index !== undefined ? opt.color_index : idx % 4];
              const ShapeIcon = shapeObj.icon;
              const isCorrect = !!opt.is_correct;

              return (
                <div
                  key={idx}
                  className={`answer-card ${shapeObj.color} ${isCorrect ? 'selected' : ''}`}
                >
                  <div className="answer-shape-icon">
                    <ShapeIcon size={28} strokeWidth={2.5} />
                  </div>

                  <input
                    type="text"
                    value={opt.option_text || ''}
                    onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                    placeholder={`Answer ${idx + 1}`}
                    className="answer-input"
                  />

                  {/* Toggle Correct Answer Radio/Check */}
                  <button
                    type="button"
                    onClick={() => handleToggleCorrect(idx)}
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      border: '2px solid #ffffff',
                      background: isCorrect ? '#26890c' : 'rgba(0,0,0,0.3)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title={isCorrect ? 'Correct choice' : 'Mark as correct answer'}
                  >
                    {isCorrect ? <CheckCircle size={22} /> : null}
                  </button>
                </div>
              );
            })}
          </div>
        </main>
      </div>

      {/* Gemini AI Generator Modal */}
      {showAiModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div className="glass-panel animate-pop" style={{ maxWidth: '520px', width: '100%', padding: '2rem', background: '#1c0842' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={22} color="#ffda6b" />
                <h3 style={{ fontSize: '1.4rem', fontWeight: '900' }}>AI Question Generator</h3>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.4' }}>
              Powered by <strong>Google Gemini</strong>. Enter a subject, paste syllabus notes, or give any topic to automatically generate interactive quiz slides!
            </p>

            {aiError && (
              <div style={{ background: 'rgba(226, 27, 60, 0.25)', border: '1px solid #e21b3c', color: '#ff99aa', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {aiError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>
                  Topic or Source Text
                </label>
                <textarea
                  rows={3}
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g. World War II key events, Solar system facts, JavaScript asynchronous programming..."
                  className="form-input"
                  style={{ resize: 'vertical' }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>
                    Number of Slides
                  </label>
                  <select
                    value={aiCount}
                    onChange={(e) => setAiCount(parseInt(e.target.value, 10))}
                    className="form-input"
                  >
                    <option value={3}>3 Questions</option>
                    <option value={5}>5 Questions</option>
                    <option value={8}>8 Questions</option>
                    <option value={10}>10 Questions</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>
                    Question Type
                  </label>
                  <select
                    value={aiType}
                    onChange={(e) => setAiType(e.target.value)}
                    className="form-input"
                  >
                    <option value="quiz_4">4-Choice Multiple Choice</option>
                    <option value="quiz_2">2-Choice True / False</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerateAi}
                disabled={aiLoading}
                className="btn btn-primary"
                style={{
                  marginTop: '0.5rem',
                  height: '50px',
                  background: 'linear-gradient(135deg, #ff0077, #7928ca)',
                  color: '#fff',
                  border: 'none'
                }}
              >
                {aiLoading ? (
                  <>
                    <Loader2 size={18} className="spin" /> Generating Slides with Gemini...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} /> Generate {aiCount} Slides
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
