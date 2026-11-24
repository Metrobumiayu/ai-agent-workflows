// Entities: player, cars (sedan/sports/taxi/truck/moto/police), pedestrians, foot police,
// helicopter, particles, pickups. All updates take the shared game state G.
import { clamp, dist2, angDiff, TAU } from './rng.js';

export const CAR_TYPES = {
  sedan:   { accel: 260, max: 340, turn: 2.6, hp: 100, w: 30, l: 56, color: '#c0c8d0' },
  sports:  { accel: 380, max: 520, turn: 3.1, hp: 80,  w: 30, l: 54, color: '#d04040' },
  taxi:    { accel: 270, max: 350, turn: 2.7, hp: 100, w: 30, l: 56, color: '#e8c020' },
  truck:   { accel: 180, max: 260, turn: 1.9, hp: 180, w: 36, l: 78, color: '#7090a0' },
  moto:    { accel: 420, max: 560, turn: 3.6, hp: 45,  w: 18, l: 44, color: '#40a0d0' },
  police:  { accel: 340, max: 430, turn: 3.0, hp: 130, w: 30, l: 56, color: '#203060' },
};
const CAR_COLORS = ['#c0c8d0', '#d04040', '#40a060', '#e8e0c0', '#8040a0', '#d08030', '#6080c0', '#a0a0a0'];

export function makeCar(G, type, x, y, angle, ai) {
  const t = CAR_TYPES[type];
  const car = {
    id: G.nextCarId++, type, x, y, angle: angle || 0, speed: 0, hp: t.hp, maxHp: t.hp,
    w: t.w, l: t.l, color: type === 'taxi' ? t.color : (type === 'police' ? t.color : CAR_COLORS[G.rng.int(0, CAR_COLORS.length - 1)]),
    ai: ai || 'traffic', dir: angle || 0, targetSpeed: 0, smoke: 0, dead: false,
    rival: false, checkpoint: 0, stuck: 0, siren: 0, paint: null,
  };
  G.cars.push(car);
  return car;
}

export function spawnTraffic(G, n) {
  for (let i = 0; i < n; i++) {
    const rx = G.city.vRoads[G.rng.int(0, G.city.vRoads.length - 1)];
    const ry = G.city.hRoads[G.rng.int(0, G.city.hRoads.length - 1)];
    const horiz = G.rng.chance(0.5);
    const type = G.rng.pick(['sedan', 'sedan', 'sports', 'taxi', 'truck', 'moto']);
    const x = horiz ? rx + G.rng.range(-900, 900) : rx + (G.rng.chance(0.5) ? -14 : 14);
    const y = horiz ? ry + (G.rng.chance(0.5) ? -14 : 14) : ry + G.rng.range(-900, 900);
    const angle = horiz ? (G.rng.chance(0.5) ? 0 : Math.PI) : (G.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
    const car = makeCar(G, type, x, y, angle, 'traffic');
    car.targetSpeed = G.rng.range(90, 170);
    if (G.rng.chance(0.35)) { car.ai = 'parked'; car.targetSpeed = 0; }
  }
}

export function spawnPeds(G, n) {
  for (let i = 0; i < n; i++) {
    const x = G.rng.range(200, 4600), y = G.rng.range(200, 3400);
    if (G.city.onRoad(x, y)) continue;
    G.peds.push({
      x, y, angle: G.rng.range(0, TAU), speed: 0,
      kind: G.rng.pick(['walker', 'walker', 'walker', 'jogger']),
      color: G.rng.pick(['#e0a060', '#60a0e0', '#e06060', '#a0e060', '#e0e0e0', '#c080a0']),
      tx: x, ty: y, wait: G.rng.range(0, 3), panic: 0,
    });
  }
}

export function collideBuildings(G, x, y, r) {
  for (const b of G.city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}
export function resolveCircle(G, e, r) {
  const b = collideBuildings(G, e.x, e.y, r);
  if (!b) return;
  const cx = clamp(e.x, b.x, b.x + b.w), cy = clamp(e.y, b.y, b.y + b.h);
  const dx = e.x - cx, dy = e.y - cy, d = Math.hypot(dx, dy);
  if (d < 1) { pushOut(G, e, r); return; } // deep inside: extract along smallest penetration
  const push = r - d;
  if (push > 0) { e.x += (dx / d) * push; e.y += (dy / d) * push; }
  e.x = clamp(e.x, 30, 4770); e.y = clamp(e.y, 30, 3570);
}
/** Extract an entity overlapping a building along the smallest penetration axis. */
export function pushOut(G, e, r) {
  const b = collideBuildings(G, e.x, e.y, r);
  if (!b) return false;
  const left = e.x - b.x, right = b.x + b.w - e.x, top = e.y - b.y, bottom = b.y + b.h - e.y;
  const m = Math.min(left, right, top, bottom);
  if (m === left) e.x = b.x - r;
  else if (m === right) e.x = b.x + b.w + r;
  else if (m === top) e.y = b.y - r;
  else e.y = b.y + b.h + r;
  e.x = clamp(e.x, 30, 4770); e.y = clamp(e.y, 30, 3570);
  return true;
}

// --- player ---
export function updatePlayer(G, dt, input) {
  const p = G.player;
  if (p.dead) return;
  if (p.inCar) { const car = G.cars.find((c) => c.id === p.carId); if (car) updatePlayerCar(G, dt, input, car); return; }
  const sp = 240;
  let mx = (input.keys.has('KeyD') || input.keys.has('ArrowRight') ? 1 : 0) - (input.keys.has('KeyA') || input.keys.has('ArrowLeft') ? 1 : 0);
  let my = (input.keys.has('KeyS') || input.keys.has('ArrowDown') ? 1 : 0) - (input.keys.has('KeyW') || input.keys.has('ArrowUp') ? 1 : 0);
  const len = Math.hypot(mx, my) || 1;
  p.x += (mx / len) * sp * dt * (mx || my ? 1 : 0);
  p.y += (my / len) * sp * dt * (mx || my ? 1 : 0);
  if (mx || my) p.angle = Math.atan2(my, mx);
  resolveCircle(G, p, 14);
  p.x = clamp(p.x, 20, 4780); p.y = clamp(p.y, 20, 3580);
  // aim at mouse
  if (input.mouseIn) p.aim = Math.atan2((G.cam.y + input.mouseY) - p.y, (G.cam.x + input.mouseX) - p.x);
  // punch cooldown
  if (p.punchCd > 0) p.punchCd -= dt;
  if (p.shootCd > 0) p.shootCd -= dt;
  if (p.hurtCd > 0) p.hurtCd -= dt;
}

export function updatePlayerCar(G, dt, input, car) {
  const t = CAR_TYPES[car.type];
  const grip = G.weather.rain ? 0.85 : 1;
  const fwd = (input.keys.has('KeyW') || input.keys.has('ArrowUp') ? 1 : 0) - (input.keys.has('KeyS') || input.keys.has('ArrowDown') ? 1 : 0);
  const steer = (input.keys.has('KeyA') || input.keys.has('ArrowLeft') ? 1 : 0) - (input.keys.has('KeyD') || input.keys.has('ArrowRight') ? 1 : 0);
  if (fwd > 0) car.speed += t.accel * grip * dt;
  else if (fwd < 0) car.speed -= t.accel * 0.7 * dt;
  else car.speed *= Math.pow(0.4, dt);
  if (input.keys.has('Space')) car.speed *= Math.pow(0.05, dt); // handbrake
  car.speed = clamp(car.speed, -t.max * 0.45, t.max);
  const spd = Math.abs(car.speed) / t.max;
  car.angle += steer * t.turn * grip * dt * (car.speed >= 0 ? 1 : -1) * (0.4 + 0.6 * spd);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  const b = collideBuildings(G, car.x, car.y, 20);
  if (b) {
    car.x -= Math.cos(car.angle) * car.speed * dt; car.y -= Math.sin(car.angle) * car.speed * dt;
    if (Math.abs(car.speed) > 120) { damageCar(G, car, Math.abs(car.speed) * 0.08); G.audio.crash(); addShake(G, 4); }
    car.speed *= -0.25;
    pushOut(G, car, 20); // extract if still overlapping (e.g. spawned inside)
  }
  car.x = clamp(car.x, 20, 4780); car.y = clamp(car.y, 20, 3580);
  const p = G.player; p.x = car.x; p.y = car.y; p.angle = car.angle;
  if (car.hp < car.maxHp * 0.4) car.smoke = 1;
  if (car.hp <= 0 && !car.dead) explodeCar(G, car);
}

export function enterCar(G, car) {
  const p = G.player;
  p.inCar = true; p.carId = car.id; car.ai = 'player'; car.targetSpeed = 0;
  G.audio.engineStart();
  G.message = car.type === 'police' ? 'Stole a police cruiser!' : `Driving a ${car.type}`;
  G.messageT = 2;
}
export function exitCar(G) {
  const p = G.player;
  const car = G.cars.find((c) => c.id === p.carId);
  if (!car) { p.inCar = false; p.carId = 0; return; }
  car.ai = 'parked'; car.speed = 0;
  const ox = Math.cos(car.angle + Math.PI / 2) * 30, oy = Math.sin(car.angle + Math.PI / 2) * 30;
  p.x = car.x + ox; p.y = car.y + oy;
  p.inCar = false; p.carId = 0;
}
export function nearestCar(G, x, y, maxD) {
  let best = null, bd = maxD * maxD;
  for (const c of G.cars) {
    if (c.dead || c.ai === 'player') continue;
    const d = dist2(x, y, c.x, c.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

export function damageCar(G, car, dmg) {
  if (car.dead) return;
  car.hp -= dmg;
  if (car.hp <= 0) { car.hp = 0; explodeCar(G, car); }
  else if (car.hp < car.maxHp * 0.4) { car.smoke = 1; spawnSmoke(G, car.x, car.y, 3); }
}
export function explodeCar(G, car) {
  if (car.dead) return;
  car.dead = true; car.speed = 0;
  G.audio.explosion(); addShake(G, 10);
  for (let i = 0; i < 26; i++) spawnParticle(G, car.x, car.y, 'fire');
  for (let i = 0; i < 12; i++) spawnParticle(G, car.x, car.y, 'smoke');
  if (G.player.inCar && G.player.carId === car.id) {
    G.player.hp -= 35;
    exitCar(G);
    if (G.player.hp <= 0) killPlayer(G, 'wasted');
  }
  addWanted(G, 1);
  G.message = 'Car wrecked!'; G.messageT = 2;
}

// --- traffic / police cars ---
export function updateCars(G, dt) {
  for (const car of G.cars) {
    if (car.dead || car.ai === 'player') continue;
    if (car.ai === 'police') updatePoliceCar(G, dt, car);
    else if (car.ai === 'rival') updateRivalCar(G, dt, car);
    else if (car.ai === 'traffic') updateTrafficCar(G, dt, car);
    if (car.smoke) spawnSmoke(G, car.x, car.y, 1);
    // car-car collision (cheap circle)
    for (const o of G.cars) {
      if (o === car || o.dead) continue;
      const d = dist2(car.x, car.y, o.x, o.y);
      if (d < 30 * 30) {
        const dd = Math.sqrt(d) || 1;
        const push = (30 - dd) / 2;
        const nx = (car.x - o.x) / dd, ny = (car.y - o.y) / dd;
        car.x += nx * push; car.y += ny * push; o.x -= nx * push; o.y -= ny * push;
        if (Math.abs(car.speed) > 150 || Math.abs(o.speed) > 150) { damageCar(G, car, 4); damageCar(G, o, 4); }
      }
    }
  }
  // remove far dead cars occasionally
  if (G.cars.length > 90) G.cars = G.cars.filter((c) => !c.dead || dist2(c.x, c.y, G.player.x, G.player.y) < 1200 * 1200);
}

function lightStateAt(G, x, y) {
  // nearest traffic light within 90px ahead on this road
  for (const l of G.city.lights) {
    if (Math.abs(l.x - x) < 70 && Math.abs(l.y - y) < 70) return l.state;
  }
  return 'green';
}

function updateTrafficCar(G, dt, car) {
  const t = CAR_TYPES[car.type];
  // traffic lights: stop at red when close to intersection
  let want = car.targetSpeed;
  const nearLight = G.city.lights.find((l) => Math.abs(l.x - car.x) < 80 && Math.abs(l.y - car.y) < 80);
  if (nearLight && nearLight.state === 'red') {
    const approaching = Math.abs(car.x - nearLight.x) < 70 && Math.abs(car.y - nearLight.y) < 70;
    if (approaching) want = 0;
  }
  // slow for cars ahead
  for (const o of G.cars) {
    if (o === car || o.dead) continue;
    const dx = o.x - car.x, dy = o.y - car.y;
    const ahead = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
    const side = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
    if (ahead > 0 && ahead < 70 && side < 24) { want = Math.min(want, Math.max(0, o.speed - 20)); break; }
  }
  car.speed += clamp(want - car.speed, -300 * dt, 200 * dt);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  const b = collideBuildings(G, car.x, car.y, 18);
  if (b) { car.x -= Math.cos(car.angle) * car.speed * dt; car.y -= Math.sin(car.angle) * car.speed * dt; car.speed = 0; car.angle += Math.PI / 2; pushOut(G, car, 18); }
  // at intersections, sometimes turn
  const onV = G.city.vRoads.some((rx) => Math.abs(car.x - rx) < 12);
  const onH = G.city.hRoads.some((ry) => Math.abs(car.y - ry) < 12);
  if ((onV || onH) && G.rng.chance(dt * 0.5)) {
    const horiz = G.rng.chance(0.5);
    car.angle = horiz ? (G.rng.chance(0.5) ? 0 : Math.PI) : (G.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
    car.x = clamp(car.x, 20, 4780); car.y = clamp(car.y, 20, 3580);
  }
  // keep on roads: if far off-road, steer back
  if (!G.city.onRoad(car.x, car.y) && G.rng.chance(dt * 0.3)) {
    const nr = nearestRoad(G, car.x, car.y);
    car.angle = Math.atan2(nr.y - car.y, nr.x - car.x);
  }
}
function nearestRoad(G, x, y) {
  let best = { x, y }, bd = 1e18;
  for (const rx of G.city.vRoads) { const d = Math.abs(x - rx); if (d < bd) { bd = d; best = { x: rx, y }; } }
  for (const ry of G.city.hRoads) { const d = Math.abs(y - ry); if (d < bd) { bd = d; best = { x, y: ry }; } }
  return best;
}

function updatePoliceCar(G, dt, car) {
  const t = CAR_TYPES.police;
  const p = G.player;
  const d = Math.hypot(p.x - car.x, p.y - car.y);
  const wantAngle = Math.atan2(p.y - car.y, p.x - car.x);
  car.angle += clamp(angDiff(wantAngle, car.angle), -3.2 * dt, 3.2 * dt);
  const target = d > 60 ? 430 : 200;
  car.speed += clamp(target - car.speed, -400 * dt, 320 * dt);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  const b = collideBuildings(G, car.x, car.y, 18);
  if (b) { car.x -= Math.cos(car.angle) * car.speed * dt; car.y -= Math.sin(car.angle) * car.speed * dt; car.speed *= 0.4; car.angle += 0.6; pushOut(G, car, 18); }
  car.siren += dt;
  if (car.siren > 0.9) { car.siren = 0; G.audio.siren(); }
  // ram the player
  if (d < 46) {
    if (p.inCar) {
      const pc = G.cars.find((c) => c.id === p.carId);
      if (pc) damageCar(G, pc, 22 * dt);
    } else if (p.hurtCd <= 0) { hurtPlayer(G, 8, 'busted'); }
    car.speed *= 0.85;
  }
  // give up if far
  if (d > 1600 && G.player.wanted === 0) { car.ai = 'traffic'; car.targetSpeed = 120; }
}

function updateRivalCar(G, dt, car) {
  const m = G.missionData;
  if (!m || !m.checkpoints || !m.checkpoints[car.checkpoint]) { car.ai = 'traffic'; car.rival = false; car.targetSpeed = 120; return; }
  const cp = m.checkpoints[car.checkpoint];
  const wantAngle = Math.atan2(cp.y - car.y, cp.x - car.x);
  car.angle += clamp(angDiff(wantAngle, car.angle), -3.0 * dt, 3.0 * dt);
  const target = 380 + (car.rivalSkill || 0) * 30;
  car.speed += clamp(target - car.speed, -400 * dt, 300 * dt);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  const b = collideBuildings(G, car.x, car.y, 18);
  if (b) { car.x -= Math.cos(car.angle) * car.speed * dt; car.y -= Math.sin(car.angle) * car.speed * dt; car.speed *= 0.5; car.angle += 0.8; pushOut(G, car, 18); }
  if (dist2(car.x, car.y, cp.x, cp.y) < 90 * 90) car.checkpoint++;
}

// --- pedestrians ---
export function updatePeds(G, dt) {
  const p = G.player;
  for (const ped of G.peds) {
    const d = Math.hypot(p.x - ped.x, p.y - ped.y);
    if (ped.panic > 0) {
      ped.panic -= dt;
      ped.angle = Math.atan2(ped.y - p.y, ped.x - p.x);
      ped.speed = 260;
    } else if (d < 60 && p.inCar) { ped.panic = 2; }
    else {
      ped.wait -= dt;
      if (ped.wait <= 0) {
        ped.tx = clamp(ped.x + G.rng.range(-300, 300), 40, 4760);
        ped.ty = clamp(ped.y + G.rng.range(-300, 300), 40, 3560);
        ped.wait = G.rng.range(2, 6);
      }
      const td = Math.hypot(ped.tx - ped.x, ped.ty - ped.y);
      if (td > 12) {
        ped.angle = Math.atan2(ped.ty - ped.y, ped.tx - ped.x);
        ped.speed = ped.kind === 'jogger' ? 170 : 70;
      } else ped.speed = 0;
    }
    ped.x += Math.cos(ped.angle) * ped.speed * dt;
    ped.y += Math.sin(ped.angle) * ped.speed * dt;
    resolveCircle(G, ped, 10);
    ped.x = clamp(ped.x, 20, 4780); ped.y = clamp(ped.y, 20, 3580);
  }
  // cars hitting peds
  for (const car of G.cars) {
    if (car.dead || Math.abs(car.speed) < 60) continue;
    for (const ped of G.peds) {
      if (dist2(car.x, car.y, ped.x, ped.y) < 26 * 26) {
        ped.panic = 3;
        ped.x += (ped.x - car.x) * 0.3; ped.y += (ped.y - car.y) * 0.3;
        if (car.ai === 'player') addWanted(G, 1);
      }
    }
  }
}

// --- foot police ---
export function updateFootPolice(G, dt) {
  const p = G.player;
  for (const cop of G.footPolice) {
    if (cop.hp <= 0) continue;
    const d = Math.hypot(p.x - cop.x, p.y - cop.y);
    cop.angle = Math.atan2(p.y - cop.y, p.x - cop.x);
    if (d > 40) { cop.x += Math.cos(cop.angle) * 200 * dt; cop.y += Math.sin(cop.angle) * 200 * dt; }
    else if (cop.cd <= 0) { cop.cd = 0.8; hurtPlayer(G, 10, 'busted'); }
    if (cop.cd > 0) cop.cd -= dt;
    resolveCircle(G, cop, 12);
  }
  G.footPolice = G.footPolice.filter((c) => c.hp > 0);
}

// --- helicopter ---
export function updateHeli(G, dt) {
  const h = G.heli;
  if (G.player.wanted >= 4 && !G.player.dead) {
    h.active = true;
    const tx = G.player.x + 40, ty = G.player.y - 60;
    h.x += (tx - h.x) * Math.min(1, dt * 1.2);
    h.y += (ty - h.y) * Math.min(1, dt * 1.2);
    h.rotor += dt * 30;
    h.beam = Math.atan2(G.player.y - h.y, G.player.x - h.x);
  } else h.active = false;
}

// --- wanted ---
export function addWanted(G, n) {
  if (G.player.dead) return;
  const before = G.player.wanted;
  G.player.wanted = clamp(G.player.wanted + n, 0, 5);
  if (G.player.wanted > before) {
    G.wantedTimer = 14;
    G.message = G.player.wanted >= 4 ? 'HELICOPTER INBOUND!' : `Wanted level ${G.player.wanted}`;
    G.messageT = 2.5;
    ensurePolice(G);
  }
}
export function ensurePolice(G) {
  const want = G.player.wanted;
  const cops = G.cars.filter((c) => c.ai === 'police' && !c.dead).length;
  const need = want >= 1 ? Math.min(2 + want, 6) : 0;
  for (let i = cops; i < need; i++) {
    const a = G.rng.range(0, TAU);
    const x = clamp(G.player.x + Math.cos(a) * 500, 60, 4740);
    const y = clamp(G.player.y + Math.sin(a) * 500, 60, 3540);
    makeCar(G, 'police', x, y, a, 'police');
  }
  if (want >= 3) {
    while (G.footPolice.length < Math.min(2 + want, 5)) {
      const a = G.rng.range(0, TAU);
      G.footPolice.push({ x: clamp(G.player.x + Math.cos(a) * 220, 40, 4760), y: clamp(G.player.y + Math.sin(a) * 220, 40, 3560), angle: 0, hp: 30, cd: 0 });
    }
  }
}
export function updateWanted(G, dt) {
  const p = G.player;
  if (p.wanted === 0) {
    // stand down: no heat means no pursuit
    for (const c of G.cars) if (c.ai === 'police') { c.ai = 'traffic'; c.targetSpeed = 120; }
    if (G.footPolice.length) G.footPolice = [];
    G.heli.active = false;
    return;
  }
  const nearCop = G.cars.some((c) => c.ai === 'police' && !c.dead && dist2(c.x, c.y, p.x, p.y) < 700 * 700)
    || G.footPolice.some((c) => dist2(c.x, c.y, p.x, p.y) < 500 * 500)
    || G.heli.active;
  if (nearCop) G.wantedTimer = 14;
  else {
    G.wantedTimer -= dt;
    if (G.wantedTimer <= 0) {
      p.wanted--; G.wantedTimer = 14;
      if (p.wanted === 0) {
        G.message = 'You lost the cops.'; G.messageT = 2;
        for (const c of G.cars) if (c.ai === 'police') { c.ai = 'traffic'; c.targetSpeed = 120; }
        G.footPolice = [];
      }
    }
  }
}

// --- combat / damage ---
export function hurtPlayer(G, dmg, how) {
  const p = G.player;
  if (p.dead || p.hurtCd > 0) return;
  p.hurtCd = 0.5;
  let left = dmg;
  if (p.armor > 0) { const ab = Math.min(p.armor, left); p.armor -= ab; left -= ab; }
  p.hp -= left;
  addShake(G, 3);
  if (p.hp <= 0) { p.hp = 0; killPlayer(G, how || 'wasted'); }
}
export function killPlayer(G, how) {
  const p = G.player;
  p.dead = true; p.deadHow = how; p.deadT = 0;
  if (p.inCar) { const car = G.cars.find((c) => c.id === p.carId); if (car) { car.ai = 'parked'; car.speed = 0; } p.inCar = false; p.carId = 0; }
  G.audio.missionFail();
  if (G.mission) { G.mission.failed = true; }
}
export function respawnPlayer(G) {
  const p = G.player;
  const lost = Math.floor(p.money * 0.1);
  p.money -= lost;
  const sp = G.safehouseOwned ? G.safehouseSpawn : G.city.hospital;
  p.x = sp.x; p.y = sp.y + 40; p.hp = 100; p.armor = 0; p.dead = false; p.wanted = 0; p.inCar = false; p.carId = 0;
  G.footPolice = [];
  for (const c of G.cars) if (c.ai === 'police') { c.ai = 'traffic'; c.targetSpeed = 120; }
  G.heli.active = false;
  G.message = `Hospital bill: -$${lost}. ${p.deadHow === 'busted' ? 'Busted!' : 'Wasted!'}`;
  G.messageT = 3;
  G.state = 'play';
}

// --- particles / pickups ---
export function spawnParticle(G, x, y, kind) {
  const a = G.rng.range(0, TAU), sp = G.rng.range(40, 220);
  G.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: G.rng.range(0.4, 1.1), max: 1.1, kind, size: G.rng.range(4, 10) });
}
export function spawnSmoke(G, x, y, n) {
  for (let i = 0; i < n; i++) G.particles.push({ x: x + G.rng.range(-8, 8), y: y + G.rng.range(-8, 8), vx: G.rng.range(-15, 15), vy: G.rng.range(-40, -10), life: G.rng.range(0.6, 1.4), max: 1.4, kind: 'smoke', size: G.rng.range(6, 14) });
}
export function updateParticles(G, dt) {
  for (const pt of G.particles) { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt; pt.vy -= 20 * dt; }
  G.particles = G.particles.filter((pt) => pt.life > 0);
  if (G.particles.length > 400) G.particles.length = 400;
}
export function addShake(G, n) { G.shake = Math.min(14, (G.shake || 0) + n); }
export function dropCash(G, x, y, amount) { G.pickups.push({ x, y, kind: 'cash', amount, t: 0 }); }
export function updatePickups(G, dt) {
  const p = G.player;
  for (const pk of G.pickups) {
    pk.t += dt;
    if (dist2(p.x, p.y, pk.x, pk.y) < 30 * 30) {
      pk.taken = true;
      if (pk.kind === 'cash') { p.money += pk.amount; G.audio.cash(); G.message = `+$${pk.amount}`; G.messageT = 1.5; }
      else if (pk.kind === 'ammo') { p.ammo[p.weapon] = (p.ammo[p.weapon] || 0) + 24; G.audio.pickup(); G.message = '+24 ammo'; G.messageT = 1.5; }
      else if (pk.kind === 'health') { p.hp = Math.min(100, p.hp + 40); G.audio.pickup(); G.message = '+40 HP'; G.messageT = 1.5; }
    }
  }
  G.pickups = G.pickups.filter((pk) => !pk.taken && pk.t < 30);
}
