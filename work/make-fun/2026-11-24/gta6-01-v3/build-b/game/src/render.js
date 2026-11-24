// Rendering: world (roads, districts, buildings with drop-shadows + lit windows, water,
// beach, airport, docks), entities, particles, weather, day/night, HUD + minimap, screens.
import { WORLD_W, WORLD_H, ROAD_W } from './city.js';
import { clamp, TAU } from './rng.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  return { canvas, ctx };
}

function nightFactor(G) { // 0 day .. 1 night
  const h = G.clock.hours;
  if (h >= 20 || h < 5) return 1;
  if (h >= 18) return (h - 18) / 2;
  if (h >= 5 && h < 7) return 1 - (h - 5) / 2;
  return 0;
}

export function render(G, R) {
  const { ctx, canvas } = R;
  const W = canvas.width, H = canvas.height;
  const cam = G.cam;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  // camera shake
  const shx = G.shake ? (Math.random() - 0.5) * G.shake : 0;
  const shy = G.shake ? (Math.random() - 0.5) * G.shake : 0;
  ctx.translate(-cam.x + shx, -cam.y + shy);
  drawGround(G, ctx);
  drawRoads(G, ctx);
  drawWater(G, ctx);
  drawAirport(G, ctx);
  drawDocks(G, ctx);
  drawShops(G, ctx);
  drawBuildings(G, ctx);
  drawTrees(G, ctx);
  drawPickups(G, ctx);
  drawCrates(G, ctx);
  drawPeds(G, ctx);
  drawCars(G, ctx);
  drawEnemies(G, ctx);
  drawPlayer(G, ctx);
  drawParticles(G, ctx);
  drawMarker(G, ctx);
  drawHeli(G, ctx);
  drawRain(G, ctx);
  drawNight(G, ctx);
  ctx.restore();
  drawHUD(G, ctx, W, H);
  if (G.state === 'start') drawStart(G, ctx, W, H);
  else if (G.state === 'pause') drawPause(G, ctx, W, H);
  else if (G.state === 'dead') drawDead(G, ctx, W, H);
  else if (G.shopOpen) drawShop(G, ctx, W, H);
}

function drawGround(G, ctx) {
  const cam = G.cam;
  ctx.fillStyle = '#2e4a2e';
  ctx.fillRect(cam.x - 20, cam.y - 20, G.viewW + 40, G.viewH + 40);
  // district tint blocks
  for (const d of G.city.districts || []) {
    ctx.fillStyle = d.color;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.globalAlpha = 1;
  }
  // beach sand
  ctx.fillStyle = '#d8c08a';
  ctx.fillRect(1000, 3050, 2200, 450);
  ctx.fillStyle = '#c8b078';
  ctx.fillRect(1000, 3050, 2200, 14);
  // grass patches
  ctx.fillStyle = '#3a5a34';
  for (let i = 0; i < 40; i++) {
    const x = ((i * 977) % 4700) + 40, y = ((i * 613) % 3400) + 40;
    ctx.fillRect(x, y, 60, 40);
  }
}

function drawRoads(G, ctx) {
  const cam = G.cam;
  ctx.fillStyle = '#33363d';
  for (const rx of G.city.vRoads) ctx.fillRect(rx - ROAD_W / 2, 0, ROAD_W, WORLD_H);
  for (const ry of G.city.hRoads) ctx.fillRect(0, ry - ROAD_W / 2, WORLD_W, ROAD_W);
  // highway ring
  ctx.strokeStyle = '#3d4048'; ctx.lineWidth = 34;
  ctx.strokeRect(60, 60, WORLD_W - 120, WORLD_H - 120);
  ctx.strokeStyle = '#e8c020'; ctx.lineWidth = 2; ctx.setLineDash([18, 14]);
  ctx.strokeRect(60, 60, WORLD_W - 120, WORLD_H - 120);
  ctx.setLineDash([]);
  // center dashes
  ctx.strokeStyle = '#d8d8d8'; ctx.lineWidth = 3; ctx.setLineDash([16, 20]);
  ctx.beginPath();
  for (const rx of G.city.vRoads) { ctx.moveTo(rx, 0); ctx.lineTo(rx, WORLD_H); }
  for (const ry of G.city.hRoads) { ctx.moveTo(0, ry); ctx.lineTo(WORLD_W, ry); }
  ctx.stroke(); ctx.setLineDash([]);
  // traffic lights
  for (const l of G.city.lights) {
    if (l.x < cam.x - 80 || l.x > cam.x + G.viewW + 80 || l.y < cam.y - 80 || l.y > cam.y + G.viewH + 80) continue;
    ctx.fillStyle = '#222';
    ctx.fillRect(l.x - 5, l.y - 28, 10, 22);
    ctx.fillStyle = l.state === 'red' ? '#ff3030' : l.state === 'yellow' ? '#ffc020' : '#30c040';
    ctx.beginPath(); ctx.arc(l.x, l.y - 17 + (l.state === 'red' ? 0 : l.state === 'yellow' ? 6 : 12), 3.5, 0, TAU); ctx.fill();
  }
  // crosswalks at major intersections
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (const l of G.city.lights) {
    for (let i = -2; i <= 2; i++) ctx.fillRect(l.x + i * 12 - 4, l.y - ROAD_W / 2 + 4, 8, 14);
  }
}

function drawWater(G, ctx) {
  const t = G.time;
  ctx.fillStyle = '#1e5a7a';
  ctx.fillRect(4400, 0, 400, 1300);
  ctx.fillStyle = '#2e7aa0';
  for (let i = 0; i < 12; i++) {
    const y = 60 + i * 105;
    const off = Math.sin(t * 1.2 + i) * 8;
    ctx.fillRect(4420 + ((i * 37) % 300), y + off, 60, 3);
  }
  // boats bobbing
  for (const b of G.city.boats) {
    const bob = Math.sin(t * 1.5 + b.phase) * 3;
    ctx.save(); ctx.translate(b.x, b.y + bob); ctx.rotate(Math.sin(t + b.phase) * 0.05);
    ctx.fillStyle = b.color;
    ctx.beginPath(); ctx.moveTo(-b.len / 2, 0); ctx.lineTo(b.len / 2, 0); ctx.lineTo(b.len / 2 - 8, 12); ctx.lineTo(-b.len / 2 + 8, 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8899aa'; ctx.fillRect(-8, -14, 16, 14);
    ctx.restore();
  }
  // boardwalk
  ctx.fillStyle = '#8c6a42';
  ctx.fillRect(1000, 3020, 2200, 30);
  ctx.fillStyle = '#a08050';
  for (let x = 1000; x < 3200; x += 40) ctx.fillRect(x, 3020, 2, 30);
}

function drawAirport(G, ctx) {
  // runway
  ctx.fillStyle = '#2a2a30';
  ctx.fillRect(3750, 1750, 800, 150);
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(3750, 1818, 800, 4);
  for (let x = 3800; x < 4500; x += 80) ctx.fillRect(x, 1820, 40, 3);
  ctx.fillStyle = '#c0c0c0';
  ctx.font = 'bold 26px Arial'; ctx.fillText('SOLARA INTL', 3900, 1790);
  // terminal
  ctx.fillStyle = '#7a7a8a';
  ctx.fillRect(3850, 1560, 320, 120);
  ctx.fillStyle = '#a0c8e8';
  for (let i = 0; i < 8; i++) ctx.fillRect(3865 + i * 38, 1590, 26, 40);
  // planes
  for (const pl of G.city.planes) {
    ctx.save(); ctx.translate(pl.x, pl.y); ctx.rotate(pl.rot);
    ctx.fillStyle = '#e8e8f0';
    ctx.beginPath(); ctx.ellipse(0, 0, 70, 14, 0, 0, TAU); ctx.fill();
    ctx.fillRect(-10, -46, 20, 92);
    ctx.fillStyle = '#c04040'; ctx.fillRect(58, -6, 16, 12);
    ctx.restore();
  }
}

function drawDocks(G, ctx) {
  for (const c of G.city.containers) {
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(3, 4, c.w, c.h);
    ctx.fillStyle = c.color; ctx.fillRect(0, 0, c.w, c.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(i * (c.w / 4), 0); ctx.lineTo(i * (c.w / 4), c.h); ctx.stroke(); }
    ctx.restore();
  }
  for (const cr of G.city.cranes) {
    ctx.strokeStyle = '#d8a020'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(cr.x, cr.y); ctx.lineTo(cr.x, cr.y - 130); ctx.lineTo(cr.x + 120, cr.y - 130); ctx.stroke();
    ctx.fillStyle = '#d8a020'; ctx.fillRect(cr.x - 14, cr.y - 10, 28, 14);
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cr.x + 100, cr.y - 130); ctx.lineTo(cr.x + 100, cr.y - 60); ctx.stroke();
    ctx.fillStyle = '#b04030'; ctx.fillRect(cr.x + 84, cr.y - 60, 32, 24);
  }
}

function drawShops(G, ctx) {
  for (const s of G.city.shops) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(s.x - 58, s.y - 48, 120, 100);
    ctx.fillStyle = s.color;
    ctx.fillRect(s.x - 60, s.y - 52, 120, 96);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
    ctx.fillText(s.kind === 'gun' ? 'GUNS' : s.kind === 'garage' ? 'GARAGE' : 'SAFEHOUSE', s.x, s.y - 28);
    ctx.font = '11px Arial';
    ctx.fillText(s.name, s.x, s.y - 10);
    ctx.fillStyle = '#ffd040';
    ctx.font = 'bold 12px Arial'; ctx.fillText('E — enter', s.x, s.y + 14);
    ctx.textAlign = 'left';
  }
  // bank
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(G.city.bank.x - 63, G.city.bank.y - 53, 130, 106);
  ctx.fillStyle = '#c8b060'; ctx.fillRect(G.city.bank.x - 65, G.city.bank.y - 55, 130, 100);
  ctx.fillStyle = '#203040'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
  ctx.fillText('BANK', G.city.bank.x, G.city.bank.y - 20);
  ctx.fillText('$', G.city.bank.x, G.city.bank.y + 12);
  ctx.textAlign = 'left';
  // hospital
  ctx.fillStyle = '#e8e8e8'; ctx.fillRect(G.city.hospital.x - 60, G.city.hospital.y - 50, 120, 96);
  ctx.fillStyle = '#c03030'; ctx.fillRect(G.city.hospital.x - 12, G.city.hospital.y - 34, 24, 24);
  ctx.fillStyle = '#fff'; ctx.fillRect(G.city.hospital.x - 3, G.city.hospital.y - 30, 6, 16); ctx.fillRect(G.city.hospital.x - 8, G.city.hospital.y - 25, 16, 6);
  ctx.fillStyle = '#203040'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
  ctx.fillText('HOSPITAL', G.city.hospital.x, G.city.hospital.y + 36);
  ctx.textAlign = 'left';
}

function drawBuildings(G, ctx) {
  const cam = G.cam, night = nightFactor(G);
  for (const b of G.city.buildings) {
    if (b.x + b.w < cam.x - 60 || b.x > cam.x + G.viewW + 60 || b.y + b.h < cam.y - 60 || b.y > cam.y + G.viewH + 60) continue;
    // drop shadow (fake height)
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(b.x + 10, b.y + 12, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    // roof detail for towers
    if (b.tower) {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, 10);
      if (b.landmark) { ctx.fillStyle = '#ffd040'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.fillText('SOLARA TOWER', b.x + b.w / 2, b.y - 8); ctx.textAlign = 'left'; }
    }
    // windows, lit at night
    for (const w of b.windows) {
      ctx.fillStyle = night > 0.4 && w.lit ? '#ffd860' : (night > 0.4 ? '#2a3444' : '#8aa0c0');
      ctx.fillRect(w.x, w.y, 12, 10);
    }
  }
}

function drawTrees(G, ctx) {
  const cam = G.cam;
  for (const t of G.city.trees) {
    if (t.x < cam.x - 40 || t.x > cam.x + G.viewW + 40 || t.y < cam.y - 40 || t.y > cam.y + G.viewH + 40) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(t.x + 3, t.y + 4, t.r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2e6b2e'; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3e8b3e'; ctx.beginPath(); ctx.arc(t.x - 2, t.y - 2, t.r * 0.6, 0, TAU); ctx.fill();
  }
  for (const l of G.city.lamps) {
    ctx.fillStyle = '#444'; ctx.fillRect(l.x, l.y, 4, 16);
    ctx.fillStyle = nightFactor(G) > 0.4 ? '#ffe080' : '#c0c0c0';
    ctx.beginPath(); ctx.arc(l.x + 2, l.y, 5, 0, TAU); ctx.fill();
  }
}

function drawPickups(G, ctx) {
  for (const pk of G.pickups) {
    const bob = Math.sin(G.time * 4 + pk.x) * 3;
    if (pk.kind === 'cash') { ctx.fillStyle = '#30c040'; ctx.fillRect(pk.x - 10, pk.y - 6 + bob, 20, 12); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Arial'; ctx.fillText('$', pk.x - 3, pk.y + 3 + bob); }
    else if (pk.kind === 'ammo') { ctx.fillStyle = '#e8c020'; ctx.fillRect(pk.x - 8, pk.y - 8 + bob, 16, 16); ctx.fillStyle = '#222'; ctx.font = 'bold 10px Arial'; ctx.fillText('A', pk.x - 3, pk.y + 3 + bob); }
    else { ctx.fillStyle = '#e84040'; ctx.fillRect(pk.x - 9, pk.y - 9 + bob, 18, 18); ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial'; ctx.fillText('+', pk.x - 4, pk.y + 4 + bob); }
  }
}
function drawCrates(G, ctx) {
  for (const c of (G.crates || [])) {
    if (c.taken) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(c.x - 13, c.y - 11, 30, 28);
    ctx.fillStyle = '#b08030'; ctx.fillRect(c.x - 15, c.y - 15, 30, 30);
    ctx.strokeStyle = '#6b4a1a'; ctx.lineWidth = 2; ctx.strokeRect(c.x - 15, c.y - 15, 30, 30);
    ctx.beginPath(); ctx.moveTo(c.x - 15, c.y - 15); ctx.lineTo(c.x + 15, c.y + 15); ctx.moveTo(c.x + 15, c.y - 15); ctx.lineTo(c.x - 15, c.y + 15); ctx.stroke();
  }
}

function drawPeds(G, ctx) {
  for (const ped of G.peds) {
    ctx.save(); ctx.translate(ped.x, ped.y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(2, 3, 9, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = ped.panic > 0 ? '#ff5040' : ped.color;
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e8c8a0'; ctx.beginPath(); ctx.arc(Math.cos(ped.angle) * 4, Math.sin(ped.angle) * 4, 4, 0, TAU); ctx.fill();
    ctx.restore();
  }
}
function drawEnemies(G, ctx) {
  for (const e of (G.enemies || [])) {
    ctx.save(); ctx.translate(e.x, e.y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(2, 3, 10, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.fill();
    ctx.fillStyle = '#222'; ctx.fillRect(-8, -18, 16, 4);
    ctx.fillStyle = '#ff3030'; ctx.fillRect(-8, -18, 16 * (e.hp / 40), 4);
    ctx.restore();
  }
  for (const cop of G.footPolice) {
    ctx.save(); ctx.translate(cop.x, cop.y);
    ctx.fillStyle = '#203060'; ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffd040'; ctx.beginPath(); ctx.arc(0, -4, 4, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

function drawCars(G, ctx) {
  const night = nightFactor(G);
  for (const car of G.cars) {
    if (car.dead) {
      ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.angle);
      ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-car.l / 2, -car.w / 2, car.l, car.w);
      ctx.fillStyle = 'rgba(255,120,20,0.6)';
      ctx.beginPath(); ctx.arc(0, 0, 14 + Math.sin(G.time * 6) * 4, 0, TAU); ctx.fill();
      ctx.restore();
      continue;
    }
    ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-car.l / 2 + 4, -car.w / 2 + 5, car.l, car.w);
    ctx.fillStyle = car.paint || car.color;
    if (car.type === 'moto') {
      ctx.fillRect(-car.l / 2, -3, car.l, 6);
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
    } else {
      ctx.fillRect(-car.l / 2, -car.w / 2, car.l, car.w);
      ctx.fillStyle = '#1e2a3a'; ctx.fillRect(-car.l / 2 + 10, -car.w / 2 + 5, car.l / 3, car.w - 10);
      ctx.fillStyle = '#2a3a4a'; ctx.fillRect(car.l / 2 - 14, -car.w / 2 + 6, 8, car.w - 12);
      if (car.type === 'taxi') { ctx.fillStyle = '#222'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center'; ctx.fillText('TAXI', 0, 3); ctx.textAlign = 'left'; }
      if (car.type === 'truck') { ctx.fillStyle = '#d8d8d8'; ctx.fillRect(-car.l / 2 + 4, -car.w / 2 + 4, car.l - 8, car.w - 8); ctx.fillStyle = '#7090a0'; ctx.fillRect(car.l / 2 - 18, -car.w / 2, 18, car.w); }
      if (car.type === 'police') {
        ctx.fillStyle = '#fff'; ctx.fillRect(-6, -car.w / 2, 12, car.w);
        ctx.fillStyle = '#c02020'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.fillText('POLICE', 0, -car.w / 2 - 4); ctx.textAlign = 'left';
        if (Math.floor(G.time * 4) % 2 === 0) { ctx.fillStyle = '#ff2020'; ctx.beginPath(); ctx.arc(-8, -car.w / 2 - 2, 4, 0, TAU); ctx.fill(); }
        else { ctx.fillStyle = '#2040ff'; ctx.beginPath(); ctx.arc(8, -car.w / 2 - 2, 4, 0, TAU); ctx.fill(); }
      }
      if (car.rival) { ctx.fillStyle = '#ffd040'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.fillText('RIVAL', 0, -car.w / 2 - 6); ctx.textAlign = 'left'; }
    }
    // headlights at night
    if (night > 0.4 && car.ai === 'player') {
      ctx.fillStyle = 'rgba(255,240,180,0.18)';
      ctx.beginPath(); ctx.moveTo(car.l / 2, -8); ctx.lineTo(car.l / 2 + 150, -44); ctx.lineTo(car.l / 2 + 150, 44); ctx.lineTo(car.l / 2, 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff8c0'; ctx.fillRect(car.l / 2 - 2, -car.w / 2 + 4, 4, 5); ctx.fillRect(car.l / 2 - 2, car.w / 2 - 9, 4, 5);
    }
    // smoke
    if (car.smoke) {
      ctx.fillStyle = 'rgba(120,120,120,0.7)';
      ctx.beginPath(); ctx.arc(-car.l / 2, 0, 8 + Math.sin(G.time * 8) * 3, 0, TAU); ctx.fill();
    }
    // car hp bar for player car
    if (car.ai === 'player' && car.hp < car.maxHp) {
      ctx.fillStyle = '#222'; ctx.fillRect(-20, -car.w / 2 - 12, 40, 5);
      ctx.fillStyle = car.hp > car.maxHp * 0.4 ? '#30c040' : '#ff3030'; ctx.fillRect(-20, -car.w / 2 - 12, 40 * (car.hp / car.maxHp), 5);
    }
    ctx.restore();
  }
}

function drawPlayer(G, ctx) {
  const p = G.player;
  if (p.dead || p.inCar) return;
  ctx.save(); ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(2, 4, 11, 7, 0, 0, TAU); ctx.fill();
  ctx.rotate(p.angle);
  ctx.fillStyle = '#2e7a4a'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.fill();
  ctx.fillStyle = '#e8c8a0'; ctx.beginPath(); ctx.arc(5, 0, 5, 0, TAU); ctx.fill();
  // gun in hand when armed
  if (p.weapon !== 'fists') { ctx.fillStyle = '#222'; ctx.fillRect(8, -2, 14, 4); }
  ctx.restore();
  // punch arc
  if (p.punchAnim > 0) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.aim || p.angle);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 26, -0.7, 0.7); ctx.stroke();
    ctx.restore();
  }
  // muzzle flash
  if (p.flash > 0) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.aim || p.angle);
    ctx.fillStyle = '#ffdd40'; ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(38, -6); ctx.lineTo(38, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

function drawParticles(G, ctx) {
  for (const pt of G.particles) {
    const a = clamp(pt.life / pt.max, 0, 1);
    if (pt.kind === 'fire') ctx.fillStyle = `rgba(255,${Math.floor(120 * a)},20,${a})`;
    else if (pt.kind === 'smoke') ctx.fillStyle = `rgba(110,110,110,${a * 0.7})`;
    else ctx.fillStyle = `rgba(255,220,80,${a})`;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * (0.5 + a * 0.5), 0, TAU); ctx.fill();
  }
}

function drawMarker(G, ctx) {
  if (!G.marker) return;
  const m = G.marker;
  const bob = Math.sin(G.time * 3) * 6;
  ctx.save(); ctx.translate(m.x, m.y + bob - 30);
  ctx.fillStyle = '#ffd040';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-12, -22); ctx.lineTo(12, -22); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#c08000'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
  // edge arrow toward marker when off-screen
  const p = G.player;
  const dx = m.x - p.x, dy = m.y - p.y, d = Math.hypot(dx, dy);
  if (d > 500) {
    const ang = Math.atan2(dy, dx);
    const sx = p.x + Math.cos(ang) * 220, sy = p.y + Math.sin(ang) * 220;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(ang);
    ctx.fillStyle = '#ffd040';
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -10); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

function drawHeli(G, ctx) {
  const h = G.heli;
  if (!h.active) return;
  // searchlight cone
  const p = G.player;
  ctx.save();
  ctx.fillStyle = 'rgba(255,250,200,0.14)';
  ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(p.x - 40, p.y - 40); ctx.lineTo(p.x + 40, p.y + 40); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,250,200,0.5)';
  ctx.beginPath(); ctx.arc(p.x, p.y, 46, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.translate(h.x, h.y);
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(3, 5, 26, 12, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#203060'; ctx.beginPath(); ctx.ellipse(0, 0, 24, 11, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#c0c8d0'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(34, 0); ctx.stroke();
  ctx.save(); ctx.rotate(h.rotor); ctx.strokeStyle = '#8899aa'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(40, 0); ctx.stroke(); ctx.restore();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center'; ctx.fillText('POLICE', 0, 3); ctx.textAlign = 'left';
  ctx.restore();
}

function drawRain(G, ctx) {
  if (!G.weather.rain) return;
  ctx.strokeStyle = 'rgba(180,200,255,0.5)'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 90; i++) {
    const x = G.cam.x + ((i * 173 + G.time * 900) % (G.viewW + 100)) - 50;
    const y = G.cam.y + ((i * 97 + G.time * 1400) % (G.viewH + 100)) - 50;
    ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 16);
  }
  ctx.stroke();
}

function drawNight(G, ctx) {
  const n = nightFactor(G);
  if (n <= 0.02) return;
  ctx.fillStyle = `rgba(8,10,40,${0.42 * n})`;
  ctx.fillRect(G.cam.x - 20, G.cam.y - 20, G.viewW + 40, G.viewH + 40);
  // headlight glow around player car
  if (G.player.inCar) {
    const p = G.player;
    const grad = ctx.createRadialGradient(p.x, p.y, 20, p.x, p.y, 320);
    grad.addColorStop(0, 'rgba(255,240,180,0.20)'); grad.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = grad; ctx.fillRect(p.x - 320, p.y - 320, 640, 640);
  }
}

// ---------------- HUD ----------------
function drawHUD(G, ctx, W, H) {
  const p = G.player;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  // top-left: money + hp + armor
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(12, 12, 250, 84);
  ctx.fillStyle = '#30e060'; ctx.font = 'bold 22px Arial';
  ctx.fillText('$' + p.money.toLocaleString('en-US'), 22, 40);
  ctx.fillStyle = '#fff'; ctx.font = '13px Arial';
  ctx.fillText('HP ' + Math.ceil(p.hp), 22, 62);
  ctx.fillStyle = '#222'; ctx.fillRect(70, 52, 120, 9);
  ctx.fillStyle = p.hp > 40 ? '#30c040' : '#ff3030'; ctx.fillRect(70, 52, 120 * (p.hp / 100), 9);
  if (p.armor > 0) { ctx.fillText('ARMOR ' + Math.ceil(p.armor), 22, 82); ctx.fillStyle = '#4080ff'; ctx.fillRect(90, 74, 100 * (p.armor / 100), 8); }
  // weapon + ammo
  ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Arial';
  const ammo = p.weapon === 'fists' ? '—' : (p.ammo[p.weapon] ?? 0);
  ctx.fillText(p.weapon.toUpperCase() + '  ' + ammo, 22, p.armor > 0 ? 100 : 86);
  // wanted stars top-right
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(W - 190, 12, 178, 44);
  ctx.font = 'bold 24px Arial';
  for (let i = 0; i < 5; i++) { ctx.fillStyle = i < p.wanted ? '#ffd040' : '#555'; ctx.fillText('★', W - 178 + i * 34, 44); }
  // clock + weather + radio
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(W - 190, 64, 178, 64);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Arial';
  const hh = String(Math.floor(G.clock.hours)).padStart(2, '0'), mm = String(Math.floor((G.clock.hours % 1) * 60)).padStart(2, '0');
  ctx.fillText(hh + ':' + mm + (G.weather.rain ? '  🌧 RAIN' : '  ☀ CLEAR'), W - 180, 86);
  ctx.font = '12px Arial'; ctx.fillStyle = '#cfe3ff';
  ctx.fillText(G.radioLabel || 'Radio: off (R)', W - 180, 106);
  ctx.fillText('Day ' + G.clock.day, W - 180, 122);
  // objective bar
  const obj = G.objectiveText || '';
  if (obj) {
    ctx.font = 'bold 15px Arial';
    const w = ctx.measureText(obj).width + 24;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(12, H - 108, w, 30);
    ctx.fillStyle = '#ffd040'; ctx.fillText('◆ ' + obj, 22, H - 87);
  }
  // mission name
  if (G.mission) {
    ctx.font = 'bold 14px Arial'; ctx.fillStyle = '#fff';
    ctx.fillText(`Mission ${G.mission.num}: ${G.mission.name}`, 12, H - 116);
  }
  // speed + car hp bottom-right (above minimap)
  if (p.inCar) {
    const car = G.cars.find((c) => c.id === p.carId);
    if (car) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(W - 190, H - 268, 178, 52);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Arial';
      ctx.fillText(Math.round(Math.abs(car.speed) * 0.36) + ' km/h', W - 180, H - 244);
      ctx.font = '12px Arial'; ctx.fillStyle = '#cfe3ff';
      ctx.fillText(car.type.toUpperCase() + '  HP ' + Math.ceil(car.hp), W - 180, H - 226);
    }
  }
  // message center
  if (G.messageT > 0 && G.message) {
    ctx.font = 'bold 20px Arial';
    const w = ctx.measureText(G.message).width + 30;
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect((W - w) / 2, 130, w, 38);
    ctx.fillStyle = '#ffd040'; ctx.textAlign = 'center'; ctx.fillText(G.message, W / 2, 156); ctx.textAlign = 'left';
  }
  // interaction prompt
  if (G.prompt) {
    ctx.font = 'bold 16px Arial';
    const w = ctx.measureText(G.prompt).width + 24;
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect((W - w) / 2, H - 170, w, 32);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(G.prompt, W / 2, H - 148); ctx.textAlign = 'left';
  }
  drawMinimap(G, ctx, W, H);
}

function drawMinimap(G, ctx, W, H) {
  const mw = 200, mh = 150, mx = W - mw - 12, my = H - mh - 12;
  const sx = mw / WORLD_W, sy = mh / WORLD_H;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
  ctx.fillStyle = '#1e3a24'; ctx.fillRect(mx, my, mw, mh);
  // water + beach
  ctx.fillStyle = '#1e5a7a'; ctx.fillRect(mx + 4400 * sx, my, 400 * sx, 1300 * sy);
  ctx.fillStyle = '#d8c08a'; ctx.fillRect(mx + 1000 * sx, my + 3050 * sy, 2200 * sx, 450 * sy);
  // roads
  ctx.fillStyle = '#555';
  for (const rx of G.city.vRoads) ctx.fillRect(mx + rx * sx - 1, my, 2, mh);
  for (const ry of G.city.hRoads) ctx.fillRect(mx, my + ry * sy - 1, mw, 2);
  // district labels
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = '7px Arial'; ctx.textAlign = 'center';
  for (const d of G.city.districts || []) ctx.fillText(d.label, mx + (d.x + d.w / 2) * sx, my + (d.y + d.h / 2) * sy);
  ctx.textAlign = 'left';
  // marker
  if (G.marker) {
    ctx.fillStyle = '#ffd040';
    ctx.beginPath(); ctx.arc(mx + G.marker.x * sx, my + G.marker.y * sy, 5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
  }
  // police blips
  ctx.fillStyle = '#4080ff';
  for (const c of G.cars) if (c.ai === 'police' && !c.dead) { ctx.beginPath(); ctx.arc(mx + c.x * sx, my + c.y * sy, 3, 0, TAU); ctx.fill(); }
  if (G.heli.active) { ctx.fillStyle = '#ff8040'; ctx.beginPath(); ctx.arc(mx + G.heli.x * sx, my + G.heli.y * sy, 4, 0, TAU); ctx.fill(); }
  // player arrow
  const p = G.player;
  ctx.save(); ctx.translate(mx + p.x * sx, my + p.y * sy); ctx.rotate(p.angle);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
  ctx.restore();
  // north + border
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(mx, my, mw, mh);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Arial'; ctx.fillText('N', mx + mw / 2 - 3, my - 8);
}

// ---------------- screens ----------------
function drawStart(G, ctx, W, H) {
  ctx.fillStyle = 'rgba(5,8,20,0.82)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd040'; ctx.font = 'bold 64px Arial';
  ctx.fillText('SOLARA BAY', W / 2, 150);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Arial';
  ctx.fillText('An open-world crime story — 10 missions, a living city, and the cops.', W / 2, 190);
  ctx.font = '16px Arial'; ctx.fillStyle = '#cfe3ff';
  const lines = [
    'WASD — move / drive    E — steal or enter car    F — punch',
    'Mouse — aim, click — shoot    1/2/3 — pistol / shotgun / SMG',
    'R — radio (SOLARA FM / BAY 98)    M — save    N — next mission    P — pause',
    'Steal cars, dodge the law, run missions for Nadia, and own the Bay.',
    '',
    'Press ENTER or click to start',
  ];
  lines.forEach((l, i) => ctx.fillText(l, W / 2, 250 + i * 28));
  ctx.fillStyle = '#ffd040'; ctx.font = 'bold 18px Arial';
  ctx.fillText(G.saveExists ? 'ENTER — Continue (save found)    or    C — New game' : 'ENTER — Start', W / 2, 250 + lines.length * 28 + 10);
  ctx.textAlign = 'left';
}
function drawPause(G, ctx, W, H) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = 'bold 40px Arial';
  ctx.fillText('PAUSED', W / 2, H / 2 - 20);
  ctx.font = '16px Arial'; ctx.fillStyle = '#cfe3ff';
  ctx.fillText('P — resume    M — save    R — radio    N — next mission', W / 2, H / 2 + 20);
  ctx.textAlign = 'left';
}
function drawDead(G, ctx, W, H) {
  ctx.fillStyle = 'rgba(20,0,0,0.75)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff4040'; ctx.font = 'bold 56px Arial';
  ctx.fillText(G.player.deadHow === 'busted' ? 'BUSTED!' : 'WASTED!', W / 2, H / 2 - 20);
  ctx.fillStyle = '#fff'; ctx.font = '17px Arial';
  ctx.fillText('The hospital patches you up — for 10% of your cash.', W / 2, H / 2 + 20);
  ctx.fillText('Press ENTER to continue', W / 2, H / 2 + 52);
  ctx.textAlign = 'left';
}
function drawShop(G, ctx, W, H) {
  const s = G.shopOpen;
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd040'; ctx.font = 'bold 32px Arial';
  ctx.fillText(s.shop.name, W / 2, 120);
  ctx.fillStyle = '#fff'; ctx.font = '16px Arial';
  ctx.fillText('Your cash: $' + G.player.money.toLocaleString('en-US'), W / 2, 150);
  const items = s.items;
  items.forEach((it, i) => {
    const y = 200 + i * 44;
    ctx.fillStyle = i === s.sel ? 'rgba(255,208,64,0.25)' : 'rgba(255,255,255,0.06)';
    ctx.fillRect(W / 2 - 260, y - 24, 520, 36);
    ctx.fillStyle = i === s.sel ? '#ffd040' : '#fff';
    ctx.font = 'bold 17px Arial';
    ctx.fillText(`${i + 1}. ${it.name} — $${it.price}`, W / 2, y);
    ctx.font = '13px Arial'; ctx.fillStyle = '#cfe3ff';
    ctx.fillText(it.desc, W / 2, y + 16);
  });
  ctx.fillStyle = '#cfe3ff'; ctx.font = '15px Arial';
  ctx.fillText('Up/Down or 1-5 to choose, ENTER to buy, E or Esc to leave', W / 2, 200 + items.length * 44 + 20);
  if (s.result) { ctx.fillStyle = '#30e060'; ctx.font = 'bold 16px Arial'; ctx.fillText(s.result, W / 2, 200 + items.length * 44 + 48); }
  ctx.textAlign = 'left';
}
