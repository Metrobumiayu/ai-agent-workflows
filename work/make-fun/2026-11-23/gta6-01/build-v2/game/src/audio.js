// Solara Bay — synthesized WebAudio sounds (no audio files).
let ctx = null, engineOsc = null, engineGain = null, sirenOsc = null, sirenGain = null, sirenLfo = null;

export function initAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 55;
      engineGain = ctx.createGain(); engineGain.gain.value = 0;
      engineOsc.connect(engineGain); engineGain.connect(ctx.destination); engineOsc.start();
      sirenOsc = ctx.createOscillator(); sirenOsc.type = 'sine'; sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain(); sirenGain.gain.value = 0;
      sirenLfo = ctx.createOscillator(); sirenLfo.type = 'square'; sirenLfo.frequency.value = 0.9;
      const lfoGain = ctx.createGain(); lfoGain.gain.value = 220;
      sirenLfo.connect(lfoGain); lfoGain.connect(sirenOsc.frequency);
      sirenOsc.connect(sirenGain); sirenGain.connect(ctx.destination);
      sirenOsc.start(); sirenLfo.start();
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* audio is optional */ }
}

export function setEngine(speedNorm, driving) {
  try {
    if (!ctx || !engineOsc) return;
    engineGain.gain.value = driving ? 0.035 + speedNorm * 0.05 : 0;
    engineOsc.frequency.value = 50 + speedNorm * 140;
  } catch { /* ignore */ }
}

export function setSiren(on) {
  try { if (ctx && sirenGain) sirenGain.gain.value = on ? 0.028 : 0; } catch { /* ignore */ }
}

function blip(freq, dur, type, vol) {
  try {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
  } catch { /* ignore */ }
}

export function playShot() {
  try {
    if (!ctx) return;
    const len = 0.12, buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = 0.22;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2400;
    src.connect(f); f.connect(g); g.connect(ctx.destination); src.start();
  } catch { /* ignore */ }
}
export function playPickup() { blip(880, 0.12, 'sine', 0.1); setTimeout(() => blip(1320, 0.14, 'sine', 0.1), 90); }
export function playPunch() { blip(140, 0.09, 'triangle', 0.12); }
export function playBusted() { blip(220, 0.5, 'sawtooth', 0.1); setTimeout(() => blip(165, 0.6, 'sawtooth', 0.1), 300); }
export function playMission() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'sine', 0.1), i * 110)); }
