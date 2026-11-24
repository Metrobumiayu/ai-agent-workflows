// Vice Bay — particles, floating texts and screen shake. One job: every visual
// effect that is not a sprite: muzzle flashes, tire smoke, explosions, sparks,
// rain splashes, pickup glints and the damage numbers / labels that float up.
import { makeRng } from './rng.js';

export function addParticle(G, p) {
  if (G.particles.length > 420) G.particles.shift();
  G.particles.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0.5, max: 0.5, size: 4, color: '#fff', kind: 'dot', ...p });
}

export function burst(G, x, y, n, color, speed, life, size) {
  const rng = makeRng((Math.random() * 1e9) | 0);
  for (let i = 0; i < n; i++) {
    const a = rng.range(0, Math.PI * 2);
    const s = rng.range(speed * 0.3, speed);
    addParticle(G, { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rng.range(life * 0.5, life), max: life, size: rng.range(size * 0.6, size * 1.4), color, kind: 'dot' });
  }
}

export function smoke(G, x, y, n = 6) {
  for (let i = 0; i < n; i++) {
    addParticle(G, { x: x + (Math.random() - 0.5) * 14, y: y + (Math.random() - 0.5) * 14, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 30, life: 0.7 + Math.random() * 0.5, max: 1.2, size: 8 + Math.random() * 8, color: '#9aa0a6', kind: 'smoke' });
  }
}

export function explode(G, x, y, big = false) {
  const r = big ? 130 : 80;
  burst(G, x, y, big ? 34 : 20, '#ff9f1c', 260, 0.6, 7);
  burst(G, x, y, big ? 20 : 12, '#ff3838', 180, 0.8, 9);
  burst(G, x, y, 10, '#ffd166', 320, 0.35, 4);
  smoke(G, x, y, big ? 16 : 10);
  addParticle(G, { x, y, vx: 0, vy: 0, life: 0.28, max: 0.28, size: r, color: '#fff3c4', kind: 'flash' });
  G.shake = Math.min(26, G.shake + (big ? 16 : 10));
  G.audio.sfx('explosion');
  // Chain damage: everything flammable nearby takes a hit.
  for (const c of G.cars) {
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < r + 30 && c.hp > 0) damageCar(G, c, big ? 120 : 60, true);
  }
  for (const e of G.enemies) {
    if (Math.hypot(e.x - x, e.y - y) < r) e.hp -= big ? 120 : 70;
  }
  const p = G.player;
  if (Math.hypot(p.x - x, p.y - y) < r && !p.inCar) hurtPlayer(G, 30);
}

export function damageCar(G, car, amount, silent = false) {
  if (car.hp <= 0) return;
  car.hp -= amount;
  if (car.hp <= 0) {
    car.hp = 0;
    car.dead = true;
    car.deadT = 0;
    if (!silent) explode(G, car.x, car.y, car.type === 'truck' || car.type === 'bus');
  }
}

export function hurtPlayer(G, amount) {
  const p = G.player;
  if (p.hurtCd > 0 || p.dead) return;
  p.hurtCd = 0.6;
  let rest = amount;
  if (p.armor > 0) { const absorbed = Math.min(p.armor, rest); p.armor -= absorbed; rest -= absorbed; }
  p.hp -= rest;
  G.shake = Math.min(20, G.shake + 5);
  if (p.hp <= 0) { p.hp = 0; p.dead = true; p.deadT = 0; }
}

export function addFloater(G, x, y, text, color = '#fff') {
  if (G.floaters.length > 24) G.floaters.shift();
  G.floaters.push({ x, y, text, color, life: 1.4, max: 1.4 });
}

export function updateParticles(G, dt) {
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.life -= dt;
    if (p.life <= 0) { G.particles.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96; p.vy *= 0.96;
    if (p.kind === 'smoke') { p.size += 14 * dt; }
  }
  for (let i = G.floaters.length - 1; i >= 0; i--) {
    const f = G.floaters[i];
    f.life -= dt;
    f.y -= 34 * dt;
    if (f.life <= 0) G.floaters.splice(i, 1);
  }
  G.shake = Math.max(0, G.shake - dt * 34);
}
