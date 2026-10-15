import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import sound from '../soundEngine';

export default function SoundToggle() {
  const [muted, setMuted] = useState(sound.isMuted());

  const handleToggle = () => {
    const isNowMuted = sound.toggleMute();
    setMuted(isNowMuted);
    if (!isNowMuted) {
      sound.playSelect();
    }
  };

  return (
    <button
      onClick={handleToggle}
      className="sound-toggle-btn"
      title={muted ? 'Unmute sounds' : 'Mute sounds'}
      aria-label="Toggle Sound"
    >
      {muted ? <VolumeX size={20} color="#ff8888" /> : <Volume2 size={20} color="#44ff88" />}
    </button>
  );
}
