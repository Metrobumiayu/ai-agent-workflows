// Vice Bay — pedestrians. One job: the people on the sidewalks — wander, cross,
// wait at lights, and run screaming when shots ring out or a car comes at them.
// A few of them are taxi fares; one of them is always the next fare.
import { resolveBuildingCollision } from './city.js';
import { angleTo, clamp } from './rng.js';

const SKINS = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1', '#fd79a8', '#00cec9'];

export function makePed(G, x, y) {
  return {
    x, y, angle: G.rng.range(0, Math.PI * 2), speed: G.rng.range(28, 52),
    color: G.rng.pick(SKINS), state: 'walk', fleeT: 0, waitT: G.rng.range(0, 4),
    target: null, fare: false, dead: false, screamT: 0,
  };
}

export function spawnPeds(G, n) {
  for (let i = 0; i < n; i++) {
    const vertical = G.rng.chance(0.5);
    const road = vertical ? G.rng.pick(G.city.roadsV) : G.rng.pick(G.city.roadsH);
    const along = G.rng.range(400, vertical ? 4200 : 6000);
    const off = G.rng.chance(0.5) ? 62 : -62;
    const x = vertical ? road + off : along;
    const y = vertical ? along : road + off;
    G.peds.push(makePed(G, x, y));
  }
}

// A gunshot or explosion within earshot sends every nearby ped running.
export function scarePeds(G, x, y, radius = 420) {
  for (const p of G.peds) {
    if (p.dead) continue;
    if (Math.hypot(p.x - x, p.y - y) < radius) {
      p.state = 'flee';
      p.fleeT = 2.5 + G.rng.range(0, 2);
      p.angle = angleTo(x, y, p.x, p.y);
      p.screamT = 0.8;
    }
  }
}

export function updatePeds(G, dt) {
  for (let i = G.peds.length - 1; i >= 0; i--) {
    const p = G.peds[i];
    if (p.dead) { G.peds.splice(i, 1); continue; }
    if (p.screamT > 0) p.screamT -= dt;
    if (p.state === 'flee') {
      p.fleeT -= dt;
      p.x += Math.cos(p.angle) * 150 * dt;
      p.y += Math.sin(p.angle) * 150 * dt;
      if (p.fleeT <= 0) p.state = 'walk';
    } else {
      // Wander: pick a sidewalk target, walk to it, idle a moment, repeat.
      if (!p.target || Math.hypot(p.x - p.target.x, p.y - p.target.y) < 24) {
        if (p.waitT > 0) { p.waitT -= dt; continue; }
        p.waitT = G.rng.range(0.5, 3);
        const vertical = G.rng.chance(0.5);
        const road = vertical ? G.rng.pick(G.city.roadsV) : G.rng.pick(G.city.roadsH);
        const along = G.rng.range(400, vertical ? 4200 : 6000);
        const off = G.rng.chance(0.5) ? 62 : -62;
        p.target = { x: vertical ? road + off : along, y: vertical ? along : road + off };
      }
      const want = angleTo(p.x, p.y, p.target.x, p.target.y);
      p.angle = want;
      p.x += Math.cos(want) * p.speed * dt;
      p.y += Math.sin(want) * p.speed * dt;
    }
    p.x = clamp(p.x, 300, 6300);
    p.y = clamp(p.y, 300, 4500);
    resolveBuildingCollision(G.city, p, 10);
    // A car ploughing through a ped: the ped goes down, the law notices.
    for (const c of G.cars) {
      if (c.dead || Math.abs(c.speed) < 60) continue;
      if (Math.hypot(c.x - p.x, c.y - p.y) < 26) {
        p.dead = true;
        G.stats.pedsHit++;
        if (c.role === 'player' || G.player.inCar && G.player.carId === c.id) {
          G.player.wanted = Math.min(5, G.player.wanted + 1);
          G.message = 'Pedestrian hit — wanted level up!';
          G.messageT = 2.5;
        }
        break;
      }
    }
  }
  // Keep the streets populated: recycle peds near the player.
  if (G.peds.length < 30) {
    const p = G.player;
    const vertical = G.rng.chance(0.5);
    const road = vertical ? G.rng.pick(G.city.roadsV) : G.rng.pick(G.city.roadsH);
    const x = vertical ? road + 62 : clamp(p.x + G.rng.range(-700, 700), 400, 6000);
    const y = vertical ? clamp(p.y + G.rng.range(-700, 700), 400, 4200) : road + 62;
    G.peds.push(makePed(G, x, y));
  }
}

export function nearestPed(G, x, y, maxD) {
  let best = null, bestD = maxD;
  for (const p of G.peds) {
    if (p.dead) continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}
