// The game's rules and state, with no drawing and no browser in it: the player on foot and in a
// car, traffic, pedestrians, police, the wanted system, combat, pickups, missions and the save.
// step() advances one fixed step and returns what happened as bit flags, so the caller can react
// without the world knowing about screens or sound.

import {
  BEST_KEY, CAR, PICKUPS, PISTOL, PLAYER, POLICE, ROADS_X, ROADS_Y, SAVE_KEY, STEP, TRAFFIC, PEDS, WANTED, WATER_Y, WORLD,
} from './config.js';
import { collideBuildings, collideCarBuildings, createCity, isOnRoad, nearestRoadX, nearestRoadY, randomRoadPoint } from './city.js';
import { createMissionState, currentObjectiveText, missionAt, missionIntro, missionReward, missionTitle, updateMission } from './missions.js';
import { pick, range } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_HIT = 1;
export const EVENT_PICKUP = 2;
export const EVENT_MISSION_DONE = 4;
export const EVENT_MISSION_FAIL = 8;
export const EVENT_BUSTED = 16;
export const EVENT_WASTED = 32;
export const EVENT_CRIME = 64;
export const EVENT_SHOT = 128;
export const EVENT_CAR_HIT = 256;

const CAR_COLORS = ['#c0392b', '#2980b9', '#7f8c8d', '#e67e22', '#16a085', '#8e44ad', '#2c3e50', '#bdc3c7', '#d35400', '#27ae60'];
const TAXI_COLOR = '#f2c94c';

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function createWorld(random) {
  const city = createCity(random);
  const mission = createMissionState();

  const state = {
    city,
    mission,
    player: { x: 1800, y: 1150, angle: -Math.PI / 2, health: PLAYER.health, money: 120, ammo: PISTOL.ammo, inCar: null, punchTimer: 0, shootTimer: 0, invulnerable: 0, bumpTimer: 0 },
    cars: [],
    peds: [],
    cops: [],
    rivals: [],
    bullets: [],
    particles: [],
    pickups: [],
    wanted: 0,
    wantedTimer: 0,
    clock: 17.2, // golden hour: the sun-soaked look
    elapsed: 0,
    kills: 0,
    carsStolen: 0,
    missionsDone: 0,
    bustedCount: 0,
    message: '',
    messageTimer: 0,
    rivalSpawned: false,
  };

  function showMessage(text, seconds) {
    state.message = text;
    state.messageTimer = seconds || 4;
  }

  function makeCar(x, y, angle, kind, color) {
    return { x, y, angle, speed: 0, health: CAR.health, kind, color: color || pick(random, CAR_COLORS), driver: kind === 'traffic', roadAxis: 'x', road: 0, lane: 0, dir: 1, turnTimer: range(random, 2, 6), stuck: 0, ramTimer: 0 };
  }

  function spawnTrafficCar() {
    const p = randomRoadPoint(random);
    const vertical = Math.abs(p.x - nearestRoadX(p.x)) < 1;
    const car = makeCar(p.x, p.y, vertical ? (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (random() < 0.5 ? 0 : Math.PI), 'traffic');
    car.roadAxis = vertical ? 'x' : 'y';
    car.road = vertical ? nearestRoadX(p.x) : nearestRoadY(p.y);
    car.lane = (random() < 0.5 ? -1 : 1) * 24;
    car.dir = random() < 0.5 ? 1 : -1;
    car.speed = range(random, TRAFFIC.minSpeed, TRAFFIC.maxSpeed);
    state.cars.push(car);
    return car;
  }

  function spawnParkedCar() {
    // Parked along a road edge, free to take (no witness, no wanted).
    const vertical = random() < 0.5;
    let x; let y; let angle;
    if (vertical) {
      x = pick(random, ROADS_X) + (random() < 0.5 ? -1 : 1) * (WORLD.roadWidth / 2 + 22);
      y = range(random, 300, WORLD.height - 400);
      angle = random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      x = range(random, 300, WORLD.width - 300);
      y = pick(random, ROADS_Y) + (random() < 0.5 ? -1 : 1) * (WORLD.roadWidth / 2 + 22);
      angle = random() < 0.5 ? 0 : Math.PI;
    }
    const car = makeCar(x, y, angle, 'parked');
    car.driver = false;
    state.cars.push(car);
    return car;
  }

  function spawnPed(x, y) {
    const vertical = random() < 0.5;
    const road = vertical ? nearestRoadX(x ?? pick(random, ROADS_X)) : nearestRoadY(y ?? pick(random, ROADS_Y));
    return {
      x: vertical ? road + (random() < 0.5 ? -1 : 1) * (WORLD.roadWidth / 2 + 8) : range(random, 200, WORLD.width - 200),
      y: vertical ? range(random, 200, WORLD.height - 400) : road + (random() < 0.5 ? -1 : 1) * (WORLD.roadWidth / 2 + 8),
      angle: random() * Math.PI * 2,
      speed: range(random, PEDS.minSpeed, PEDS.maxSpeed),
      color: pick(random, ['#e5534b', '#4fc3f7', '#9b59b6', '#e67e22', '#1abc9c', '#ecf0f1']),
      flee: 0,
      axis: vertical ? 'x' : 'y',
      dir: random() < 0.5 ? 1 : -1,
    };
  }

  function spawnPickup(kind, x, y) {
    state.pickups.push({ kind, x, y, bob: random() * Math.PI * 2 });
  }

  function scatterPickups() {
    for (let i = 0; i < PICKUPS.cash.count; i++) {
      const p = randomRoadPoint(random);
      spawnPickup('cash', p.x + range(random, -60, 60), p.y + range(random, -60, 60));
    }
    for (let i = 0; i < PICKUPS.health.count; i++) {
      const p = randomRoadPoint(random);
      spawnPickup('health', p.x + range(random, -60, 60), p.y + range(random, -60, 60));
    }
    for (let i = 0; i < PICKUPS.ammo.count; i++) {
      const p = randomRoadPoint(random);
      spawnPickup('ammo', p.x + range(random, -60, 60), p.y + range(random, -60, 60));
    }
  }

  function reset() {
    state.cars.length = 0;
    state.peds.length = 0;
    state.cops.length = 0;
    state.rivals.length = 0;
    state.bullets.length = 0;
    state.particles.length = 0;
    state.pickups.length = 0;
    const p = state.player;
    p.x = 1800; p.y = 1150; p.angle = -Math.PI / 2;
    p.health = PLAYER.health; p.money = 120; p.ammo = PISTOL.ammo;
    p.inCar = null; p.punchTimer = 0; p.shootTimer = 0; p.invulnerable = 0; p.bumpTimer = 0;
    state.wanted = 0;
    state.wantedTimer = 0;
    state.clock = 17.2;
    state.elapsed = 0;
    state.kills = 0;
    state.carsStolen = 0;
    state.missionsDone = 0;
    state.bustedCount = 0;
    state.rivalSpawned = false;
    mission.index = 0; mission.step = 0; mission.timer = 0; mission.defeated = 0;
    mission.done = false; mission.failed = false;
    for (let i = 0; i < TRAFFIC.count; i++) spawnTrafficCar();
    for (let i = 0; i < 10; i++) spawnParkedCar();
    // One taxi, one sports car near the start, for the first steal.
    const taxi = makeCar(1800, 1300, -Math.PI / 2, 'traffic', TAXI_COLOR);
    taxi.roadAxis = 'x'; taxi.road = 1800; taxi.lane = 24; taxi.dir = 1; taxi.speed = 150;
    state.cars.push(taxi);
    for (let i = 0; i < PEDS.count; i++) state.peds.push(spawnPed());
    scatterPickups();
    showMessage('Welcome to Solara Bay. Mission: ' + missionTitle(0) + ' — ' + missionIntro(0), 6);
  }

  function addWanted(stars) {
    if (state.wanted >= WANTED.maxStars) return;
    state.wanted = Math.min(WANTED.maxStars, state.wanted + stars);
    state.wantedTimer = 0;
  }

  function nearestCar(x, y, maxDist, kinds) {
    let best = null;
    let bestD = maxDist * maxDist;
    for (const car of state.cars) {
      if (kinds && !kinds.includes(car.kind)) continue;
      const d = dist2(x, y, car.x, car.y);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }

  function damagePlayer(amount) {
    const p = state.player;
    if (p.invulnerable > 0) return;
    p.health -= amount;
    p.invulnerable = 0.4;
    if (p.health <= 0) p.health = 0;
  }

  function burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = random() * Math.PI * 2;
      state.particles.push({ x, y, vx: Math.cos(a) * speed * (0.4 + random() * 0.8), vy: Math.sin(a) * speed * (0.4 + random() * 0.8), life: 0.5 + random() * 0.4, color });
    }
  }

  function stepTraffic(dt) {
    for (const car of state.cars) {
      if (car.kind !== 'traffic') continue;
      // Follow the road: stay in lane, turn at intersections sometimes.
      car.turnTimer -= dt;
      const onVertical = car.roadAxis === 'x';
      let targetSpeed = car.speed;
      // Car ahead in the same lane? Slow down.
      for (const other of state.cars) {
        if (other === car || other.kind === 'police') continue;
        const dx = other.x - car.x;
        const dy = other.y - car.y;
        const ahead = onVertical ? dy * car.dir : dx * car.dir;
        const side = onVertical ? Math.abs(dx) : Math.abs(dy);
        if (ahead > 0 && ahead < TRAFFIC.followGap && side < 40) targetSpeed = Math.min(targetSpeed, other.speed * 0.7);
      }
      car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 2);
      const fx = onVertical ? 0 : car.dir;
      const fy = onVertical ? car.dir : 0;
      car.x += fx * car.speed * dt;
      car.y += fy * car.speed * dt;
      car.angle = onVertical ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (car.dir > 0 ? 0 : Math.PI);
      // Snap to lane.
      if (onVertical) car.x += (car.road + car.lane - car.x) * Math.min(1, dt * 3);
      else car.y += (car.road + car.lane - car.y) * Math.min(1, dt * 3);
      // Turn at an intersection.
      const atCross = onVertical ? ROADS_Y.some((ry) => Math.abs(car.y - ry) < 6) : ROADS_X.some((rx) => Math.abs(car.x - rx) < 6);
      if (atCross && car.turnTimer <= 0 && random() < TRAFFIC.turnChance) {
        if (onVertical) {
          car.roadAxis = 'y';
          car.road = nearestRoadY(car.y);
          car.lane = (random() < 0.5 ? -1 : 1) * 24;
          car.dir = random() < 0.5 ? 1 : -1;
        } else {
          car.roadAxis = 'x';
          car.road = nearestRoadX(car.x);
          car.lane = (random() < 0.5 ? -1 : 1) * 24;
          car.dir = random() < 0.5 ? 1 : -1;
        }
        car.turnTimer = range(random, 3, 8);
      }
      // Reverse at the world edge.
      if (car.x < 120 || car.x > WORLD.width - 120 || car.y < 120 || car.y > WORLD.height - 420) car.dir *= -1;
      // Keep off buildings (traffic sticks to roads, but a turn can clip a corner).
      const fixed = collideCarBuildings(city, car.x, car.y, car.angle, CAR.length / 2, CAR.width / 2);
      car.x = fixed.x; car.y = fixed.y;
    }
  }

  function stepPeds(dt) {
    const p = state.player;
    for (const ped of state.peds) {
      if (ped.flee > 0) {
        ped.flee -= dt;
        const dx = ped.x - p.x;
        const dy = ped.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        ped.x += (dx / d) * 220 * dt;
        ped.y += (dy / d) * 220 * dt;
        ped.angle = Math.atan2(dy, dx);
      } else {
        const fx = ped.axis === 'x' ? 0 : ped.dir;
        const fy = ped.axis === 'x' ? ped.dir : 0;
        ped.x += fx * ped.speed * dt;
        ped.y += fy * ped.speed * dt;
        ped.angle = Math.atan2(fy, fx);
        const atCross = ped.axis === 'x' ? ROADS_Y.some((ry) => Math.abs(ped.y - ry) < 5) : ROADS_X.some((rx) => Math.abs(ped.x - rx) < 5);
        if (atCross && random() < 0.01) {
          ped.axis = ped.axis === 'x' ? 'y' : 'x';
          ped.dir = random() < 0.5 ? 1 : -1;
        }
        if (ped.x < 120 || ped.x > WORLD.width - 120 || ped.y < 120 || ped.y > WORLD.height - 420) ped.dir *= -1;
      }
      // A speeding car nearby scares pedestrians.
      const carNear = state.cars.some((car) => Math.abs(car.speed) > 200 && dist2(ped.x, ped.y, car.x, car.y) < 90 * 90);
      if (carNear) ped.flee = 1.2;
    }
  }

  function stepPolice(dt) {
    const p = state.player;
    const wantCars = state.wanted > 0 ? Math.min(state.wanted, POLICE.maxCars) : 0;
    let haveCars = state.cars.filter((c) => c.kind === 'police').length;
    while (haveCars < wantCars) {
      // Spawn on a road, a good distance from the player.
      let x; let y; let tries = 0;
      do {
        const spot = randomRoadPoint(random);
        x = spot.x; y = spot.y; tries += 1;
      } while (dist2(x, y, p.x, p.y) < POLICE.spawnDistance * POLICE.spawnDistance && tries < 12);
      const car = makeCar(x, y, 0, 'police', '#1c3a5e');
      car.speed = 0;
      state.cars.push(car);
      haveCars += 1;
    }
    // Extra police cars fade out once the heat is gone.
    if (state.wanted === 0) {
      state.cars = state.cars.filter((c) => c.kind !== 'police' || dist2(c.x, c.y, p.x, p.y) < 1400 * 1400);
    }
    for (const car of state.cars) {
      if (car.kind !== 'police') continue;
      const dx = p.x - car.x;
      const dy = p.y - car.y;
      const d = Math.hypot(dx, dy) || 1;
      const targetAngle = Math.atan2(dy, dx);
      let diff = targetAngle - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.angle += Math.max(-3.2 * dt, Math.min(3.2 * dt, diff));
      car.speed = Math.min(POLICE.carSpeed, car.speed + 420 * dt);
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      const fixed = collideCarBuildings(city, car.x, car.y, car.angle, CAR.length / 2, CAR.width / 2);
      if (fixed.x !== car.x || fixed.y !== car.y) car.speed *= 0.5;
      car.x = fixed.x; car.y = fixed.y;
      // Ram the player: a nudge with a cooldown, so a chase stays a chase and the
      // player can still outrun the patrol car instead of being pinned to a stop.
      car.ramTimer -= dt;
      if (car.ramTimer <= 0) {
        if (p.inCar) {
          if (dist2(car.x, car.y, p.inCar.x, p.inCar.y) < 46 * 46) {
            car.ramTimer = 1.0;
            p.inCar.speed *= 0.9;
            car.speed *= 0.7;
            p.inCar.health -= POLICE.ramDamage;
            burst(p.inCar.x, p.inCar.y, '#f2c94c', 3, 120);
          }
        } else if (dist2(car.x, car.y, p.x, p.y) < 40 * 40) {
          car.ramTimer = 1.0;
          damagePlayer(POLICE.ramDamage);
          burst(p.x, p.y, '#e5534b', 3, 120);
        }
      }
    }
    // On-foot cops at high wanted.
    const wantCops = state.wanted >= 3 ? Math.min(state.wanted - 1, 4) : 0;
    while (state.cops.length < wantCops) {
      const a = random() * Math.PI * 2;
      state.cops.push({ x: p.x + Math.cos(a) * 500, y: p.y + Math.sin(a) * 500, angle: 0, cooldown: 0, health: 50 });
    }
    if (state.wanted < 3) state.cops.length = 0;
    for (const cop of state.cops) {
      const dx = p.x - cop.x;
      const dy = p.y - cop.y;
      const d = Math.hypot(dx, dy) || 1;
      cop.angle = Math.atan2(dy, dx);
      if (d > 26) {
        cop.x += (dx / d) * POLICE.copSpeed * dt;
        cop.y += (dy / d) * POLICE.copSpeed * dt;
      }
      cop.cooldown -= dt;
      if (d < 30 && cop.cooldown <= 0) {
        cop.cooldown = POLICE.copCooldown;
        damagePlayer(POLICE.copDamage);
        burst(p.x, p.y, '#e5534b', 4, 100);
      }
      const fixed = collideBuildings(city, cop.x, cop.y, 14);
      cop.x = fixed.x; cop.y = fixed.y;
    }
  }

  function stepRivals(dt) {
    if (mission.index !== 3) return;
    const m = mission;
    if (m.step === 1 && !state.rivalSpawned) {
      state.rivalSpawned = true;
      for (let i = 0; i < 4; i++) {
        state.rivals.push({
          x: 3360 + range(random, -60, 60),
          y: 1800 + range(random, -60, 60),
          angle: 0, health: 60, cooldown: 0, speed: 170,
        });
      }
      showMessage('The Dock Rats are here. Deal with them!', 4);
    }
    const p = state.player;
    for (const rival of state.rivals) {
      const dx = p.x - rival.x;
      const dy = p.y - rival.y;
      const d = Math.hypot(dx, dy) || 1;
      rival.angle = Math.atan2(dy, dx);
      if (d > 30) {
        rival.x += (dx / d) * rival.speed * dt;
        rival.y += (dy / d) * rival.speed * dt;
      }
      rival.cooldown -= dt;
      if (d < 32 && rival.cooldown <= 0) {
        rival.cooldown = 0.9;
        damagePlayer(9);
        burst(p.x, p.y, '#e5534b', 4, 100);
      }
    }
  }

  function stepBullets(dt) {
    for (const b of state.bullets) {
      b.x += Math.cos(b.angle) * b.speed * dt;
      b.y += Math.sin(b.angle) * b.speed * dt;
      b.life -= dt;
      // Hit peds, cops, rivals.
      const targets = [...state.peds, ...state.cops, ...state.rivals];
      for (const t of targets) {
        if (dist2(b.x, b.y, t.x, t.y) < 20 * 20) {
          b.life = 0;
          burst(b.x, b.y, '#e5534b', 6, 140);
          if (state.rivals.includes(t)) {
            t.health -= PISTOL.damage;
            if (t.health <= 0) {
              state.rivals.splice(state.rivals.indexOf(t), 1);
              mission.defeated += 1;
              state.kills += 1;
              burst(t.x, t.y, '#e5534b', 12, 200);
            }
          } else if (state.cops.includes(t)) {
            t.health -= PISTOL.damage;
            if (t.health <= 0) {
              state.cops.splice(state.cops.indexOf(t), 1);
              addWanted(WANTED.killCop);
              state.kills += 1;
              burst(t.x, t.y, '#1c3a5e', 12, 200);
            }
          } else {
            // Shot a civilian: a crime.
            state.peds.splice(state.peds.indexOf(t), 1);
            addWanted(WANTED.shoot);
            burst(t.x, t.y, '#e5534b', 10, 180);
            if (state.peds.length < PEDS.count) state.peds.push(spawnPed());
          }
          break;
        }
      }
      // Hit cars.
      for (const car of state.cars) {
        if (b.life <= 0) break;
        if (dist2(b.x, b.y, car.x, car.y) < 34 * 34) {
          b.life = 0;
          car.health -= PISTOL.damage;
          burst(b.x, b.y, '#f2c94c', 5, 120);
          if (car.health <= 0) {
            burst(car.x, car.y, '#e5534b', 24, 260);
            state.cars.splice(state.cars.indexOf(car), 1);
            if (car.kind === 'traffic') spawnTrafficCar();
            if (car === state.player.inCar) state.player.inCar = null;
          }
          break;
        }
      }
      if (collideBuildings(city, b.x, b.y, 2).hit) b.life = 0;
    }
    state.bullets = state.bullets.filter((b) => b.life > 0);
  }

  function stepPlayerCar(dt, move) {
    const p = state.player;
    const car = p.inCar;
    if (!car) return;
    const steering = move.x;
    const throttle = -move.y; // up = gas
    const speedSign = car.speed >= 0 ? 1 : -1;
    if (throttle > 0) car.speed += CAR.accel * dt;
    else if (throttle < 0) {
      if (car.speed > 10) car.speed -= CAR.brake * dt;
      else car.speed -= CAR.reverseAccel * dt;
    } else {
      car.speed *= Math.pow(0.4, dt); // drag
    }
    car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
    const turn = steering * CAR.turnRate * (0.4 + 0.6 * Math.min(1, Math.abs(car.speed) / 300)) * speedSign;
    car.angle += turn * dt;
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    const fixed = collideCarBuildings(city, nx, ny, car.angle, CAR.length / 2, CAR.width / 2);
    if (fixed.x !== nx || fixed.y !== ny) {
      if (Math.abs(car.speed) > 260) {
        car.health -= 6;
        burst(car.x, car.y, '#f2c94c', 8, 160);
      }
      car.speed *= 0.45;
    }
    car.x = fixed.x;
    car.y = fixed.y;
    // The city ends at the water: never let the player's car leave the map.
    car.x = Math.max(60, Math.min(WORLD.width - 60, car.x));
    car.y = Math.max(60, Math.min(WATER_Y - 40, car.y));
    if (car.x === 60 || car.x === WORLD.width - 60 || car.y === 60 || car.y === WATER_Y - 40) car.speed *= 0.5;
    // Car vs car bumps. The positional push separates them every step, but the speed
    // and damage penalty fires at most every 0.25 s, so a car overlapped by another
    // can still accelerate away instead of being pinned to a stop.
    for (const other of state.cars) {
      if (other === car) continue;
      const d2 = dist2(car.x, car.y, other.x, other.y);
      if (d2 < 50 * 50 && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const push = (50 - d) / 2;
        const ux = (car.x - other.x) / d;
        const uy = (car.y - other.y) / d;
        if (other.kind === 'police') {
          // A patrol car bounces off the player's car instead of shoving it off the road.
          other.x -= ux * push * 2;
          other.y -= uy * push * 2;
        } else {
          car.x += ux * push; car.y += uy * push;
          other.x -= ux * push; other.y -= uy * push;
        }
        if (p.bumpTimer <= 0 && Math.abs(car.speed) > 200) {
          car.health -= 3;
          other.health -= 3;
          car.speed *= 0.85;
          p.bumpTimer = 0.25;
        }
      }
    }
    // Running over pedestrians.
    for (const ped of [...state.peds]) {
      if (dist2(car.x, car.y, ped.x, ped.y) < 34 * 34 && Math.abs(car.speed) > 120) {
        state.peds.splice(state.peds.indexOf(ped), 1);
        addWanted(WANTED.runOver);
        burst(ped.x, ped.y, '#e5534b', 10, 180);
        if (state.peds.length < PEDS.count) state.peds.push(spawnPed());
      }
    }
    if (car.health <= 0) {
      burst(car.x, car.y, '#e5534b', 30, 300);
      state.cars.splice(state.cars.indexOf(car), 1);
      p.inCar = null;
      p.x = car.x + 40;
      p.y = car.y;
      damagePlayer(15);
    }
    p.x = car.x; p.y = car.y; p.angle = car.angle;
    if (p.bumpTimer > 0) p.bumpTimer -= dt;
  }

  function stepPlayerOnFoot(dt, move, actions, mouseWorld) {
    const p = state.player;
    const speed = move.x !== 0 || move.y !== 0 ? 1 : 0;
    const spd = actions.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
    const nx = p.x + move.x * spd * dt;
    const ny = p.y + move.y * spd * dt;
    const fixed = collideBuildings(city, nx, ny, PLAYER.radius);
    p.x = Math.max(40, Math.min(WORLD.width - 40, fixed.x));
    p.y = Math.max(40, Math.min(WORLD.height - 320, fixed.y));
    if (speed) p.angle = Math.atan2(move.y, move.x);
    p.punchTimer -= dt;
    p.shootTimer -= dt;
    if (p.invulnerable > 0) p.invulnerable -= dt;

    // Enter / exit a car.
    if (actions.enter) {
      const car = nearestCar(p.x, p.y, 70, ['traffic', 'parked', 'police']);
      if (car && car.kind !== 'police') {
        if (car.kind === 'traffic' && car.driver) {
          car.driver = false;
          const driver = spawnPed(car.x + 30, car.y);
          driver.flee = 3;
          state.peds.push(driver);
          addWanted(WANTED.stealCar);
          state.carsStolen += 1;
          showMessage('Car stolen! The cops won\'t like that.', 3);
        }
        p.inCar = car;
        car.kind = 'player';
      }
    }
    // Punch.
    if (actions.punch && p.punchTimer <= 0) {
      p.punchTimer = PLAYER.punchCooldown;
      const hx = p.x + Math.cos(p.angle) * PLAYER.punchRange;
      const hy = p.y + Math.sin(p.angle) * PLAYER.punchRange;
      let hitAny = false;
      for (const list of [state.rivals, state.cops, state.peds]) {
        for (const t of [...list]) {
          if (dist2(hx, hy, t.x, t.y) < 30 * 30) {
            hitAny = true;
            if (list === state.rivals) {
              t.health -= PLAYER.punchDamage;
              if (t.health <= 0) {
                state.rivals.splice(state.rivals.indexOf(t), 1);
                mission.defeated += 1;
                state.kills += 1;
                burst(t.x, t.y, '#e5534b', 12, 200);
              }
            } else if (list === state.cops) {
              t.health -= PLAYER.punchDamage;
              if (t.health <= 0) {
                state.cops.splice(state.cops.indexOf(t), 1);
                addWanted(WANTED.killCop);
                state.kills += 1;
                burst(t.x, t.y, '#1c3a5e', 12, 200);
              }
            } else {
              state.peds.splice(state.peds.indexOf(t), 1);
              addWanted(WANTED.punchPed);
              burst(t.x, t.y, '#e5534b', 10, 180);
              if (state.peds.length < PEDS.count) state.peds.push(spawnPed());
            }
            break;
          }
        }
        if (hitAny) break;
      }
      burst(hx, hy, '#f2c94c', 3, 80);
    }
    // Shoot toward the mouse.
    if (actions.shoot && p.shootTimer <= 0 && p.ammo > 0) {
      p.shootTimer = PISTOL.cooldown;
      p.ammo -= 1;
      const angle = Math.atan2(mouseWorld.y - p.y, mouseWorld.x - p.x) + (random() - 0.5) * PISTOL.spread;
      state.bullets.push({ x: p.x + Math.cos(angle) * 22, y: p.y + Math.sin(angle) * 22, angle, speed: 900, life: PISTOL.range / 900 });
      p.angle = angle;
    }
    // Pickups.
    for (const pickup of [...state.pickups]) {
      if (dist2(p.x, p.y, pickup.x, pickup.y) < 30 * 30) {
        state.pickups.splice(state.pickups.indexOf(pickup), 1);
        if (pickup.kind === 'cash') { p.money += PICKUPS.cash.value; showMessage(`+$${PICKUPS.cash.value} found`, 2); }
        else if (pickup.kind === 'health') { p.health = Math.min(PLAYER.health, p.health + PICKUPS.health.heal); showMessage('Health +40', 2); }
        else if (pickup.kind === 'ammo') { p.ammo += PICKUPS.ammo.ammo; showMessage('Ammo +12', 2); }
        burst(pickup.x, pickup.y, '#7be495', 8, 120);
      }
    }
  }

  function stepWanted(dt) {
    if (state.wanted === 0) return;
    const p = state.player;
    const nearestPolice = state.cars.some((c) => c.kind === 'police' && dist2(c.x, c.y, p.x, p.y) < WANTED.decayDistance * WANTED.decayDistance)
      || state.cops.some((c) => dist2(c.x, c.y, p.x, p.y) < WANTED.decayDistance * WANTED.decayDistance);
    if (!nearestPolice) {
      state.wantedTimer += dt;
      if (state.wantedTimer >= WANTED.decaySeconds) {
        state.wanted -= 1;
        state.wantedTimer = 0;
        showMessage(state.wanted === 0 ? 'You lost the heat.' : `Wanted level dropped to ${state.wanted}.`, 3);
      }
    } else {
      state.wantedTimer = 0;
    }
  }

  /**
   * One fixed step. `input` is { move, actions, mouseWorld }. Returns event flags.
   * actions: { enter, punch, shoot, save, run } as booleans.
   */
  function step(dt, input) {
    let events = EVENT_NONE;
    state.elapsed += dt;
    state.clock = (state.clock + dt / 240) % 24; // a full day in 4 minutes of play
    if (state.messageTimer > 0) state.messageTimer -= dt;

    const p = state.player;
    if (p.inCar) {
      stepPlayerCar(dt, input.move);
      if (input.actions.enter) {
        // Get out of the car.
        const car = p.inCar;
        p.inCar = null;
        car.kind = 'parked';
        p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 40;
        p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 40;
        const fixed = collideBuildings(city, p.x, p.y, PLAYER.radius);
        p.x = fixed.x; p.y = fixed.y;
      }
    } else {
      stepPlayerOnFoot(dt, input.move, input.actions, input.mouseWorld);
    }
    if (p.invulnerable > 0 && !p.inCar) p.invulnerable -= dt;

    stepTraffic(dt);
    stepPeds(dt);
    stepPolice(dt);
    stepRivals(dt);
    stepBullets(dt);
    stepWanted(dt);

    // Particles.
    for (const pt of state.particles) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
    }
    state.particles = state.particles.filter((pt) => pt.life > 0);

    // Mission progress.
    if (mission.index < 5) {
      const api = { x: p.x, y: p.y, driving: !!p.inCar, wanted: state.wanted };
      const result = updateMission(mission, api, dt);
      if (result === 'complete') {
        const reward = missionReward(mission.index);
        p.money += reward;
        state.missionsDone += 1;
        events |= EVENT_MISSION_DONE;
        const doneTitle = missionTitle(mission.index);
        mission.index += 1;
        mission.step = 0;
        mission.timer = 0;
        mission.defeated = 0;
        state.rivalSpawned = false;
        if (mission.index < 5) {
          showMessage(`Mission complete: ${doneTitle}! +$${reward}. Next: ${missionTitle(mission.index)} — ${missionIntro(mission.index)}`, 7);
        } else {
          showMessage(`Story complete! +$${reward}. Solara Bay is yours — free roam.`, 7);
        }
        saveGame();
      } else if (result === 'failed') {
        events |= EVENT_MISSION_FAIL;
        mission.failed = false;
        mission.step = 0;
        mission.timer = 0;
        showMessage(`Mission failed: ${missionTitle(mission.index)}. Try again — the marker is back.`, 5);
      }
    }

    // Busted / wasted.
    if (p.health <= 0) {
      state.bustedCount += 1;
      const wasWanted = state.wanted > 0;
      const lost = Math.floor(p.money * 0.1);
      p.money -= lost;
      p.health = PLAYER.health;
      p.x = city.landmarks.hospital.x;
      p.y = city.landmarks.hospital.y + 140;
      p.inCar = null;
      state.wanted = 0;
      state.cops.length = 0;
      state.cars = state.cars.filter((c) => c.kind !== 'police');
      events |= wasWanted ? EVENT_BUSTED : EVENT_WASTED;
      showMessage(`You woke up at Solara General. -$${lost} in hospital bills.`, 5);
      saveGame();
    }
    return events;
  }

  function saveGame() {
    try {
      const p = state.player;
      const data = {
        x: Math.round(p.x), y: Math.round(p.y), money: p.money, ammo: p.ammo,
        missionIndex: mission.index, missionsDone: state.missionsDone,
        carsStolen: state.carsStolen, kills: state.kills, clock: state.clock,
      };
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  function loadGame() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (typeof data.x !== 'number' || typeof data.money !== 'number') return null;
      return data;
    } catch {
      return null;
    }
  }

  function applySave(data) {
    const p = state.player;
    p.x = data.x; p.y = data.y; p.money = data.money; p.ammo = data.ammo || PISTOL.ammo;
    p.health = PLAYER.health;
    mission.index = Math.min(data.missionIndex || 0, 5);
    mission.step = 0; mission.timer = 0; mission.defeated = 0;
    state.missionsDone = data.missionsDone || 0;
    state.carsStolen = data.carsStolen || 0;
    state.kills = data.kills || 0;
    if (typeof data.clock === 'number') state.clock = data.clock;
    showMessage(`Welcome back. Mission: ${missionTitle(mission.index)} — ${missionIntro(mission.index)}`, 6);
  }

  function readBest() {
    try {
      return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
    } catch {
      return 0;
    }
  }

  function saveBest(value) {
    try {
      window.localStorage.setItem(BEST_KEY, String(value));
    } catch {
      // Storage can be off: the best then lasts this visit only.
    }
  }

  reset();
  return {
    state, reset, step, saveGame, loadGame, applySave, readBest, saveBest,
    showMessage,
    currentObjectiveText: () => currentObjectiveText(mission),
    missionTitle: () => missionTitle(mission.index),
    missionIntro: () => missionIntro(mission.index),
  };
}
