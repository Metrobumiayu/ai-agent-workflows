// state.js — The single game state: shift clock, score, coins, streak,
// live orders, the chef's hands, and every station slot. Pure logic here;
// drawing lives in render.js, interaction in stations.js.

import {
  SHIFT_SECONDS, TARGET_SCORE, ORDER_START_SECONDS, ORDER_MIN_SECONDS,
  ORDER_SPAWN_SECONDS, MAX_ORDERS_START, MAX_ORDERS_CAP, BASE_POINTS,
  TIME_BONUS_MAX, STREAK_BONUS, EXPIRE_PENALTY, RECIPES,
  plateMatchesRecipe,
} from './config.js';

let orderSeq = 1;

export function createState() {
  return {
    screen: 'title', // title | playing | paused | won | lost
    shiftLeft: SHIFT_SECONDS,
    elapsed: 0,
    score: 0,
    coins: 0,
    streak: 0,
    bestStreak: 0,
    served: 0,
    lostOrders: 0,
    orders: [],
    spawnTimer: 4,
    hand: null, // null | {kind, state} | {kind:'plate', contents:[items]}
    toasts: [], // {text, color, t}
    flash: null, // {color, t}
    result: null, // {win, reason} filled on win/lose
    player: { x: 640, y: 470, dir: 1, moving: false },
    moveTarget: null,
    // station slots
    board: { item: null, progress: 0, done: false }, // chopping board
    stove: [
      { item: null, progress: 0, stage: 'empty' }, // stage: empty|cooking|cooked|burnt
      { item: null, progress: 0, stage: 'empty' },
    ],
    assembly: { plate: null }, // plate sitting on the assembly counter
    sizzleTimer: 0,
  };
}

export function orderTimerFor(elapsed) {
  const t = ORDER_START_SECONDS - Math.floor(elapsed / 30) * 3;
  return Math.max(ORDER_MIN_SECONDS, t);
}

export function maxOrdersFor(elapsed) {
  return Math.min(MAX_ORDERS_CAP, MAX_ORDERS_START + Math.floor(elapsed / 60));
}

export function spawnOrder(state, recipeId) {
  const recipe = recipeId
    ? RECIPES.find((r) => r.id === recipeId)
    : RECIPES[Math.floor(Math.random() * RECIPES.length)];
  if (!recipe) return null;
  const total = orderTimerFor(state.elapsed);
  const order = { id: orderSeq++, recipe, timeLeft: total, total };
  state.orders.push(order);
  return order;
}

export function addToast(state, text, color = '#fff') {
  state.toasts.push({ text, color, t: 0 });
  if (state.toasts.length > 5) state.toasts.shift();
}

export function flash(state, color) {
  state.flash = { color, t: 0 };
}

// Try to serve the plate in hand at the window. Returns 'served' | 'wrong' | 'noplate'.
export function servePlate(state) {
  const hand = state.hand;
  if (!hand || hand.kind !== 'plate') return 'noplate';
  const idx = state.orders.findIndex((o) => plateMatchesRecipe(hand.contents, o.recipe));
  if (idx === -1) return 'wrong';
  const order = state.orders[idx];
  state.orders.splice(idx, 1);
  const timeBonus = Math.round((order.timeLeft / order.total) * TIME_BONUS_MAX);
  const streakBonus = state.streak * STREAK_BONUS;
  const points = BASE_POINTS + timeBonus + streakBonus;
  state.score += points;
  state.coins += order.recipe.price;
  state.streak += 1;
  state.bestStreak = Math.max(state.bestStreak, state.streak);
  state.served += 1;
  addToast(state, `+${points}  ${order.recipe.name}!`, '#7be382');
  if (state.score >= TARGET_SCORE) {
    endShift(state, true, 'Target reached — the Golden Ladle is yours!');
  }
  return 'served';
}

export function expireOrder(state, order) {
  const idx = state.orders.indexOf(order);
  if (idx !== -1) state.orders.splice(idx, 1);
  state.lostOrders += 1;
  state.streak = 0;
  state.score = Math.max(0, state.score - EXPIRE_PENALTY);
  addToast(state, `Order lost: ${order.recipe.name}  (-${EXPIRE_PENALTY})`, '#ff7a6b');
  flash(state, 'rgba(255,60,40,0.25)');
}

export function endShift(state, win, reason) {
  if (state.screen !== 'playing') return;
  state.screen = win ? 'won' : 'lost';
  state.result = { win, reason };
}

// Advance timers by dt seconds. Called only while playing.
export function tick(state, dt, onEvent) {
  state.elapsed += dt;
  state.shiftLeft = Math.max(0, state.shiftLeft - dt);
  if (state.shiftLeft <= 0) {
    endShift(state, state.score >= TARGET_SCORE,
      state.score >= TARGET_SCORE
        ? 'Shift over — target reached!'
        : 'Shift over — target missed.');
    return;
  }

  // order spawn
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    state.spawnTimer = ORDER_SPAWN_SECONDS;
    if (state.orders.length < maxOrdersFor(state.elapsed)) {
      spawnOrder(state);
      onEvent && onEvent('orderIn');
    }
  }

  // order countdowns
  for (const order of [...state.orders]) {
    order.timeLeft -= dt;
    if (order.timeLeft <= 0) {
      expireOrder(state, order);
      onEvent && onEvent('orderLost');
    }
  }

  // chopping board
  const b = state.board;
  if (b.item && !b.done) {
    b.progress += dt;
    if (b.progress >= 2.5) {
      b.done = true;
      b.item.state = 'chopped';
      onEvent && onEvent('chopDone');
    }
  }

  // stove slots
  for (const slot of state.stove) {
    if (!slot.item) continue;
    slot.progress += dt;
    if (slot.stage === 'cooking' && slot.progress >= 4.0) {
      slot.stage = 'cooked';
      slot.item.state = 'cooked';
      slot.progress = 0;
      onEvent && onEvent('cooked');
    } else if (slot.stage === 'cooked' && slot.progress >= 4.0) {
      slot.stage = 'burnt';
      slot.item.state = 'burnt';
      onEvent && onEvent('burnt');
    }
  }
  state.sizzleTimer -= dt;
  if (state.sizzleTimer <= 0 && state.stove.some((s) => s.stage === 'cooking')) {
    state.sizzleTimer = 0.9;
    onEvent && onEvent('sizzle');
  }

  // toasts + flash decay
  for (const t of state.toasts) t.t += dt;
  state.toasts = state.toasts.filter((t) => t.t < 2.2);
  if (state.flash) {
    state.flash.t += dt;
    if (state.flash.t > 0.5) state.flash = null;
  }
}
