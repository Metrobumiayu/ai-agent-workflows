// WebAudio synth: SFX + two radio stations (SOLARA FM funk, BAY 98 synthwave). No audio files.
export class AudioEngine {
  constructor() {
    this.ctx = null; this.master = null; this.radioGain = null; this.sfxGain = null;
    this.radioOn = false; this.station = 0; this.step = 0; this.nextNote = 0; this.timer = null;
    this.muted = false;
  }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.9; this.sfxGain.connect(this.master);
      this.radioGain = this.ctx.createGain(); this.radioGain.gain.value = 0.16; this.radioGain.connect(this.master);
    } catch (e) { this.ctx = null; }
  }
  tone(freq, dur, type, vol, when = 0, slideTo = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol || 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(this.sfxGain);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  noise(dur, vol, filterFreq) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq || 1200;
    const g = this.ctx.createGain(); g.gain.value = vol || 0.3;
    src.connect(f); f.connect(g); g.connect(this.sfxGain); src.start(t0);
  }
  shoot(kind) {
    if (kind === 'shotgun') { this.noise(0.25, 0.5, 900); this.tone(120, 0.18, 'square', 0.25, 0, 40); }
    else if (kind === 'smg') { this.noise(0.08, 0.3, 1800); this.tone(220, 0.06, 'square', 0.15, 0, 90); }
    else { this.noise(0.12, 0.35, 1400); this.tone(180, 0.1, 'square', 0.2, 0, 60); }
  }
  punch() { this.noise(0.08, 0.3, 500); this.tone(90, 0.08, 'sine', 0.3, 0, 50); }
  crash() { this.noise(0.3, 0.4, 600); }
  explosion() { this.noise(0.8, 0.6, 400); this.tone(60, 0.7, 'sine', 0.4, 0, 25); }
  pickup() { this.tone(660, 0.09, 'sine', 0.25); this.tone(990, 0.12, 'sine', 0.25, 0.09); }
  cash() { this.tone(880, 0.08, 'sine', 0.22); this.tone(1174, 0.08, 'sine', 0.22, 0.08); this.tone(1568, 0.14, 'sine', 0.22, 0.16); }
  siren() { this.tone(700, 0.4, 'sine', 0.06, 0, 950); }
  missionOk() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.25, i * 0.1)); }
  missionFail() { [400, 350, 300].forEach((f, i) => this.tone(f, 0.2, 'sawtooth', 0.15, i * 0.13)); }
  engineStart() { this.tone(80, 0.3, 'sawtooth', 0.12, 0, 160); }
  horn() { this.tone(370, 0.18, 'square', 0.12); this.tone(466, 0.18, 'square', 0.1); }

  // --- radio: 16-step sequencer, two stations ---
  static STATIONS = ['SOLARA FM — Funk', 'BAY 98 — Synthwave'];
  toggleRadio() {
    this.ensure();
    if (!this.ctx) return 'off';
    this.radioOn = !this.radioOn;
    if (this.radioOn) this.startSequencer(); else this.stopSequencer();
    return this.radioOn ? AudioEngine.STATIONS[this.station] : 'off';
  }
  switchStation() {
    this.station = (this.station + 1) % 2;
    if (this.radioOn) { this.step = 0; }
    return AudioEngine.STATIONS[this.station];
  }
  startSequencer() {
    if (this.timer) return;
    this.step = 0; this.nextNote = this.ctx.currentTime + 0.05;
    this.timer = setInterval(() => this.scheduleRadio(), 40);
  }
  stopSequencer() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }
  radioNote(freq, dur, type, vol, when) {
    const t0 = when; const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(this.radioGain); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  scheduleRadio() {
    if (!this.ctx) return;
    const spb = this.station === 0 ? 0.24 : 0.21; // seconds per 16th
    while (this.nextNote < this.ctx.currentTime + 0.15) {
      const s = this.step % 16, t = this.nextNote;
      if (this.station === 0) {
        // funk: bassline E minor pentatonic + hats
        const bass = [82.4, 0, 98, 0, 110, 0, 98, 82.4, 123.5, 0, 110, 98, 82.4, 0, 73.4, 98][s];
        if (bass) this.radioNote(bass, 0.22, 'sawtooth', 0.5, t);
        if (s % 4 === 0) this.radioNote(220, 0.1, 'square', 0.12, t);
        if (s % 2 === 1) this.radioNote(6000, 0.03, 'sine', 0.05, t);
      } else {
        // synthwave: Am–F–C–G pads + arp
        const chord = [[220, 261.6, 329.6], [174.6, 220, 261.6], [261.6, 329.6, 392], [196, 246.9, 293.7]][Math.floor(this.step / 16) % 4];
        if (s === 0) chord.forEach((f) => this.radioNote(f, 1.6, 'triangle', 0.22, t));
        const arp = [440, 523.3, 659.3, 880][s % 4];
        if (s % 2 === 0) this.radioNote(arp, 0.12, 'square', 0.1, t);
        if (s % 4 === 0) this.radioNote(55, 0.3, 'sine', 0.5, t);
      }
      this.step++; this.nextNote += spb;
    }
  }
}
