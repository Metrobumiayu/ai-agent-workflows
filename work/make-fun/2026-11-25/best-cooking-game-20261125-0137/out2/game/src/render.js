// render.js — Every pixel is drawn with canvas paths: the kitchen, the
// order board, ingredient icons, the chef, plates mid-assembly, HUD and
// the title / pause / win / lose screens. No images, no fonts from the
// network — system fonts only.

import {
  CANVAS_W, CANVAS_H, HUD_H, BOARD_H, SHIFT_SECONDS, TARGET_SCORE,
  INGREDIENTS, RECIPES,
} from './config.js';
import { STATIONS, stationCenter, nearestStation } from './stations.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'center', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

// --- ingredient icons (drawn, not images) ---
export function drawIngredient(ctx, kind, state, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  if (kind === 'bun') {
    ctx.fillStyle = '#e8b96a';
    ctx.beginPath(); ctx.ellipse(0, -s * 0.15, s, s * 0.62, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#d99a4a';
    ctx.fillRect(-s, -s * 0.18, s * 2, s * 0.18);
    ctx.fillStyle = '#fff3d6';
    [[-0.5, -0.45], [0, -0.6], [0.5, -0.45]].forEach(([dx, dy]) => {
      ctx.beginPath(); ctx.ellipse(dx * s, dy * s, s * 0.09, s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
    });
  } else if (kind === 'patty') {
    ctx.fillStyle = state === 'burnt' ? '#1c1c1c' : state === 'cooked' ? '#6e4526' : '#a86a4a';
    ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    if (state === 'cooked') {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.ellipse(-s * 0.3, -s * 0.15, s * 0.3, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    }
  } else if (kind === 'lettuce') {
    ctx.fillStyle = state === 'chopped' ? '#8fd45f' : '#5da83c';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.ellipse(i * s * 0.5, 0, s * 0.55, s * 0.42, i * 0.3, 0, Math.PI * 2); ctx.fill();
    }
  } else if (kind === 'tomato') {
    ctx.fillStyle = state === 'chopped' ? '#ff7a5c' : '#e84a3a';
    ctx.beginPath(); ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5da83c';
    ctx.beginPath(); ctx.arc(0, -s * 0.7, s * 0.25, 0, Math.PI * 2); ctx.fill();
    if (state === 'chopped') {
      ctx.strokeStyle = '#c22e22'; ctx.lineWidth = s * 0.12;
      ctx.beginPath(); ctx.moveTo(-s * 0.6, 0); ctx.lineTo(s * 0.6, 0); ctx.stroke();
    }
  } else if (kind === 'cheese') {
    ctx.fillStyle = '#f5c542';
    ctx.beginPath(); ctx.moveTo(-s, s * 0.5); ctx.lineTo(0, -s * 0.7); ctx.lineTo(s, s * 0.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d99a1f';
    [[-0.4, 0.1], [0.25, 0.2], [0, -0.25]].forEach(([dx, dy]) => {
      ctx.beginPath(); ctx.arc(dx * s, dy * s, s * 0.1, 0, Math.PI * 2); ctx.fill();
    });
  }
  ctx.restore();
}

function drawPlate(ctx, contents, x, y, s) {
  ctx.fillStyle = '#f4f4f4';
  ctx.beginPath(); ctx.ellipse(x, y, s * 1.5, s * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c8c8c8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y, s * 1.5, s * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
  let dy = 0;
  for (const item of contents) {
    drawIngredient(ctx, item.kind, item.state, x, y - s * 0.15 - dy, s * 0.62);
    dy += s * 0.3;
  }
}

// --- the whole frame ---
export function render(ctx, state) {
  drawKitchen(ctx, state);
  drawOrderBoard(ctx, state);
  drawHUD(ctx, state);
  drawStations(ctx, state);
  drawPlayer(ctx, state);
  drawToasts(ctx, state);
  if (state.flash) {
    ctx.fillStyle = state.flash.color;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
  if (state.screen === 'title') drawTitle(ctx, state);
  if (state.screen === 'paused') drawPause(ctx);
  if (state.screen === 'won' || state.screen === 'lost') drawEnd(ctx, state);
}

function drawKitchen(ctx) {
  // floor: warm wood tiles
  ctx.fillStyle = '#c98f5a';
  ctx.fillRect(0, HUD_H + BOARD_H, CANVAS_W, CANVAS_H - HUD_H - BOARD_H);
  ctx.fillStyle = '#bd8250';
  for (let y = HUD_H + BOARD_H; y < CANVAS_H; y += 56) {
    ctx.fillRect(0, y, CANVAS_W, 2);
  }
  for (let x = 0; x < CANVAS_W; x += 112) {
    ctx.fillRect(x, HUD_H + BOARD_H, 2, CANVAS_H - HUD_H - BOARD_H);
  }
  // back wall strip with a window and a clock
  ctx.fillStyle = '#8e5b3a';
  ctx.fillRect(0, HUD_H + BOARD_H, CANVAS_W, 16);
  ctx.fillStyle = '#ffe9a8';
  rr(ctx, 760, HUD_H + BOARD_H + 22, 120, 60, 8); ctx.fill();
  ctx.fillStyle = '#7ec8e3';
  rr(ctx, 768, HUD_H + BOARD_H + 30, 104, 44, 5); ctx.fill();
  ctx.strokeStyle = '#8e5b3a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(820, HUD_H + BOARD_H + 30); ctx.lineTo(820, HUD_H + BOARD_H + 74); ctx.stroke();
}

function drawHUD(ctx, state) {
  ctx.fillStyle = '#2b2118';
  ctx.fillRect(0, 0, CANVAS_W, HUD_H);
  text(ctx, 'THE GOLDEN LADLE', 16, 34, 26, '#ffcf5c', 'left');
  const mins = Math.floor(Math.max(0, state.shiftLeft) / 60);
  const secs = Math.floor(Math.max(0, state.shiftLeft) % 60);
  const clock = `${mins}:${String(secs).padStart(2, '0')}`;
  const low = state.shiftLeft <= 30 && state.screen === 'playing';
  text(ctx, '⏱ ' + clock, 330, 34, 24, low ? '#ff6b5e' : '#ffffff', 'left');
  // shift progress bar
  ctx.fillStyle = '#4a3a28';
  rr(ctx, 470, 26, 220, 16, 8); ctx.fill();
  ctx.fillStyle = low ? '#ff6b5e' : '#7be382';
  const frac = 1 - state.shiftLeft / SHIFT_SECONDS;
  if (frac > 0) { rr(ctx, 470, 26, 220 * frac, 16, 8); ctx.fill(); }
  text(ctx, 'SCORE ' + state.score + ' / ' + TARGET_SCORE, 720, 34, 22, '#ffffff', 'left');
  text(ctx, '🪙 ' + state.coins, 960, 34, 22, '#ffd94a', 'left');
  if (state.streak >= 2) {
    text(ctx, '🔥 x' + state.streak + ' STREAK', 1060, 34, 20, '#ff9a3d', 'left');
  } else {
    text(ctx, 'streak x' + state.streak, 1060, 34, 18, '#b9a68f', 'left');
  }
}

function drawOrderBoard(ctx, state) {
  const y0 = HUD_H;
  ctx.fillStyle = '#3d2f22';
  ctx.fillRect(0, y0, CANVAS_W, BOARD_H);
  ctx.fillStyle = '#5a4632';
  ctx.fillRect(0, y0, CANVAS_W, 4);
  text(ctx, 'ORDER BOARD', 16, y0 + 24, 16, '#ffcf5c', 'left');
  text(ctx, 'serve before the timer runs out!', 16, y0 + 70, 13, '#c9b49a', 'left');
  let x = 230;
  for (const order of state.orders) {
    drawTicket(ctx, order, x, y0 + 12, 210, BOARD_H - 24);
    x += 224;
  }
  if (state.orders.length === 0) {
    text(ctx, 'No orders yet — the rush is coming…', 240, y0 + 48, 16, '#c9b49a', 'left');
  }
}

function drawTicket(ctx, order, x, y, w, h) {
  const urgency = order.timeLeft / order.total;
  ctx.fillStyle = '#fff6df';
  rr(ctx, x, y, w, h, 8); ctx.fill();
  ctx.fillStyle = urgency < 0.33 ? '#e84a3a' : urgency < 0.6 ? '#e8a13a' : '#5da83c';
  rr(ctx, x, y + h - 12, w * urgency, 12, 6); ctx.fill();
  text(ctx, order.recipe.name, x + 10, y + 18, 15, '#2b2118', 'left');
  let ix = x + 16;
  for (const tok of order.recipe.needs) {
    const [kind, st] = tok.split('-');
    drawIngredient(ctx, kind, st || 'raw', ix + 12, y + 44, 13);
    ix += 34;
  }
  text(ctx, Math.ceil(order.timeLeft) + 's', x + w - 12, y + 18, 16, urgency < 0.33 ? '#e84a3a' : '#2b2118', 'right');
  text(ctx, '$' + order.recipe.price, x + w - 12, y + 46, 13, '#8a6a2a', 'right');
}

function drawStations(ctx, state) {
  const near = state.screen === 'playing' ? nearestStation(state) : null;
  for (const s of STATIONS) {
    const isNear = near && near.id === s.id;
    ctx.fillStyle = stationFill(s.kind);
    rr(ctx, s.x, s.y, s.w, s.h, 10); ctx.fill();
    ctx.lineWidth = isNear ? 4 : 2;
    ctx.strokeStyle = isNear ? '#ffe066' : 'rgba(0,0,0,0.35)';
    rr(ctx, s.x, s.y, s.w, s.h, 10); ctx.stroke();
    text(ctx, s.label, s.x + s.w / 2, s.y + 14, 12, '#fff', 'center');
    drawStationContent(ctx, state, s);
    if (isNear) {
      text(ctx, '[E] interact', s.x + s.w / 2, s.y + s.h + 14, 12, '#ffe066');
    }
  }
}

function stationFill(kind) {
  switch (kind) {
    case 'bin': return '#7a5a3a';
    case 'board': return '#a9804f';
    case 'stove': return '#5b5b66';
    case 'plates': return '#4a6b8a';
    case 'assembly': return '#8a6d4b';
    case 'serve': return '#3f7a4a';
    case 'trash': return '#6b4a4a';
    default: return '#666';
  }
}

function drawStationContent(ctx, state, s) {
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2 + 8;
  if (s.kind === 'bin') {
    drawIngredient(ctx, s.ingredient, 'raw', cx, cy, 20);
  } else if (s.kind === 'board') {
    ctx.fillStyle = '#e8d5b0';
    rr(ctx, s.x + 16, s.y + 30, s.w - 32, s.h - 44, 6); ctx.fill();
    const b = state.board;
    if (b.item) {
      drawIngredient(ctx, b.item.kind, b.done ? 'chopped' : 'raw', cx, cy, 20);
      if (!b.done) progressBar(ctx, cx - 50, s.y + s.h - 14, 100, 8, b.progress / 2.5);
      else text(ctx, 'READY!', cx, s.y + s.h - 22, 13, '#2f7a2f');
    } else {
      text(ctx, 'drop lettuce / tomato', cx, cy, 12, '#8a6d4b');
    }
  } else if (s.kind === 'stove') {
    state.stove.forEach((slot, i) => {
      const bx = s.x + 30 + i * 105;
      ctx.fillStyle = '#2b2b30';
      ctx.beginPath(); ctx.arc(bx + 40, cy, 42, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#888'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(bx + 40, cy, 42, 0, Math.PI * 2); ctx.stroke();
      if (slot.item) {
        drawIngredient(ctx, slot.item.kind, slot.item.state, bx + 40, cy, 22);
        if (slot.stage === 'cooking') progressBar(ctx, bx, s.y + s.h - 14, 80, 8, slot.progress / 4.0, '#ff9a3d');
        if (slot.stage === 'cooked') text(ctx, 'READY!', bx + 40, s.y + s.h - 22, 12, '#7be382');
        if (slot.stage === 'burnt') text(ctx, 'BURNT!', bx + 40, s.y + s.h - 22, 12, '#ff6b5e');
      }
    });
  } else if (s.kind === 'plates') {
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = '#f4f4f4';
      ctx.beginPath(); ctx.ellipse(cx, cy + 12 - i * 7, 26, 8, 0, 0, Math.PI * 2); ctx.fill();
    }
  } else if (s.kind === 'assembly') {
    const a = state.assembly;
    if (a.plate) drawPlate(ctx, a.plate.contents, cx, cy + 6, 30);
    else text(ctx, 'place a plate, then add food', cx, cy, 12, '#e8d5b0');
  } else if (s.kind === 'serve') {
    ctx.fillStyle = '#2f5a37';
    rr(ctx, s.x + 14, s.y + 28, s.w - 28, s.h - 40, 6); ctx.fill();
    text(ctx, '🍽 SERVE HERE', cx, cy + 4, 14, '#ffe9a8');
    text(ctx, 'Space = serve', cx, cy + 24, 11, '#cfe8c9');
  } else if (s.kind === 'trash') {
    text(ctx, '🗑', cx, cy, 28, '#fff');
  }
}

function progressBar(ctx, x, y, w, h, frac, color = '#7be382') {
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  rr(ctx, x, y, w, h, h / 2); ctx.fill();
  ctx.fillStyle = color;
  if (frac > 0) { rr(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2); ctx.fill(); }
}

function drawPlayer(ctx, state) {
  const p = state.player;
  ctx.save();
  ctx.translate(p.x, p.y);
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(0, 20, 24, 8, 0, 0, Math.PI * 2); ctx.fill();
  // body (apron)
  ctx.fillStyle = '#f2f2f2';
  rr(ctx, -16, -8, 32, 34, 10); ctx.fill();
  ctx.fillStyle = '#3f7a4a';
  ctx.fillRect(-16, 8, 32, 8);
  // head + toque
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath(); ctx.arc(0, -20, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(0, -32, 12, Math.PI, 0); ctx.fill();
  ctx.fillRect(-12, -34, 24, 6);
  // eyes
  ctx.fillStyle = '#2b2118';
  ctx.beginPath(); ctx.arc(-4 + p.dir * 2, -20, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(5 + p.dir * 2, -20, 1.8, 0, Math.PI * 2); ctx.fill();
  // held item above head
  if (state.hand) {
    if (state.hand.kind === 'plate') drawPlate(ctx, state.hand.contents, 0, -62, 20);
    else drawIngredient(ctx, state.hand.kind, state.hand.state, 0, -58, 17);
  }
  ctx.restore();
}

function drawToasts(ctx, state) {
  let y = CANVAS_H - 120;
  for (const t of state.toasts) {
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t.t - 1.4) / 0.8);
    text(ctx, t.text, CANVAS_W / 2, y, 20, t.color);
    y -= 26;
  }
  ctx.globalAlpha = 1;
}

function overlay(ctx) {
  ctx.fillStyle = 'rgba(20,14,8,0.72)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

function drawTitle(ctx, state) {
  overlay(ctx);
  text(ctx, '🍳', CANVAS_W / 2, 150, 64, '#fff');
  text(ctx, 'THE GOLDEN LADLE', CANVAS_W / 2, 230, 56, '#ffcf5c');
  text(ctx, 'A 3-minute kitchen rush — serve the orders, beat the clock.', CANVAS_W / 2, 285, 20, '#fff');
  const lines = [
    'WASD / Arrows — move the chef      E — grab / place / interact',
    '1–5 — grab an ingredient bin      Space — serve at the window',
    'Chop lettuce & tomato on the board · cook patties on the stove',
    'Build dishes on a plate at the assembly counter — match the ticket!',
    'Reach 300 points before the shift ends to win the Golden Ladle.',
  ];
  lines.forEach((l, i) => text(ctx, l, CANVAS_W / 2, 340 + i * 30, 17, '#e8d5b0'));
  const blink = Math.floor(Date.now() / 500) % 2 === 0;
  if (blink) text(ctx, 'PRESS ENTER OR CLICK TO START', CANVAS_W / 2, 530, 24, '#7be382');
  text(ctx, 'P pause · R restart · M mute', CANVAS_W / 2, 580, 15, '#b9a68f');
}

function drawPause(ctx) {
  overlay(ctx);
  text(ctx, 'PAUSED', CANVAS_W / 2, 320, 48, '#ffcf5c');
  text(ctx, 'Press P to keep cooking', CANVAS_W / 2, 380, 20, '#fff');
}

function drawEnd(ctx, state) {
  overlay(ctx);
  const win = state.screen === 'won';
  text(ctx, win ? '🏆 YOU WIN!' : '⏰ SHIFT OVER', CANVAS_W / 2, 220, 52, win ? '#ffcf5c' : '#ff7a6b');
  text(ctx, state.result ? state.result.reason : '', CANVAS_W / 2, 285, 20, '#fff');
  text(ctx, `Score ${state.score} / ${TARGET_SCORE}   ·   Dishes served ${state.served}   ·   Best streak x${state.bestStreak}`, CANVAS_W / 2, 340, 20, '#e8d5b0');
  text(ctx, `Coins earned 🪙 ${state.coins}   ·   Orders lost ${state.lostOrders}`, CANVAS_W / 2, 375, 18, '#e8d5b0');
  const blink = Math.floor(Date.now() / 500) % 2 === 0;
  if (blink) text(ctx, 'PRESS R TO PLAY AGAIN', CANVAS_W / 2, 450, 24, '#7be382');
}
