// main.js — The game loop: start, tick, render, and the wiring between
// input, stations, state and sound. Also exposes window.__LADLE__, a
// small debug handle used by the maker's own playtests and screenshots.

import { CANVAS_W, CANVAS_H, TARGET_SCORE } from './config.js';
import { createState, spawnOrder, servePlate, tick, addToast, endShift } from './state.js';
import { STATIONS, nearestStation, stationAtPoint, interact, movePlayer } from './stations.js';
import { createInput, moveVector, consume, consumeClick } from './input.js';
import { render } from './render.js';
import { ensureAudio, toggleMute, sfx } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

let state = createState();
const input = createInput(canvas);

function startShift() {
  state = createState();
  state.screen = 'playing';
  spawnOrder(state, 'classic');
  spawnOrder(state, 'salad');
  addToast(state, 'Shift started! Serve fast, serve right.', '#7be382');
  sfx.orderIn();
}

function playSound(key) {
  if (!key) return;
  if (key === 'serve') {
    const result = servePlate(state);
    if (result === 'served') sfx.serve();
    else if (result === 'wrong') {
      addToast(state, 'Wrong dish! Check the ticket.', '#ff7a6b');
      sfx.reject();
    } else if (result === 'noplate') {
      sfx.reject();
    }
    return;
  }
  const fn = sfx[key];
  if (fn) fn();
}

function handleEvent(name) {
  if (name === 'orderIn') sfx.orderIn();
  else if (name === 'orderLost') sfx.orderLost();
  else if (name === 'chopDone') sfx.chopDone();
  else if (name === 'cooked') sfx.cooked();
  else if (name === 'burnt') { sfx.burnt(); addToast(state, 'A patty burnt!', '#ff7a6b'); }
  else if (name === 'sizzle') sfx.sizzle();
}

function update(dt) {
  // global keys
  if (consume(input, 'mute')) {
    ensureAudio();
    const m = toggleMute();
    addToast(state, m ? 'Muted' : 'Sound on', '#c9c9c9');
  }
  if (consume(input, 'restart')) {
    if (state.screen !== 'title') startShift();
    return;
  }

  if (state.screen === 'title') {
    if (consume(input, 'start') || consumeClick(input)) {
      ensureAudio();
      sfx.click();
      startShift();
    }
    return;
  }
  if (state.screen === 'won' || state.screen === 'lost') {
    consumeClick(input);
    return;
  }
  if (consume(input, 'pause')) {
    state.screen = state.screen === 'paused' ? 'playing' : 'paused';
    sfx.click();
    return;
  }
  if (state.screen === 'paused') return;

  // --- playing ---
  tick(state, dt, handleEvent);

  // keyboard movement
  const v = moveVector(input);
  if (v.dx !== 0 || v.dy !== 0) {
    state.moveTarget = null;
    movePlayer(state, v.dx, v.dy, dt);
  } else if (state.moveTarget) {
    const dx = state.moveTarget.x - state.player.x;
    const dy = state.moveTarget.y - state.player.y;
    if (Math.hypot(dx, dy) < 8) state.moveTarget = null;
    else movePlayer(state, dx, dy, dt);
  }

  // number keys: grab straight from a bin (walk there first is not needed —
  // the chef must stand near the bin; otherwise a hint shows)
  for (const [name, id] of [['bin-bun', 'bin-bun'], ['bin-patty', 'bin-patty'],
    ['bin-lettuce', 'bin-lettuce'], ['bin-tomato', 'bin-tomato'], ['bin-cheese', 'bin-cheese']]) {
    if (consume(input, name)) {
      const bin = STATIONS.find((s) => s.id === id);
      const near = nearestStation(state);
      if (near === bin) playSound(interact(state, bin));
      else addToast(state, 'Walk to the ' + bin.label + ' bin first', '#ffd27a');
    }
  }

  // mouse click: station in range -> interact; otherwise walk there
  const click = consumeClick(input);
  if (click) {
    ensureAudio();
    const station = stationAtPoint(click.x, click.y);
    const near = nearestStation(state);
    if (station && near === station) {
      playSound(interact(state, station));
    } else if (station) {
      const c = { x: station.x + station.w / 2, y: station.y + station.h / 2 };
      state.moveTarget = c;
      state.pendingStation = station;
    } else {
      state.moveTarget = click;
      state.pendingStation = null;
    }
  }
  // arrived at a clicked station: interact now
  if (state.pendingStation) {
    const near = nearestStation(state);
    if (near === state.pendingStation) {
      playSound(interact(state, state.pendingStation));
      state.pendingStation = null;
      state.moveTarget = null;
    }
  }

  if (consume(input, 'interact')) {
    const near = nearestStation(state);
    if (near) playSound(interact(state, near));
  }
  if (consume(input, 'serve')) {
    const near = nearestStation(state);
    if (near && near.kind === 'serve') playSound('serve');
    else if (state.hand && state.hand.kind === 'plate') {
      addToast(state, 'Walk to the SERVE window first', '#ffd27a');
    }
  }

  if (state.screen === 'won') sfx.win();
  if (state.screen === 'lost') sfx.lose();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render(ctx, state);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// --- debug handle: the maker's own playtest + screenshot staging ---
window.__LADLE__ = {
  get state() { return state; },
  start: startShift,
  spawnOrder: (id) => spawnOrder(state, id),
  setShiftLeft: (s) => { state.shiftLeft = s; },
  addScore: (n) => { state.score += n; },
  forceWin: () => endShift(state, true, 'Debug win'),
  forceLoss: () => endShift(state, false, 'Debug loss'),
  teleport: (x, y) => { state.player.x = x; state.player.y = y; },
  interactAt: (id) => {
    const s = STATIONS.find((st) => st.id === id);
    if (!s) return null;
    const key = interact(state, s);
    playSound(key);
    return key;
  },
  // Stage a mid-play scene: orders up, food prepping, a plate half-built.
  stageMidPlay() {
    startShift();
    state.toasts = [];
    state.elapsed = 75;
    state.score = 145;
    state.coins = 120;
    state.streak = 3;
    state.bestStreak = 3;
    state.served = 3;
    state.shiftLeft = 105;
    state.orders = [];
    spawnOrder(state, 'classic');
    spawnOrder(state, 'cheese');
    spawnOrder(state, 'stack');
    state.orders[0].timeLeft = 22; state.orders[0].total = 42;
    state.orders[1].timeLeft = 38; state.orders[1].total = 42;
    state.orders[2].timeLeft = 14; state.orders[2].total = 42;
    state.board = { item: { kind: 'lettuce', state: 'raw' }, progress: 1.4, done: false };
    state.stove[0] = { item: { kind: 'patty', state: 'raw' }, progress: 2.2, stage: 'cooking' };
    state.assembly.plate = { kind: 'plate', contents: [
      { kind: 'bun', state: 'raw' },
      { kind: 'patty', state: 'cooked' },
    ] };
    state.hand = { kind: 'lettuce', state: 'chopped' };
    state.player.x = 640; state.player.y = 500;
  },
  // Stage a plate ready to serve at the window.
  stageServe() {
    startShift();
    state.toasts = [];
    state.elapsed = 40;
    state.score = 95;
    state.coins = 60;
    state.streak = 2;
    state.shiftLeft = 140;
    state.orders = [];
    spawnOrder(state, 'classic');
    state.orders[0].timeLeft = 31; state.orders[0].total = 45;
    state.hand = { kind: 'plate', contents: [
      { kind: 'bun', state: 'raw' },
      { kind: 'patty', state: 'cooked' },
      { kind: 'lettuce', state: 'chopped' },
    ] };
    state.player.x = 1080; state.player.y = 500;
  },
  stageWin() {
    startShift();
    state.toasts = [];
    state.score = TARGET_SCORE;
    state.coins = 315;
    state.served = 6;
    state.bestStreak = 4;
    endShift(state, true, 'Target reached — the Golden Ladle is yours!');
  },
};
