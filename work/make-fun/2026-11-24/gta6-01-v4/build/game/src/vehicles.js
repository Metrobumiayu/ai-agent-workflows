// Vice Bay — vehicles. One job: everything with four wheels (or two): the factory,
// player driving physics with drift, traffic AI that follows the road grid and stops
// at red lights, car-vs-car and car-vs-building collisions, and spawning.
import { VEHICLES } from './config.js';
import { clamp, angDiff, angleTo } from './rng.js';
import { roadAt, resolveBuildingCollision } from './city.js';
import { damageCar, smoke, burst, addParticle } from './particles.js';

let NEXT_ID = 1;

export function makeCar(G, type, x, y, angle = 0, role = 'parked') {
  const def = VEHICLES[type];
  const car = {
    id: NEXT_ID++, type, x, y, angle, speed: 0, steer: 0,
    w: def.w, h: def.h, hp: def.hp, maxHp: def.hp,
    color: G.rng.pick(def.colors), role, targetSpeed: 0,
    driver: role === 'traffic' ? 'traffic' : null,
    dead: false, deadT: 0, smokeT: 0, honkT: 0, sirenT: 0,
    ai: { axis: 'h', dir: 1, wait: 0, turnAt: null },
    plated: false, repainted: null, nitro: 0,
  };
  return car;
}

export function spawnTraffic(G, n) {
  const types = ['sedan', 'sedan', 'taxi', 'truck', 'van', 'bus', 'muscle', 'sedan', 'sports'];
  for (let i = 0; i < n; i++) {
    const vertical = G.rng.chance(0.5);
    const road = vertical ? G.rng.pick(G.city.roadsV) : G.rng.pick(G.city.roadsH);
    const along = G.rng.range(400, vertical ? 4300 : 6000);
    const x = vertical ? road + (G.rng.chance(0.5) ? 24 : -24) : along;
    const y = vertical ? along : road + (G.rng.chance(0.5) ? 24 : -24);
    const angle = vertical ? (G.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : (G.rng.chance(0.5) ? 0 : Math.PI);
    const c = makeCar(G, G.rng.pick(types), x, y, angle, 'traffic');
    c.ai.axis = vertical ? 'v' : 'h';
    c.ai.dir = Math.cos(angle) > 0 || Math.sin(angle) > 0 ? 1 : -1;
    c.targetSpeed = G.rng.range(120, 220);
    G.cars.push(c);
  }
}

export function spawnParked(G, n) {
  for (let i = 0; i < n; i++) {
    const vertical = G.rng.chance(0.5);
    const road = vertical ? G.rng.pick(G.city.roadsV) : G.rng.pick(G.city.roadsH);
    const along = G.rng.range(500, vertical ? 4200 : 5900);
    const x = vertical ? road + 34 : along;
    const y = vertical ? along : road + 34;
    const angle = vertical ? Math.PI / 2 : 0;
    G.cars.push(makeCar(G, G.rng.pick(['sedan', 'sports', 'muscle', 'taxi', 'van', 'moto', 'limo']), x, y, angle, 'parked'));
  }
}

// The player's car: arcade physics — accel, brake/reverse, steering that bites
// harder at speed, handbrake drift with tire smoke, grip from the weather.
export function drivePlayerCar(G, car, dt, throttle, steer, handbrake) {
  const def = VEHICLES[car.type];
  const grip = G.weather.grip * (car.plated ? 1.02 : 1);
  if (throttle > 0) car.speed += def.accel * throttle * dt * (car.nitro > 0 ? 1.5 : 1);
  else if (throttle < 0) car.speed += (car.speed > 20 ? -def.accel * 1.4 : -def.accel * 0.7) * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 160 * dt);
  const max = def.max * (car.nitro > 0 ? 1.25 : 1);
  car.speed = clamp(car.speed, -140, max);
  if (car.nitro > 0) car.nitro -= dt;
  const turnAuthority = clamp(Math.abs(car.speed) / 120, 0.25, 1);
  car.angle += steer * def.turn * turnAuthority * dt * (car.speed >= 0 ? 1 : -1) * (handbrake ? 1.5 : 1);
  const slide = handbrake && Math.abs(car.speed) > 180 ? 0.35 : 0;
  const vx = Math.cos(car.angle) * car.speed;
  const vy = Math.sin(car.angle) * car.speed;
  car.x += vx * dt + (slide ? -Math.sin(car.angle) * car.speed * 0.12 * dt : 0);
  car.y += vy * dt + (slide ? Math.cos(car.angle) * car.speed * 0.12 * dt : 0);
  if (handbrake && Math.abs(car.speed) > 160) {
    car.smokeT -= dt;
    if (car.smokeT <= 0) { car.smokeT = 0.05; smoke(G, car.x - Math.cos(car.angle) * car.w / 2, car.y - Math.sin(car.angle) * car.w / 2, 2); }
  }
  if (car.hp < car.maxHp * 0.35) {
    car.smokeT -= dt;
    if (car.smokeT <= 0) { car.smokeT = 0.12; smoke(G, car.x, car.y, 1); }
  }
  car.x = clamp(car.x, 40, 6360);
  car.y = clamp(car.y, 40, 4560);
  if (resolveBuildingCollision(G.city, car, car.w * 0.42)) {
    if (Math.abs(car.speed) > 200) { damageCar(G, car, 8); G.shake = Math.min(14, G.shake + 4); G.audio.sfx('crash'); }
    car.speed *= 0.4;
  }
  G.playerCarSpeed = Math.abs(car.speed);
}

// Traffic: follow the road it is on, pick a new direction at intersections,
// stop at red lights, swerve around a slow car ahead, keep clear of the player.
export function updateTrafficCar(G, car, dt) {
  if (car.dead) return;
  const road = roadAt(G.city, car.x, car.y);
  if (!road) {
    // Drifted off-road (pushed): steer back toward the nearest road.
    const target = nearestRoadPoint(G.city, car.x, car.y);
    const want = angleTo(car.x, car.y, target.x, target.y);
    car.angle += clamp(angDiff(car.angle, want), -1.6 * dt, 1.6 * dt);
    car.speed = Math.min(car.speed + 120 * dt, 90);
  } else {
    car.ai.axis = road.axis;
    const light = lightAt(G, car.x, car.y);
    const mustStop = light && lightRedFor(G, light, road.axis);
    // Car ahead?
    const ahead = carAhead(G, car);
    if (mustStop || ahead) {
      car.speed = Math.max(0, car.speed - 500 * dt);
    } else {
      car.speed = Math.min(car.targetSpeed, car.speed + 200 * dt);
    }
    // At an intersection, sometimes turn.
    if (atIntersection(G.city, car.x, car.y) && car.ai.turnAt === null) {
      car.ai.turnAt = { x: car.x, y: car.y };
      if (G.rng.chance(0.35)) {
        const cur = road.axis === 'v' ? (Math.sin(car.angle) > 0 ? 1 : -1) : (Math.cos(car.angle) > 0 ? 1 : -1);
        const turn = G.rng.chance(0.5) ? 1 : -1;
        car.angle += turn * Math.PI / 2;
        car.ai.axis = road.axis === 'v' ? 'h' : 'v';
        void cur;
      }
    }
    if (car.ai.turnAt && Math.hypot(car.x - car.ai.turnAt.x, car.y - car.ai.turnAt.y) > 130) car.ai.turnAt = null;
  }
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  if (resolveBuildingCollision(G.city, car, car.w * 0.42)) car.speed *= 0.5;
  if (car.x < 200 || car.x > 6200 || car.y < 200 || car.y > 4400) {
    // Recycle far-away traffic back near the player so the streets stay alive.
    const p = G.player;
    const vertical = G.rng.chance(0.5);
    const road = vertical ? G.rng.pick(G.city.roadsV) : G.rng.pick(G.city.roadsH);
    car.x = vertical ? road : clamp(p.x + G.rng.range(-900, 900), 400, 6000);
    car.y = vertical ? clamp(p.y + G.rng.range(-900, 900), 400, 4200) : road;
    car.angle = vertical ? Math.PI / 2 : 0;
  }
}

function nearestRoadPoint(city, x, y) {
  let best = null, bestD = Infinity;
  for (const rx of city.roadsV) { const d = Math.abs(x - rx); if (d < bestD) { bestD = d; best = { x: rx, y }; } }
  for (const ry of city.roadsH) { const d = Math.abs(y - ry); if (d < bestD) { bestD = d; best = { x, y: ry }; } }
  return best;
}

function atIntersection(city, x, y) {
  const onV = city.roadsV.some((rx) => Math.abs(x - rx) < 60);
  const onH = city.roadsH.some((ry) => Math.abs(y - ry) < 60);
  return onV && onH;
}

function lightAt(G, x, y) {
  for (const l of G.city.lights) if (Math.hypot(l.x - x, l.y - y) < 130) return l;
  return null;
}

function lightRedFor(G, light, axis) {
  // ns green means vertical traffic goes; horizontal waits, and vice versa.
  return axis === 'v' ? !light.ns : light.ns;
}

function carAhead(G, car) {
  const ax = car.x + Math.cos(car.angle) * 70;
  const ay = car.y + Math.sin(car.angle) * 70;
  for (const o of G.cars) {
    if (o === car || o.dead) continue;
    if (Math.hypot(o.x - ax, o.y - ay) < 42) return true;
  }
  const p = G.player;
  if (p.inCar) {
    const pc = G.cars.find((c) => c.id === p.carId);
    if (pc && Math.hypot(pc.x - ax, pc.y - ay) < 46) return true;
  } else if (Math.hypot(p.x - ax, p.y - ay) < 30) return true;
  return false;
}

// Simple circle-vs-circle car collisions with a spark and a damage tap.
export function collideCars(G) {
  const cars = G.cars;
  for (let i = 0; i < cars.length; i++) {
    const a = cars[i];
    if (a.dead) continue;
    for (let j = i + 1; j < cars.length; j++) {
      const b = cars[j];
      if (b.dead) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const r = (a.w + b.w) / 2 * 0.82;
      const d2 = dx * dx + dy * dy;
      if (d2 >= r * r || d2 < 0.01) continue;
      const d = Math.sqrt(d2);
      const push = (r - d) / 2;
      const nx = dx / d, ny = dy / d;
      a.x -= nx * push; a.y -= ny * push;
      b.x += nx * push; b.y += ny * push;
      const impact = Math.abs(a.speed - b.speed);
      if (impact > 140) {
        damageCar(G, a, impact / 60);
        damageCar(G, b, impact / 60);
        burst(G, (a.x + b.x) / 2, (a.y + b.y) / 2, 5, '#ffd166', 120, 0.3, 3);
        G.audio.sfx('crash');
        const pa = G.player.inCar && G.player.carId === a.id;
        const pb = G.player.inCar && G.player.carId === b.id;
        if (pa || pb) G.shake = Math.min(12, G.shake + 4);
      }
      a.speed *= 0.82; b.speed *= 0.82;
    }
  }
}

export function carById(G, id) { return G.cars.find((c) => c.id === id) || null; }
export function nearestCar(G, x, y, maxD) {
  let best = null, bestD = maxD;
  for (const c of G.cars) {
    if (c.dead) continue;
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}
export function countCars(G) { return G.cars.filter((c) => !c.dead).length; }
