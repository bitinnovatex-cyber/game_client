// Web Audio API Synthesizer for Kahoot-style real-time audio
// Zero external assets or network requests - runs 100% locally with high performance

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('kahoot_muted') === 'true';
    this.bgInterval = null;
    this.bgPlaying = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  isMuted() {
    return this.muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('kahoot_muted', this.muted);
    if (this.muted && this.bgPlaying) {
      this.stopLobbyMusic();
    }
    return this.muted;
  }

  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.15) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy safe guard
    }
  }

  playTick() {
    if (this.muted) return;
    this.playTone(800, 'triangle', 0.05, 0.08);
  }

  playHurryTick() {
    if (this.muted) return;
    this.playTone(1200, 'sawtooth', 0.08, 0.15);
  }

  playSelect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(now + 0.12);
    } catch (e) {}
  }

  playCorrect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      // Upbeat major triad arpeggio: C5, E5, G5, C6
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        setTimeout(() => {
          this.playTone(freq, 'triangle', 0.25, 0.2);
        }, i * 70);
      });
    } catch (e) {}
  }

  playWrong() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      // Low descending two-tone buzz
      this.playTone(220, 'sawtooth', 0.2, 0.18);
      setTimeout(() => {
        this.playTone(180, 'sawtooth', 0.35, 0.2);
      }, 150);
    } catch (e) {}
  }

  playFanfare() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      // Victory brass melody: C4, G4, C5, E5, G5
      const fanfareNotes = [
        { f: 261.63, d: 0.15, delay: 0 },
        { f: 392.00, d: 0.15, delay: 180 },
        { f: 523.25, d: 0.2, delay: 360 },
        { f: 659.25, d: 0.25, delay: 540 },
        { f: 783.99, d: 0.6, delay: 720 },
        { f: 1046.5, d: 0.8, delay: 1100 }
      ];

      fanfareNotes.forEach(({ f, d, delay }) => {
        setTimeout(() => {
          this.playTone(f, 'sine', d, 0.25);
        }, delay);
      });
    } catch (e) {}
  }

  startLobbyMusic() {
    if (this.muted || this.bgPlaying) return;
    this.init();
    if (!this.ctx) return;

    this.bgPlaying = true;
    const notes = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63];
    let step = 0;

    this.bgInterval = setInterval(() => {
      if (this.muted || !this.bgPlaying) return;
      const freq = notes[step % notes.length];
      this.playTone(freq, 'sine', 0.12, 0.05);
      step++;
    }, 400);
  }

  stopLobbyMusic() {
    if (this.bgInterval) {
      clearInterval(this.bgInterval);
      this.bgInterval = null;
    }
    this.bgPlaying = false;
  }
}

const sound = new SoundEngine();
export default sound;
