// Vice Bay — HUD, minimap and menus. One job: everything drawn on top of the
// world: health/armor/cash/wanted/clock, the live minimap with blips, objective
// and message banners, prompts, and the title / briefing / shop / pause /
// dead / ending screens. Canvas only — no DOM menus to keep the page offline.
import { WEAPONS } from './config.js';
import { clockLabel, weatherLabel, isNight } from './weather.js';
import { rankOf } from './economy.js';
import { carById } from './vehicles.js';

export function drawHUD(G, ctx, w, h) {
  const p = G.player;
  // Top-left: health, armor, cash, rank.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(14, 12, 250, 86);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(`$${p.money.toLocaleString()}`, 24, 34);
  ctx.fillStyle = '#7ee081';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(`${rankOf(p.rep).name}  •  REP ${p.rep}`, 24, 52);
  // Health bar.
  ctx.fillStyle = '#333';
  ctx.fillRect(24, 60, 110, 10);
  ctx.fillStyle = p.hp > 30 ? '#37d67a' : '#ff5252';
  ctx.fillRect(24, 60, 110 * Math.max(0, p.hp / 100), 10);
  ctx.fillStyle = '#fff';
  ctx.font = '11px monospace';
  ctx.fillText('HP', 138, 69);
  // Armor bar.
  ctx.fillStyle = '#333';
  ctx.fillRect(24, 76, 110, 10);
  ctx.fillStyle = '#4fc3f7';
  ctx.fillRect(24, 76, 110 * Math.max(0, p.armor / 100), 10);
  ctx.fillStyle = '#fff';
  ctx.fillText('ARMOR', 138, 85);
  // Wanted stars, top-right of the left block.
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < p.wanted ? '#ffd166' : 'rgba(255,255,255,0.25)';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('★', 168 + i * 20, 36);
  }
  // Top-right: clock + weather + radio.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(w - 226, 12, 212, 62);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(`${clockLabel(G)}  DAY ${G.clock.day}`, w - 214, 34);
  ctx.fillStyle = '#b0bec5';
  ctx.font = '12px monospace';
  ctx.fillText(weatherLabel(G), w - 214, 54);
  ctx.fillText(G.audio.stationName, w - 214, 70);
  // Weapon + ammo, bottom-left.
  const wp = WEAPONS[p.weapon];
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(14, h - 52, 210, 38);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(wp.name, 24, h - 30);
  ctx.fillStyle = '#ffd166';
  ctx.font = '12px monospace';
  ctx.fillText(p.weapon === 'fists' ? '—' : `AMMO ${p.ammo[p.weapon] || 0}`, 24, h - 16);
  ctx.fillStyle = '#b0bec5';
  ctx.fillText('1-5 weapons • R radio • M map', 130, h - 16);
  // Objective banner, top-center.
  if (G.objectiveText) {
    ctx.font = 'bold 15px monospace';
    const tw = ctx.measureText(G.objectiveText).width;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(w / 2 - tw / 2 - 14, 12, tw + 28, 30);
    ctx.fillStyle = '#ffd166';
    ctx.fillText(G.objectiveText, w / 2 - tw / 2, 33);
  }
  // Message banner, center.
  if (G.messageT > 0 && G.message) {
    ctx.font = 'bold 17px monospace';
    const tw = ctx.measureText(G.message).width;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(w / 2 - tw / 2 - 14, h * 0.3, tw + 28, 34);
    ctx.fillStyle = '#fff';
    ctx.fillText(G.message, w / 2 - tw / 2, h * 0.3 + 23);
  }
  // Mission complete / fail flash.
  if (G.bannerT > 0 && G.banner) {
    ctx.font = 'bold 34px monospace';
    const tw = ctx.measureText(G.banner).width;
    ctx.fillStyle = G.bannerColor || '#7ee081';
    ctx.fillText(G.banner, w / 2 - tw / 2, h * 0.42);
    ctx.font = '16px monospace';
    ctx.fillStyle = '#fff';
    if (G.bannerSub) {
      const sw = ctx.measureText(G.bannerSub).width;
      ctx.fillText(G.bannerSub, w / 2 - sw / 2, h * 0.42 + 28);
    }
  }
  // Context prompt, bottom-center.
  if (G.prompt) {
    ctx.font = 'bold 15px monospace';
    const tw = ctx.measureText(G.prompt).width;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(w / 2 - tw / 2 - 12, h - 92, tw + 24, 30);
    ctx.fillStyle = '#fff';
    ctx.fillText(G.prompt, w / 2 - tw / 2, h - 72);
  }
  drawMinimap(G, ctx, w, h);
}

function drawMinimap(G, ctx, w, h) {
  const size = 190;
  const x0 = w - size - 14, y0 = h - size - 14;
  const scale = size / 6400;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x0 - 4, y0 - 4, size + 8, size + 8);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, size, size);
  ctx.clip();
  // Ocean + land.
  ctx.fillStyle = '#1b4d6b';
  ctx.fillRect(x0, y0, size, size);
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(x0 + 270 * scale, y0, size - 270 * scale, size);
  // Roads.
  ctx.fillStyle = '#888';
  for (const rx of G.city.roadsV) ctx.fillRect(x0 + rx * scale - 1, y0, 2, size);
  for (const ry of G.city.roadsH) ctx.fillRect(x0, y0 + ry * scale - 1, size, 2);
  // Buildings, faint.
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (const b of G.city.buildings) ctx.fillRect(x0 + b.x * scale, y0 + b.y * scale, Math.max(1, b.w * scale), Math.max(1, b.h * scale));
  // Shops.
  const shopColor = { gun: '#ff5252', garage: '#ffb74d', safehouse: '#7ee081', bar: '#ffd166', casino: '#ff2e88', taxi: '#4fc3f7', race: '#ce93d8', hospital: '#e57373' };
  for (const s of Object.values(G.city.shops)) {
    ctx.fillStyle = shopColor[s.kind] || '#fff';
    ctx.fillRect(x0 + s.x * scale - 2, y0 + s.y * scale - 2, 5, 5);
  }
  // Packages.
  ctx.fillStyle = '#ffd166';
  for (const pkg of G.city.packages) if (!pkg.taken) ctx.fillRect(x0 + pkg.x * scale - 1, y0 + pkg.y * scale - 1, 3, 3);
  // Police + heli.
  ctx.fillStyle = '#2979ff';
  for (const c of G.cars) if (c.role === 'police' || c.role === 'roadblock') ctx.fillRect(x0 + c.x * scale - 2, y0 + c.y * scale - 2, 5, 5);
  if (G.heli.active) {
    ctx.fillStyle = '#ff1744';
    ctx.beginPath(); ctx.arc(x0 + G.heli.x * scale, y0 + G.heli.y * scale, 4, 0, Math.PI * 2); ctx.fill();
  }
  // Mission marker: pulsing yellow diamond.
  if (G.marker) {
    const r = 4 + Math.sin(G.time * 5) * 1.5;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(x0 + G.marker.x * scale, y0 + G.marker.y * scale, r, 0, Math.PI * 2); ctx.fill();
  }
  // Player: white arrow, or the car.
  const p = G.player;
  const px = p.inCar ? (carById(G, p.carId) || p).x : p.x;
  const py = p.inCar ? (carById(G, p.carId) || p).y : p.y;
  const pa = p.inCar ? (carById(G, p.carId) || p).angle : p.angle;
  ctx.save();
  ctx.translate(x0 + px * scale, y0 + py * scale);
  ctx.rotate(pa);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(7, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  // North + night tint.
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('N', x0 + size / 2 - 3, y0 - 8);
  if (isNight(G)) {
    ctx.fillStyle = 'rgba(6,8,26,0.25)';
    ctx.fillRect(x0, y0, size, size);
  }
}

function panel(ctx, w, h, pw, ph) {
  const x = (w - pw) / 2, y = (h - ph) / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.78)';
  ctx.fillRect(x, y, pw, ph);
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, pw, ph);
  return { x, y };
}

export function drawTitle(G, ctx, w, h) {
  ctx.fillStyle = '#0d0d17';
  ctx.fillRect(0, 0, w, h);
  // Sunset gradient skyline silhouette.
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#1a1a2e');
  grad.addColorStop(0.55, '#4a235a');
  grad.addColorStop(0.8, '#ff6b35');
  grad.addColorStop(1, '#0d0d17');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h * 0.72);
  ctx.fillStyle = '#0d0d17';
  const base = h * 0.72;
  for (let i = 0; i < 24; i++) {
    const bw = 30 + ((i * 37) % 60);
    const bh = 60 + ((i * 53) % 180);
    ctx.fillRect(i * (w / 24), base - bh, bw, bh);
  }
  ctx.fillStyle = '#ffd166';
  ctx.beginPath(); ctx.arc(w * 0.72, h * 0.3, 46, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 64px monospace';
  ctx.fillText('VICE BAY', w / 2, h * 0.32);
  ctx.fillStyle = '#ff2e88';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('A GRAND THEFT STORY', w / 2, h * 0.32 + 34);
  ctx.fillStyle = '#ddd';
  ctx.font = '16px monospace';
  ctx.fillText('Rook Calloway is back. Sal owns his debt. The Vipers own the streets.', w / 2, h * 0.52);
  ctx.fillText('Sixteen missions. Three acts. One city to take back.', w / 2, h * 0.52 + 26);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(G.saveExists ? 'ENTER — Continue    •    N — New game' : 'ENTER — Start game', w / 2, h * 0.66);
  ctx.fillStyle = '#aaa';
  ctx.font = '14px monospace';
  ctx.fillText('WASD drive / walk  •  E enter car, use, start mission  •  Mouse aim, click shoot', w / 2, h * 0.74);
  ctx.fillText('SPACE handbrake  •  1–5 weapons  •  R radio  •  P pause  •  H save  •  M mission list', w / 2, h * 0.74 + 22);
  ctx.fillText('Steal cars. Lose the cops. Find 24 hidden packages. Become Kingpin.', w / 2, h * 0.74 + 48);
  ctx.textAlign = 'left';
}

export function drawBriefing(G, ctx, w, h) {
  const m = G.briefing;
  if (!m) return;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, w, h);
  const p = panel(ctx, w, h, 640, 340);
  ctx.fillStyle = '#ff2e88';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(m.act === 1 ? 'ACT I — HOMECOMING' : m.act === 2 ? 'ACT II — THE TAKEOVER' : 'ACT III — THE KINGPIN', p.x + 28, p.y + 38);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px monospace';
  ctx.fillText(m.name, p.x + 28, p.y + 78);
  ctx.fillStyle = '#ddd';
  ctx.font = '16px monospace';
  wrapText(ctx, m.brief, p.x + 28, p.y + 112, 584, 24);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(`Reward $${m.reward}  •  +${m.rep} REP`, p.x + 28, p.y + 292);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('ENTER — Accept mission    •    ESC — Back out', p.x + 28, p.y + 322);
}

export function drawShop(G, ctx, w, h) {
  const s = G.shopOpen;
  if (!s) return;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, w, h);
  const items = s.menu;
  const p = panel(ctx, w, h, 560, 110 + items.length * 34);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px monospace';
  ctx.fillText(s.shop.name, p.x + 28, p.y + 40);
  ctx.fillStyle = '#7ee081';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(`Cash $${G.player.money}`, p.x + 28, p.y + 66);
  ctx.font = '15px monospace';
  items.forEach((it, i) => {
    const y = p.y + 96 + i * 34;
    ctx.fillStyle = i === s.sel ? '#ffd166' : '#ddd';
    ctx.fillText(`${i + 1}. ${it.name} — $${it.price}`, p.x + 28, y);
    ctx.fillStyle = '#999';
    ctx.font = '12px monospace';
    ctx.fillText(it.desc, p.x + 300, y);
    ctx.font = '15px monospace';
  });
  ctx.fillStyle = '#fff';
  ctx.font = '13px monospace';
  ctx.fillText('↑↓ select • ENTER buy • ESC leave', p.x + 28, p.y + 96 + items.length * 34 - 8);
  if (s.feedback) {
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(s.feedback, p.x + 28, p.y + 96 + items.length * 34 + 16);
  }
}

export function drawPause(G, ctx, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, w, h);
  const p = panel(ctx, w, h, 520, 330);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px monospace';
  ctx.fillText('PAUSED', p.x + 28, p.y + 46);
  ctx.font = '15px monospace';
  ctx.fillStyle = '#ddd';
  const lines = [
    `Missions done: ${G.missionsCompleted}/16`,
    `Next: ${G.nextMission <= 16 ? 'Mission ' + G.nextMission : 'All missions complete!'}`,
    `Rank: ${rankOf(G.player.rep).name} (REP ${G.player.rep})`,
    `Cash: $${G.player.money}   •   Packages: ${G.stats.packages}/24`,
    `Cars stolen: ${G.stats.carsStolen}   •   Kills: ${G.stats.kills}`,
    `Taxi fares: ${G.stats.fares}   •   Races won: ${G.stats.racesWon}`,
    `Stunt jumps: ${G.stats.jumps}   •   Peds hit: ${G.stats.pedsHit}`,
  ];
  lines.forEach((l, i) => ctx.fillText(l, p.x + 28, p.y + 84 + i * 26));
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 15px monospace';
  ctx.fillText('P / ESC — Resume    •    H — Save    •    R — Radio', p.x + 28, p.y + 300);
}

export function drawMissionList(G, ctx, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, w, h);
  const p = panel(ctx, w, h, 620, 480);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px monospace';
  ctx.fillText('MISSION LIST — VICE BAY', p.x + 28, p.y + 40);
  ctx.font = '14px monospace';
  const acts = ['ACT I — HOMECOMING', 'ACT II — THE TAKEOVER', 'ACT III — THE KINGPIN'];
  let y = p.y + 70;
  let act = 0;
  for (let i = 0; i < 16; i++) {
    const m = G.allMissions[i];
    if (m.act !== act + 1) { act = m.act - 1; ctx.fillStyle = '#ff2e88'; ctx.font = 'bold 13px monospace'; ctx.fillText(acts[act], p.x + 28, y); y += 22; ctx.font = '14px monospace'; }
    const done = i + 1 <= G.missionsCompleted;
    const next = i + 1 === G.nextMission;
    ctx.fillStyle = done ? '#7ee081' : next ? '#ffd166' : '#888';
    ctx.fillText(`${done ? '✓' : next ? '►' : '·'} ${String(i + 1).padStart(2, '0')}. ${m.name} — $${m.reward}`, p.x + 28, y);
    y += 20;
  }
  ctx.fillStyle = '#fff';
  ctx.font = '13px monospace';
  ctx.fillText('M / ESC — Close', p.x + 28, p.y + 452);
}

export function drawDead(G, ctx, w, h) {
  ctx.fillStyle = 'rgba(20,0,0,0.75)';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ff5252';
  ctx.textAlign = 'center';
  ctx.font = 'bold 64px monospace';
  ctx.fillText(G.deadHow === 'busted' ? 'BUSTED' : 'WASTED', w / 2, h * 0.42);
  ctx.fillStyle = '#fff';
  ctx.font = '18px monospace';
  ctx.fillText(G.deadHow === 'busted' ? 'The VCPD took you in. Sal posted bail — minus a fee.' : 'Vice Bay is unforgiving. The hospital patched you up — minus a fee.', w / 2, h * 0.42 + 36);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('ENTER — Get back out there', w / 2, h * 0.58);
  ctx.textAlign = 'left';
}

export function drawEnding(G, ctx, w, h) {
  ctx.fillStyle = '#0d0d17';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ffd166';
  ctx.textAlign = 'center';
  ctx.font = 'bold 56px monospace';
  ctx.fillText('KING OF VICE BAY', w / 2, h * 0.36);
  ctx.fillStyle = '#fff';
  ctx.font = '18px monospace';
  ctx.fillText('The ledger is yours. The Vipers are gone. The city belongs to Rook Calloway.', w / 2, h * 0.36 + 40);
  ctx.fillStyle = '#ddd';
  ctx.font = '16px monospace';
  const lines = [
    `Missions completed: ${G.missionsCompleted}/16`,
    `Cash: $${G.player.money}   •   Rank: ${rankOf(G.player.rep).name}`,
    `Packages: ${G.stats.packages}/24   •   Cars stolen: ${G.stats.carsStolen}`,
    `Kills: ${G.stats.kills}   •   Races won: ${G.stats.racesWon}`,
  ];
  lines.forEach((l, i) => ctx.fillText(l, w / 2, h * 0.5 + i * 28));
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('ENTER — Keep playing Vice Bay', w / 2, h * 0.72);
  ctx.textAlign = 'left';
}

function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lh;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}
