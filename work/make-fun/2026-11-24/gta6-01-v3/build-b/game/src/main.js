// Solara Bay — main entry. Vanilla JS + Canvas, ES modules, no libraries, no network.
// Top-down open world: steal cars, police + helicopter, 10 missions, economy, weather, radio.
import { buildCity, DISTRICTS, WORLD_W, WORLD_H } from './city.js';
import { makeRng, clamp, dist2, angDiff, TAU } from './rng.js';
import { AudioEngine } from './audio.js';
import * as E from './entities.js';
import { MISSIONS, startMission, updateMission, missionObjective, demoteRivals } from './missions.js';
import { createRenderer, render } from './render.js';

const SAVE_KEY = 'solara-bay-save-v3';
const params = new URLSearchParams(location.search);
const SHOT = params.get('shot') || '';
const SEED = parseInt(params.get('seed') || '7', 10) || 7;

const canvas = document.getElementById('game');
const R = createRenderer(canvas);
if (SHOT) { const h = document.getElementById('help'); if (h) h.style.display = 'none'; }

function newGameState() {
  const rng = makeRng(SEED);
  const city = buildCity(SEED);
  city.districts = DISTRICTS;
  const G = {
    rng, city, seed: SEED,
    state: 'start', // start | play | pause | dead
    time: 0, shake: 0,
    viewW: canvas.width, viewH: canvas.height,
    cam: { x: 0, y: 0 },
    clock: { hours: 10, day: 1 },
    weather: { rain: false, timer: 90 },
    audio: new AudioEngine(),
    radioLabel: 'Radio: off (R)',
    player: {
      x: city.start.x, y: city.start.y, angle: 0, aim: 0, hp: 100, armor: 0,
      money: 250, weapon: 'pistol', ammo: { pistol: 24, shotgun: 0, smg: 0 },
      inCar: false, carId: 0, wanted: 0, dead: false, deadHow: '', deadT: 0,
      punchCd: 0, shootCd: 0, hurtCd: 0, punchAnim: 0, flash: 0,
    },
    cars: [], peds: [], footPolice: [], enemies: [], crates: [], pickups: [], particles: [],
    heli: { x: 0, y: 0, active: false, rotor: 0, beam: 0 },
    nextCarId: 1, wantedTimer: 14, mission: null, missionData: {},
    missionsCompleted: 0, nextMissionNum: 1,
    marker: null, message: '', messageT: 0, prompt: '', objectiveText: '',
    shopOpen: null, safehouseOwned: false,
    safehouseSpawn: { x: 4150, y: 1450 },
    saveExists: false, playerCarSpeed: 0,
    taxiSpots: [],
  };
  return G;
}

const G = newGameState();
G.saveExists = (() => { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } })();

// ---------- world population ----------
E.spawnTraffic(G, 26);
E.spawnPeds(G, 34);
// a few parked cars near start, on the road (south lane of y=2200)
for (let i = 0; i < 6; i++) {
  const x = 2050 + i * 130, y = 2214;
  const c = E.makeCar(G, ['sedan', 'sports', 'taxi', 'truck', 'moto', 'sedan'][i], x, y, 0, 'parked');
  c.targetSpeed = 0;
}
for (const [x, y, k, a] of [[2400, 2300, 'cash', 100], [1900, 1700, 'ammo', 0], [2600, 1900, 'health', 0], [4200, 1200, 'cash', 150], [1300, 2900, 'ammo', 0], [3700, 2700, 'cash', 80]]) {
  G.pickups.push({ x, y, kind: k, amount: a, t: 0 });
}

// ---------- input (edge-triggered) ----------
const input = { keys: new Set(), pressed: new Set(), mouseX: 0, mouseY: 0, mouseIn: false, mouseDown: false, mouseClicked: false };
const KEYMAP = { KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1, ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, Space: 1 };
window.addEventListener('keydown', (e) => {
  if (e.code === 'Tab') e.preventDefault();
  if (!e.repeat) input.pressed.add(e.code);
  input.keys.add(e.code);
  if (KEYMAP[e.code]) e.preventDefault();
  G.audio.ensure();
});
window.addEventListener('keyup', (e) => input.keys.delete(e.code));
canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  input.mouseX = (e.clientX - r.left) * (canvas.width / r.width);
  input.mouseY = (e.clientY - r.top) * (canvas.height / r.height);
  input.mouseIn = true;
});
canvas.addEventListener('mousedown', (e) => { input.mouseDown = true; input.mouseClicked = true; G.audio.ensure(); if (G.state === 'start') startGame(false); });
canvas.addEventListener('mouseup', () => { input.mouseDown = false; });
window.addEventListener('blur', () => { input.keys.clear(); input.mouseDown = false; });

function mouseWorld() {
  return { x: G.cam.x + input.mouseX, y: G.cam.y + input.mouseY };
}

// ---------- save / load ----------
G.saveGame = function (auto) {
  try {
    const p = G.player;
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      x: p.x, y: p.y, money: p.money, hp: p.hp, armor: p.armor, weapon: p.weapon, ammo: p.ammo,
      missionsCompleted: G.missionsCompleted, safehouseOwned: G.safehouseOwned,
      hours: G.clock.hours, day: G.clock.day, auto: !!auto,
    }));
    G.saveExists = true;
    if (!auto) { G.message = 'Game saved.'; G.messageT = 2; }
  } catch (e) { /* storage unavailable */ }
};
function loadGame() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!s) return false;
    const p = G.player;
    p.x = s.x; p.y = s.y; p.money = s.money; p.hp = s.hp; p.armor = s.armor; p.weapon = s.weapon; p.ammo = s.ammo;
    G.missionsCompleted = s.missionsCompleted || 0; G.nextMissionNum = G.missionsCompleted + 1;
    G.safehouseOwned = !!s.safehouseOwned;
    G.clock.hours = s.hours || 10; G.clock.day = s.day || 1;
    return true;
  } catch (e) { return false; }
}

// ---------- shops ----------
function shopItems(shop) {
  if (shop.kind === 'gun') return [
    { name: 'Pistol ammo +24', price: 60, desc: 'Top up your pistol', buy() { G.player.ammo.pistol += 24; } },
    { name: 'Shotgun', price: 400, desc: 'Close-range power, 12 shells', buy() { G.player.ammo.shotgun += 12; if (G.player.weapon === 'fists') G.player.weapon = 'shotgun'; } },
    { name: 'SMG', price: 700, desc: 'Rapid fire, 60 rounds', buy() { G.player.ammo.smg += 60; if (G.player.weapon === 'fists') G.player.weapon = 'smg'; } },
    { name: 'Body armor', price: 250, desc: 'Absorbs 100 damage', buy() { G.player.armor = 100; } },
  ];
  if (shop.kind === 'garage') return [
    { name: 'Repair current car', price: 100, desc: 'Full HP restore', buy() { const c = G.cars.find((x) => x.id === G.player.carId); if (c) { c.hp = c.maxHp; c.smoke = 0; } else throw new Error('no car'); } },
    { name: 'Repaint current car', price: 50, desc: 'Fresh coat, random color', buy() { const c = G.cars.find((x) => x.id === G.player.carId); if (c) c.paint = ['#d04040', '#40a0d0', '#e8c020', '#40a060', '#8040a0'][G.rng.int(0, 4)]; else throw new Error('no car'); } },
  ];
  return [
    { name: 'Buy this safehouse — $1,500', price: 1500, desc: 'Respawn here after Busted/Wasted', buy() { if (G.safehouseOwned) throw new Error('owned'); G.safehouseOwned = true; } },
    { name: 'Rest & heal — free', price: 0, desc: 'Restore HP to 100', buy() { G.player.hp = 100; } },
  ];
}
function openShop(shop) {
  G.shopOpen = { shop, items: shopItems(shop), sel: 0, result: '' };
}
function buySelected() {
  const s = G.shopOpen; if (!s) return;
  const it = s.items[s.sel];
  if (G.player.money < it.price) { s.result = 'Not enough cash!'; G.audio.missionFail(); return; }
  try {
    it.buy();
    G.player.money -= it.price;
    s.result = `Bought: ${it.name}`;
    G.audio.cash();
  } catch (e) { s.result = 'Needs a car — drive one in first.'; }
}

// ---------- combat ----------
function shoot() {
  const p = G.player;
  if (p.shootCd > 0 || p.inCar || p.dead) return;
  const w = p.weapon;
  if (w === 'fists') return;
  if ((p.ammo[w] || 0) <= 0) { p.shootCd = 0.3; G.message = 'Out of ammo — buy more at a gun store'; G.messageT = 2; return; }
  const mw = mouseWorld();
  const ang = Math.atan2(mw.y - p.y, mw.x - p.x);
  p.aim = ang; p.flash = 0.08;
  const rate = w === 'smg' ? 0.09 : w === 'shotgun' ? 0.7 : 0.25;
  p.shootCd = rate;
  p.ammo[w]--;
  G.audio.shoot(w);
  const pellets = w === 'shotgun' ? 3 : 1;
  for (let i = 0; i < pellets; i++) {
    const a = ang + (pellets > 1 ? (i - 1) * 0.12 : 0);
    fireRay(a, w === 'shotgun' ? 14 : w === 'smg' ? 12 : 22, 420);
  }
}
function fireRay(ang, dmg, range) {
  const p = G.player;
  const dx = Math.cos(ang), dy = Math.sin(ang);
  let best = null, bd = range;
  const consider = (x, y, r, obj) => {
    const rx = x - p.x, ry = y - p.y;
    const along = rx * dx + ry * dy;
    if (along < 0 || along > bd) return;
    const perp = Math.abs(-rx * dy + ry * dx);
    if (perp < r + 6) { bd = along; best = obj; }
  };
  for (const e of G.enemies) consider(e.x, e.y, 12, { kind: 'enemy', o: e });
  for (const c of G.footPolice) consider(c.x, c.y, 12, { kind: 'cop', o: c });
  for (const ped of G.peds) consider(ped.x, ped.y, 10, { kind: 'ped', o: ped });
  for (const car of G.cars) {
    if (car.dead || car.ai === 'player') continue;
    consider(car.x, car.y, 26, { kind: 'car', o: car });
  }
  const hx = p.x + dx * bd, hy = p.y + dy * bd;
  G.particles.push({ x: hx, y: hy, vx: 0, vy: 0, life: 0.15, max: 0.15, kind: 'spark', size: 6 });
  if (!best) return;
  if (best.kind === 'enemy') {
    best.o.hp -= dmg;
    if (best.o.hp <= 0) { G.enemies = G.enemies.filter((e) => e !== best.o); E.dropCash(G, best.o.x, best.o.y, 30); }
  } else if (best.kind === 'cop') {
    best.o.hp -= dmg;
    if (best.o.hp <= 0) { G.footPolice = G.footPolice.filter((c) => c !== best.o); }
    E.addWanted(G, 1);
  } else if (best.kind === 'ped') {
    best.o.panic = 3; E.addWanted(G, 1);
  } else if (best.kind === 'car') {
    E.damageCar(G, best.o, dmg);
    if (best.o.ai === 'police') E.addWanted(G, 1);
    if (best.o.ai === 'traffic' || best.o.ai === 'parked') E.addWanted(G, 1);
  }
}
function punch() {
  const p = G.player;
  if (p.punchCd > 0 || p.inCar || p.dead) return;
  p.punchCd = 0.4; p.punchAnim = 0.18;
  G.audio.punch();
  const hit = (x, y, r) => {
    const d = Math.hypot(x - p.x, y - p.y);
    if (d > 46) return false;
    return Math.abs(angDiff(Math.atan2(y - p.y, x - p.x), p.aim || p.angle)) < 1.1;
  };
  for (const e of [...G.enemies]) {
    if (hit(e.x, e.y, 12)) {
      e.hp -= 18; e.x += Math.cos(p.aim || 0) * 14; e.y += Math.sin(p.aim || 0) * 14;
      if (e.hp <= 0) { G.enemies = G.enemies.filter((x) => x !== e); E.dropCash(G, e.x, e.y, 30); }
    }
  }
  for (const c of [...G.footPolice]) {
    if (hit(c.x, c.y, 12)) { c.hp -= 18; E.addWanted(G, 1); if (c.hp <= 0) G.footPolice = G.footPolice.filter((x) => x !== c); }
  }
  for (const ped of G.peds) {
    if (hit(ped.x, ped.y, 10)) { ped.panic = 3; E.addWanted(G, 1); }
  }
}
function updateEnemies(G, dt) {
  const p = G.player;
  for (const e of G.enemies) {
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    if (d < 420 && !p.dead) {
      e.angle = Math.atan2(p.y - e.y, p.x - e.x);
      if (d > 36) { e.x += Math.cos(e.angle) * 170 * dt; e.y += Math.sin(e.angle) * 170 * dt; }
      else if (e.cd <= 0) { e.cd = 0.9; E.hurtPlayer(G, 9, 'wasted'); }
    }
    if (e.cd > 0) e.cd -= dt;
    E.resolveCircle(G, e, 12);
  }
}

// ---------- game flow ----------
function startGame(fromSave) {
  G.audio.ensure();
  if (fromSave && loadGame()) { G.message = 'Welcome back to Solara Bay.'; G.messageT = 2.5; }
  else if (fromSave) { G.message = 'No save found — new game.'; G.messageT = 2; }
  G.state = 'play';
}
function nearestShop() {
  let best = null, bd = 95 * 95;
  for (const s of G.city.shops) {
    const d = dist2(G.player.x, G.player.y, s.x, s.y);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}
function handleKeys() {
  const pr = input.pressed;
  if (pr.has('Enter')) {
    if (G.state === 'start') startGame(G.saveExists);
    else if (G.state === 'dead') E.respawnPlayer(G);
  }
  if (G.state === 'start') {
    if (pr.has('KeyC')) startGame(false);
    return;
  }
  if (pr.has('KeyP') && G.state !== 'dead') {
    if (G.shopOpen) G.shopOpen = null;
    else G.state = G.state === 'pause' ? 'play' : 'pause';
  }
  if (G.state !== 'play') return;
  // shop open: shop keys only
  if (G.shopOpen) {
    const s = G.shopOpen;
    if (pr.has('Escape') || pr.has('KeyE')) G.shopOpen = null;
    else if (pr.has('ArrowUp') || pr.has('KeyW')) s.sel = (s.sel + s.items.length - 1) % s.items.length;
    else if (pr.has('ArrowDown') || pr.has('KeyS')) s.sel = (s.sel + 1) % s.items.length;
    else if (pr.has('Enter')) buySelected();
    else {
      for (let i = 0; i < s.items.length; i++) if (pr.has('Digit' + (i + 1))) { s.sel = i; buySelected(); }
    }
    return;
  }
  if (pr.has('KeyM')) G.saveGame(false);
  if (pr.has('KeyR')) {
    const label = G.audio.toggleRadio();
    G.radioLabel = label === 'off' ? 'Radio: off (R)' : 'Radio: ' + label;
  }
  if (pr.has('KeyT')) {
    const label = G.audio.switchStation();
    if (G.audio.radioOn) G.radioLabel = 'Radio: ' + label;
  }
  if (pr.has('KeyN')) {
    if (!G.mission && G.nextMissionNum <= 10) {
      startMission(G, G.nextMissionNum);
      G.nextMissionNum = G.mission ? G.mission.num : G.nextMissionNum;
    } else if (!G.mission) { G.message = 'All 10 missions done — free roam!'; G.messageT = 2; }
  }
  if (pr.has('Digit1')) G.player.weapon = 'pistol';
  if (pr.has('Digit2') && (G.player.ammo.shotgun || 0) > 0) G.player.weapon = 'shotgun';
  if (pr.has('Digit3') && (G.player.ammo.smg || 0) > 0) G.player.weapon = 'smg';
  if (pr.has('KeyH')) G.audio.horn();
  if (pr.has('KeyF')) punch();
  // E — edge-triggered only: exit car > steal car > shop (steal outranks shops)
  if (pr.has('KeyE')) {
    const p = G.player;
    if (p.inCar) E.exitCar(G);
    else {
      const car = E.nearestCar(G, p.x, p.y, 70);
      if (car) {
        if (car.ai === 'traffic' || car.ai === 'parked' || car.ai === 'police') {
          E.enterCar(G, car);
          E.addWanted(G, 1);
        }
      } else {
        const shop = nearestShop();
        if (shop) openShop(shop);
      }
    }
  }
}
function updatePrompt() {
  const p = G.player;
  if (G.state !== 'play' || G.shopOpen || p.dead) { G.prompt = ''; return; }
  if (p.inCar) { G.prompt = 'E — Exit car    Space — Handbrake'; return; }
  const car = E.nearestCar(G, p.x, p.y, 70);
  if (car) { G.prompt = car.ai === 'parked' ? 'E — Enter car' : 'E — Steal car (!)'; return; }
  const shop = nearestShop();
  if (shop) { G.prompt = `E — Enter ${shop.name}`; return; }
  G.prompt = '';
}

// ---------- update ----------
function update(dt) {
  G.time += dt;
  if (G.messageT > 0) G.messageT -= dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 30);
  const p = G.player;
  if (p.punchAnim > 0) p.punchAnim -= dt;
  if (p.flash > 0) p.flash -= dt;
  // clock: 1 game hour per 60s
  G.clock.hours += dt / 60;
  if (G.clock.hours >= 24) { G.clock.hours -= 24; G.clock.day++; }
  // weather cycle: 90s clear, 40s rain
  G.weather.timer -= dt;
  if (G.weather.timer <= 0) {
    G.weather.rain = !G.weather.rain;
    G.weather.timer = G.weather.rain ? 40 : 90;
    G.message = G.weather.rain ? 'Rain moving in — roads are slick.' : 'Skies clearing over the Bay.';
    G.messageT = 2;
  }
  // traffic lights cycle
  for (const l of G.city.lights) {
    const ph = (G.time + l.t) % 12;
    l.state = ph < 6 ? 'green' : ph < 7 ? 'yellow' : 'red';
  }
  // boating bob handled in render via G.time
  E.updatePlayer(G, dt, input);
  const pc = p.inCar ? G.cars.find((c) => c.id === p.carId) : null;
  G.playerCarSpeed = pc ? pc.speed : 0;
  E.updateCars(G, dt);
  E.updatePeds(G, dt);
  E.updateFootPolice(G, dt);
  E.updateHeli(G, dt);
  E.updateWanted(G, dt);
  E.updateParticles(G, dt);
  E.updatePickups(G, dt);
  updateEnemies(G, dt);
  updateMission(G, dt);
  // mission completion bookkeeping
  if (G.missionDone) { G.nextMissionNum = G.missionDone + 1; G.missionDone = 0; }
  // shooting (hold for SMG; a quick click also fires via the edge flag)
  if (input.mouseDown || input.mouseClicked) shoot();
  input.mouseClicked = false;
  // camera
  const cw = G.viewW, ch = G.viewH;
  G.cam.x = clamp(p.x - cw / 2, 0, WORLD_W - cw);
  G.cam.y = clamp(p.y - ch / 2, 0, WORLD_H - ch);
  G.objectiveText = missionObjective(G);
  updatePrompt();
  // dead handling
  if (p.dead) { p.deadT += dt; if (p.deadT > 0.4 && G.state === 'play') G.state = 'dead'; }
  // keep traffic topped up
  const live = G.cars.filter((c) => !c.dead && (c.ai === 'traffic' || c.ai === 'parked')).length;
  if (live < 20 && G.rng.chance(dt * 0.5)) E.spawnTraffic(G, 2);
  if (G.peds.length < 24 && G.rng.chance(dt * 0.3)) E.spawnPeds(G, 3);
}

// ---------- staged screenshots (?shot=) ----------
function stageShot() {
  const p = G.player;
  document.getElementById('help')?.remove?.();
  G.state = 'play';
  if (SHOT === 'start') {
    G.state = 'start';
    G.cam.x = 2000; G.cam.y = 1400;
    return;
  }
  const putInCar = (type, x, y, angle) => {
    const car = E.makeCar(G, type, x, y, angle, 'player');
    p.x = x; p.y = y; p.inCar = true; p.carId = car.id;
    return car;
  };
  if (SHOT === 'chase') {
    G.clock.hours = 22.5; G.weather.rain = true;
    putInCar('sports', 2200, 2200, -Math.PI / 2);
    p.wanted = 4; p.money = 3250; p.hp = 82;
    E.ensurePolice(G);
    G.heli.active = true; G.heli.x = 2340; G.heli.y = 1990;
    G.marker = { x: 900, y: 2900, label: 'Getaway — Beach' };
    G.mission = { id: 'heist', num: 5, name: 'The Big Score', def: MISSIONS[4] };
    G.missionData = { stage: 'getaway', hold: 6 };
  } else if (SHOT === 'heist') {
    G.clock.hours = 20.2;
    p.x = 2400; p.y = 1800; p.weapon = 'shotgun'; p.ammo.shotgun = 12; p.wanted = 4; p.money = 12500;
    E.ensurePolice(G);
    for (let i = 0; i < 2; i++) E.makeCar(G, 'police', 2250 + i * 200, 2150, -Math.PI / 2, 'police');
    G.marker = { x: 900, y: 2900, label: 'Getaway — Beach' };
    G.mission = { id: 'heist', num: 5, name: 'The Big Score', def: MISSIONS[4] };
    G.missionData = { stage: 'getaway', hold: 6 };
  } else if (SHOT === 'race') {
    G.clock.hours = 16;
    putInCar('sports', 2200, 2200, -Math.PI / 2);
    startMission(G, 6);
    G.missionData.i = 1;
    G.marker = { x: 4200, y: 1000, label: 'Checkpoint 2/6' };
    p.money = 1800;
  } else if (SHOT === 'airport') {
    G.clock.hours = 12;
    putInCar('taxi', 3800, 1800, 0);
    p.money = 950;
    G.marker = { x: 3900, y: 1650, label: 'Airport Terminal' };
    G.mission = { id: 'airport', num: 8, name: 'Flight Risk', def: MISSIONS[7] };
    G.missionData = { t: 87 };
  }
  // settle the world: run fixed steps so traffic/police/heli are in place
  for (let i = 0; i < 90; i++) update(1 / 60);
  G.state = 'play';
  G.cam.x = clamp(p.x - G.viewW / 2, 0, WORLD_W - G.viewW);
  G.cam.y = clamp(p.y - G.viewH / 2, 0, WORLD_H - G.viewH);
  render(G, R);
}

// ---------- debug handle for playtesting (read-only state + test helpers) ----------
window.__solara = {
  get state() { return G.state; },
  get player() { return { x: G.player.x, y: G.player.y, hp: G.player.hp, money: G.player.money, wanted: G.player.wanted, inCar: G.player.inCar, weapon: G.player.weapon, ammo: { ...G.player.ammo }, dead: G.player.dead }; },
  get mission() { return G.mission ? { num: G.mission.num, name: G.mission.name, objective: missionObjective(G) } : null; },
  get missionsCompleted() { return G.missionsCompleted; },
  get cars() { return G.cars.length; },
  get policeCars() { return G.cars.filter((c) => c.ai === 'police' && !c.dead).length; },
  get heliActive() { return G.heli.active; },
  get footPolice() { return G.footPolice.length; },
  get weather() { return G.weather.rain ? 'rain' : 'clear'; },
  get clock() { return { hours: G.clock.hours, day: G.clock.day }; },
  get errors() { return window.__solaraErrors || []; },
  debug: {
    start(fromSave) { startGame(!!fromSave); },
    setWanted(n) { G.player.wanted = n; G.wantedTimer = 14; E.ensurePolice(G); },
    teleport(x, y) { G.player.x = x; G.player.y = y; if (G.player.inCar) { const c = G.cars.find((c) => c.id === G.player.carId); if (c) { c.x = x; c.y = y; } } },
    giveMoney(n) { G.player.money += n; },
    startMission(n) { return startMission(G, n); },
    missionData() { return JSON.parse(JSON.stringify(G.missionData, (k, v) => (k === 'checkpoints' || k === 'stops' ? v.length : v))); },
    rivals() { return G.cars.filter((c) => c.rival).map((c) => ({ type: c.type, ai: c.ai, checkpoint: c.checkpoint })); },
    nearestCar() { const c = E.nearestCar(G, G.player.x, G.player.y, 200); return c ? { type: c.type, ai: c.ai, x: c.x, y: c.y } : null; },
    enterNearestCar() { const c = E.nearestCar(G, G.player.x, G.player.y, 70); if (c) { E.enterCar(G, c); return c.type; } return null; },
    exitCar() { E.exitCar(G); },
    shootAt(x, y) { input.mouseX = x - G.cam.x; input.mouseY = y - G.cam.y; input.mouseIn = true; shoot(); },
    punch() { punch(); },
    setRain(on) { G.weather.rain = !!on; },
    setHour(h) { G.clock.hours = h; },
    save() { G.saveGame(false); },
    load() { return loadGame(); },
    enemies() { return G.enemies.length; },
    keys() { return [...input.keys]; },
    findCar(type) {
      let best = null, bd = 1500 * 1500;
      for (const c of G.cars) {
        if (c.dead || c.ai === 'player' || (type && c.type !== type)) continue;
        const d = dist2(c.x, c.y, G.player.x, G.player.y);
        if (d < bd) { bd = d; best = c; }
      }
      if (!best) return null;
      G.player.x = best.x - 30; G.player.y = best.y;
      if (G.player.inCar) { const pc = G.cars.find((c) => c.id === G.player.carId); if (pc) { pc.x = best.x - 30; pc.y = best.y; } }
      return { type: best.type, ai: best.ai, x: best.x, y: best.y };
    },
    giveAmmo(weapon, n) { G.player.ammo[weapon] = (G.player.ammo[weapon] || 0) + n; },
    setWeapon(w) { G.player.weapon = w; },
    heal() { G.player.hp = 100; G.player.armor = 100; },
    spawnCar(type) {
      const c = E.makeCar(G, type, G.player.x + 60, G.player.y, 0, 'parked');
      c.targetSpeed = 0;
      return { type: c.type, x: c.x, y: c.y };
    },
    enterCarByType(type) {
      let best = null, bd = 200 * 200;
      for (const c of G.cars) {
        if (c.dead || c.ai === 'player' || c.type !== type) continue;
        const d = dist2(c.x, c.y, G.player.x, G.player.y);
        if (d < bd) { bd = d; best = c; }
      }
      if (!best) return null;
      E.enterCar(G, best);
      return { type: best.type, x: best.x, y: best.y };
    },
    enemiesPos() { return G.enemies.map((e) => ({ x: e.x, y: e.y, hp: e.hp })); },
    cam() { return { x: G.cam.x, y: G.cam.y }; },
    damagePlayer(n) { E.hurtPlayer(G, n, 'wasted'); },
    crates() { return (G.crates || []).filter((c) => !c.taken).length; },
    marker() { return G.marker; },
  },
};
window.__solaraErrors = [];
window.addEventListener('error', (e) => { window.__solaraErrors.push(String(e.message || e.error)); });

// ---------- main loop ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); // clamp at 0.1 so game time tracks real time down to 10fps
  last = now;
  handleKeys();
  if (G.state === 'play' && !G.shopOpen) update(dt);
  else if (G.state === 'start') { G.time += dt; G.cam.x = 2000 + Math.sin(G.time * 0.05) * 200; G.cam.y = 1400; }
  render(G, R);
  input.pressed.clear();
  requestAnimationFrame(frame);
}
if (SHOT) {
  stageShot();
} else {
  requestAnimationFrame(frame);
}
