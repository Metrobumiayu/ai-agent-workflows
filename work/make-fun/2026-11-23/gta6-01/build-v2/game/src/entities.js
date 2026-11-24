// Solara Bay — entities: player, cars, traffic, pedestrians, police, combat.
import { WORLD, ROADS_X, ROADS_Y, ROAD_W, onRoad, inWater, collideBuildings } from './world.js';

export const CAR_COLORS = ['#d23b2e', '#2e6fd2', '#e8b73c', '#3fae5a', '#e8e8e8', '#222831', '#c96fd2', '#e87c2e'];
export const PD_COLOR = '#1e4fd8';

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function dist(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
function angTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
function angDiff(a, b) { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }

let carId = 0;
export function makeCar(x, y, angle, color, kind) {
  return { id: ++carId, x, y, angle, speed: 0, color, kind: kind || 'traffic', hp: 100, maxHp: 100, driver: true, steer: 0, brake: false, ramCd: 0, bumpCd: 0, dead: false, targetRoad: null, dir: 1, axis: 'x' };
}

export function makePed(x, y, color) {
  return { x, y, angle: Math.random() * Math.PI * 2, speed: 28 + Math.random() * 22, color: color || ['#e8b88a', '#c98a5a', '#8a5a3a', '#e8d0a0'][Math.floor(Math.random() * 4)], shirt: ['#d23b2e', '#2e6fd2', '#3fae5a', '#e8b73c', '#8a5a9a'][Math.floor(Math.random() * 5)], flee: 0, hp: 20, dead: false, punchCd: 0, isCop: false, isRival: false };
}

export function spawnTraffic(rnd, world, n) {
  const cars = [];
  for (let i = 0; i < n; i++) {
    const horiz = rnd() < 0.5;
    let x, y, angle, axis, dir;
    if (horiz) {
      const ry = ROADS_Y[Math.floor(rnd() * ROADS_Y.length)];
      x = 100 + rnd() * (WORLD.w - 200); y = ry + (rnd() < 0.5 ? -22 : 22);
      dir = y < ry ? 1 : -1; angle = dir > 0 ? 0 : Math.PI; axis = 'x';
    } else {
      const rx = ROADS_X[Math.floor(rnd() * ROADS_X.length)];
      x = rx + (rnd() < 0.5 ? -22 : 22); y = 100 + rnd() * (WORLD.h - 300);
      dir = x < rx ? 1 : -1; angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2; axis = 'y';
    }
    const c = makeCar(x, y, angle, CAR_COLORS[Math.floor(rnd() * CAR_COLORS.length)], 'traffic');
    c.speed = 90 + rnd() * 60; c.axis = axis; c.dir = dir;
    cars.push(c);
  }
  return cars;
}

export function spawnParked(rnd, world, n) {
  const cars = [];
  let tries = 0;
  while (cars.length < n && tries++ < 400) {
    const horiz = rnd() < 0.5;
    let x, y, angle;
    if (horiz) {
      const ry = ROADS_Y[Math.floor(rnd() * ROADS_Y.length)];
      x = 120 + rnd() * (WORLD.w - 240); y = ry + (rnd() < 0.5 ? -58 : 58); angle = rnd() < 0.5 ? 0 : Math.PI;
    } else {
      const rx = ROADS_X[Math.floor(rnd() * ROADS_X.length)];
      x = rx + (rnd() < 0.5 ? -58 : 58); y = 120 + rnd() * (WORLD.h - 320); angle = rnd() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
    }
    if (inWater(x, y)) continue;
    if (cars.some(c => dist(c.x, c.y, x, y) < 90)) continue;
    const c = makeCar(x, y, angle, CAR_COLORS[Math.floor(rnd() * CAR_COLORS.length)], 'parked');
    c.driver = false;
    cars.push(c);
  }
  return cars;
}

export function spawnPeds(rnd, world, n) {
  const peds = [];
  let tries = 0;
  while (peds.length < n && tries++ < 800) {
    const x = 80 + rnd() * (WORLD.w - 160), y = 80 + rnd() * (WORLD.h - 360);
    if (onRoad(x, y, 4) || inWater(x, y)) continue;
    if (world.buildings.some(b => x > b.x - 8 && x < b.x + b.w + 8 && y > b.y - 8 && y < b.y + b.h + 8)) continue;
    peds.push(makePed(x, y));
  }
  return peds;
}

// Traffic follows the road grid: drive along current axis; at an intersection
// randomly turn or continue; never leaves a road.
export function updateTraffic(car, dt, rnd) {
  if (car.kind !== 'traffic') return;
  const speed = 95 + (car.id % 5) * 9;
  car.speed = speed;
  let nx = car.x, ny = car.y;
  if (car.axis === 'x') {
    nx += Math.cos(car.angle) * speed * dt;
    const nearX = ROADS_X.find(rx => Math.abs(nx - rx) < 6);
    if (nearX !== undefined && Math.abs(car.y - nearestRoadY(car.y)) < 30) {
      // at intersection: maybe turn
      if (rnd() < 0.35) {
        const dirY = rnd() < 0.5 ? 1 : -1;
        car.axis = 'y'; car.angle = dirY > 0 ? Math.PI / 2 : -Math.PI / 2;
        car.x = nearX + (dirY > 0 ? -22 : 22); car.dir = dirY;
        return;
      }
    }
  } else {
    ny += Math.sin(car.angle) * speed * dt;
    const nearY = ROADS_Y.find(ry => Math.abs(ny - ry) < 6);
    if (nearY !== undefined && Math.abs(car.x - nearestRoadX(car.x)) < 30) {
      if (rnd() < 0.35) {
        const dirX = rnd() < 0.5 ? 1 : -1;
        car.axis = 'x'; car.angle = dirX > 0 ? 0 : Math.PI;
        car.y = nearY + (dirX > 0 ? -22 : 22); car.dir = dirX;
        return;
      }
    }
  }
  // wrap around the map edges on the road network
  if (nx < 60) { nx = WORLD.w - 60; }
  if (nx > WORLD.w - 60) { nx = 60; }
  if (ny < 60) { ny = WORLD.h - 260; }
  if (ny > WORLD.h - 260) { ny = 60; }
  car.x = nx; car.y = ny;
}
function nearestRoadX(x) { let best = ROADS_X[0], bd = 1e9; for (const rx of ROADS_X) { const d = Math.abs(x - rx); if (d < bd) { bd = d; best = rx; } } return best; }
function nearestRoadY(y) { let best = ROADS_Y[0], bd = 1e9; for (const ry of ROADS_Y) { const d = Math.abs(y - ry); if (d < bd) { bd = d; best = ry; } } return best; }

export function updatePeds(peds, dt, cars, player) {
  for (const p of peds) {
    if (p.dead) continue;
    p.punchCd = Math.max(0, p.punchCd - dt);
    // flee from fast cars / player car
    let fleeX = 0, fleeY = 0, danger = false;
    for (const c of cars) {
      if (Math.abs(c.speed) < 60) continue;
      const d = dist(p.x, p.y, c.x, c.y);
      if (d < 130) { danger = true; fleeX += (p.x - c.x) / (d || 1); fleeY += (p.y - c.y) / (d || 1); }
    }
    if (player.car && Math.abs(player.car.speed) > 60 && dist(p.x, p.y, player.x, player.y) < 130) {
      danger = true; fleeX += (p.x - player.x) / 130; fleeY += (p.y - player.y) / 130;
    }
    if (danger) {
      p.flee = 1.2;
      const m = Math.hypot(fleeX, fleeY) || 1;
      p.angle = Math.atan2(fleeY / m, fleeX / m);
      p.x += Math.cos(p.angle) * 150 * dt;
      p.y += Math.sin(p.angle) * 150 * dt;
    } else {
      p.flee = Math.max(0, p.flee - dt);
      // stroll: keep near sidewalks (just off a road), change direction sometimes
      if (Math.random() < 0.004) p.angle = Math.random() * Math.PI * 2;
      const nx = p.x + Math.cos(p.angle) * p.speed * dt;
      const ny = p.y + Math.sin(p.angle) * p.speed * dt;
      if (!onRoad(nx, ny, 2) && !inWater(nx, ny) && nx > 40 && nx < WORLD.w - 40 && ny > 40 && ny < WORLD.h - 240) { p.x = nx; p.y = ny; }
      else p.angle += Math.PI / 2;
    }
    p.x = clamp(p.x, 30, WORLD.w - 30); p.y = clamp(p.y, 30, WORLD.h - 230);
  }
}

// Player car arcade physics. Returns nothing; mutates car.
export function drivePlayerCar(car, input, dt, world, onCollide) {
  const ACCEL = 520, BRAKE = 900, MAX_SPEED = 560, REVERSE_MAX = 200, TURN = 2.6;
  let target = 0;
  if (input.up) target = MAX_SPEED;
  if (input.down) target = car.speed > 20 ? -BRAKE : -REVERSE_MAX;
  if (target > 0) car.speed = Math.min(target, car.speed + ACCEL * dt);
  else if (target < 0) car.speed = Math.max(target, car.speed + (car.speed > 20 ? -BRAKE : -ACCEL * 0.6) * dt);
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 300 * dt);
  const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  const spd = clamp(car.speed / MAX_SPEED, -1, 1);
  car.angle += steer * TURN * spd * dt * (car.speed >= 0 ? 1 : -1);
  let nx = car.x + Math.cos(car.angle) * car.speed * dt;
  let ny = car.y + Math.sin(car.angle) * car.speed * dt;
  // building collision (circle r=18)
  const fixed = collideBuildings(nx, ny, 18, world.buildings);
  if (fixed.x !== nx || fixed.y !== ny) { car.speed *= 0.45; if (onCollide) onCollide(4); nx = fixed.x; ny = fixed.y; }
  nx = clamp(nx, 30, WORLD.w - 30); ny = clamp(ny, 30, WORLD.h - 230);
  if (nx === 30 || nx === WORLD.w - 30 || ny === 30 || ny === WORLD.h - 230) car.speed *= 0.5;
  car.x = nx; car.y = ny;
}

export function collideCars(a, b) {
  // simple circle collision between two cars; returns overlap depth
  const d = dist(a.x, a.y, b.x, b.y);
  const min = 34;
  if (d >= min || d < 0.001) return 0;
  const push = (min - d) / 2;
  const ux = (a.x - b.x) / d, uy = (a.y - b.y) / d;
  a.x += ux * push; a.y += uy * push;
  b.x -= ux * push; b.y -= uy * push;
  return min - d;
}

export function drawCar(ctx, car, t) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-19, -11, 40, 24);
  ctx.fillStyle = car.color;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-20, -11, 40, 22, 6); else ctx.rect(-20, -11, 40, 22);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,220,255,.85)'; ctx.fillRect(-4, -9, 10, 18);
  ctx.fillStyle = '#222'; ctx.fillRect(-18, -11, 5, 5); ctx.fillRect(-18, 6, 5, 5); ctx.fillRect(13, -11, 5, 5); ctx.fillRect(13, 6, 5, 5);
  // headlights
  ctx.fillStyle = '#ffe9a0'; ctx.fillRect(19, -8, 3, 4); ctx.fillRect(19, 4, 3, 4);
  if (car.kind === 'police') {
    const blink = Math.floor(t / 250) % 2 === 0;
    ctx.fillStyle = blink ? '#ff2e2e' : '#2e6bff'; ctx.fillRect(-2, -11, 8, 4);
    ctx.fillStyle = blink ? '#2e6bff' : '#ff2e2e'; ctx.fillRect(-2, 7, 8, 4);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.fillText('PD', -12, 3);
  }
  if (car.hp < 100) { // smoke when damaged
    ctx.fillStyle = 'rgba(120,120,120,.5)';
    ctx.beginPath(); ctx.arc(-14 + Math.sin(t / 90) * 3, -6, 5 + Math.sin(t / 130) * 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  // hp bar for damaged player/police cars
  if ((car.kind === 'player' || car.kind === 'police') && car.hp < 100) {
    ctx.fillStyle = '#000'; ctx.fillRect(car.x - 18, car.y - 26, 36, 5);
    ctx.fillStyle = car.hp > 40 ? '#4ae05a' : '#e04a4a'; ctx.fillRect(car.x - 17, car.y - 25, 34 * (car.hp / 100), 3);
  }
}

export function drawPed(ctx, p) {
  if (p.dead) return;
  ctx.save(); ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 4, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.shirt; ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(Math.cos(p.angle) * 3, Math.sin(p.angle) * 3 - 2, 4.5, 0, Math.PI * 2); ctx.fill();
  if (p.isCop) { ctx.fillStyle = '#1e4fd8'; ctx.fillRect(-7, -3, 14, 4); ctx.fillStyle = '#fff'; ctx.font = 'bold 6px Arial'; ctx.textAlign = 'center'; ctx.fillText('PD', 0, 0); }
  if (p.isRival) { ctx.fillStyle = '#ff2e2e'; ctx.beginPath(); ctx.arc(0, -9, 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
