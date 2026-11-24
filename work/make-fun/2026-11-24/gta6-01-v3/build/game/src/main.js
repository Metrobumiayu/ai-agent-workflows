// SOLARA BAY — an original open-world crime game. Top-down 2D canvas, vanilla JS, no libraries,
// no network, no Rockstar content. City, traffic, pedestrians, car theft, wanted system with
// police cars, foot police, roadblocks and a helicopter, 10 story missions + a repeatable taxi
// side-job, an economy (gun store, garage, safehouse, armor), 5 vehicle types, traffic lights,
// rain weather, a day/night cycle, 2 synth radio stations, save/load, staged screenshots.
import { makeAudio } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const VW = 1280, VH = 720;
const WORLD_W = 4800, WORLD_H = 3600;
const ROAD = 400; // grid spacing
const audio = makeAudio();

// ---- utils ----
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rng = mulberry32(1337);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const TAU = Math.PI * 2;

// ---- districts ----
const DISTRICTS = [
  { name: 'DOWNTOWN', x: 1800, y: 1200, w: 1200, h: 1200, color: '#3a4a6b' },
  { name: 'SUBURBS', x: 200, y: 200, w: 4400, h: 800, color: '#4a6b3f' },
  { name: 'MARINA', x: 200, y: 1400, w: 700, h: 1200, color: '#2e6b7a' },
  { name: 'BEACH', x: 200, y: 2800, w: 1600, h: 600, color: '#c2a15a' },
  { name: 'AIRPORT', x: 3400, y: 2400, w: 1200, h: 1000, color: '#5a5a66' },
  { name: 'DOCKS', x: 3800, y: 800, w: 800, h: 1200, color: '#6b5a3f' },
];
function districtAt(x, y) {
  for (const d of DISTRICTS) if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.name;
  return 'SOLARA BAY';
}
function onRoad(x, y) {
  const mx = ((x % ROAD) + ROAD) % ROAD, my = ((y % ROAD) + ROAD) % ROAD;
  if (mx < 46 || mx > ROAD - 46 || my < 46 || my > ROAD - 46) return true;
  // highway ring road (rounded rectangle inset 220)
  if ((x > 220 && x < WORLD_W - 220 && (y < 290 || y > WORLD_H - 290)) || (y > 220 && y < WORLD_H - 220 && (x < 290 || x > WORLD_W - 290))) return true;
  return false;
}
function inWater(x, y) { return x < 300 && y > 1300 && y < 2800; } // marina bay water
function inBeach(x, y) { return y > 3100 && x < 1700 && x > 300; }

// ---- world gen (deterministic) ----
const buildings = [];
const trees = [];
const props = []; // {x,y,kind,color} benches, umbrellas, containers, cranes, planes, boats
const BUILD_COLORS = ['#8a7f8d', '#a08b74', '#7d8aa0', '#9a8f7a', '#6f7f8a', '#b09a7f', '#857a92', '#7a8a7a'];
for (let bx = 0; bx < WORLD_W / ROAD; bx++) for (let by = 0; by < WORLD_H / ROAD; by++) {
  const ox = bx * ROAD + 60, oy = by * ROAD + 60, s = ROAD - 120;
  const cx = ox + s / 2, cy = oy + s / 2;
  if (inWater(cx, cy) || inBeach(cx, cy)) continue;
  const d = districtAt(cx, cy);
  if (d === 'AIRPORT') continue; // runway + terminal handled as props
  if (d === 'DOCKS' && rng() < 0.45) { // container yard
    for (let i = 0; i < 5; i++) props.push({ x: ox + 20 + rng() * (s - 60), y: oy + 20 + rng() * (s - 60), kind: 'container', color: pick(['#b3543f', '#3f7ab3', '#4a9a5a', '#b3893f']) });
    continue;
  }
  const n = d === 'DOWNTOWN' ? 2 : (d === 'SUBURBS' ? 3 : 1);
  for (let i = 0; i < n; i++) {
    const w = d === 'DOWNTOWN' ? 90 + rng() * 90 : 60 + rng() * 70;
    const h = d === 'DOWNTOWN' ? 90 + rng() * 90 : 50 + rng() * 60;
    const x = ox + 10 + rng() * (s - w - 20), y = oy + 10 + rng() * (s - h - 20);
    const tall = d === 'DOWNTOWN' ? 3 + Math.floor(rng() * 6) : 1;
    buildings.push({ x, y, w, h, color: pick(BUILD_COLORS), tall, district: d });
  }
  if (rng() < 0.6) trees.push({ x: ox + rng() * s, y: oy + rng() * s });
  if (d === 'BEACH') for (let i = 0; i < 3; i++) props.push({ x: ox + rng() * s, y: oy + rng() * s, kind: 'umbrella', color: pick(['#e05a5a', '#f2c14e', '#4ea8f2']) });
}
// airport props: runway, terminal, parked planes
props.push({ x: 4000, y: 2900, kind: 'runway' });
props.push({ x: 3600, y: 2550, kind: 'terminal' });
props.push({ x: 3850, y: 2900, kind: 'plane', color: '#dfe6ee' });
props.push({ x: 4300, y: 3050, kind: 'plane', color: '#f2d98c' });
props.push({ x: 4100, y: 2650, kind: 'plane', color: '#9fc2e8' });
// marina props: docks + boats
for (let i = 0; i < 6; i++) props.push({ x: 320 + (i % 2) * 60, y: 1500 + i * 180, kind: 'boat', color: pick(['#e8e8e8', '#f2c14e', '#7ab3e8']) });
props.push({ x: 350, y: 2050, kind: 'pier' });
// docks cranes
props.push({ x: 4200, y: 1100, kind: 'crane', color: '#c96a2e' });
props.push({ x: 4400, y: 1700, kind: 'crane', color: '#c96a2e' });
// downtown landmark tower
buildings.push({ x: 1740, y: 2120, w: 160, h: 160, color: '#2e3a55', tall: 9, district: 'DOWNTOWN', landmark: 'SOLARA TOWER' });

// fixed locations
const LOC = {
  home: { x: 1000, y: 1000, name: "Mara's Place" },
  gunstore: { x: 2200, y: 1000, name: 'Gun Store' },
  garage: { x: 2600, y: 2600, name: 'Garage' },
  safehouse: { x: 600, y: 600, name: 'Safehouse' },
  bank: { x: 2400, y: 1800, name: 'Solara Bank' },
  docks: { x: 4200, y: 1400, name: 'The Docks' },
  airport: { x: 4000, y: 2900, name: 'Airport' },
  marina: { x: 500, y: 2100, name: 'Marina' },
  downtown: { x: 2400, y: 1800, name: 'Downtown' },
  raceStart: { x: 2400, y: 200, name: 'Race Start' },
};

// ---- game state ----
const S = {
  mode: 'start', // start | play | pause | busted | wasted
  time: 0, clock: 9 * 60, // minutes since midnight
  rain: 0, rainTimer: 45, weather: 'clear',
  money: 150, wanted: 0, wantedTimer: 0,
  player: { x: 1200, y: 800, angle: 0, hp: 100, armor: 0, speed: 0, inCar: null, weapon: 'pistol', ammo: { pistol: 24, shotgun: 0, smg: 0 }, owned: ['pistol'], onFoot: true },
  cam: { x: 1200, y: 800 },
  cars: [], peds: [], cops: [], bullets: [], particles: [], pickups: [], roadblocks: [],
  heli: null, heliTimer: 0,
  missionIdx: -1, mission: null, missionStep: 0, missionTimer: 0, missionData: {},
  taxi: { active: false, stage: 0, fare: null, done: 0 },
  safehouseOwned: false, respawn: { x: 1200, y: 800 },
  radio: false, station: 'OFF',
  stats: { carsStolen: 0, missionsDone: 0, shots: 0, cashEarned: 0 },
  errors: [], msg: '', msgTimer: 0, objective: 'Press ENTER to start',
  saveExists: false,
};
function say(t) { S.msg = t; S.msgTimer = 4; }

// ---- vehicles ----
const VEHICLES = {
  sedan: { len: 52, wid: 26, accel: 340, max: 420, grip: 0.92, hp: 100, color: '#c94f4f' },
  sports: { len: 54, wid: 25, accel: 520, max: 620, grip: 0.9, hp: 80, color: '#f2c14e' },
  taxi: { len: 52, wid: 26, accel: 360, max: 440, grip: 0.92, hp: 100, color: '#f2d13f' },
  truck: { len: 72, wid: 30, accel: 220, max: 300, grip: 0.95, hp: 200, color: '#5a7a9a' },
  bike: { len: 40, wid: 14, accel: 600, max: 660, grip: 0.86, hp: 50, color: '#3f9a6a' },
  police: { len: 54, wid: 26, accel: 480, max: 560, grip: 0.93, hp: 120, color: '#2a2f3a' },
};
const CAR_COLORS = ['#c94f4f', '#4e7ac2', '#e8e8e8', '#3f3f3f', '#7ab34e', '#b3549a', '#e88a3f', '#4ea8a0'];
let carId = 0;
function makeCar(type, x, y, angle, driver) {
  const v = VEHICLES[type];
  return { id: ++carId, type, x, y, angle: angle || 0, speed: 0, hp: v.hp, maxHp: v.hp, color: type === 'taxi' ? '#f2d13f' : (type === 'police' ? '#2a2f3a' : pick(CAR_COLORS)), driver: driver || 'traffic', stuck: 0, target: null, dead: false };
}
function randomRoadPoint() {
  for (let tries = 0; tries < 40; tries++) {
    const x = 300 + rng() * (WORLD_W - 600), y = 300 + rng() * (WORLD_H - 600);
    if (onRoad(x, y) && !inWater(x, y)) return { x, y };
  }
  return { x: 2400, y: 2000 };
}
function spawnTraffic() {
  S.cars = [];
  for (let i = 0; i < 30; i++) {
    const p = randomRoadPoint();
    const t = pick(['sedan', 'sedan', 'sports', 'taxi', 'truck', 'bike']);
    const c = makeCar(t, p.x, p.y, (Math.floor(rng() * 4)) * Math.PI / 2, 'traffic');
    c.speed = 120 + rng() * 120;
    S.cars.push(c);
  }
  for (let i = 0; i < 8; i++) { // parked cars
    const p = randomRoadPoint();
    const c = makeCar(pick(['sedan', 'sports', 'taxi', 'truck', 'bike']), p.x + (rng() * 60 - 30), p.y + (rng() * 60 - 30), (Math.floor(rng() * 4)) * Math.PI / 2, 'parked');
    S.cars.push(c);
  }
}
function spawnPeds() {
  S.peds = [];
  for (let i = 0; i < 40; i++) {
    const p = randomRoadPoint();
    S.peds.push({ x: p.x + (rng() * 80 - 40), y: p.y + (rng() * 80 - 40), angle: rng() * TAU, speed: 40 + rng() * 40, kind: rng() < 0.25 ? 'jogger' : 'walker', panic: 0, color: pick(['#e8b88a', '#8a6a4e', '#d98a7a', '#a88ac2', '#6aa88a']), hp: 30 });
  }
}
function spawnPickups() {
  S.pickups = [
    { x: 1500, y: 1400, kind: 'health' }, { x: 3000, y: 1000, kind: 'armor' },
    { x: 3400, y: 1800, kind: 'ammo' }, { x: 1200, y: 2600, kind: 'health' },
    { x: 4200, y: 2200, kind: 'ammo' }, { x: 2600, y: 600, kind: 'cash', amount: 150 },
    { x: 600, y: 1800, kind: 'cash', amount: 100 }, { x: 3800, y: 3200, kind: 'armor' },
  ];
}

// ---- input ----
const keys = {};
const mouse = { x: VW / 2, y: VH / 2, down: false };
let shotCooldown = 0;
window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault();
  audio.unlock();
  if (e.key === 'Enter' && S.mode === 'start') startGame();
  if (e.key.toLowerCase() === 'p' && (S.mode === 'play' || S.mode === 'pause')) { S.mode = S.mode === 'play' ? 'pause' : 'play'; audio.sfx.click(); }
  if (e.key.toLowerCase() === 'm' && S.mode === 'play') saveGame();
  if (e.key.toLowerCase() === 'r' && S.mode === 'play') { S.station = audio.radioToggle() || 'OFF'; S.radio = S.station !== 'OFF'; say(S.radio ? 'Radio: ' + S.station : 'Radio off'); if (S.radio) S.station = audio.stationName(); }
  if (e.key.toLowerCase() === 'e' && S.mode === 'play' && !e.repeat) { if (S.player.inCar) exitCar(); else interact(); }
  if (e.key.toLowerCase() === 'f' && S.mode === 'play') punch();
  if ((e.key === '1' || e.key === '2' || e.key === '3') && S.mode === 'play') switchWeapon(Number(e.key));
  if (e.key === 'Enter' && (S.mode === 'busted' || S.mode === 'wasted')) respawn();
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
canvas.addEventListener('mousemove', (e) => { const r = canvas.getBoundingClientRect(); mouse.x = (e.clientX - r.left) * VW / r.width; mouse.y = (e.clientY - r.top) * VH / r.height; });
canvas.addEventListener('mousedown', (e) => { mouse.down = true; audio.unlock(); if (S.mode === 'start') startGame(); });
canvas.addEventListener('mouseup', () => { mouse.down = false; });
window.addEventListener('error', (e) => { S.errors.push(String(e.message)); });

// ---- missions ----
const MISSIONS = [
  { id: 1, name: 'First Wheels', giver: 'Mara', desc: 'Steal any car and drive it to my place.', reward: 200, steps: [{ type: 'steal' }, { type: 'goto', loc: 'home', label: "Drive to Mara's Place" }] },
  { id: 2, name: 'Courier Run', giver: 'Mara', desc: 'Three drops, four minutes. Do not be late.', reward: 350, steps: [{ type: 'goto', loc: 'downtown', label: 'Drop 1: Downtown', timed: 240 }, { type: 'goto', loc: 'marina', label: 'Drop 2: Marina' }, { type: 'goto', loc: 'airport', label: 'Drop 3: Airport' }] },
  { id: 3, name: 'Heat Wave', giver: 'Drex', desc: 'The cops are hot. Survive 60 seconds at 2 stars.', reward: 400, steps: [{ type: 'survive', seconds: 60, wanted: 2, label: 'Survive the heat — 60s' }] },
  { id: 4, name: 'Payback at the Docks', giver: 'Drex', desc: 'Three of Rook’s crew wait at the docks. Deal with them.', reward: 500, steps: [{ type: 'goto', loc: 'docks', label: 'Go to the Docks' }, { type: 'fight', count: 3, label: 'Deal with Rook’s crew (0/3)' }, { type: 'goto', loc: 'home', label: 'Return to Mara' }] },
  { id: 5, name: 'Solara Grand Prix', giver: 'Vex', desc: 'Six checkpoints, three rivals, one winner. In a car!', reward: 800, steps: [{ type: 'race', label: 'Race! Hit every checkpoint' }] },
  { id: 6, name: 'The Big Score', giver: 'Mara', desc: 'Hold the vault 6 seconds, grab the cash, lose the cops.', reward: 1500, steps: [{ type: 'goto', loc: 'bank', label: 'Get to Solara Bank' }, { type: 'heist', seconds: 6, label: 'Hold the vault — grab the cash!' }, { type: 'goto', loc: 'safehouse', label: 'Getaway! Reach the Safehouse' }] },
  { id: 7, name: 'Taxi Nights', giver: 'Cab Co.', desc: 'Three fares around the bay. The meter is running.', reward: 450, steps: [{ type: 'taxi', count: 3, label: 'Taxi fares (0/3)' }] },
  { id: 8, name: 'Airport Run', giver: 'Vex', desc: 'A package for the 22:40 flight. Three minutes, no excuses.', reward: 600, steps: [{ type: 'goto', loc: 'airport', label: 'Deliver to the Airport', timed: 180 }] },
  { id: 9, name: 'Marina Nights', giver: 'Drex', desc: 'Five crates went overboard at the marina. Fish them out.', reward: 550, steps: [{ type: 'collect', count: 5, label: 'Collect floating crates (0/5)' }] },
  { id: 10, name: 'The Last Mile', giver: 'Mara', desc: 'Pick me up, cross downtown, and finish this — cops and all.', reward: 2500, steps: [{ type: 'goto', loc: 'home', label: 'Pick up Mara' }, { type: 'goto', loc: 'downtown', label: 'Cross Downtown' }, { type: 'survive', seconds: 45, wanted: 3, label: 'Lose the ambush — 45s' }, { type: 'goto', loc: 'marina', label: 'Reach the Marina — the end' }] },
];
const RACE_POINTS = [{ x: 2400, y: 200 }, { x: 4200, y: 600 }, { x: 4400, y: 2400 }, { x: 4000, y: 3200 }, { x: 1600, y: 3200 }, { x: 600, y: 1800 }, { x: 2400, y: 200 }];
function startMission(i) {
  S.missionIdx = i; S.mission = MISSIONS[i]; S.missionStep = 0; S.missionTimer = 0; S.missionData = {};
  const st = S.mission.steps[0];
  if (st.type === 'race') setupRace();
  if (st.type === 'fight') spawnThugs();
  if (st.type === 'collect') spawnCrates();
  if (st.type === 'taxi') startTaxiFare();
  if (st.type === 'survive') setWanted(st.wanted || 2);
  S.objective = S.mission.name + ': ' + stepLabel();
  say('Mission: ' + S.mission.name + ' — ' + S.mission.desc);
  audio.sfx.mission();
}
function stepLabel() {
  if (!S.mission) return 'Free roam — press M to save, find Mara (M) for missions';
  const st = S.mission.steps[S.missionStep];
  if (!st) return S.mission.name;
  if (st.type === 'fight') return `Deal with Rook's crew (${S.missionData.kills || 0}/${st.count})`;
  if (st.type === 'collect') return `Collect floating crates (${S.missionData.got || 0}/${st.count})`;
  if (st.type === 'taxi') return `Taxi fares (${S.missionData.fares || 0}/${st.count})`;
  if (st.type === 'race') return `Race! Checkpoint ${S.missionData.cp || 0}/${RACE_POINTS.length - 1}`;
  return st.label || st.type;
}
function advanceStep() {
  S.missionStep++;
  if (S.missionStep >= S.mission.steps.length) { completeMission(); return; }
  const st = S.mission.steps[S.missionStep];
  S.missionTimer = 0;
  if (st.type === 'race') setupRace();
  if (st.type === 'fight') spawnThugs();
  if (st.type === 'collect') spawnCrates();
  if (st.type === 'taxi') startTaxiFare();
  if (st.type === 'survive') setWanted(st.wanted || 2);
  S.objective = S.mission.name + ': ' + stepLabel();
  say('Next: ' + stepLabel());
}
function completeMission() {
  const m = S.mission;
  S.money += m.reward; S.stats.cashEarned += m.reward; S.stats.missionsDone++;
  say('MISSION COMPLETE: ' + m.name + '  +$' + m.reward);
  audio.sfx.mission();
  S.mission = null; S.missionIdx = -1; S.missionStep = 0;
  S.objective = 'Mission complete! Visit Mara (M) for the next job.';
  S.wanted = Math.max(0, S.wanted - 1);
  saveGame();
}
function failMission(reason) {
  say('MISSION FAILED: ' + reason);
  audio.sfx.fail();
  S.mission = null; S.missionIdx = -1; S.missionStep = 0;
  S.objective = 'Mission failed. Visit Mara (M) to retry.';
}
function setupRace() {
  S.missionData.cp = 0; S.missionData.raceT = 0;
  S.missionData.rivals = [];
  for (let i = 0; i < 3; i++) {
    const c = makeCar(i === 0 ? 'sports' : 'sedan', 2400 + (i - 1) * 60, 260, -Math.PI / 2, 'rival');
    c.speed = 0; S.cars.push(c); S.missionData.rivals.push(c);
  }
  say('Race! Follow the yellow checkpoints. First to the last wins.');
}
function spawnThugs() {
  S.missionData.kills = 0; S.missionData.thugs = [];
  for (let i = 0; i < 3; i++) {
    S.missionData.thugs.push({ x: LOC.docks.x + (i - 1) * 90, y: LOC.docks.y + (i % 2) * 70, hp: 60, angle: 0, speed: 70, kind: 'thug', color: '#3a3a3a', panic: 0 });
  }
  say('Rook’s crew is here. F to punch, click to shoot.');
}
function spawnCrates() {
  S.missionData.got = 0; S.missionData.crates = [];
  for (let i = 0; i < 5; i++) S.missionData.crates.push({ x: 340 + rng() * 200, y: 1500 + i * 220 + rng() * 60, got: false });
}
function startTaxiFare() {
  const spots = [LOC.downtown, LOC.airport, LOC.marina, LOC.docks, LOC.gunstore, LOC.garage];
  const from = spots[Math.floor(Math.random() * spots.length)];
  const to = spots[Math.floor(Math.random() * spots.length)];
  S.taxi.active = true; S.taxi.stage = 0;
  S.taxi.fare = { from: { x: from.x + 40, y: from.y + 40, name: from.name }, to: { x: to.x + 40, y: to.y + 40, name: to.name }, pay: 60 + Math.floor(Math.random() * 70) };
  S.taxi.farePed = { x: S.taxi.fare.from.x, y: S.taxi.fare.from.y, angle: 0, speed: 0, kind: 'walker', color: '#f2c14e', hp: 30, panic: 0 };
  say('Taxi fare: pick up at ' + S.taxi.fare.from.name + ' → ' + S.taxi.fare.to.name + ' ($' + S.taxi.fare.pay + ')');
}

// ---- wanted / police ----
function setWanted(n) { S.wanted = clamp(n, 0, 5); S.wantedTimer = 0; if (n > 0) audio.sfx.siren(); }
function addWanted(n) { setWanted(S.wanted + n); }
function spawnPoliceCar() {
  const p = S.player;
  const a = Math.random() * TAU;
  const c = makeCar('police', clamp(p.x + Math.cos(a) * 700, 200, WORLD_W - 200), clamp(p.y + Math.sin(a) * 700, 200, WORLD_H - 200), 0, 'police');
  S.cars.push(c);
  return c;
}
function updateWanted(dt) {
  if (S.wanted === 0) return;
  S.wantedTimer += dt;
  const cops = S.cars.filter((c) => c.driver === 'police' && !c.dead);
  const nearCop = cops.some((c) => dist(c.x, c.y, S.player.x, S.player.y) < 500);
  if (S.wantedTimer > 14 && !nearCop) { S.wanted--; S.wantedTimer = 0; if (S.wanted === 0) say('You lost the cops.'); }
  // spawn police up to wanted level
  if (cops.length < S.wanted && Math.random() < dt * 0.8) spawnPoliceCar();
  // foot police at 3+
  if (S.wanted >= 3 && S.cops.length < (S.wanted - 2) * 2 && Math.random() < dt * 0.5) {
    S.cops.push({ x: S.player.x + (Math.random() * 400 - 200), y: S.player.y + (Math.random() * 400 - 200), angle: 0, speed: 150, hp: 40, kind: 'cop', color: '#2a3a5a', panic: 0 });
  }
  // roadblocks at 3+
  if (S.wanted >= 3 && S.roadblocks.length < S.wanted - 2 && Math.random() < dt * 0.2) {
    const p = S.player, a = Math.atan2(p.y - (p.y - 400), 0);
    S.roadblocks.push({ x: clamp(p.x + (Math.random() * 600 - 300), 300, WORLD_W - 300), y: clamp(p.y - 500, 300, WORLD_H - 300), angle: Math.random() * TAU, t: 20 });
  }
  // helicopter at 4-5
  if (S.wanted >= 4) {
    if (!S.heli) { S.heli = { x: S.player.x, y: S.player.y - 300, angle: 0 }; say('Police helicopter overhead!'); audio.sfx.siren(); }
  } else if (S.heli) S.heli = null;
  if (S.heli) { S.heli.x = lerp(S.heli.x, S.player.x, dt * 0.8); S.heli.y = lerp(S.heli.y, S.player.y - 60, dt * 0.8); }
}

// ---- combat ----
function switchWeapon(n) {
  const w = ['pistol', 'shotgun', 'smg'][n - 1];
  if (S.player.owned.includes(w)) { S.player.weapon = w; say('Weapon: ' + w); audio.sfx.click(); }
  else say('You do not own a ' + w + ' — visit the Gun Store.');
}
function punch() {
  const p = S.player;
  audio.sfx.punch();
  const range = p.inCar ? 0 : 46;
  if (range === 0) return;
  const tx = p.x + Math.cos(p.angle) * 40, ty = p.y + Math.sin(p.angle) * 40;
  for (const ped of S.peds) if (dist(ped.x, ped.y, tx, ty) < range) { ped.hp -= 25; ped.panic = 3; if (ped.hp <= 0) { ped.hp = 0; addWanted(1); } }
  for (const cop of S.cops) if (dist(cop.x, cop.y, tx, ty) < range) { cop.hp -= 25; if (cop.hp <= 0) { cop.hp = 0; addWanted(1); } }
  if (S.missionData.thugs) for (const t of S.missionData.thugs) if (t.hp > 0 && dist(t.x, t.y, tx, ty) < range) { t.hp -= 25; if (t.hp <= 0) { S.missionData.kills++; audio.sfx.cash(); S.objective = S.mission.name + ': ' + stepLabel(); if (S.missionData.kills >= 3) advanceStep(); } }
}
function shoot() {
  const p = S.player;
  if (shotCooldown > 0) return;
  const w = p.weapon;
  if ((p.ammo[w] || 0) <= 0) { say('No ammo for ' + w + ' — buy some at the Gun Store.'); shotCooldown = 0.4; return; }
  p.ammo[w]--; S.stats.shots++;
  const aim = Math.atan2(mouse.y - VH / 2, mouse.x - VW / 2);
  const ox = p.inCar ? p.inCar.x : p.x, oy = p.inCar ? p.inCar.y : p.y;
  const spread = w === 'shotgun' ? 0.22 : w === 'smg' ? 0.06 : 0.02;
  const n = w === 'shotgun' ? 5 : 1;
  for (let i = 0; i < n; i++) S.bullets.push({ x: ox + Math.cos(aim) * 30, y: oy + Math.sin(aim) * 30, angle: aim + (Math.random() - 0.5) * spread, speed: 900, life: 0.6, dmg: w === 'shotgun' ? 12 : w === 'smg' ? 8 : 15 });
  shotCooldown = w === 'smg' ? 0.09 : w === 'shotgun' ? 0.7 : 0.25;
  if (w === 'shotgun') audio.sfx.shotgun(); else audio.sfx.shoot();
  S.particles.push({ x: ox + Math.cos(aim) * 36, y: oy + Math.sin(aim) * 36, kind: 'flash', t: 0.08, vx: 0, vy: 0 });
  addWanted(0); // shooting in public draws attention only when it hits
}

// ---- interact / economy ----
function near(loc, r) { return dist(S.player.x, S.player.y, loc.x, loc.y) < (r || 90); }
function interact() {
  const p = S.player;
  if (p.inCar) return;
  // a car right next to you wins over a shop door — stealing is the core verb
  let best = null, bd = 55;
  for (const c of S.cars) { if (c.driver === 'police' || c.dead) continue; const d = dist(p.x, p.y, c.x, c.y); if (d < bd) { bd = d; best = c; } }
  if (best) { stealCar(best); return; }
  if (near(LOC.gunstore, 100)) { shopMenu(); return; }
  if (near(LOC.garage, 110)) {
    if (p.inCar) return;
    if (S.money >= 100 && S._lastCar) { S.money -= 100; S._lastCar.hp = S._lastCar.maxHp; say('Car repaired — $100.'); audio.sfx.cash(); }
    else if (S.money >= 50) { S.money -= 50; if (S._lastCar) S._lastCar.color = pick(CAR_COLORS); say('Repaint — $50.'); audio.sfx.cash(); }
    else say('Garage: repair $100 / repaint $50. You are broke.');
    return;
  }
  if (near(LOC.safehouse, 100)) {
    if (!S.safehouseOwned && S.money >= 1500) { S.money -= 1500; S.safehouseOwned = true; S.respawn = { x: LOC.safehouse.x, y: LOC.safehouse.y }; say('Safehouse bought! This is your new respawn.'); audio.sfx.mission(); }
    else if (S.safehouseOwned) { S.respawn = { x: LOC.safehouse.x, y: LOC.safehouse.y }; say('Respawn set to Safehouse.'); }
    else say('Safehouse for sale: $1500. You have $' + S.money + '.');
    return;
  }
  if (near(LOC.home, 110)) {
    const next = S.stats.missionsDone;
    if (next < MISSIONS.length) startMission(next);
    else say('All missions done! Free roam — taxi jobs still pay. Press E near a taxi fare.');
    return;
  }
  // steal nearest car (wider radius than the priority check above)
  best = null; bd = 90;
  for (const c of S.cars) { if (c.driver === 'police' || c.dead) continue; const d = dist(p.x, p.y, c.x, c.y); if (d < bd) { bd = d; best = c; } }
  if (best) { stealCar(best); return; }
  say('No car nearby. E steals cars, buys things, talks to Mara.');
}
function stealCar(car) {
  const p = S.player;
  p.inCar = car; car.driver = 'player'; p.onFoot = false;
  S.stats.carsStolen++; S._lastCar = car;
  if (S.wanted === 0) addWanted(1);
  say('You stole a ' + car.type + '! Wanted level up.');
  audio.sfx.engine();
}
function shopMenu() {
  // One-press shop: cycles a simple buy flow via repeated E presses is confusing; use keys 1-3 contextually.
  // Here: E at gun store buys the cheapest thing you can afford and don't own yet, then ammo.
  const p = S.player;
  if (!p.owned.includes('shotgun') && S.money >= 400) { S.money -= 400; p.owned.push('shotgun'); p.ammo.shotgun = 16; say('Bought SHOTGUN — $400. Press 2 to equip.'); audio.sfx.cash(); return; }
  if (!p.owned.includes('smg') && S.money >= 700) { S.money -= 700; p.owned.push('smg'); p.ammo.smg = 64; say('Bought SMG — $700. Press 3 to equip.'); audio.sfx.cash(); return; }
  if (S.money >= 250 && p.armor < 100) { S.money -= 250; p.armor = 100; say('Bought ARMOR — $250.'); audio.sfx.cash(); return; }
  if (S.money >= 60) { const w = p.weapon; S.money -= 60; p.ammo[w] = (p.ammo[w] || 0) + (w === 'shotgun' ? 8 : w === 'smg' ? 32 : 24); say('Ammo restocked for ' + w + ' — $60.'); audio.sfx.cash(); return; }
  say('Gun Store: shotgun $400, SMG $700, armor $250, ammo $60. You have $' + S.money + '.');
}

// ---- save / load / respawn ----
function saveGame() {
  try {
    const p = S.player;
    localStorage.setItem('solara-bay-save', JSON.stringify({ money: S.money, x: p.x, y: p.y, hp: p.hp, armor: p.armor, owned: p.owned, ammo: p.ammo, missionsDone: S.stats.missionsDone, safehouseOwned: S.safehouseOwned, respawn: S.respawn, clock: S.clock }));
    S.saveExists = true; say('Game saved.'); audio.sfx.click();
  } catch (e) { say('Save failed (storage unavailable).'); }
}
function loadSave() {
  try {
    const raw = localStorage.getItem('solara-bay-save');
    if (!raw) return false;
    const d = JSON.parse(raw);
    S.money = d.money; S.player.x = d.x; S.player.y = d.y; S.player.hp = d.hp; S.player.armor = d.armor || 0;
    S.player.owned = d.owned || ['pistol']; S.player.ammo = d.ammo || { pistol: 24, shotgun: 0, smg: 0 };
    S.stats.missionsDone = d.missionsDone || 0; S.safehouseOwned = !!d.safehouseOwned;
    S.respawn = d.respawn || { x: 1200, y: 800 }; S.clock = d.clock || 9 * 60;
    S.saveExists = true; return true;
  } catch (e) { return false; }
}
function respawn() {
  const p = S.player;
  p.hp = 100; p.armor = 0; p.inCar = null; p.onFoot = true;
  p.x = S.respawn.x; p.y = S.respawn.y;
  S.money = Math.floor(S.money * 0.9);
  S.wanted = 0; S.heli = null; S.cops = []; S.roadblocks = [];
  S.cars = S.cars.filter((c) => c.driver !== 'police');
  S.mode = 'play';
  say('You wake up at the hospital. -$' + Math.floor(S.money * 0.1) + ' in bills... (10% lost)');
}
function startGame() {
  if (S.mode !== 'start') return;
  S.mode = 'play';
  spawnTraffic(); spawnPeds(); spawnPickups();
  S.objective = 'Visit Mara (M) — or steal a car with E';
  say('Welcome to Solara Bay. WASD move/drive, E interact, F punch, click shoot, R radio, P pause, M save.');
  audio.unlock(); audio.sfx.mission();
}
function damagePlayer(n) {
  const p = S.player;
  if (p.armor > 0) { const ab = Math.min(p.armor, n); p.armor -= ab; n -= ab; }
  p.hp -= n;
  if (p.hp <= 0) { p.hp = 0; S.mode = 'wasted'; audio.sfx.fail(); if (S.mission) failMission('You were wasted.'); }
}

// ---- update ----
let trafficLight = { state: 'green', t: 0 }; // shared cycle for major intersections
function hitBuilding(x, y, r) {
  for (const b of buildings) if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  return null;
}
function update(dt) {
  S.time += dt;
  S.clock = (S.clock + dt * 2) % 1440; // 1 real second = 2 game minutes
  // weather cycle
  S.rainTimer -= dt;
  if (S.rainTimer <= 0) {
    if (S.weather === 'clear') { S.weather = 'rain'; S.rain = 1; S.rainTimer = 25 + Math.random() * 15; say('Rain over Solara Bay — roads are slick.'); }
    else { S.weather = 'clear'; S.rain = 0; S.rainTimer = 50 + Math.random() * 40; }
  }
  trafficLight.t -= dt;
  if (trafficLight.t <= 0) { trafficLight.state = trafficLight.state === 'green' ? 'red' : 'green'; trafficLight.t = trafficLight.state === 'green' ? 7 : 5; }
  if (S.msgTimer > 0) S.msgTimer -= dt;
  if (shotCooldown > 0) shotCooldown -= dt;
  const p = S.player;
  const grip = (S.weather === 'rain' ? 0.85 : 1);

  // ---- player ----
  if (p.inCar) {
    const car = p.inCar, v = VEHICLES[car.type];
    const fwd = (keys['w'] || keys['arrowup'] ? 1 : 0) - (keys['s'] || keys['arrowdown'] ? 1 : 0);
    const steer = (keys['a'] || keys['arrowleft'] ? 1 : 0) - (keys['d'] || keys['arrowright'] ? 1 : 0);
    car.speed += fwd * v.accel * dt;
    car.speed *= Math.pow(0.4, dt); // drag
    car.speed = clamp(car.speed, -v.max * 0.5, v.max);
    if (fwd === 0 && Math.abs(car.speed) < 8) car.speed = 0;
    car.angle += steer * clamp(car.speed / v.max, -1, 1) * 2.4 * dt * (car.speed < 0 ? -1 : 1) * v.grip * grip;
    const nx = car.x + Math.cos(car.angle) * car.speed * dt, ny = car.y + Math.sin(car.angle) * car.speed * dt;
    if (!hitBuilding(nx, car.y, 20)) car.x = nx; else { car.hp -= Math.abs(car.speed) * 0.08; car.speed *= -0.3; audio.sfx.crash(); }
    if (!hitBuilding(car.x, ny, 20)) car.y = ny; else { car.hp -= Math.abs(car.speed) * 0.08; car.speed *= -0.3; audio.sfx.crash(); }
    car.x = clamp(car.x, 40, WORLD_W - 40); car.y = clamp(car.y, 40, WORLD_H - 40);
    p.x = car.x; p.y = car.y; p.angle = car.angle;
    if (car.hp <= 0 && !car.dead) { car.dead = true; explode(car.x, car.y); p.inCar = null; p.onFoot = true; damagePlayer(20); say('Your car blew up!'); }
    else if (car.hp < 35 && Math.random() < dt * 2) S.particles.push({ x: car.x, y: car.y, kind: 'smoke', t: 0.8, vx: (Math.random() - 0.5) * 20, vy: -30 });
    if (mouse.down) shoot();
  } else {
    const sp = 240;
    let mx = (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0);
    let my = (keys['s'] || keys['arrowdown'] ? 1 : 0) - (keys['w'] || keys['arrowup'] ? 1 : 0);
    if (mx || my) {
      const len = Math.hypot(mx, my); mx /= len; my /= len;
      p.angle = Math.atan2(my, mx);
      const nx = p.x + mx * sp * dt, ny = p.y + my * sp * dt;
      if (!hitBuilding(nx, p.y, 14)) p.x = nx;
      if (!hitBuilding(p.x, ny, 14)) p.y = ny;
    }
    p.x = clamp(p.x, 20, WORLD_W - 20); p.y = clamp(p.y, 20, WORLD_H - 20);
    if (mouse.down) shoot();
  }
  // exit car with E handled above for in-car; on-foot E is keydown-driven (interact)

  // ---- traffic AI ----
  for (const c of S.cars) {
    if (c.dead || c.driver === 'player') continue;
    const v = VEHICLES[c.type];
    if (c.driver === 'police') { updatePoliceCar(c, dt); continue; }
    if (c.driver === 'rival') { updateRival(c, dt); continue; }
    if (c.driver === 'parked') continue;
    // traffic: follow road direction, stop at red lights near intersections, avoid player car
    const atJunction = ((c.x % ROAD) < 60 || (c.x % ROAD) > ROAD - 60) && ((c.y % ROAD) < 60 || (c.y % ROAD) > ROAD - 60);
    if (atJunction && trafficLight.state === 'red' && Math.random() < 0.7) { c.speed = lerp(c.speed, 0, dt * 4); }
    else c.speed = lerp(c.speed, 150 + (c.type === 'bike' ? 120 : 0), dt * 0.5);
    // gentle steering to stay on road center
    const mx = ((c.x % ROAD) + ROAD) % ROAD, my = ((c.y % ROAD) + ROAD) % ROAD;
    const horiz = Math.abs(Math.sin(c.angle)) < 0.5;
    let targetAngle = c.angle;
    if (horiz) { const wantY = Math.round(c.y / ROAD) * ROAD; if (Math.abs(c.y - wantY) > 30) targetAngle = c.angle + (c.y > wantY ? -0.02 : 0.02) * Math.sign(Math.cos(c.angle)); }
    else { const wantX = Math.round(c.x / ROAD) * ROAD; if (Math.abs(c.x - wantX) > 30) targetAngle = c.angle + (c.x > wantX ? 0.02 : -0.02) * Math.sign(Math.sin(c.angle)); }
    if (Math.random() < dt * 0.15) targetAngle = (Math.floor(Math.random() * 4)) * Math.PI / 2; // turn at junctions
    c.angle += angDiff(c.angle, targetAngle) * dt * 2;
    c.x += Math.cos(c.angle) * c.speed * dt; c.y += Math.sin(c.angle) * c.speed * dt;
    c.x = clamp(c.x, 60, WORLD_W - 60); c.y = clamp(c.y, 60, WORLD_H - 60);
    if (hitBuilding(c.x, c.y, 18)) { c.angle += Math.PI / 2; c.x -= Math.cos(c.angle) * 40; c.y -= Math.sin(c.angle) * 40; }
  }
  // car-car collisions (player car vs traffic)
  if (p.inCar) {
    for (const c of S.cars) {
      if (c === p.inCar || c.dead) continue;
      if (dist(c.x, c.y, p.inCar.x, p.inCar.y) < 46) {
        const push = 60 * dt;
        c.x += Math.cos(c.angle) * push; c.y += Math.sin(c.angle) * push;
        p.inCar.hp -= 2 * dt * 10; c.hp -= 2 * dt * 10;
        if (Math.abs(p.inCar.speed) > 200) { audio.sfx.crash(); p.inCar.speed *= 0.6; }
        if (c.hp <= 0 && !c.dead) { c.dead = true; explode(c.x, c.y); if (c.driver === 'police') addWanted(1); }
      }
    }
  }
  // ---- pedestrians ----
  for (const ped of S.peds) {
    if (ped.hp <= 0) continue;
    if (ped.panic > 0) { ped.panic -= dt; ped.speed = 220; } else ped.speed = ped.kind === 'jogger' ? 110 : 55;
    ped.x += Math.cos(ped.angle) * ped.speed * dt; ped.y += Math.sin(ped.angle) * ped.speed * dt;
    if (Math.random() < dt * 0.2) ped.angle += (Math.random() - 0.5) * 1.5;
    if (ped.x < 30 || ped.x > WORLD_W - 30 || ped.y < 30 || ped.y > WORLD_H - 30) ped.angle += Math.PI;
    if (hitBuilding(ped.x, ped.y, 10)) ped.angle += Math.PI / 2;
    if (inWater(ped.x, ped.y)) ped.angle += Math.PI;
    // run over by player car
    if (p.inCar && dist(ped.x, ped.y, p.x, p.y) < 34 && Math.abs(p.inCar.speed) > 60) { ped.hp = 0; addWanted(1); say('You ran someone over! Wanted up.'); audio.sfx.crash(); }
  }
  // ---- foot cops ----
  for (const cop of S.cops) {
    if (cop.hp <= 0) continue;
    const d = dist(cop.x, cop.y, p.x, p.y);
    cop.angle = Math.atan2(p.y - cop.y, p.x - cop.x);
    if (d > 26) { cop.x += Math.cos(cop.angle) * cop.speed * dt; cop.y += Math.sin(cop.angle) * cop.speed * dt; }
    else if (Math.random() < dt * 1.2) { damagePlayer(8); say('A cop is beating you down!'); }
  }
  S.cops = S.cops.filter((c) => c.hp > 0);
  // ---- thugs ----
  if (S.missionData.thugs) for (const t of S.missionData.thugs) {
    if (t.hp <= 0) continue;
    const d = dist(t.x, t.y, p.x, p.y);
    t.angle = Math.atan2(p.y - t.y, p.x - t.x);
    if (d > 30) { t.x += Math.cos(t.angle) * t.speed * dt; t.y += Math.sin(t.angle) * t.speed * dt; }
    else if (Math.random() < dt * 1.0) damagePlayer(6);
  }
  // ---- bullets ----
  for (const b of S.bullets) {
    b.x += Math.cos(b.angle) * b.speed * dt; b.y += Math.sin(b.angle) * b.speed * dt; b.life -= dt;
    for (const ped of S.peds) if (ped.hp > 0 && dist(ped.x, ped.y, b.x, b.y) < 16) { ped.hp -= b.dmg; ped.panic = 3; b.life = 0; if (ped.hp <= 0) addWanted(1); }
    for (const cop of S.cops) if (cop.hp > 0 && dist(cop.x, cop.y, b.x, b.y) < 16) { cop.hp -= b.dmg; b.life = 0; if (cop.hp <= 0) addWanted(1); }
    if (S.missionData.thugs) for (const t of S.missionData.thugs) if (t.hp > 0 && dist(t.x, t.y, b.x, b.y) < 16) { t.hp -= b.dmg; b.life = 0; if (t.hp <= 0) { S.missionData.kills++; audio.sfx.cash(); S.objective = S.mission.name + ': ' + stepLabel(); if (S.missionData.kills >= 3) advanceStep(); } }
    for (const c of S.cars) if (!c.dead && c.driver !== 'player' && dist(c.x, c.y, b.x, b.y) < 26) { c.hp -= b.dmg; b.life = 0; if (c.hp <= 0) { c.dead = true; explode(c.x, c.y); if (c.driver === 'police') addWanted(1); } }
    if (hitBuilding(b.x, b.y, 2)) b.life = 0;
  }
  S.bullets = S.bullets.filter((b) => b.life > 0);
  // ---- particles ----
  for (const pt of S.particles) { pt.t -= dt; pt.x += (pt.vx || 0) * dt; pt.y += (pt.vy || 0) * dt; }
  S.particles = S.particles.filter((pt) => pt.t > 0);
  // ---- pickups ----
  for (const pk of S.pickups) {
    if (pk.taken) continue;
    if (dist(p.x, p.y, pk.x, pk.y) < 40) {
      pk.taken = true;
      if (pk.kind === 'health') { p.hp = Math.min(100, p.hp + 40); say('Health +40'); }
      if (pk.kind === 'armor') { p.armor = 100; say('Armor picked up'); }
      if (pk.kind === 'ammo') { p.ammo[p.weapon] = (p.ammo[p.weapon] || 0) + 24; say('Ammo +24'); }
      if (pk.kind === 'cash') { S.money += pk.amount; S.stats.cashEarned += pk.amount; say('Found $' + pk.amount); }
      audio.sfx.pickup();
    }
  }
  // ---- roadblocks decay ----
  for (const rb of S.roadblocks) rb.t -= dt;
  S.roadblocks = S.roadblocks.filter((rb) => rb.t > 0);
  updateWanted(dt);
  updateMission(dt);
  // camera
  S.cam.x = lerp(S.cam.x, p.x, 1 - Math.pow(0.001, dt));
  S.cam.y = lerp(S.cam.y, p.y, 1 - Math.pow(0.001, dt));
}
function exitCar() {
  const p = S.player, car = p.inCar;
  p.inCar = null; p.onFoot = true;
  p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 40; p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 40;
  car.speed = 0;
}
function explode(x, y) {
  for (let i = 0; i < 26; i++) S.particles.push({ x, y, kind: i % 3 === 0 ? 'fire' : 'smoke', t: 0.5 + Math.random() * 0.7, vx: (Math.random() - 0.5) * 220, vy: (Math.random() - 0.5) * 220 });
  audio.sfx.explosion();
}
function updatePoliceCar(c, dt) {
  const p = S.player, v = VEHICLES.police;
  const want = Math.atan2(p.y - c.y, p.x - c.x);
  c.angle += angDiff(c.angle, want) * dt * 2.2;
  c.speed = lerp(c.speed, v.max * 0.9, dt * 0.8);
  c.x += Math.cos(c.angle) * c.speed * dt; c.y += Math.sin(c.angle) * c.speed * dt;
  if (hitBuilding(c.x, c.y, 18)) { c.angle += Math.PI / 2; c.speed *= 0.5; }
  const d = dist(c.x, c.y, p.x, p.y);
  if (d < 50) {
    if (p.inCar) { p.inCar.hp -= 12 * dt; p.inCar.speed *= (1 - dt * 0.8); if (Math.random() < dt * 2) audio.sfx.crash(); }
    else if (Math.random() < dt * 0.7) { damagePlayer(10); say('Busted?! Fight back or run!'); }
    if (p.inCar && p.inCar.hp <= 0 && !p.inCar.dead) { p.inCar.dead = true; explode(p.inCar.x, p.inCar.y); p.inCar = null; p.onFoot = true; }
  }
  if (d > 1200) { c.x = clamp(p.x + (Math.random() - 0.5) * 800, 100, WORLD_W - 100); c.y = clamp(p.y + (Math.random() - 0.5) * 800, 100, WORLD_H - 100); }
}
function updateRival(c, dt) {
  const md = S.missionData;
  if (!S.mission || !S.mission.steps[S.missionStep] || S.mission.steps[S.missionStep].type !== 'race' || md.cp === undefined) { c.driver = 'traffic'; return; } // race over: rival joins traffic
  const target = RACE_POINTS[Math.min(md.cp + 1, RACE_POINTS.length - 1)];
  const want = Math.atan2(target.y - c.y, target.x - c.x);
  c.angle += angDiff(c.angle, want) * dt * 2.5;
  const v = VEHICLES[c.type];
  c.speed = lerp(c.speed, v.max * (0.82 + Math.random() * 0.06), dt);
  c.x += Math.cos(c.angle) * c.speed * dt; c.y += Math.sin(c.angle) * c.speed * dt;
  if (dist(c.x, c.y, target.x, target.y) < 90) md.rivalCp = (md.rivalCp || 0) + 1;
}

// ---- mission step updates ----
function updateMission(dt) {
  if (!S.mission) {
    // taxi side-job can run without a story mission
    if (S.taxi.active) updateTaxi(dt, null);
    return;
  }
  const st = S.mission.steps[S.missionStep];
  if (!st) return;
  const p = S.player;
  S.missionTimer += dt;
  if (st.timed && S.missionTimer > st.timed) { failMission('Out of time on ' + S.mission.name + '.'); return; }
  if (st.type === 'steal') { if (p.inCar) advanceStep(); return; }
  if (st.type === 'goto') {
    const loc = LOC[st.loc];
    if (dist(p.x, p.y, loc.x, loc.y) < 90) advanceStep();
    return;
  }
  if (st.type === 'survive') {
    S.objective = S.mission.name + ': ' + stepLabel() + ' — ' + Math.ceil(st.seconds - S.missionTimer) + 's';
    if (S.missionTimer >= st.seconds) { S.wanted = Math.max(0, S.wanted - 2); advanceStep(); }
    return;
  }
  if (st.type === 'race') {
    const md = S.missionData; md.raceT += dt;
    const cp = RACE_POINTS[md.cp + 1];
    if (cp && dist(p.x, p.y, cp.x, cp.y) < 110) {
      md.cp++;
      audio.sfx.pickup();
      S.objective = S.mission.name + ': ' + stepLabel();
      if (md.cp >= RACE_POINTS.length - 1) {
        const rivalBest = md.rivalCp || 0;
        if (rivalBest >= RACE_POINTS.length - 1) { failMission('A rival beat you to the finish.'); return; }
        advanceStep();
      }
    }
    return;
  }
  if (st.type === 'heist') {
    const loc = LOC.bank;
    if (dist(p.x, p.y, loc.x, loc.y) < 110) {
      S.objective = S.mission.name + ': Hold the vault — ' + Math.ceil(st.seconds - S.missionTimer) + 's';
      if (S.missionTimer >= st.seconds) {
        S.money += 800; S.stats.cashEarned += 800;
        setWanted(4); say('Vault cracked! +$800 — now RUN to the Safehouse!');
        audio.sfx.cash();
        advanceStep();
      }
    } else { S.missionTimer = Math.max(0, S.missionTimer - dt * 2); S.objective = S.mission.name + ': Get inside the bank vault'; }
    return;
  }
  if (st.type === 'collect') {
    const md = S.missionData;
    for (const cr of md.crates) if (!cr.got && dist(p.x, p.y, cr.x, cr.y) < 46) { cr.got = true; md.got++; audio.sfx.pickup(); S.objective = S.mission.name + ': ' + stepLabel(); if (md.got >= st.count) advanceStep(); }
    return;
  }
  if (st.type === 'taxi') { updateTaxi(dt, st); return; }
  // fight steps advance from punch()/shoot() handlers
}
function updateTaxi(dt, st) {
  const p = S.player, f = S.taxi.fare;
  if (!f) return;
  if (S.taxi.stage === 0) { // go to pickup
    if (dist(p.x, p.y, f.from.x, f.from.y) < 70) {
      S.taxi.stage = 1;
      say('Fare picked up! Deliver to ' + f.to.name + '.');
      audio.sfx.pickup();
    }
  } else if (S.taxi.stage === 1) {
    if (dist(p.x, p.y, f.to.x, f.to.y) < 80) {
      S.money += f.pay; S.stats.cashEarned += f.pay; S.taxi.done++;
      say('Fare complete! +$' + f.pay);
      audio.sfx.cash();
      S.taxi.active = false; S.taxi.fare = null;
      if (st) { S.missionData.fares = (S.missionData.fares || 0) + 1; S.objective = S.mission.name + ': ' + stepLabel(); if (S.missionData.fares >= st.count) advanceStep(); else startTaxiFare(); }
      else { saveGame(); }
    }
  }
}

// ---- rendering ----
function dayFactor() { // 0 = deep night, 1 = noon
  const h = S.clock / 60;
  if (h < 5 || h > 21) return 0.15;
  if (h < 7) return lerp(0.15, 1, (h - 5) / 2);
  if (h < 18) return 1;
  return lerp(1, 0.15, (h - 18) / 3);
}
function fmtClock() { const h = Math.floor(S.clock / 60) % 24, m = Math.floor(S.clock % 60); return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); }
function drawCar(c) {
  const v = VEHICLES[c.type];
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.angle);
  if (c.type === 'bike') {
    ctx.fillStyle = '#222'; ctx.fillRect(-v.len / 2, -3, v.len, 6);
    ctx.fillStyle = c.color; ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e8b88a'; ctx.beginPath(); ctx.arc(2, 0, 4, 0, TAU); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-v.len / 2 + 4, -v.wid / 2 + 5, v.len, v.wid);
    ctx.fillStyle = c.color;
    ctx.beginPath(); ctx.roundRect(-v.len / 2, -v.wid / 2, v.len, v.wid, 7); ctx.fill();
    if (c.driver === 'police') { ctx.fillStyle = '#e8e8e8'; ctx.fillRect(-6, -v.wid / 2, 12, v.wid); ctx.fillStyle = '#2244aa'; ctx.fillRect(-4, -v.wid / 2 - 2, 8, 5); ctx.fillStyle = '#cc2222'; ctx.fillRect(-4, v.wid / 2 - 3, 8, 5); }
    if (c.type === 'taxi') { ctx.fillStyle = '#222'; ctx.font = 'bold 9px Verdana'; ctx.textAlign = 'center'; ctx.fillText('TAXI', 0, 3); }
    ctx.fillStyle = '#bfe0f2'; ctx.fillRect(v.len / 2 - 16, -v.wid / 2 + 4, 10, v.wid - 8);
    ctx.fillStyle = '#22303a'; ctx.fillRect(-v.len / 2 + 6, -v.wid / 2 + 4, 8, v.wid - 8);
    if (c.hp < c.maxHp * 0.4) { ctx.fillStyle = 'rgba(80,80,80,0.8)'; ctx.beginPath(); ctx.arc(-v.len / 4, 0, 6 + Math.random() * 4, 0, TAU); ctx.fill(); }
    // headlights at night
    if (dayFactor() < 0.5) {
      const g = ctx.createRadialGradient(v.len / 2, 0, 2, v.len / 2, 0, 130);
      g.addColorStop(0, 'rgba(255,240,180,0.55)'); g.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(v.len / 2, -8); ctx.lineTo(v.len / 2 + 130, -46); ctx.lineTo(v.len / 2 + 130, 46); ctx.lineTo(v.len / 2, 8); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}
function drawPed(ped) {
  ctx.save(); ctx.translate(ped.x, ped.y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0, 3, 8, 4, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = ped.color; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
  ctx.fillStyle = ped.kind === 'cop' || ped.kind === 'thug' ? '#1c2a44' : '#e8e8e8';
  ctx.beginPath(); ctx.arc(Math.cos(ped.angle) * 3, Math.sin(ped.angle) * 3, 3.5, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawWorld() {
  const df = dayFactor();
  const camX = S.cam.x - VW / 2, camY = S.cam.y - VH / 2;
  ctx.save();
  ctx.translate(-camX, -camY);
  // ground
  ctx.fillStyle = '#4a7a3f'; ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  // beach sand
  ctx.fillStyle = '#d9c078'; ctx.fillRect(300, 3100, 1400, 500);
  // marina water (animated)
  const wob = Math.sin(S.time * 1.4) * 4;
  ctx.fillStyle = '#2a6a8a'; ctx.fillRect(0, 1300, 300 + wob, 1500);
  ctx.fillStyle = '#3a8ab2';
  for (let i = 0; i < 12; i++) { const wy = 1350 + i * 120; ctx.fillRect(10 + ((S.time * 20 + i * 60) % 260), wy, 60, 3); }
  // districts tint
  for (const d of DISTRICTS) { ctx.fillStyle = d.color + '22'; ctx.fillRect(d.x, d.y, d.w, d.h); }
  // highway ring
  ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 60; ctx.strokeRect(250, 250, WORLD_W - 500, WORLD_H - 500);
  ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = 2; ctx.setLineDash([24, 24]); ctx.strokeRect(250, 250, WORLD_W - 500, WORLD_H - 500); ctx.setLineDash([]);
  // roads
  ctx.fillStyle = '#3c3c40';
  for (let x = 0; x <= WORLD_W; x += ROAD) ctx.fillRect(x - 23, 0, 46, WORLD_H);
  for (let y = 0; y <= WORLD_H; y += ROAD) ctx.fillRect(0, y - 23, WORLD_W, 46);
  ctx.strokeStyle = '#d8d8d8'; ctx.lineWidth = 2; ctx.setLineDash([18, 18]);
  for (let x = 0; x <= WORLD_W; x += ROAD) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_H); ctx.stroke(); }
  for (let y = 0; y <= WORLD_H; y += ROAD) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_W, y); ctx.stroke(); }
  ctx.setLineDash([]);
  // traffic lights at major intersections
  ctx.fillStyle = trafficLight.state === 'red' ? '#e03a3a' : '#3ac95a';
  for (const [jx, jy] of [[1200, 1200], [2400, 1200], [3600, 2000], [2400, 2400]]) { ctx.beginPath(); ctx.arc(jx + 30, jy + 30, 6, 0, TAU); ctx.fill(); }
  // airport runway
  ctx.fillStyle = '#2e2e33'; ctx.fillRect(3550, 2830, 900, 130);
  ctx.fillStyle = '#f2f2f2'; ctx.font = 'bold 26px Verdana'; ctx.textAlign = 'center'; ctx.fillText('SOLARA INTL', 4000, 2900);
  ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = 3; ctx.setLineDash([30, 20]); ctx.beginPath(); ctx.moveTo(3570, 2895); ctx.lineTo(4430, 2895); ctx.stroke(); ctx.setLineDash([]);
  // props
  for (const pr of props) {
    if (pr.kind === 'container') { ctx.fillStyle = pr.color; ctx.fillRect(pr.x, pr.y, 46, 24); ctx.strokeStyle = '#00000055'; ctx.strokeRect(pr.x, pr.y, 46, 24); }
    else if (pr.kind === 'umbrella') { ctx.fillStyle = pr.color; ctx.beginPath(); ctx.arc(pr.x, pr.y, 16, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#8a6a4e'; ctx.fillRect(pr.x - 1, pr.y, 2, 12); }
    else if (pr.kind === 'boat') { ctx.fillStyle = pr.color; ctx.beginPath(); ctx.ellipse(pr.x, pr.y + Math.sin(S.time * 1.2 + pr.y) * 3, 26, 10, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#7a4a2a'; ctx.fillRect(pr.x - 2, pr.y - 16, 4, 16); }
    else if (pr.kind === 'pier') { ctx.fillStyle = '#8a6a4e'; ctx.fillRect(pr.x - 14, pr.y - 120, 28, 240); }
    else if (pr.kind === 'crane') { ctx.strokeStyle = pr.color; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pr.x, pr.y - 120); ctx.lineTo(pr.x + 90, pr.y - 120); ctx.stroke(); }
    else if (pr.kind === 'terminal') { ctx.fillStyle = '#9aa4b5'; ctx.fillRect(pr.x - 120, pr.y - 60, 240, 120); ctx.fillStyle = '#2e3a55'; ctx.font = 'bold 16px Verdana'; ctx.textAlign = 'center'; ctx.fillText('TERMINAL', pr.x, pr.y); }
    else if (pr.kind === 'plane') {
      ctx.save(); ctx.translate(pr.x, pr.y); ctx.fillStyle = pr.color;
      ctx.beginPath(); ctx.ellipse(0, 0, 70, 14, 0, 0, TAU); ctx.fill();
      ctx.fillRect(-10, -46, 16, 92); ctx.fillStyle = '#3a6ab2'; ctx.fillRect(30, -6, 22, 12); ctx.restore();
    }
  }
  // trees
  for (const t of trees) { ctx.fillStyle = '#2e6b2e'; ctx.beginPath(); ctx.arc(t.x, t.y, 12, 0, TAU); ctx.fill(); ctx.fillStyle = '#5a3a22'; ctx.fillRect(t.x - 2, t.y + 8, 4, 8); }
  // buildings with drop shadows
  for (const b of buildings) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(b.x + 8, b.y + 10, b.w, b.h);
    ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.fillRect(b.x, b.y, b.w, 6);
    ctx.fillStyle = df < 0.5 ? '#ffd76a' : '#2a3550';
    const cols = Math.max(1, Math.floor(b.w / 22)), rows = Math.max(1, Math.floor(b.h / 22));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) ctx.fillRect(b.x + 6 + i * 22, b.y + 8 + j * 22, 10, 12);
    if (b.tall >= 7) { ctx.fillStyle = '#f2c14e'; ctx.font = 'bold 11px Verdana'; ctx.textAlign = 'center'; ctx.fillText(b.landmark || '', b.x + b.w / 2, b.y + b.h / 2); }
  }
  // shops / markers
  const markers = [
    { ...LOC.gunstore, label: 'GUN STORE', color: '#c94f4f' }, { ...LOC.garage, label: 'GARAGE', color: '#4ea8f2' },
    { ...LOC.safehouse, label: S.safehouseOwned ? 'SAFEHOUSE ✓' : 'SAFEHOUSE $1500', color: '#7ab34e' },
    { ...LOC.home, label: "MARA'S", color: '#f2c14e' }, { ...LOC.bank, label: 'BANK', color: '#e8e8e8' },
  ];
  for (const m of markers) {
    ctx.fillStyle = m.color; ctx.beginPath(); ctx.arc(m.x, m.y, 12, 0, TAU); ctx.fill();
    ctx.fillStyle = '#111'; ctx.font = 'bold 10px Verdana'; ctx.textAlign = 'center'; ctx.fillText(m.label, m.x, m.y - 18);
  }
  // mission crates
  if (S.missionData.crates) for (const cr of S.missionData.crates) if (!cr.got) { ctx.fillStyle = '#f2c14e'; ctx.fillRect(cr.x - 10, cr.y - 8 + Math.sin(S.time * 2 + cr.x) * 3, 20, 16); ctx.strokeStyle = '#8a6a2a'; ctx.strokeRect(cr.x - 10, cr.y - 8, 20, 16); }
  // taxi fare ped
  if (S.taxi.active && S.taxi.stage === 0 && S.taxi.farePed) drawPed(S.taxi.farePed);
  // race checkpoints
  if (S.mission && S.mission.steps[S.missionStep] && S.mission.steps[S.missionStep].type === 'race') {
    const cp = RACE_POINTS[S.missionData.cp + 1];
    if (cp) { ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cp.x, cp.y, 60 + Math.sin(S.time * 4) * 8, 0, TAU); ctx.stroke(); ctx.fillStyle = '#f2c14e'; ctx.font = 'bold 22px Verdana'; ctx.textAlign = 'center'; ctx.fillText(String(S.missionData.cp + 1), cp.x, cp.y + 8); }
  }
  // mission goto marker
  const st = S.mission && S.mission.steps[S.missionStep];
  if (st && st.type === 'goto') {
    const loc = LOC[st.loc];
    ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(loc.x, loc.y, 46 + Math.sin(S.time * 4) * 6, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#f2c14e'; ctx.beginPath(); ctx.moveTo(loc.x, loc.y - 70); ctx.lineTo(loc.x - 10, loc.y - 46); ctx.lineTo(loc.x + 10, loc.y - 46); ctx.closePath(); ctx.fill();
  }
  if (st && st.type === 'heist') { const loc = LOC.bank; ctx.strokeStyle = '#e03a3a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(loc.x, loc.y, 56 + Math.sin(S.time * 5) * 6, 0, TAU); ctx.stroke(); }
  if (S.taxi.active && S.taxi.fare) {
    const t = S.taxi.stage === 0 ? S.taxi.fare.from : S.taxi.fare.to;
    ctx.strokeStyle = '#f2d13f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(t.x, t.y, 40 + Math.sin(S.time * 4) * 5, 0, TAU); ctx.stroke();
  }
  // roadblocks
  for (const rb of S.roadblocks) { ctx.save(); ctx.translate(rb.x, rb.y); ctx.rotate(rb.angle); ctx.fillStyle = '#e88a3f'; ctx.fillRect(-40, -8, 80, 16); ctx.fillStyle = '#111'; ctx.font = 'bold 9px Verdana'; ctx.textAlign = 'center'; ctx.fillText('POLICE', 0, 3); ctx.restore(); }
  // pickups
  for (const pk of S.pickups) {
    if (pk.taken) continue;
    ctx.fillStyle = pk.kind === 'health' ? '#e03a3a' : pk.kind === 'armor' ? '#4ea8f2' : pk.kind === 'ammo' ? '#f2c14e' : '#7ab34e';
    ctx.beginPath(); ctx.arc(pk.x, pk.y, 12, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Verdana'; ctx.textAlign = 'center';
    ctx.fillText(pk.kind === 'health' ? '+' : pk.kind === 'armor' ? 'A' : pk.kind === 'ammo' ? '•' : '$', pk.x, pk.y + 4);
  }
  // peds, thugs, cops
  for (const ped of S.peds) if (ped.hp > 0) drawPed(ped);
  if (S.missionData.thugs) for (const t of S.missionData.thugs) if (t.hp > 0) drawPed(t);
  for (const cop of S.cops) drawPed(cop);
  // cars
  for (const c of S.cars) if (!c.dead) drawCar(c);
  // player
  const p = S.player;
  if (!p.inCar) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 4, 10, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e05a5a'; ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f2d8a8'; ctx.beginPath(); ctx.arc(6, 0, 5, 0, TAU); ctx.fill();
    if (p.weapon !== 'pistol' || true) { ctx.fillStyle = '#222'; ctx.fillRect(8, -2, 14, 4); }
    ctx.restore();
  }
  // bullets
  ctx.fillStyle = '#ffe14e';
  for (const b of S.bullets) { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.angle); ctx.fillRect(-6, -1.5, 12, 3); ctx.restore(); }
  // particles
  for (const pt of S.particles) {
    if (pt.kind === 'fire') { ctx.fillStyle = `rgba(240,${100 + Math.floor(80 * pt.t)},20,${pt.t})`; ctx.beginPath(); ctx.arc(pt.x, pt.y, 14 * pt.t + 4, 0, TAU); ctx.fill(); }
    else if (pt.kind === 'smoke') { ctx.fillStyle = `rgba(90,90,90,${pt.t * 0.7})`; ctx.beginPath(); ctx.arc(pt.x, pt.y, 18 * (1 - pt.t) + 6, 0, TAU); ctx.fill(); }
    else if (pt.kind === 'flash') { ctx.fillStyle = `rgba(255,230,120,${pt.t * 8})`; ctx.beginPath(); ctx.arc(pt.x, pt.y, 16, 0, TAU); ctx.fill(); }
  }
  // helicopter + searchlight
  if (S.heli) {
    const h = S.heli;
    const g = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, 190);
    g.addColorStop(0, 'rgba(255,250,200,0.35)'); g.addColorStop(1, 'rgba(255,250,200,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 190, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(h.x, h.y);
    ctx.fillStyle = '#2a2f3a'; ctx.beginPath(); ctx.ellipse(0, 0, 34, 16, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#666'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(40, 0); ctx.stroke();
    ctx.fillStyle = '#ffe14e'; ctx.beginPath(); ctx.arc(20, 0, 5, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // rain
  if (S.weather === 'rain') {
    ctx.strokeStyle = 'rgba(180,200,230,0.5)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 90; i++) {
      const rx = camX + ((i * 137 + S.time * 900) % (VW + 40)) - 20, ry = camY + ((i * 89 + S.time * 1400) % (VH + 40)) - 20;
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 6, ry + 16); ctx.stroke();
    }
  }
  // night overlay
  if (df < 0.9) { ctx.fillStyle = `rgba(8,10,40,${(0.9 - df) * 0.45})`; ctx.fillRect(camX, camY, VW, VH); }
  ctx.restore();
}

// ---- HUD + minimap ----
function drawHUD() {
  const p = S.player;
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, VW, 34);
  ctx.fillStyle = '#7ab34e'; ctx.font = 'bold 17px Verdana'; ctx.textAlign = 'left';
  ctx.fillText('$' + S.money, 14, 24);
  ctx.fillStyle = '#fff'; ctx.font = '15px Verdana';
  ctx.fillText('HP ' + Math.ceil(p.hp) + (p.armor > 0 ? '  ARMOR ' + Math.ceil(p.armor) : ''), 130, 23);
  ctx.fillText(p.weapon.toUpperCase() + ' ' + (p.ammo[p.weapon] || 0), 330, 23);
  ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 15px Verdana';
  let stars = '';
  for (let i = 0; i < 5; i++) stars += i < S.wanted ? '★' : '☆';
  ctx.fillText(stars, 480, 23);
  ctx.fillStyle = '#fff'; ctx.fillText(fmtClock() + '  ' + districtAt(p.x, p.y) + (S.weather === 'rain' ? '  🌧' : ''), 640, 23);
  if (p.inCar) { const c = p.inCar; ctx.fillStyle = '#fff'; ctx.fillText(Math.abs(Math.round(c.speed * 0.24)) + ' km/h', 900, 23); ctx.fillStyle = c.hp < 35 ? '#e03a3a' : '#7ab34e'; ctx.fillText('CAR ' + Math.ceil(c.hp) + '/' + c.maxHp + '  ' + c.type.toUpperCase(), 1000, 23); }
  if (S.radio) { ctx.fillStyle = '#4ea8f2'; ctx.fillText('♪ ' + S.station, 14, 56); }
  // objective
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(14, 44, 560, 30);
  ctx.fillStyle = '#ffe14e'; ctx.font = 'bold 14px Verdana'; ctx.textAlign = 'left';
  ctx.fillText(S.objective.slice(0, 72), 22, 64);
  if (S.mission) { ctx.fillStyle = '#fff'; ctx.font = '13px Verdana'; ctx.fillText(S.mission.name + '  •  $' + S.mission.reward, 22, 88); }
  if (S.taxi.active && S.taxi.fare) { ctx.fillStyle = '#f2d13f'; ctx.font = '13px Verdana'; ctx.fillText('TAXI: ' + S.taxi.fare.from.name + ' → ' + S.taxi.fare.to.name + '  ($' + S.taxi.fare.pay + ')', 22, 108); }
  if (S.msgTimer > 0) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(VW / 2 - 320, VH - 64, 640, 30); ctx.fillStyle = '#fff'; ctx.font = '14px Verdana'; ctx.textAlign = 'center'; ctx.fillText(S.msg, VW / 2, VH - 44); }
  // minimap
  const mw = 220, mh = 165, mx = VW - mw - 14, my = VH - mh - 14, sx = mw / WORLD_W, sy = mh / WORLD_H;
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
  ctx.fillStyle = '#1e3a24'; ctx.fillRect(mx, my, mw, mh);
  ctx.fillStyle = '#2a6a8a'; ctx.fillRect(mx, my + 1300 * sy, 300 * sx, 1500 * sy);
  ctx.fillStyle = '#3c3c40';
  for (let x = 0; x <= WORLD_W; x += ROAD) ctx.fillRect(mx + x * sx - 1, my, 2, mh);
  for (let y = 0; y <= WORLD_H; y += ROAD) ctx.fillRect(mx, my + y * sy, mw, 2);
  ctx.fillStyle = '#f2c14e'; ctx.font = 'bold 8px Verdana'; ctx.textAlign = 'left';
  for (const d of DISTRICTS) ctx.fillText(d.name, mx + d.x * sx + 3, my + d.y * sy + 10);
  ctx.fillStyle = '#e05a5a'; ctx.beginPath(); ctx.arc(mx + S.player.x * sx, my + S.player.y * sy, 4, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.strokeRect(mx + S.cam.x * sx - 20, my + S.cam.y * sy - 11, 40, 22);
  const st = S.mission && S.mission.steps[S.missionStep];
  if (st && st.type === 'goto') { const loc = LOC[st.loc]; ctx.fillStyle = '#ffe14e'; ctx.beginPath(); ctx.arc(mx + loc.x * sx, my + loc.y * sy, 5, 0, TAU); ctx.fill(); }
  if (S.heli) { ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Verdana'; ctx.fillText('HELI!', mx + S.heli.x * sx - 10, my + S.heli.y * sy - 6); }
  // controls hint
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(14, VH - 30, 470, 20);
  ctx.fillStyle = '#ccc'; ctx.font = '11px Verdana'; ctx.textAlign = 'left';
  ctx.fillText('WASD drive/walk • E steal/interact • F punch • Click shoot • 1/2/3 weapons • R radio • P pause • M save', 20, VH - 16);
}
function drawStart() {
  drawWorld();
  ctx.fillStyle = 'rgba(5,8,20,0.72)'; ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f2c14e'; ctx.font = 'bold 64px Verdana'; ctx.fillText('SOLARA BAY', VW / 2, 170);
  ctx.fillStyle = '#fff'; ctx.font = '20px Verdana'; ctx.fillText('An open-world crime game — a sun-soaked city of your own', VW / 2, 210);
  ctx.fillStyle = '#9fc2e8'; ctx.font = '16px Verdana';
  ctx.fillText('10 story missions • street race • bank heist • taxi jobs • gun store • garage • safehouse', VW / 2, 250);
  ctx.fillText('Police, roadblocks and a helicopter • rain • day & night • 2 radio stations', VW / 2, 278);
  ctx.fillStyle = '#7ab34e'; ctx.font = 'bold 22px Verdana';
  ctx.fillText(S.saveExists ? 'Press ENTER to play — or C to Continue your save' : 'Press ENTER or CLICK to play', VW / 2, 350);
  ctx.fillStyle = '#ccc'; ctx.font = '15px Verdana';
  ctx.fillText('WASD move / drive   •   E steal cars & interact   •   F punch   •   Mouse aim, click to shoot', VW / 2, 420);
  ctx.fillText('1/2/3 switch weapons   •   R radio   •   P pause   •   M save', VW / 2, 446);
  ctx.fillStyle = '#f2c14e'; ctx.font = '14px Verdana';
  ctx.fillText('Mara is waiting at M. Steal a car. Make the city yours.', VW / 2, 500);
}
function drawPause() {
  ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 40px Verdana'; ctx.textAlign = 'center';
  ctx.fillText('PAUSED', VW / 2, VH / 2 - 20);
  ctx.font = '16px Verdana'; ctx.fillText('P to resume  •  M to save  •  Money $' + S.money + '  •  Missions done ' + S.stats.missionsDone + '/10', VW / 2, VH / 2 + 20);
}
function drawEnd(title, sub) {
  ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = title === 'BUSTED' ? '#4ea8f2' : '#e03a3a'; ctx.font = 'bold 56px Verdana'; ctx.textAlign = 'center';
  ctx.fillText(title, VW / 2, VH / 2 - 10);
  ctx.fillStyle = '#fff'; ctx.font = '18px Verdana'; ctx.fillText(sub, VW / 2, VH / 2 + 30);
  ctx.fillText('Press ENTER to respawn (lose 10% of your cash)', VW / 2, VH / 2 + 60);
}

// ---- staged screenshots (?shot=heli|heist|race|airport) ----
function setupShot(kind) {
  spawnTraffic(); spawnPeds(); spawnPickups();
  S.mode = 'play';
  const p = S.player;
  if (kind === 'heli') {
    S.clock = 22 * 60; S.weather = 'clear'; S.rain = 0;
    p.x = 2100; p.y = 2000; p.inCar = makeCar('sports', 2100, 2000, 0, 'player'); p.inCar.speed = 300; S.cars.push(p.inCar); p.onFoot = false;
    setWanted(5);
    for (let i = 0; i < 3; i++) { const c = spawnPoliceCar(); c.x = 2100 - 200 - i * 120; c.y = 2000 + (i - 1) * 60; }
    S.objective = 'WANTED 5 STARS — outrun the cops and the helicopter!';
    S.cam.x = 2100; S.cam.y = 2000;
  } else if (kind === 'heist') {
    S.clock = 15 * 60; S.weather = 'clear';
    p.x = 2400; p.y = 1800; p.inCar = makeCar('sports', 2400, 1800, Math.PI, 'player'); S.cars.push(p.inCar); p.onFoot = false;
    S.money = 2300; setWanted(4);
    startMission(5); // The Big Score
    S.missionStep = 2; S.missionData = {};
    S.objective = 'The Big Score: Getaway! Reach the Safehouse';
    S.cam.x = 2400; S.cam.y = 1800;
  } else if (kind === 'race') {
    S.clock = 17 * 60; S.weather = 'clear';
    p.x = 2400; p.y = 260; p.inCar = makeCar('sports', 2400, 260, -Math.PI / 2, 'player'); S.cars.push(p.inCar); p.onFoot = false;
    startMission(4); // Grand Prix
    S.cam.x = 2400; S.cam.y = 500;
  } else if (kind === 'airport') {
    S.clock = 10 * 60; S.weather = 'clear';
    p.x = 3950; p.y = 2750; p.inCar = makeCar('taxi', 3950, 2750, Math.PI / 2, 'player'); S.cars.push(p.inCar); p.onFoot = false;
    S.money = 1250; S.taxi.active = true; S.taxi.stage = 1;
    S.taxi.fare = { from: { x: 2400, y: 1800, name: 'Downtown' }, to: { x: 4000, y: 2900, name: 'Airport' }, pay: 120 };
    S.objective = 'TAXI: Downtown → Airport ($120)';
    S.cam.x = 3950; S.cam.y = 2750;
  }
  // settle the scene with fixed ticks so the shot is deterministic
  for (let i = 0; i < 30; i++) update(1 / 60);
  S.mode = 'shot';
}

// ---- main loop ----
let last = 0;
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
  last = t;
  if (S.mode === 'play') update(dt);
  ctx.clearRect(0, 0, VW, VH);
  if (S.mode === 'start') drawStart();
  else {
    drawWorld();
    if (S.mode !== 'shot') drawHUD();
    if (S.mode === 'pause') drawPause();
    if (S.mode === 'busted') drawEnd('BUSTED', 'The cops got you.');
    if (S.mode === 'wasted') drawEnd('WASTED', 'Solara Bay is unforgiving.');
    if (S.mode === 'shot') drawHUD();
  }
}

// ---- debug handle for playtesting ----
window.__solara = {
  get state() { return S; },
  get errors() { return S.errors; },
  start: () => startGame(),
  teleport: (x, y) => { S.player.x = x; S.player.y = y; if (S.player.inCar) { S.player.inCar.x = x; S.player.inCar.y = y; } S.cam.x = x; S.cam.y = y; },
  giveMoney: (n) => { S.money += n; },
  setWanted: (n) => setWanted(n),
  startMission: (i) => startMission(i),
  spawnCar: (type) => { const c = makeCar(type || 'sports', S.player.x + 60, S.player.y, 0, 'parked'); S.cars.push(c); return c.id; },
  stealNearest: () => interact(),
  shoot: () => shoot(),
  punch: () => punch(),
  save: () => saveGame(),
  load: () => loadSave(),
  setWeather: (w) => { S.weather = w; S.rain = w === 'rain' ? 1 : 0; },
  setClock: (mins) => { S.clock = mins; },
};

// ---- init ----
(function init() {
  const q = new URLSearchParams(location.search);
  const shot = q.get('shot');
  S.saveExists = !!localStorage.getItem('solara-bay-save');
  if (shot) {
    setupShot(shot);
  } else {
    // attract mode behind the start screen
    spawnTraffic(); spawnPeds(); spawnPickups();
    S.cam.x = 2400; S.cam.y = 1800;
  }
  // 'C' to continue a save from the start screen
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'c' && S.mode === 'start' && S.saveExists) { startGame(); loadSave(); say('Save loaded. Welcome back.'); }
  });
  requestAnimationFrame(frame);
})();
