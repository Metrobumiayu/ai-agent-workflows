// Vice Bay — staged screenshot scenes (?shot=chase|marina|neon|finale&seed=N).
// One job: set the live game to a deterministic, busy frame — real entities,
// real HUD, real minimap — so each screenshot is what a short game really looks
// like. The same seed always gives the same frame.
import { makeCar } from './vehicles.js';
import { makePed } from './pedestrians.js';
import { makeEnemy } from './combat.js';
import { burst, smoke } from './particles.js';

function clearWorld(G) {
  G.cars.length = 0;
  G.peds.length = 0;
  G.enemies.length = 0;
  G.footCops.length = 0;
  G.barrels.length = 0;
  G.particles.length = 0;
  G.floaters.length = 0;
  G.heli.active = false;
  G.mission = null;
  G.taxi = { active: false, phase: 'pickup', spawnT: 8, timer: 0, ped: null, dest: null };
  G.race = { active: false, gates: [], i: 0, timer: 0 };
}

function playerInCar(G, type, x, y, angle, speed, color) {
  const car = makeCar(G, type, x, y, angle, 'player');
  if (color) car.color = color;
  car.speed = speed;
  G.cars.push(car);
  const p = G.player;
  p.inCar = true;
  p.carId = car.id;
  p.x = x; p.y = y; p.angle = angle;
  return car;
}

function trafficRow(G, list) {
  for (const [type, x, y, angle, speed] of list) {
    const c = makeCar(G, type, x, y, angle, 'traffic');
    c.speed = speed;
    c.targetSpeed = speed;
    G.cars.push(c);
  }
}

function pedRow(G, list) {
  for (const [x, y] of list) G.peds.push(makePed(G, x, y));
}

function policeChase(G, spots) {
  for (const [x, y, angle] of spots) {
    const c = makeCar(G, 'police', x, y, angle, 'police');
    c.speed = 420;
    c.targetSpeed = 500;
    G.cars.push(c);
  }
}

export function stageShot(name, G) {
  const p = G.player;
  p.dead = false;
  p.hp = 100;
  p.armor = 50;
  p.money = 12500;
  p.weapon = 'smg';
  p.ammo = { pistol: 48, shotgun: 24, smg: 120, rifle: 30 };
  p.rep = 320;
  G.missionsCompleted = 11;
  G.nextMission = 12;
  G.state = 'play';
  G.message = '';
  G.messageT = 0;
  G.banner = '';
  G.bannerT = 0;
  G.shopOpen = null;
  G.briefing = null;
  clearWorld(G);

  if (name === 'marina') {
    // Shot 2: on foot on the Vice Beach sand at dusk — ocean, lighthouse, marina
    // piers, boardwalk peds and traffic on the beach road.
    G.clock.hours = 18; G.clock.minutes = 22; G.clock.day = 2;
    G.weather.rain = 0; G.weather.kind = 'clear'; G.weather.grip = 1;
    p.inCar = false; p.carId = 0;
    p.x = 600; p.y = 2200; p.angle = Math.PI / 2; p.aim = Math.PI / 2;
    p.wanted = 0;
    p.money = 1840;
    trafficRow(G, [
      ['sedan', 900, 2240, 0, 160], ['taxi', 900, 2380, Math.PI, 150], ['sports', 1500, 2240, 0, 200],
      ['van', 2100, 2380, Math.PI, 140], ['sedan', 2700, 2240, 0, 170], ['moto', 3300, 2240, 0, 260],
    ]);
    pedRow(G, [[470, 2180], [500, 2320], [380, 2350], [560, 2100], [420, 2450], [650, 2200], [360, 2180], [540, 2400], [700, 2350]]);
    const parked = makeCar(G, 'muscle', 900, 2320, 0, 'parked');
    G.cars.push(parked);
    const parked2 = makeCar(G, 'sedan', 900, 2100, Math.PI, 'parked');
    G.cars.push(parked2);
    G.marker = { x: 2250, y: 1250, label: "SAL'S BAR" };
    G.objectiveText = 'Free roam — find packages, take fares, start the next mission at Sal\'s Bar';
    G.prompt = '';
    return 'play';
  }

  if (name === 'neon') {
    // Shot 3: night rain on the Neon Strip — neon casino, wet roads, 2 stars.
    G.clock.hours = 22; G.clock.minutes = 14; G.clock.day = 3;
    G.weather.rain = 1; G.weather.kind = 'rain'; G.weather.grip = 0.85;
    playerInCar(G, 'muscle', 4500, 1050, 0, 300, '#8e44ad');
    p.wanted = 2;
    p.money = 6420;
    policeChase(G, [[4200, 1050, 0], [4800, 1150, Math.PI]]);
    trafficRow(G, [
      ['sedan', 4500, 800, Math.PI, 150], ['taxi', 3900, 1050, 0, 160], ['sports', 5100, 1050, Math.PI, 220],
      ['van', 4500, 1300, 0, 130], ['limo', 3900, 800, 0, 120],
    ]);
    pedRow(G, [[4400, 900], [4600, 950], [4350, 1200], [4700, 1150], [4450, 700]]);
    G.footCops.push({ x: 4300, y: 1100, hp: 50, angle: 0, shootCd: 1, speed: 150 });
    G.marker = { x: 600, y: 2200, label: 'BEACH EXTRACTION' };
    G.objectiveText = 'Casino Royale Heist — escape to the beach extraction!';
    G.prompt = '';
    return 'play';
  }

  if (name === 'finale') {
    // Shot 4: the finale getaway — 5 stars, helicopter, roadblock, explosion.
    G.clock.hours = 12; G.clock.minutes = 5; G.clock.day = 4;
    G.weather.rain = 0; G.weather.kind = 'clear'; G.weather.grip = 1;
    playerInCar(G, 'sports', 3000, 1300, 0, 420, '#e74c3c');
    p.wanted = 5;
    p.money = 21400;
    p.hp = 64;
    policeChase(G, [[2750, 1300, 0], [2850, 1420, 0], [3300, 1050, Math.PI / 2]]);
    trafficRow(G, [
      ['sedan', 3350, 1300, 0, 180], ['truck', 2400, 1300, 0, 120], ['taxi', 3000, 1550, Math.PI, 150],
      ['bus', 3900, 1300, Math.PI, 110], ['moto', 3150, 1050, 0, 280], ['van', 3600, 1550, Math.PI, 140],
    ]);
    pedRow(G, [[2800, 1150], [3200, 1150], [2900, 1450], [3400, 1450]]);
    G.heli.active = true;
    G.heli.x = 3150; G.heli.y = 1150; G.heli.rotor = 1.2; G.heli.beam = true;
    // A Viper car blowing up right behind the player, plus a second blast.
    const wreck = makeCar(G, 'muscle', 2620, 1300, 0.4, 'rival');
    wreck.hp = 0; wreck.dead = true; wreck.color = '#8e44ad';
    G.cars.push(wreck);
    burst(G, 2620, 1300, 30, '#ff9f1c', 260, 0.6, 9);
    burst(G, 2620, 1300, 18, '#ff3838', 180, 0.8, 11);
    burst(G, 2620, 1300, 14, '#ffd166', 340, 0.35, 5);
    smoke(G, 2620, 1300, 12);
    burst(G, 2400, 1420, 20, '#ff9f1c', 220, 0.6, 8);
    smoke(G, 2400, 1420, 8);
    smoke(G, 2960, 1300, 4);
    G.enemies.push(makeEnemy(G, 2800, 1450, 'rifle', 70));
    G.enemies.push(makeEnemy(G, 3200, 1150, 'smg', 60));
    G.marker = { x: 600, y: 1000, label: 'THE BOAT' };
    G.objectiveText = 'King of Vice Bay — escape to the marina boat! 5 STARS!';
    G.prompt = '';
    return 'play';
  }

  // Shot 1 (default, cover): downtown chase — player sports car, 3 police close
  // behind, heli, 4 stars, mission objective, traffic, peds, minimap full of blips.
  G.clock.hours = 10; G.clock.minutes = 42; G.clock.day = 2;
  G.weather.rain = 0; G.weather.kind = 'clear'; G.weather.grip = 1;
  playerInCar(G, 'sports', 3000, 1300, 0, 380, '#e74c3c');
  p.wanted = 4;
  p.money = 12500;
  p.hp = 82;
  policeChase(G, [[2750, 1300, 0], [2850, 1420, 0], [3300, 1050, Math.PI / 2]]);
  trafficRow(G, [
    ['sedan', 3350, 1300, 0, 180], ['taxi', 3000, 1550, Math.PI, 160], ['truck', 3900, 1300, Math.PI, 120],
    ['van', 3600, 1550, Math.PI, 140], ['bus', 2400, 1300, 0, 110], ['moto', 3150, 1050, 0, 280],
    ['limo', 4200, 1300, Math.PI, 130],
  ]);
  pedRow(G, [[2800, 1150], [3200, 1150], [2900, 1450], [3400, 1450], [3000, 1150], [2700, 1450]]);
  smoke(G, 2960, 1300, 5);
  smoke(G, 2920, 1300, 3);
  G.heli.active = true;
  G.heli.x = 3200; G.heli.y = 1150; G.heli.rotor = 0.6; G.heli.beam = false;
  G.enemies.push(makeEnemy(G, 2800, 1450, 'pistol', 50));
  G.marker = { x: 2350, y: 3050, label: 'SAFEHOUSE' };
  G.objectiveText = 'Bank Job: Harbor Trust — escape to the safehouse, lose the cops!';
  G.prompt = '';
  return 'play';
}
