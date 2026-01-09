
// Simple Web Audio API synthesizer
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

export const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.3; // Global volume
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

type SoundType = 'tap' | 'flip' | 'match' | 'attack' | 'heal' | 'shield' | 'coin' | 'combo' | 'victory' | 'defeat' | 'enemy_match' | 'ascend';

export const playSound = (type: SoundType) => {
  if (!audioCtx || !masterGain) return;

  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(masterGain);

  switch (type) {
    case 'tap':
      // Short high tick for immediate feedback
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.03);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.03);
      osc.start(t);
      osc.stop(t + 0.03);
      break;

    case 'flip':
      // Swoosh sound
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.1);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      osc.start(t);
      osc.stop(t + 0.1);
      break;

    case 'match':
      // Pleasant chime (Major triad arpeggio effect)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, t); // A4
      osc.frequency.setValueAtTime(554, t + 0.1); // C#5
      osc.frequency.setValueAtTime(659, t + 0.2); // E5
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.5, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.4);
      break;
    
    case 'enemy_match':
      // Lower, ominous chime
      osc.type = 'square';
      osc.frequency.setValueAtTime(220, t); 
      osc.frequency.linearRampToValueAtTime(180, t + 0.2); 
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.4);
      break;

    case 'attack':
      // Noise-like impact (simulated with fast frequency drop saw)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      osc.start(t);
      osc.stop(t + 0.15);
      break;

    case 'heal':
      // Rising gentle tone
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.linearRampToValueAtTime(600, t + 0.4);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.5, t + 0.1);
      gain.gain.linearRampToValueAtTime(0, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.4);
      break;

    case 'shield':
      // Metallic ping
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.3);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.3);
      break;

    case 'coin':
      // High pitched ping (Coin pickup)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.setValueAtTime(1600, t + 0.05);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.3);
      break;

    case 'combo':
      // Energizing sweep
      osc.type = 'square';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.linearRampToValueAtTime(880, t + 0.3);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.4);
      break;

    case 'ascend':
       // Magical rising sound
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.linearRampToValueAtTime(1200, t + 0.6);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.linearRampToValueAtTime(0.4, t + 0.3);
      gain.gain.linearRampToValueAtTime(0, t + 0.6);
      osc.start(t);
      osc.stop(t + 0.6);
      break;

    case 'victory':
      // Fanfare-ish sequence (simple)
      {
        const now = audioCtx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major
        notes.forEach((freq, i) => {
          const o = audioCtx!.createOscillator();
          const g = audioCtx!.createGain();
          o.connect(g);
          g.connect(masterGain!);
          o.type = 'triangle';
          o.frequency.value = freq;
          g.gain.setValueAtTime(0.2, now + i * 0.1);
          g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.4);
          o.start(now + i * 0.1);
          o.stop(now + i * 0.1 + 0.4);
        });
      }
      break;

    case 'defeat':
      // Sad descending tones
      {
        const now = audioCtx.currentTime;
        const notes = [440, 415, 392, 370]; 
        notes.forEach((freq, i) => {
          const o = audioCtx!.createOscillator();
          const g = audioCtx!.createGain();
          o.connect(g);
          g.connect(masterGain!);
          o.type = 'sawtooth';
          o.frequency.value = freq;
          g.gain.setValueAtTime(0.2, now + i * 0.3);
          g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.3 + 0.6);
          o.start(now + i * 0.3);
          o.stop(now + i * 0.3 + 0.6);
        });
      }
      break;
  }
};
