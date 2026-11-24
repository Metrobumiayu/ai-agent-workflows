// Vice Bay — the law. One job: the wanted system and everything it summons.
// Layers stack with the stars: 1★ patrol cars chase, 2★ foot cops join on foot,
// 3★ roadblocks appear ahead of the player, 4★ the helicopter with its searchlight,
// 5★ everything at once, faster. Lay low out of sight and the heat cools off.
import { makeCar, carById } from './vehicles.js';
import { clamp, angDiff, angleTo } from './rng.js';
import { roadAt } from './city.js';
import { hurtPlayer, burst } from './particles.js';

export function wantedCars(wanted) {
  return wanted <= 0 ? 0 : wanted === 1 ? 1 : wanted === 2 ? 2 : wanted === 3 ? 3 : wanted === 4 ? 4 : 5;
}

export function addWanted(G, n, reason) {
  const p = G.player;
  const before = p.wanted;
  p.wanted = clamp(p.wanted + n, 0, 5);
  if (p.wanted > before) {
    G.message = reason || `Wanted level ${p.wanted}!`;
    G.messageT = 2.5;
    G.audio.sfx('siren');
  }
  G.wantedTimer = 14;
}

// Pick a spawn point ~dist px from the player, inside the world, and actually
// that far away: naive cos/sin + clamp collapses to the player's own spot
// when the player is near a world edge, which made cops spawn on top of the
// player and the heat impossible to lose.
function spawnAway(G, dist) {
  const p = G.player;
  let best = { x: clamp(p.x + dist, 400, 6000), y: p.y };
  let bestD = -1;
  for (let i = 0; i < 8; i++) {
    const a = G.rng.range(0, Math.PI * 2);
    const x = clamp(p.x + Math.cos(a) * dist, 400, 6000);
    const y = clamp(p.y + Math.sin(a) * dist, 400, 4200);
    const d = Math.hypot(x - p.x, y - p.y);
    if (d > bestD) { bestD = d; best = { x, y }; }
    if (d >= dist * 0.85) break;
  }
  return best;
}

export function updatePolice(G, dt) {
  const p = G.player;
  if (p.dead) return;
  // Heat cools when no ground unit can see the player. (The helicopter alone
  // never pins the heat: at 4–5 stars it is always overhead, so counting it
  // would make the wanted level impossible to lose.)
  const anyNear = G.cars.some((c) => c.role === 'police' && !c.dead && Math.hypot(c.x - p.x, c.y - p.y) < 620)
    || G.footCops.some((f) => Math.hypot(f.x - p.x, f.y - p.y) < 320);
  if (p.wanted > 0 && !anyNear) {
    G.wantedTimer -= dt;
    if (G.wantedTimer <= 0) { p.wanted--; G.wantedTimer = 14; if (p.wanted === 0) { G.message = 'You lost the cops.'; G.messageT = 2; } }
  } else if (p.wanted > 0) {
    G.wantedTimer = 14;
  }

  // Spawn / despawn patrol cars to match the wanted level.
  const want = wantedCars(p.wanted);
  const have = G.cars.filter((c) => c.role === 'police' && !c.dead).length;
  if (have < want) {
    const angle = G.rng.range(0, Math.PI * 2);
    const s = spawnAway(G, 900);
    const c = makeCar(G, 'police', s.x, s.y, angleTo(s.x, s.y, p.x, p.y), 'police');
    c.targetSpeed = 480 + p.wanted * 14;
    c.sirenT = 0;
    G.cars.push(c);
  } else if (have > want) {
    const far = G.cars.filter((c) => c.role === 'police' && !c.dead).sort((a, b) => Math.hypot(b.x - p.x, b.y - p.y) - Math.hypot(a.x - p.x, a.y - p.y))[0];
    if (far && Math.hypot(far.x - p.x, far.y - p.y) > 1300) { far.dead = true; far.deadT = 0; }
  }

  // Patrol AI: chase the player, ram on foot, PIT the player's car.
  for (const c of G.cars) {
    if (c.role !== 'police' || c.dead) continue;
    const target = playerTarget(G);
    const want = angleTo(c.x, c.y, target.x, target.y);
    const diff = angDiff(c.angle, want);
    c.angle += clamp(diff, -3.4 * dt, 3.4 * dt);
    const distP = Math.hypot(target.x - c.x, target.y - c.y);
    c.speed = clamp(c.speed + (distP > 160 ? 420 : 180) * dt, 0, c.targetSpeed);
    c.x += Math.cos(c.angle) * c.speed * dt;
    c.y += Math.sin(c.angle) * c.speed * dt;
    c.sirenT -= dt;
    if (c.sirenT <= 0) { c.sirenT = 1.6; G.audio.sfx('siren'); }
    // Ram the player on foot.
    if (!p.inCar && distP < 34 && p.hurtCd <= 0) {
      hurtPlayer(G, 14);
      G.message = 'Run over by the VCPD!';
      G.messageT = 1.5;
    }
    // PIT: shove the player's car sideways.
    if (p.inCar) {
      const pc = carById(G, p.carId);
      if (pc && Math.hypot(pc.x - c.x, pc.y - c.y) < 52) {
        pc.speed *= 0.94;
        pc.angle += 0.35 * dt * (G.rng.chance(0.5) ? 1 : -1);
      }
    }
  }

  // Foot cops at 2★+ when the player is on foot. They spawn off-screen (900px)
  // and walk in — spawning them on top of the player would make the heat
  // impossible to lose, since their presence alone blocks the cool-off.
  if (p.wanted >= 2 && !p.inCar && G.footCops.length < p.wanted - 1) {
    const s = spawnAway(G, 900);
    G.footCops.push({ x: s.x, y: s.y, hp: 50, angle: 0, shootCd: 1.5, speed: 150 });
  }
  for (let i = G.footCops.length - 1; i >= 0; i--) {
    const f = G.footCops[i];
    if (p.wanted < 2 || p.inCar) { G.footCops.splice(i, 1); continue; }
    const d = Math.hypot(p.x - f.x, p.y - f.y);
    f.angle = angleTo(f.x, f.y, p.x, p.y);
    if (d > 60) { f.x += Math.cos(f.angle) * f.speed * dt; f.y += Math.sin(f.angle) * f.speed * dt; }
    f.shootCd -= dt;
    if (d < 380 && f.shootCd <= 0) {
      f.shootCd = 1.4;
      if (G.rng.chance(0.5)) { hurtPlayer(G, 8); burst(G, p.x, p.y, 3, '#ffd166', 90, 0.25, 3); G.audio.sfx('shot'); }
    }
    if (d < 26 && p.hurtCd <= 0) hurtPlayer(G, 10);
    if (f.hp <= 0) G.footCops.splice(i, 1);
  }

  // Roadblocks at 3★+: two patrol cars parked across the road ahead of the player.
  G.roadblockT -= dt;
  if (p.wanted >= 3 && G.roadblockT <= 0) {
    G.roadblockT = 22;
    const ahead = p.inCar ? carById(G, p.carId) : null;
    const dir = ahead ? ahead.angle : p.angle;
    const bx = p.x + Math.cos(dir) * 620;
    const by = p.y + Math.sin(dir) * 620;
    const road = roadAt(G.city, bx, by);
    if (road) {
      const perp = road.axis === 'v' ? 0 : Math.PI / 2;
      for (const off of [-46, 46]) {
        const c = makeCar(G, 'police', bx + Math.cos(perp) * off, by + Math.sin(perp) * off, perp, 'police');
        c.targetSpeed = 0;
        c.role = 'roadblock';
        G.cars.push(c);
      }
      G.message = 'Roadblock ahead!';
      G.messageT = 2.5;
    }
  }

  // Helicopter at 4★+: shadows the player, searchlight at night, never lands.
  const wantHeli = p.wanted >= 4;
  if (wantHeli && !G.heli.active) { G.heli.active = true; G.heli.x = p.x - 300; G.heli.y = p.y - 300; G.message = 'VCPD helicopter overhead!'; G.messageT = 2.5; }
  if (!wantHeli && G.heli.active && p.wanted < 3) G.heli.active = false;
  if (G.heli.active) {
    G.heli.rotor += dt * 22;
    const want = angleTo(G.heli.x, G.heli.y, p.x, p.y);
    G.heli.x += Math.cos(want) * 260 * dt;
    G.heli.y += Math.sin(want) * 260 * dt;
    G.heli.beam = Math.hypot(p.x - G.heli.x, p.y - G.heli.y) < 420;
  }
}

function playerTarget(G) {
  const p = G.player;
  if (p.inCar) {
    const pc = carById(G, p.carId);
    if (pc) return { x: pc.x, y: pc.y };
  }
  return { x: p.x, y: p.y };
}

export function bustedCheck(G) {
  // Busted: a foot cop reaches the player while the player is unarmed and slow, or hp hits 0 on foot.
  const p = G.player;
  if (p.dead) return p.inCar ? 'wasted' : 'busted';
  return null;
}
