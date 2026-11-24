// Vice Bay — sound. One job: everything the player hears, synthesized live with
// WebAudio so the game ships zero audio files: two radio stations (VIBE 98.5 funk,
// HARBOR ROCK), engine hum, sirens, gunshots, crashes, pickups and UI blips.
// Audio only starts after the first user gesture; every call is guarded so a
// missing AudioContext can never break the game.
export class AudioEngine {
  constructor() {
    this.ctx = null; this.master = null; this.radio = null; this.radioGain = null;
    this.station = 0; // 0 off, 1 VIBE 98.5, 2 HARBOR ROCK
    this.stationName = 'Radio: off (R)';
    this.step = 0; this.nextNote = 0; this.engineOsc = null; this.engineGain = null;
    this.sirenOn = false; this.sirenOsc = null;
  }

  ensure() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch { /* audio is optional */ }
  }

  setStation(n) {
    this.station = n;
    this.stationName = n === 0 ? 'Radio: off (R)' : n === 1 ? 'VIBE 98.5 — Vice Funk (R)' : 'HARBOR ROCK — 101.1 (R)';
    if (n === 0) this.stopRadio();
    else this.startRadio();
  }

  startRadio() {
    if (!this.ctx || this.radio) return;
    try {
      this.radioGain = this.ctx.createGain();
      this.radioGain.gain.value = 0.16;
      this.radioGain.connect(this.master);
      this.radio = setInterval(() => this.radioTick(), 170);
      this.step = 0;
      this.nextNote = this.ctx.currentTime + 0.1;
    } catch { /* ignore */ }
  }

  stopRadio() {
    if (this.radio) { clearInterval(this.radio); this.radio = null; }
  }

  radioTick() {
    if (!this.ctx || this.station === 0) return;
    const now = this.ctx.currentTime;
    while (this.nextNote < now + 0.35) {
      const t = Math.max(now, this.nextNote);
      const s = this.step % 16;
      if (this.station === 1) {
        // VIBE 98.5: funky minor bass + stab chords.
        const bass = [55, 0, 55, 65.4, 0, 55, 49, 58.3, 55, 0, 55, 65.4, 73.4, 65.4, 49, 58.3][s];
        if (bass) this.tone(bass, t, 0.16, 'sawtooth', 0.5);
        if (s === 0 || s === 6 || s === 10) this.tone(220, t, 0.08, 'square', 0.12);
        if (s % 4 === 2) this.noise(t, 0.05, 0.1);
      } else {
        // HARBOR ROCK: driving eighth-note riff.
        const riff = [110, 110, 130.8, 110, 98, 110, 146.8, 130.8, 110, 110, 130.8, 164.8, 146.8, 130.8, 98, 110][s];
        this.tone(riff, t, 0.15, 'square', 0.28);
        if (s % 2 === 0) this.noise(t, 0.04, 0.14);
      }
      this.step++;
      this.nextNote += 0.17;
    }
  }

  tone(freq, t, dur, type, vol) {
    try {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(this.radioGain || this.master);
      o.start(t); o.stop(t + dur + 0.02);
    } catch { /* ignore */ }
  }

  noise(t, dur, vol) {
    try {
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.value = vol;
      src.connect(g); g.connect(this.radioGain || this.master);
      src.start(t);
    } catch { /* ignore */ }
  }

  sfx(name) {
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      if (name === 'shot') {
        const len = Math.floor(this.ctx.sampleRate * 0.12);
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
        const s = this.ctx.createBufferSource(); s.buffer = buf;
        const g = this.ctx.createGain(); g.gain.value = 0.5;
        const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800;
        s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
      } else if (name === 'explosion') {
        const len = Math.floor(this.ctx.sampleRate * 0.7);
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.6);
        const s = this.ctx.createBufferSource(); s.buffer = buf;
        const g = this.ctx.createGain(); g.gain.value = 0.8;
        const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
        s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
      } else if (name === 'crash') {
        this.tone(70, t, 0.18, 'sawtooth', 0.4);
        this.tone(52, t + 0.02, 0.2, 'square', 0.25);
      } else if (name === 'siren') {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(660, t);
        o.frequency.linearRampToValueAtTime(880, t + 0.4);
        o.frequency.linearRampToValueAtTime(660, t + 0.8);
        g.gain.setValueAtTime(0.06, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
        o.connect(g); g.connect(this.master);
        o.start(t); o.stop(t + 0.9);
      } else if (name === 'pickup') {
        this.tone(880, t, 0.09, 'sine', 0.3);
        this.tone(1318, t + 0.09, 0.12, 'sine', 0.3);
      } else if (name === 'click') {
        this.tone(1200, t, 0.05, 'square', 0.15);
      } else if (name === 'punch') {
        this.tone(120, t, 0.1, 'sine', 0.4);
      } else if (name === 'win') {
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, t + i * 0.12, 0.18, 'triangle', 0.3));
      } else if (name === 'fail') {
        [392, 330, 262].forEach((f, i) => this.tone(f, t + i * 0.15, 0.2, 'sawtooth', 0.2));
      }
    } catch { /* ignore */ }
  }

  engine(speedRatio, on) {
    if (!this.ctx) return;
    try {
      if (on && !this.engineOsc) {
        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = 0.03;
        const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
        this.engineOsc.connect(f); f.connect(this.engineGain); this.engineGain.connect(this.master);
        this.engineOsc.start();
      }
      if (!on && this.engineOsc) { this.engineOsc.stop(); this.engineOsc = null; this.engineGain = null; return; }
      if (this.engineOsc) {
        this.engineOsc.frequency.value = 60 + speedRatio * 160;
        this.engineGain.gain.value = 0.02 + speedRatio * 0.05;
      }
    } catch { /* ignore */ }
  }
}
