// Solara Bay audio: WebAudio synth SFX + two radio stations. No audio files, no network.
export function makeAudio() {
  let ctx = null, master = null, radioTimer = null, radioOn = false, station = 0, nextNote = 0, step = 0;
  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
      } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure()) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, low) {
    if (!ensure()) return;
    const t = ctx.currentTime, len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ctx.createBufferSource(); s.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = low || 1200;
    const g = ctx.createGain(); g.gain.value = vol || 0.3;
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  const sfx = {
    shoot() { noise(0.12, 0.5, 3000); tone(180, 0.08, 'square', 0.25, 60); },
    shotgun() { noise(0.25, 0.6, 1800); tone(120, 0.15, 'square', 0.3, 40); },
    punch() { noise(0.08, 0.35, 700); },
    pickup() { tone(660, 0.09, 'sine', 0.25); setTimeout(() => tone(990, 0.12, 'sine', 0.25), 90); },
    cash() { tone(880, 0.08, 'sine', 0.22); setTimeout(() => tone(1174, 0.08, 'sine', 0.22), 80); setTimeout(() => tone(1568, 0.14, 'sine', 0.22), 160); },
    crash() { noise(0.3, 0.5, 500); },
    siren() { tone(700, 0.35, 'sine', 0.08, 950); setTimeout(() => tone(950, 0.35, 'sine', 0.08, 700), 350); },
    mission() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.25), i * 110)); },
    fail() { [400, 300, 200].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'sawtooth', 0.18), i * 130)); },
    click() { tone(1200, 0.04, 'square', 0.12); },
    explosion() { noise(0.7, 0.7, 400); tone(80, 0.5, 'sine', 0.4, 30); },
    engine() { tone(55, 0.2, 'sawtooth', 0.05, 70); },
  };
  // Two stations: 0 = SOLARA FM (funky bassline, A minor), 1 = BAY 98 (synthwave, C major arp).
  const STATIONS = [
    { name: 'SOLARA FM', bpm: 112, bass: [55, 0, 65.4, 0, 49, 0, 58.3, 73.4], lead: [220, 261.6, 329.6, 392] },
    { name: 'BAY 98', bpm: 96, bass: [130.8, 98, 87.3, 98], lead: [523.2, 659.2, 784, 1046.5, 784, 659.2] },
  ];
  function radioTick() {
    if (!radioOn || !ensure()) return;
    const st = STATIONS[station], beat = 60 / st.bpm / 2;
    const now = ctx.currentTime;
    if (nextNote < now + 0.15) {
      const b = st.bass[step % st.bass.length];
      if (b) tone(b, beat * 0.9, 'triangle', 0.22);
      if (step % 2 === 0) { const l = st.lead[(step / 2 | 0) % st.lead.length]; tone(l, beat * 0.8, 'sine', 0.07); }
      if (step % 8 === 4) noise(0.05, 0.06, 6000);
      nextNote += beat; step++;
    }
  }
  function radioStart() {
    ensure(); if (!ctx) return;
    radioOn = true; nextNote = ctx.currentTime + 0.05; step = 0;
    if (!radioTimer) radioTimer = setInterval(radioTick, 40);
  }
  function radioStop() { radioOn = false; }
  function radioToggle() { if (radioOn) { radioStop(); return null; } radioStart(); return STATIONS[station].name; }
  function radioNext() { station = (station + 1) % STATIONS.length; if (radioOn) { step = 0; nextNote = ctx ? ctx.currentTime + 0.05 : 0; } return STATIONS[station].name; }
  function stationName() { return STATIONS[station].name; }
  function unlock() { ensure(); }
  return { sfx, radioToggle, radioNext, radioStop, stationName, unlock, isRadioOn: () => radioOn };
}
