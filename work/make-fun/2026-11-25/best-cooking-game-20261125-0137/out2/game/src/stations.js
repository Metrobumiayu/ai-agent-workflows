// stations.js — The kitchen layout and every interaction: bins hand out
// raw ingredients, the board chops, the stove cooks (and burns), the
// assembly counter builds plates, the window serves, the trash clears.

import { INGREDIENTS, INTERACT_RANGE } from './config.js';
import { addToast } from './state.js';

export const STATIONS = [
  // ingredient bins, top row
  { id: 'bin-bun',     kind: 'bin', ingredient: 'bun',     x: 60,  y: 176, w: 110, h: 74, label: 'BUNS' },
  { id: 'bin-patty',   kind: 'bin', ingredient: 'patty',   x: 190, y: 176, w: 110, h: 74, label: 'PATTY' },
  { id: 'bin-lettuce', kind: 'bin', ingredient: 'lettuce', x: 320, y: 176, w: 110, h: 74, label: 'LETTUCE' },
  { id: 'bin-tomato',  kind: 'bin', ingredient: 'tomato',  x: 450, y: 176, w: 110, h: 74, label: 'TOMATO' },
  { id: 'bin-cheese',  kind: 'bin', ingredient: 'cheese',  x: 580, y: 176, w: 110, h: 74, label: 'CHEESE' },
  // work stations
  { id: 'board',    kind: 'board',    x: 60,  y: 330, w: 200, h: 110, label: 'CHOPPING BOARD' },
  { id: 'stove',    kind: 'stove',    x: 980, y: 330, w: 240, h: 110, label: 'STOVE' },
  { id: 'plates',   kind: 'plates',   x: 380, y: 560, w: 90,  h: 90,  label: 'PLATES' },
  { id: 'assembly', kind: 'assembly', x: 490, y: 560, w: 300, h: 90,  label: 'ASSEMBLY COUNTER' },
  { id: 'serve',    kind: 'serve',    x: 1010, y: 560, w: 210, h: 90,  label: 'SERVE WINDOW' },
  { id: 'trash',    kind: 'trash',    x: 60,  y: 560, w: 110, h: 90,  label: 'TRASH' },
];

export function stationCenter(s) {
  return { x: s.x + s.w / 2, y: s.y + s.h / 2 };
}

export function nearestStation(state) {
  const p = state.player;
  let best = null;
  let bestD = Infinity;
  for (const s of STATIONS) {
    const c = stationCenter(s);
    const d = Math.hypot(p.x - c.x, p.y - c.y);
    const reach = INTERACT_RANGE + Math.max(s.w, s.h) / 2;
    if (d < reach && d < bestD) { best = s; bestD = d; }
  }
  return best;
}

export function stationAtPoint(x, y) {
  return STATIONS.find((s) => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) || null;
}

function handLabel(item) {
  if (!item) return 'empty hands';
  if (item.kind === 'plate') return 'a plate';
  const ing = INGREDIENTS[item.kind];
  return ing.name + (item.state === 'raw' ? '' : ' (' + item.state + ')');
}

// One interaction at a station. Returns a sound key for audio.js, or null.
export function interact(state, station) {
  if (!station || state.screen !== 'playing') return null;
  const hand = state.hand;

  if (station.kind === 'bin') {
    if (hand) { addToast(state, 'Hands full — serve or trash first', '#ffd27a'); return 'reject'; }
    state.hand = { kind: station.ingredient, state: 'raw' };
    return 'pickup';
  }

  if (station.kind === 'plates') {
    if (hand) { addToast(state, 'Hands full', '#ffd27a'); return 'reject'; }
    state.hand = { kind: 'plate', contents: [] };
    return 'pickup';
  }

  if (station.kind === 'board') {
    const b = state.board;
    if (b.item) {
      if (!b.done) { addToast(state, 'Still chopping…', '#ffd27a'); return null; }
      if (hand) { addToast(state, 'Hands full', '#ffd27a'); return 'reject'; }
      state.hand = b.item;
      state.board = { item: null, progress: 0, done: false };
      return 'pickup';
    }
    if (!hand) return null;
    if (hand.kind === 'plate') { addToast(state, 'Plates go on the assembly counter', '#ffd27a'); return 'reject'; }
    if (!INGREDIENTS[hand.kind].chop) { addToast(state, INGREDIENTS[hand.kind].name + ' needs no chopping', '#ffd27a'); return 'reject'; }
    if (hand.state !== 'raw') { addToast(state, 'Already chopped', '#ffd27a'); return 'reject'; }
    state.board = { item: hand, progress: 0, done: false };
    state.hand = null;
    return 'chop';
  }

  if (station.kind === 'stove') {
    // take a finished patty first if the player has a free hand
    if (!hand) {
      const slot = state.stove.find((s) => s.item && (s.stage === 'cooked' || s.stage === 'burnt'));
      if (slot) {
        state.hand = slot.item;
        slot.item = null; slot.progress = 0; slot.stage = 'empty';
        return 'pickup';
      }
      return null;
    }
    if (hand.kind === 'plate') { addToast(state, 'Plates go on the assembly counter', '#ffd27a'); return 'reject'; }
    if (!INGREDIENTS[hand.kind].cook) { addToast(state, INGREDIENTS[hand.kind].name + ' needs no cooking', '#ffd27a'); return 'reject'; }
    if (hand.state !== 'raw') { addToast(state, 'Already cooked', '#ffd27a'); return 'reject'; }
    const free = state.stove.find((s) => !s.item);
    if (!free) { addToast(state, 'Stove is full', '#ffd27a'); return 'reject'; }
    free.item = hand; free.progress = 0; free.stage = 'cooking';
    state.hand = null;
    return 'place';
  }

  if (station.kind === 'assembly') {
    const a = state.assembly;
    if (!a.plate) {
      if (!hand) return null;
      if (hand.kind !== 'plate') { addToast(state, 'Bring a plate here first', '#ffd27a'); return 'reject'; }
      a.plate = hand;
      state.hand = null;
      return 'place';
    }
    // a plate is on the counter
    if (!hand) {
      state.hand = a.plate;
      a.plate = null;
      return 'pickup';
    }
    if (hand.kind === 'plate') { addToast(state, 'One plate at a time', '#ffd27a'); return 'reject'; }
    if (hand.state === 'burnt') { addToast(state, 'Burnt! Trash it', '#ff7a6b'); return 'reject'; }
    if (hand.state === 'raw' && INGREDIENTS[hand.kind].prep !== 'none') {
      addToast(state, INGREDIENTS[hand.kind].name + ' needs prep first', '#ffd27a');
      return 'reject';
    }
    a.plate.contents.push(hand);
    state.hand = null;
    return 'place';
  }

  if (station.kind === 'serve') {
    if (!hand || hand.kind !== 'plate') {
      addToast(state, 'Bring a finished plate to serve', '#ffd27a');
      return 'reject';
    }
    if (hand.contents.length === 0) { addToast(state, 'Empty plate!', '#ffd27a'); return 'reject'; }
    return 'serve'; // main.js resolves the serve through state.servePlate
  }

  if (station.kind === 'trash') {
    if (!hand) return null;
    state.hand = null;
    addToast(state, 'Tossed ' + handLabel(hand), '#c9c9c9');
    return 'place';
  }

  return null;
}

// Walk the chef: keyboard vector or click target, blocked by station rects.
export function movePlayer(state, dx, dy, dt) {
  const p = state.player;
  const len = Math.hypot(dx, dy);
  if (len < 0.001) { p.moving = false; return; }
  const nx = p.x + (dx / len) * 280 * dt;
  const ny = p.y + (dy / len) * 280 * dt;
  p.moving = true;
  if (dx !== 0) p.dir = dx > 0 ? 1 : -1;
  if (!hitsStation(nx, p.y)) p.x = nx;
  if (!hitsStation(p.x, ny)) p.y = ny;
  p.x = Math.max(40, Math.min(1240, p.x));
  p.y = Math.max(280, Math.min(700, p.y));
}

function hitsStation(x, y) {
  const r = 22;
  return STATIONS.some((s) =>
    x + r > s.x + 4 && x - r < s.x + s.w - 4 &&
    y + r > s.y + 4 && y - r < s.y + s.h - 4);
}
