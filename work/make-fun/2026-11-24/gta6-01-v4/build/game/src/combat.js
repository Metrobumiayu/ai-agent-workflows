// Vice Bay — combat. One job: guns, fists, drive-bys and the enemies who shoot back.
// Hitscan with spread and pellets; tracers and muzzle flashes go through particles;
// every shot scares the peds and can raise the wanted level.
import { WEAPONS } from './config.js';
import { angleTo } from './rng.js';
import { pointInBuilding } from './city.js';
import { addParticle, burst, explode, damageCar, hurtPlayer, addFloater } from './particles.js';
import { scarePeds } from './pedestrians.js';
import { carById } from './vehicles.js';
import { addWanted } from './police.js';

export function makeEnemy(G, x, y, weapon = 'pistol', hp = 50) {
  return { x, y, hp, maxHp: hp, weapon, angle: 0, shootCd: 1 + G.rng.range(0, 1), speed: 120, state: 'guard', target: null, dead: false };
}

export function updateEnemies(G, dt) {
  const p = G.player;
  for (let i = G.enemies.length - 1; i >= 0; i--) {
    const e = G.enemies[i];
    if (e.dead || e.hp <= 0) {
      if (!e.dead) { e.dead = true; G.stats.kills++; addFloater(G, e.x, e.y, '+$25', '#7ee081'); p.money += 25; }
      G.enemies.splice(i, 1);
      continue;
    }
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    e.angle = angleTo(e.x, e.y, p.x, p.y);
    if (d < 520) {
      e.state = 'fight';
      if (d > 200) { e.x += Math.cos(e.angle) * e.speed * dt; e.y += Math.sin(e.angle) * e.speed * dt; }
      e.shootCd -= dt;
      if (e.shootCd <= 0) {
        e.shootCd = WEAPONS[e.weapon].rate * 2.4;
        if (G.rng.chance(0.42)) {
          hurtPlayer(G, WEAPONS[e.weapon].damage / 2);
          tracer(G, e.x, e.y, p.x, p.y);
          G.audio.sfx('shot');
        }
      }
    } else if (e.state === 'guard' && e.target) {
      const td = Math.hypot(e.target.x - e.x, e.target.y - e.y);
      if (td > 30) { const a = angleTo(e.x, e.y, e.target.x, e.target.y); e.x += Math.cos(a) * e.speed * dt; e.y += Math.sin(a) * e.speed * dt; }
    }
  }
}

// Fire the player's current weapon toward (tx,ty). Handles fists, ammo, spread,
// drive-by penalty from a car, and the wanted consequences of shooting in public.
export function playerShoot(G, tx, ty) {
  const p = G.player;
  if (p.shootCd > 0 || p.dead) return false;
  const w = WEAPONS[p.weapon];
  p.shootCd = w.rate;
  p.flash = 0.15;
  const from = playerGunPos(G);
  const base = angleTo(from.x, from.y, tx, ty);
  const spread = w.spread * (p.inCar ? 1.8 : 1);
  if (p.weapon === 'fists') {
    p.punchAnim = 0.22;
    // Melee: anything within 40px in front takes the hit.
    const hit = nearestHittable(G, from.x + Math.cos(base) * 30, from.y + Math.sin(base) * 30, 44);
    if (hit) damageHittable(G, hit, w.damage);
    G.audio.sfx('punch');
    return true;
  }
  if ((p.ammo[p.weapon] || 0) <= 0) {
    G.message = 'Out of ammo — buy more at Ammo-Nation.';
    G.messageT = 2;
    G.audio.sfx('click');
    return false;
  }
  p.ammo[p.weapon]--;
  for (let i = 0; i < w.pellets; i++) {
    const a = base + (G.rng.range(-1, 1)) * spread;
    fireRay(G, from.x, from.y, a, w.range, w.damage, true);
  }
  addParticle(G, { x: from.x + Math.cos(base) * 22, y: from.y + Math.sin(base) * 22, vx: 0, vy: 0, life: 0.15, max: 0.15, size: 16, color: '#ffe082', kind: 'flash' });
  G.audio.sfx('shot');
  scarePeds(G, from.x, from.y, 420);
  if (p.wanted === 0 && G.rng.chance(0.5)) addWanted(G, 1, 'Shots fired — VCPD alerted!');
  return true;
}

function playerGunPos(G) {
  const p = G.player;
  if (p.inCar) {
    const c = carById(G, p.carId);
    if (c) return { x: c.x, y: c.y };
  }
  return { x: p.x, y: p.y };
}

function fireRay(G, x, y, angle, range, damage, byPlayer) {
  const step = 14;
  let cx = x, cy = y;
  for (let d = 0; d < range; d += step) {
    cx = x + Math.cos(angle) * d;
    cy = y + Math.sin(angle) * d;
    if (pointInBuilding(G.city.buildings, cx, cy)) { burst(G, cx, cy, 3, '#cfd8dc', 80, 0.25, 3); break; }
    const hit = nearestHittable(G, cx, cy, 26);
    if (hit) {
      damageHittable(G, hit, damage);
      tracer(G, x, y, cx, cy);
      return;
    }
  }
  tracer(G, x, y, cx, cy);
}

function tracer(G, x1, y1, x2, y2) {
  addParticle(G, { x: x1, y: y1, vx: 0, vy: 0, life: 0.09, max: 0.09, size: 1, color: '#ffe082', kind: 'tracer', x2, y2 });
}

function nearestHittable(G, x, y, r) {
  for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - x, e.y - y) < r + 12) return { kind: 'enemy', e };
  for (const f of G.footCops) if (Math.hypot(f.x - x, f.y - y) < r + 12) return { kind: 'cop', f };
  for (const c of G.cars) {
    if (c.dead) continue;
    if (Math.hypot(c.x - x, c.y - y) < r + c.w / 2) return { kind: 'car', c };
  }
  const p = G.player;
  if (!p.inCar && Math.hypot(p.x - x, p.y - y) < r + 12) return { kind: 'player' };
  return null;
}

function damageHittable(G, hit, damage) {
  if (hit.kind === 'enemy') { hit.e.hp -= damage; burst(G, hit.e.x, hit.e.y, 4, '#ff5252', 100, 0.3, 3); }
  else if (hit.kind === 'cop') { hit.f.hp -= damage; addWanted(G, 1, 'You shot a cop!'); }
  else if (hit.kind === 'car') { damageCar(G, hit.c, damage); }
  else if (hit.kind === 'player') { hurtPlayer(G, damage); }
}

// A barrel / gas tank the player can shoot: chain explosions are the fun part.
export function spawnBarrels(G, x, y, n = 3) {
  for (let i = 0; i < n; i++) {
    G.barrels.push({ x: x + (i - 1) * 44, y: y + (i % 2) * 30, hp: 10, dead: false });
  }
}
export function updateBarrels(G) {
  for (let i = G.barrels.length - 1; i >= 0; i--) {
    const b = G.barrels[i];
    if (b.hp <= 0 && !b.dead) { b.dead = true; explode(G, b.x, b.y, false); G.barrels.splice(i, 1); }
  }
}
