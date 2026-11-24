// Vice Bay — the story. One job: 16 missions in 3 acts for Rook Calloway, fresh out
// of prison and back in Vice Bay, working off a debt to Sal "The Shark" and taking
// the city back from the Vipers. Each mission is a small stage machine: start(),
// then update() returns 'active', 'done' or 'fail'. Shared helpers below keep
// every mission honest: go-to markers, holds, chases, tails, races and shootouts.
import { makeCar, carById } from './vehicles.js';
import { makeEnemy } from './combat.js';
import { spawnBarrels } from './combat.js';
import { addWanted } from './police.js';
import { addFloater } from './particles.js';
import { clamp } from './rng.js';

function P(G) {
  if (G.player.inCar) { const c = carById(G, G.player.carId); if (c) return { x: c.x, y: c.y }; }
  return { x: G.player.x, y: G.player.y };
}
function near(G, x, y, r) { const p = P(G); return Math.hypot(p.x - x, p.y - y) < r; }
function setMark(G, x, y, label) { G.marker = { x, y, label }; }
function setObj(G, text) { G.objectiveText = text; }
function playerCar(G) { return G.player.inCar ? carById(G, G.player.carId) : null; }

function rivalCar(G, type, x, y) {
  const c = makeCar(G, type, x, y, 0, 'rival');
  c.targetSpeed = 300;
  c.wp = 0;
  G.cars.push(c);
  return c;
}
// Drive a rival along waypoints; returns true when it reaches the last one.
function driveWaypoints(G, car, wps, speed, dt) {
  if (car.wp >= wps.length) return true;
  const wp = wps[car.wp];
  const d = Math.hypot(wp.x - car.x, wp.y - car.y);
  if (d < 70) { car.wp++; return car.wp >= wps.length; }
  const want = Math.atan2(wp.y - car.y, wp.x - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.angle += clamp(diff, -2.6 * dt, 2.6 * dt);
  car.speed = Math.min(speed, car.speed + 300 * dt);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  return false;
}

const BAR = { x: 2250, y: 1250 };
const BANK = { x: 2900, y: 1000 };
const CASINO = { x: 4500, y: 800 };
const MARINA = { x: 600, y: 1000 };
const TOWER = { x: 2400, y: 550 };
const DOCKS = { x: 3600, y: 2050 };
const PLAZA = { x: 2700, y: 3550 };
const RACE_START = { x: 5750, y: 3050 };

export const MISSIONS = [
  {
    id: 1, act: 1, name: 'Homecoming', reward: 200, rep: 20,
    brief: "Rook's back in Vice Bay after three years inside. Sal owns his debt — and his first job. Steal any car and get to Sal's Bar.",
    startAt: BAR,
    start(G) { setObj(G, 'Steal a car and drive to Sal\'s Bar'); setMark(G, BAR.x, BAR.y, "SAL'S BAR"); },
    update(G, dt) {
      if (G.player.inCar && near(G, BAR.x, BAR.y, 90)) return 'done';
      if (!G.player.inCar) setObj(G, 'Steal a car (walk up to one, press E)');
      else setObj(G, "Drive to Sal's Bar");
      return 'active';
    },
  },
  {
    id: 2, act: 1, name: 'Cab Fare', reward: 350, rep: 20,
    brief: "Sal needs wheels with a cover. Grab the yellow taxi by the stand and run three fares — the meter is running.",
    startAt: { x: 2350, y: 950 },
    start(G) {
      G.mission.data.fare = 0;
      G.mission.data.spots = [{ x: 3300, y: 800, dx: 5100, dy: 800 }, { x: 1500, y: 2300, dx: 3900, dy: 3300 }, { x: 4500, y: 1800, dx: 900, dy: 3800 }];
      G.mission.data.phase = 'pickup';
      G.mission.data.timer = 75;
      setMark(G, 2350, 950, 'TAXI');
      setObj(G, 'Get in the taxi at the stand');
    },
    update(G, dt) {
      const d = G.mission.data;
      const pc = playerCar(G);
      const inTaxi = pc && pc.type === 'taxi';
      if (d.phase === 'pickup') {
        if (!inTaxi) { setObj(G, 'Get in the taxi at the stand'); setMark(G, 2350, 950, 'TAXI'); return 'active'; }
        const s = d.spots[d.fare];
        setMark(G, s.x, s.y, 'FARE');
        setObj(G, `Pick up fare ${d.fare + 1}/3 — ${Math.ceil(d.timer)}s`);
        d.timer -= dt;
        if (d.timer <= 0) return 'fail';
        if (near(G, s.x, s.y, 80)) { d.phase = 'drop'; d.timer = 75; G.message = 'Fare aboard — drive!'; G.messageT = 2; G.audio.sfx('pickup'); }
        return 'active';
      }
      const s = d.spots[d.fare];
      setMark(G, s.dx, s.dy, 'DROP-OFF');
      setObj(G, `Drop fare ${d.fare + 1}/3 — ${Math.ceil(d.timer)}s`);
      d.timer -= dt;
      if (d.timer <= 0) return 'fail';
      if (near(G, s.dx, s.dy, 80)) {
        G.player.money += 80;
        addFloater(G, s.dx, s.dy, '+$80', '#7ee081');
        d.fare++;
        if (d.fare >= 3) return 'done';
        d.phase = 'pickup'; d.timer = 75;
      }
      return 'active';
    },
  },
  {
    id: 3, act: 1, name: 'First Blood Race', reward: 500, rep: 30,
    brief: 'The Vipers race for pink slips on the East End strip. Beat Dante and Mira to the finish — four checkpoints, no shortcuts.',
    startAt: RACE_START,
    start(G) {
      const cps = [{ x: 5750, y: 3800 }, { x: 4500, y: 3800 }, { x: 4500, y: 2800 }, { x: 5750, y: 2800 }, { x: 5750, y: 3050 }];
      G.mission.data.cps = cps;
      G.mission.data.cp = 0;
      G.mission.data.rivals = [rivalCar(G, 'sports', 5680, 3050), rivalCar(G, 'muscle', 5680, 3120)];
      G.mission.data.rivalDone = false;
      setMark(G, cps[0].x, cps[0].y, 'CHECKPOINT 1/5');
      setObj(G, 'Race! Hit every checkpoint before the rivals');
    },
    update(G, dt) {
      const d = G.mission.data;
      if (d.rivalDone) return 'fail';
      for (const r of d.rivals) {
        if (driveWaypoints(G, r, d.cps, 330, dt)) { d.rivalDone = true; }
      }
      if (d.cp < d.cps.length && near(G, d.cps[d.cp].x, d.cps[d.cp].y, 90)) {
        d.cp++;
        G.audio.sfx('pickup');
        if (d.cp >= d.cps.length) { for (const r of d.rivals) { r.role = 'traffic'; r.targetSpeed = 200; } return 'done'; }
        setMark(G, d.cps[d.cp].x, d.cps[d.cp].y, `CHECKPOINT ${d.cp + 1}/5`);
      }
      setObj(G, `Checkpoint ${Math.min(d.cp + 1, 5)}/5 — beat the rivals`);
      return 'active';
    },
  },
  {
    id: 4, act: 1, name: 'Package Run', reward: 400, rep: 25,
    brief: "Sal's product moves tonight. Three drops across the city, 150 seconds, and don't scratch the merchandise — or the car.",
    startAt: BAR,
    start(G) {
      G.mission.data.drops = [{ x: 900, y: 800 }, { x: 5100, y: 1300 }, { x: 3300, y: 3800 }];
      G.mission.data.i = 0;
      G.mission.data.timer = 150;
      setMark(G, 900, 800, 'DROP 1/3');
      setObj(G, 'Deliver the packages — 150s');
    },
    update(G, dt) {
      const d = G.mission.data;
      d.timer -= dt;
      if (d.timer <= 0) return 'fail';
      setObj(G, `Deliver package ${d.i + 1}/3 — ${Math.ceil(d.timer)}s`);
      if (near(G, d.drops[d.i].x, d.drops[d.i].y, 90)) {
        d.i++;
        G.audio.sfx('pickup');
        if (d.i >= 3) return 'done';
        setMark(G, d.drops[d.i].x, d.drops[d.i].y, `DROP ${d.i + 1}/3`);
      }
      return 'active';
    },
  },
  {
    id: 5, act: 1, name: 'The Shakedown', reward: 450, rep: 30,
    brief: 'Three deadbeats owe Sal. Go to Southside Plaza on foot, collect the money — fists or otherwise — then lose the heat.',
    startAt: PLAZA,
    start(G) {
      G.mission.data.debtors = [
        makeEnemy(G, 2600, 3450, 'fists', 40),
        makeEnemy(G, 2800, 3650, 'fists', 40),
        makeEnemy(G, 2500, 3650, 'pistol', 50),
      ];
      for (const e of G.mission.data.debtors) G.enemies.push(e);
      setMark(G, PLAZA.x, PLAZA.y, 'DEBTORS');
      setObj(G, 'Collect from all 3 debtors');
    },
    update(G, dt) {
      const d = G.mission.data;
      const left = d.debtors.filter((e) => e.hp > 0).length;
      setObj(G, `Debtors left: ${left} — then lose the cops`);
      if (left === 0) {
        if (G.player.wanted === 0) { G.player.money += 150; return 'done'; }
        setObj(G, 'Collected! Lose the wanted level');
        if (G.mission.data.heatSet !== true) { G.mission.data.heatSet = true; addWanted(G, 1, 'The debtors called the cops!'); }
        if (G.player.wanted === 0) { G.player.money += 150; return 'done'; }
      }
      return 'active';
    },
  },
  {
    id: 6, act: 2, name: 'Hot Wheels', reward: 600, rep: 35,
    brief: 'A Veyron-class sports car sits in a guarded lot by the Marina. Take it. The guards will object — briefly.',
    startAt: { x: 900, y: 800 },
    start(G) {
      const car = makeCar(G, 'sports', 900, 800, 0, 'mission');
      car.color = '#e74c3c';
      G.cars.push(car);
      G.mission.data.carId = car.id;
      for (const [x, y] of [[860, 760], [940, 760], [900, 860]]) G.enemies.push(makeEnemy(G, x, y, 'pistol', 50));
      setMark(G, 900, 800, 'SPORTS CAR');
      setObj(G, 'Steal the red sports car');
    },
    update(G, dt) {
      const d = G.mission.data;
      const pc = playerCar(G);
      if (pc && pc.id === d.carId) {
        if (!d.heat) { d.heat = true; addWanted(G, 2, 'Car stolen — 2 stars!'); }
        setObj(G, 'Lose the cops, then get to the garage');
        setMark(G, 1750, 2050, "DANTE'S");
        if (G.player.wanted === 0 && near(G, 1750, 2050, 110)) return 'done';
      } else {
        setObj(G, 'Steal the red sports car');
      }
      return 'active';
    },
  },
  {
    id: 7, act: 2, name: 'Bank Job: Harbor Trust', reward: 1200, rep: 50,
    brief: 'The Harbor Trust vault holds Sal’s retirement fund. Hold the vault for 8 seconds, then outrun a 3-star getaway to the safehouse.',
    startAt: BANK,
    start(G) {
      G.mission.data.hold = 0;
      G.mission.data.phase = 'enter';
      setMark(G, BANK.x, BANK.y, 'BANK');
      setObj(G, 'Get to Harbor Trust Bank');
    },
    update(G, dt) {
      const d = G.mission.data;
      if (d.phase === 'enter') {
        setObj(G, 'Get to Harbor Trust Bank');
        if (near(G, BANK.x, BANK.y, 110)) { d.phase = 'hold'; }
        return 'active';
      }
      if (d.phase === 'hold') {
        if (near(G, BANK.x, BANK.y, 110)) {
          d.hold += dt;
          setObj(G, `Cracking the vault… ${Math.ceil(8 - d.hold)}s — stay inside!`);
          if (d.hold >= 8) {
            d.phase = 'escape';
            G.player.money += 400;
            addWanted(G, 3, 'Bank alarm — 3 stars!');
            setMark(G, 2350, 3050, 'SAFEHOUSE');
            G.message = 'Vault open! Run!';
            G.messageT = 2;
          }
        } else { setObj(G, 'Get back to the vault!'); }
        return 'active';
      }
      setObj(G, 'Escape to the safehouse — lose the cops');
      if (G.player.wanted === 0 && near(G, 2350, 3050, 120)) return 'done';
      return 'active';
    },
  },
  {
    id: 8, act: 2, name: 'The Convoy', reward: 900, rep: 45,
    brief: 'An armored truck rolls payroll through the Docks. Ram it or shoot it till it stops, grab the cash, and vanish.',
    startAt: DOCKS,
    start(G) {
      const truck = makeCar(G, 'truck', 3300, 2050, 0, 'mission');
      truck.color = '#5d6d7e';
      truck.hp = 260; truck.maxHp = 260;
      G.cars.push(truck);
      G.mission.data.truckId = truck.id;
      G.mission.data.route = [{ x: 4500, y: 2050 }, { x: 4500, y: 2800 }, { x: 3300, y: 2800 }, { x: 3300, y: 2050 }];
      G.mission.data.wp = 0;
      G.mission.data.phase = 'stop';
      setMark(G, 3300, 2050, 'ARMORED TRUCK');
      setObj(G, 'Stop the armored truck — ram it or shoot it');
    },
    update(G, dt) {
      const d = G.mission.data;
      const truck = carById(G, d.truckId);
      if (!truck) return 'fail';
      if (d.phase === 'stop') {
        // The truck rolls its route until it is beaten down.
        const wp = d.route[d.wp];
        const dist = Math.hypot(wp.x - truck.x, wp.y - truck.y);
        if (dist < 80) d.wp = (d.wp + 1) % d.route.length;
        else {
          const want = Math.atan2(wp.y - truck.y, wp.x - truck.x);
          let diff = want - truck.angle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          truck.angle += clamp(diff, -2 * dt, 2 * dt);
          truck.speed = Math.min(180, truck.speed + 200 * dt);
          truck.x += Math.cos(truck.angle) * truck.speed * dt;
          truck.y += Math.sin(truck.angle) * truck.speed * dt;
        }
        // Ramming at speed hurts the truck a lot more than the rammer.
        const pc = playerCar(G);
        if (pc && Math.hypot(pc.x - truck.x, pc.y - truck.y) < 70 && Math.abs(pc.speed) > 220) {
          truck.hp -= 26 * dt;
          if (Math.random() < 0.1) G.audio.sfx('crash');
        }
        setMark(G, truck.x, truck.y, 'ARMORED TRUCK');
        setObj(G, `Stop the truck — HP ${Math.max(0, Math.ceil(truck.hp))}`);
        if (truck.hp <= 40) { d.phase = 'grab'; truck.speed = 0; truck.targetSpeed = 0; G.message = 'Truck stopped — grab the cash!'; G.messageT = 2.5; }
        return 'active';
      }
      setMark(G, truck.x, truck.y, 'GRAB THE CASH');
      setObj(G, 'Grab the cash from the truck, then lose the cops');
      if (near(G, truck.x, truck.y, 80)) {
        G.player.money += 500;
        addFloater(G, truck.x, truck.y, '+$500', '#7ee081');
        addWanted(G, 2, 'Truck robbery — 2 stars!');
        d.phase = 'escape';
      }
      if (d.phase === 'escape') {
        setObj(G, 'Lose the cops');
        if (G.player.wanted === 0) return 'done';
      }
      return 'active';
    },
  },
  {
    id: 9, act: 2, name: 'Drive-By Diplomacy', reward: 800, rep: 45,
    brief: 'The Vipers cruise Southside in force. Four of their cars — take them all out. Drive-by or on foot, your call.',
    startAt: { x: 2700, y: 3300 },
    start(G) {
      G.mission.data.cars = [];
      for (const [x, y] of [[2500, 3300], [2900, 3300], [2700, 3100], [3100, 3500]]) {
        const c = makeCar(G, 'muscle', x, y, 0, 'rival');
        c.color = '#8e44ad';
        c.wp = 0;
        G.cars.push(c);
        G.mission.data.cars.push(c.id);
      }
      G.mission.data.timer = 180;
      setObj(G, 'Destroy all 4 Viper cars');
    },
    update(G, dt) {
      const d = G.mission.data;
      d.timer -= dt;
      if (d.timer <= 0) return 'fail';
      const alive = d.cars.filter((id) => { const c = carById(G, id); return c && !c.dead; });
      // Viper cars try to run: they flee from the player.
      for (const id of alive) {
        const c = carById(G, id);
        const p = P(G);
        const away = Math.atan2(c.y - p.y, c.x - p.x);
        let diff = away - c.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        c.angle += clamp(diff, -2.4 * dt, 2.4 * dt);
        c.speed = Math.min(300, c.speed + 260 * dt);
        c.x += Math.cos(c.angle) * c.speed * dt;
        c.y += Math.sin(c.angle) * c.speed * dt;
      }
      setObj(G, `Viper cars left: ${alive.length} — ${Math.ceil(d.timer)}s`);
      if (alive.length > 0) setMark(G, carById(G, alive[0]).x, carById(G, alive[0]).y, 'VIPER');
      if (alive.length === 0) return 'done';
      return 'active';
    },
  },
  {
    id: 10, act: 2, name: 'The Informant', reward: 700, rep: 40,
    brief: 'A Viper informant drives a grey sedan to the meet. Tail him for 30 seconds — close enough to see, far enough to stay invisible.',
    startAt: { x: 3300, y: 1300 },
    start(G) {
      const car = makeCar(G, 'sedan', 3300, 1300, 0, 'rival');
      car.color = '#7f8c8d';
      car.wp = 0;
      G.cars.push(car);
      G.mission.data.carId = car.id;
      G.mission.data.route = [{ x: 4500, y: 1300 }, { x: 4500, y: 2300 }, { x: 3900, y: 2300 }, { x: 3900, y: 3300 }];
      G.mission.data.tail = 0;
      G.mission.data.exposed = 0;
      G.mission.data.phase = 'tail';
      setMark(G, 3300, 1300, 'INFORMANT');
      setObj(G, 'Tail the grey sedan — stay 120–380px away');
    },
    update(G, dt) {
      const d = G.mission.data;
      const car = carById(G, d.carId);
      if (!car || car.dead) return 'fail';
      if (d.phase === 'tail') {
        driveWaypoints(G, car, d.route, 200, dt);
        const dist = Math.hypot(P(G).x - car.x, P(G).y - car.y);
        if (dist > 120 && dist < 380) { d.tail += dt; d.exposed = 0; }
        else { d.exposed += dt; if (d.exposed > 3) return 'fail'; }
        setMark(G, car.x, car.y, 'INFORMANT');
        setObj(G, `Tailing… ${Math.ceil(30 - d.tail)}s — stay in the band`);
        if (d.tail >= 30) {
          d.phase = 'hit';
          car.speed = 0; car.targetSpeed = 0;
          const e = makeEnemy(G, car.x + 40, car.y, 'pistol', 60);
          G.enemies.push(e);
          G.mission.data.target = e;
          setMark(G, car.x, car.y, 'TAKE HIM OUT');
          setObj(G, 'He made the meet — take him out');
        }
        return 'active';
      }
      if (d.target.hp <= 0) return 'done';
      setObj(G, 'Take out the informant');
      return 'active';
    },
  },
  {
    id: 11, act: 2, name: 'Storm the Docks', reward: 1000, rep: 50,
    brief: 'The Vipers stash their guns at the port. Eight shooters, one Rook. The barrels are flammable — use them.',
    startAt: DOCKS,
    start(G) {
      const spots = [[3400, 1950], [3500, 2150], [3700, 1950], [3800, 2150], [3450, 2050], [3750, 2050], [3600, 1900], [3600, 2200]];
      G.mission.data.enemies = spots.map(([x, y]) => makeEnemy(G, x, y, 'smg', 60));
      for (const e of G.mission.data.enemies) G.enemies.push(e);
      spawnBarrels(G, 3600, 2050, 4);
      setMark(G, DOCKS.x, DOCKS.y, 'CLEAR THE DOCKS');
      setObj(G, 'Clear all 8 Vipers at the docks');
    },
    update(G, dt) {
      const d = G.mission.data;
      const left = d.enemies.filter((e) => e.hp > 0).length;
      setObj(G, `Vipers left: ${left}`);
      if (left === 0) return 'done';
      return 'active';
    },
  },
  {
    id: 12, act: 2, name: 'Getaway King', reward: 1100, rep: 55,
    brief: 'You hit the Viper stash house and the whole VCPD is coming. Four stars. Survive 90 seconds, then reach the Marina.',
    startAt: { x: 1500, y: 3300 },
    start(G) {
      addWanted(G, 4, '4 stars — survive!');
      G.mission.data.timer = 90;
      setMark(G, MARINA.x, MARINA.y, 'MARINA');
      setObj(G, 'Survive the chase — 90s');
    },
    update(G, dt) {
      const d = G.mission.data;
      d.timer -= dt;
      if (G.player.dead) return 'fail';
      if (d.timer > 0) { setObj(G, `Survive! ${Math.ceil(d.timer)}s — then reach the Marina`); return 'active'; }
      setObj(G, 'Reach the Marina!');
      setMark(G, MARINA.x, MARINA.y, 'MARINA');
      if (near(G, MARINA.x, MARINA.y, 110)) return 'done';
      return 'active';
    },
  },
  {
    id: 13, act: 3, name: 'The Fixer', reward: 900, rep: 45,
    brief: 'Three drops, two stars, 150 seconds. The city is watching — move fast and don’t stop for anyone.',
    startAt: BAR,
    start(G) {
      addWanted(G, 2, '2 stars — the Fixer run!');
      G.mission.data.drops = [{ x: 5700, y: 800 }, { x: 900, y: 3800 }, { x: 5100, y: 3800 }];
      G.mission.data.i = 0;
      G.mission.data.timer = 150;
      setMark(G, 5700, 800, 'DROP 1/3');
      setObj(G, 'Deliver 3 packages — 150s');
    },
    update(G, dt) {
      const d = G.mission.data;
      d.timer -= dt;
      if (d.timer <= 0) return 'fail';
      setObj(G, `Drop ${d.i + 1}/3 — ${Math.ceil(d.timer)}s`);
      if (near(G, d.drops[d.i].x, d.drops[d.i].y, 90)) {
        d.i++;
        G.audio.sfx('pickup');
        if (d.i >= 3) return 'done';
        setMark(G, d.drops[d.i].x, d.drops[d.i].y, `DROP ${d.i + 1}/3`);
      }
      return 'active';
    },
  },
  {
    id: 14, act: 3, name: 'Casino Royale Heist', reward: 2000, rep: 70,
    brief: 'The big one. Casino Royale’s vault, ten seconds on the floor, and a four-star escape with the helicopter on your tail. Beach extraction.',
    startAt: CASINO,
    start(G) {
      G.mission.data.phase = 'enter';
      G.mission.data.hold = 0;
      setMark(G, CASINO.x, CASINO.y, 'CASINO');
      setObj(G, 'Get inside Casino Royale');
    },
    update(G, dt) {
      const d = G.mission.data;
      if (d.phase === 'enter') {
        if (near(G, CASINO.x, CASINO.y, 120)) { d.phase = 'hold'; }
        return 'active';
      }
      if (d.phase === 'hold') {
        if (near(G, CASINO.x, CASINO.y, 120)) {
          d.hold += dt;
          setObj(G, `Vault… ${Math.ceil(10 - d.hold)}s`);
          if (d.hold >= 10) {
            d.phase = 'escape';
            G.player.money += 1000;
            addWanted(G, 4, 'Casino alarm — 4 stars + helicopter!');
            setMark(G, 600, 2200, 'BEACH EXTRACTION');
            G.message = 'Jackpot! Run to the beach!';
            G.messageT = 2.5;
          }
        } else setObj(G, 'Get back to the vault!');
        return 'active';
      }
      setObj(G, 'Escape to the beach extraction');
      if (near(G, 600, 2200, 120)) return 'done';
      return 'active';
    },
  },
  {
    id: 15, act: 3, name: 'The Betrayal', reward: 1500, rep: 60,
    brief: 'Dante sold the crew out to the Vipers. His yellow sports car is running the highway ring — stop it, then settle it on foot.',
    startAt: { x: 3300, y: 300 },
    start(G) {
      const car = makeCar(G, 'sports', 3300, 300, 0, 'rival');
      car.color = '#f1c40f';
      car.hp = 160; car.maxHp = 160;
      car.wp = 0;
      G.cars.push(car);
      G.mission.data.carId = car.id;
      G.mission.data.route = [{ x: 6100, y: 300 }, { x: 6100, y: 4300 }, { x: 300, y: 4300 }, { x: 300, y: 300 }, { x: 3300, y: 300 }];
      G.mission.data.phase = 'chase';
      setMark(G, 3300, 300, "DANTE'S CAR");
      setObj(G, "Chase Dante — stop his car");
    },
    update(G, dt) {
      const d = G.mission.data;
      const car = carById(G, d.carId);
      if (!car) return 'fail';
      if (d.phase === 'chase') {
        driveWaypoints(G, car, d.route, 380, dt);
        setMark(G, car.x, car.y, "DANTE'S CAR");
        setObj(G, `Stop Dante's car — HP ${Math.max(0, Math.ceil(car.hp))}`);
        // Ramming Dante hurts his car.
        const pc = playerCar(G);
        if (pc && Math.hypot(pc.x - car.x, pc.y - car.y) < 70 && Math.abs(pc.speed) > 220) car.hp -= 22 * dt;
        if (car.hp <= 30) {
          d.phase = 'confront';
          car.speed = 0; car.targetSpeed = 0;
          const e = makeEnemy(G, car.x + 50, car.y, 'smg', 90);
          e.name = 'Dante';
          G.enemies.push(e);
          d.target = e;
          setMark(G, car.x, car.y, 'DANTE');
          setObj(G, 'Settle it with Dante');
        }
        return 'active';
      }
      if (d.target.hp <= 0) return 'done';
      setObj(G, 'Settle it with Dante');
      return 'active';
    },
  },
  {
    id: 16, act: 3, name: 'King of Vice Bay', reward: 5000, rep: 100,
    brief: 'The finale. Race to Vice Tower, fight to the roof, take the Viper ledger, and escape a five-star storm to the marina boat. The city is yours.',
    startAt: TOWER,
    start(G) {
      G.mission.data.phase = 'race';
      G.mission.data.cps = [{ x: 2400, y: 550 }];
      G.mission.data.hold = 0;
      setMark(G, TOWER.x, TOWER.y, 'VICE TOWER');
      setObj(G, 'Race to Vice Tower');
    },
    update(G, dt) {
      const d = G.mission.data;
      if (d.phase === 'race') {
        if (near(G, TOWER.x, TOWER.y, 120)) {
          d.phase = 'fight';
          d.enemies = [];
          for (const [x, y] of [[2350, 500], [2450, 500], [2350, 620], [2450, 620], [2300, 550], [2500, 550]]) {
            const e = makeEnemy(G, x, y, 'rifle', 70);
            G.enemies.push(e);
            d.enemies.push(e);
          }
          spawnBarrels(G, 2400, 550, 3);
          setMark(G, TOWER.x, TOWER.y, 'ROOFTOP');
          setObj(G, 'Clear the rooftop');
        }
        return 'active';
      }
      if (d.phase === 'fight') {
        const left = d.enemies.filter((e) => e.hp > 0).length;
        setObj(G, `Rooftop Vipers left: ${left}`);
        if (left === 0) {
          d.phase = 'grab';
          G.mission.data.ledger = { x: 2400, y: 550 };
          setMark(G, 2400, 550, 'THE LEDGER');
          setObj(G, 'Grab the ledger');
        }
        return 'active';
      }
      if (d.phase === 'grab') {
        if (near(G, 2400, 550, 70)) {
          d.phase = 'escape';
          G.player.money += 2000;
          addWanted(G, 5, '5 STARS — the whole city is coming!');
          setMark(G, MARINA.x, MARINA.y, 'THE BOAT');
          setObj(G, 'Escape to the marina boat — 5 stars!');
          G.message = 'Ledger secured! RUN!';
          G.messageT = 3;
        }
        return 'active';
      }
      setObj(G, 'Reach the boat at the Marina!');
      if (near(G, MARINA.x, MARINA.y, 120)) return 'done';
      return 'active';
    },
  },
];

export function missionById(id) { return MISSIONS.find((m) => m.id === id) || null; }
export function actName(act) { return act === 1 ? 'ACT I — HOMECOMING' : act === 2 ? 'ACT II — THE TAKEOVER' : 'ACT III — THE KINGPIN'; }
