// audio.js — All sound is synthesized with WebAudio: no audio files,
// no network. A tiny synth: tones for dings and chimes, filtered noise
// for chops, sizzles and the reject buzz.

let ctx = null;
let master = null;
let muted = false;

export function ensureAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.35;
  master.connect(ctx.destination);
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.35;
  return muted;
}

function tone(freq, dur, type, vol, when = 0, slideTo = null) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(dur, filterFreq, vol, when = 0) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + when;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  filter.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(t0);
}

export const sfx = {
  pickup() { tone(520, 0.08, 'sine', 0.25); },
  place() { tone(340, 0.08, 'triangle', 0.25); },
  chop() { noiseBurst(0.09, 2400, 0.5); tone(180, 0.05, 'square', 0.12); },
  chopDone() { tone(660, 0.1, 'sine', 0.25); tone(880, 0.12, 'sine', 0.22, 0.08); },
  sizzle() { noiseBurst(0.35, 5200, 0.16); },
  cooked() { tone(740, 0.1, 'sine', 0.25); tone(988, 0.14, 'sine', 0.22, 0.09); },
  burnt() { tone(220, 0.3, 'sawtooth', 0.18, 0, 110); },
  serve() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'sine', 0.28, i * 0.07));
  },
  reject() { tone(160, 0.22, 'sawtooth', 0.22, 0, 90); },
  orderIn() { tone(880, 0.09, 'sine', 0.2); tone(1175, 0.12, 'sine', 0.18, 0.08); },
  orderLost() { tone(392, 0.18, 'triangle', 0.22, 0, 262); tone(262, 0.3, 'triangle', 0.2, 0.14, 196); },
  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'triangle', 0.26, i * 0.11));
  },
  lose() {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'triangle', 0.22, i * 0.16));
  },
  click() { tone(700, 0.05, 'sine', 0.18); },
};
