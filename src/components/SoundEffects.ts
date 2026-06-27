// Web Audio API Synthesizer for 8-bit Cyberpunk Sound Effects
// Handled gracefully in case the browser blocks audio or context fails.

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

function getAudioContext(): AudioContext | null {
  if (!soundEnabled) return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn("Web Audio API is not supported in this browser.", e);
      soundEnabled = false;
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export const setSoundEnabled = (enabled: boolean) => {
  soundEnabled = enabled;
  if (!enabled && audioCtx) {
    audioCtx.close().then(() => {
      audioCtx = null;
    });
  }
};

export const isSoundEnabled = () => soundEnabled;

export const playShoot = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(350, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.12);

  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.12);
};

export const playEnemyShoot = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(180, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);

  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.15);
};

export const playHit = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Generate short explosion/noise hit
  const bufferSize = ctx.sampleRate * 0.1; // 100ms
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1000, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start();
  noise.stop(ctx.currentTime + 0.1);
};

export const playPlayerHit = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = "triangle";
  osc1.frequency.setValueAtTime(150, ctx.currentTime);
  osc1.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.25);

  osc2.type = "sawtooth";
  osc2.frequency.setValueAtTime(100, ctx.currentTime);
  osc2.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.25);

  gain.gain.setValueAtTime(0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start();
  osc2.start();
  osc1.stop(ctx.currentTime + 0.25);
  osc2.stop(ctx.currentTime + 0.25);
};

export const playDash = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(120, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);

  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.15);
};

export const playShieldBreak = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.2);

  gain.gain.setValueAtTime(0.18, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.2);
};

export const playAlert = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const playBip = (time: number, freq: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration - 0.02);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + duration);
  };

  playBip(now, 440, 0.1);
  playBip(now + 0.12, 440, 0.1);
  playBip(now + 0.24, 660, 0.2);
};

export const playPatchApplied = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Futuristic glitchy positive melody arpeggio
  const playNote = (time: number, freq: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Cyberpunk touch: hybrid of square and sine
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, time);
    
    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration - 0.01);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + duration);
  };

  playNote(now, 261.63, 0.08); // C4
  playNote(now + 0.08, 329.63, 0.08); // E4
  playNote(now + 0.16, 392.00, 0.08); // G4
  playNote(now + 0.24, 523.25, 0.15); // C5
  playNote(now + 0.32, 659.25, 0.3); // E5 (cyber glow)
};

export const playGlitch = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  for (let i = 0; i < 4; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = Math.random() > 0.5 ? "sawtooth" : "square";
    osc.frequency.setValueAtTime(Math.random() * 800 + 100, now + i * 0.05);
    gain.gain.setValueAtTime(0.08, now + i * 0.05);
    gain.gain.setValueAtTime(0, now + (i + 1) * 0.05 - 0.01);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.05);
    osc.stop(now + (i + 1) * 0.05);
  }
};

export const playGameOver = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Sad descending minor chord
  const playNote = (time: number, freq: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration - 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + duration);
  };

  playNote(now, 293.66, 0.25); // D4
  playNote(now + 0.25, 261.63, 0.25); // C4
  playNote(now + 0.5, 220.00, 0.3); // A3
  playNote(now + 0.8, 146.83, 0.8); // D3 (gloomy root note)
};
