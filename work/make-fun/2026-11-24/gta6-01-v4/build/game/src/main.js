// Vice Bay — main entry. Vanilla JS + Canvas, ES modules, no libraries, no network.
// Top-down open world: steal cars, police + helicopter, 16 missions in 3 acts,
// economy, weather, radio, save/load. Fixed 1/60 s steps; the renderer paints
// what is there. ?shot=chase|marina|neon|finale (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady.
import { WORLD_W, WORLD_H, STEP, WEAPONS, START_MONEY } from './config.js';
import { makeRng, clamp } from './rng.js';
import { buildCity, resolveBuildingCollision } from './city.js';
import { createInput, driveKeys, walkKeys } from './input.js';
import { makeCar, spawnTraffic, spawnParked, drivePlayerCar, updateTrafficCar, collideCars, carById, nearestCar } from './vehicles.js';
import { spawnPeds, updatePeds } from './pedestrians.js';
import { updatePolice, addWanted } from './police.js';
import { playerShoot, updateEnemies, updateBarrels } from './combat.js';
import { MISSIONS, missionById } from './missions.js';
import { nearShop, gunMenu, buyGunItem, garageMenu, buyGarageItem, useSafehouse, updatePackages, updateJumps, updateTaxi, startRace, updateRace } from './economy.js';
import { createWeather, updateWeather } from './weather.js';
import { AudioEngine } from './audio.js';
import { updateParticles, damageCar, hurtPlayer, addFloater } from './particles.js';
import { createRenderer } from './render.js';
import { drawHUD, drawTitle, drawBriefing, drawShop, drawPause, drawMissionList, drawDead, drawEnding } from './hud.js';
import { saveGame, loadGame, saveExists } from './save.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const SHOT = params.get('shot') || '';
const SEED = parseInt(params.get('seed') || '7', 10) || 7;

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const helpEl = document.getElementById('help');
const renderer = createRenderer(canvas);

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function newGameState() {
  const rng = makeRng(SEED);
  const city = buildCity(SEED);
  const G = {
    rng, city, seed: SEED,
    state: 'title', // title | play | pause | briefing | shop | dead | ending | missionlist
    time: 0, shake: 0,
    viewW: canvas.width, viewH: canvas.height,
    cam: { x: 0, y: 0 },
    clock: { hours: 10, minutes: 0, day: 1 },
    weather: createWeather(),
    audio: new AudioEngine(),
    player: {
      x: city.start.x, y: city.start.y, angle: -Math.PI / 2, aim: 0, hp: 100, armor: 0,
      money: START_MONEY, weapon: 'pistol', ammo: { pistol: 24, shotgun: 0, smg: 0, rifle: 0 },
      inCar: false, carId: 0, wanted: 0, rep: 0, dead: false, deadT: 0,
      punchCd: 0, shootCd: 0, hurtCd: 0, punchAnim: 0, flash: 0,
    },
    cars: [], peds: [], footCops: [], enemies: [], barrels: [], pickups: [], particles: [], floaters: [],
    heli: { x: 0, y: 0, active: false, rotor: 0, beam: false },
    wantedTimer: 14, roadblockT: 0,
    mission: null, missionsCompleted: 0, nextMission: 1, allMissions: MISSIONS,
    marker: null, message: '', messageT: 0, banner: '', bannerT: 0, bannerColor: '', bannerSub: '',
    objectiveText: '', prompt: '', briefing: null, shopOpen: null,
    safehouseOwned: false, saveExists: false, playerCarSpeed: 0,
    taxi: { active: false, phase: 'pickup', spawnT: 8, timer: 0, ped: null, dest: null },
    race: { active: false, gates: [], i: 0, timer: 0 },
    stats: { kills: 0, carsStolen: 0, packages: 0, racesWon: 0, fares: 0, jumps: 0, pedsHit: 0 },
    deadHow: 'wasted',
  };
  G.saveGame = (quiet) => saveGame(G, quiet);
  G.loadGame = () => loadGame(G);
  return G;
}

const G = newGameState();
G.saveExists = saveExists();
window.__vicebay = G;

// ---------- world population ----------
spawnTraffic(G, 26);
spawnPeds(G, 34);
spawnParked(G, 10);
for (const [x, y, k, a] of [[2400, 2300, 'cash', 100], [1900, 1700, 'ammo', 0], [2600, 1900, 'health', 0], [4200, 1200, 'cash', 150], [1300, 2900, 'ammo', 0], [3700, 2700, 'cash', 80], [5100, 800, 'health', 0], [900, 3800, 'cash', 120]]) {
  G.pickups.push({ x, y, kind: k, amount: a, t: 0 });
}

const input = createInput(canvas);

function announce(msg) { if (statusEl) statusEl.textContent = msg; }
function setMissionMarker() {
  if (G.nextMission > 16) { G.marker = null; G.objectiveText = 'All missions complete — free roam Vice Bay!'; return; }
  const m = missionById(G.nextMission);
  G.marker = { x: m.startAt.x, y: m.startAt.y, label: `MISSION ${m.id}` };
  G.objectiveText = `Next mission: ${m.name} — go to the marker`;
}
setMissionMarker();

function startMissionBriefing(def) {
  G.briefing = def;
  G.state = 'briefing';
  announce(`Mission ${def.id}: ${def.name}. Press Enter to accept.`);
}

function acceptMission() {
  const def = G.briefing;
  G.briefing = null;
  G.mission = { def, stage: 0, t: 0, data: {} };
  def.start(G);
  G.state = 'play';
  G.message = `Mission ${def.id} — ${def.name}`;
  G.messageT = 3;
  announce(`Mission started: ${def.name}`);
}

function endMission(result) {
  const def = G.mission.def;
  G.mission = null;
  G.enemies.length = 0;
  G.barrels.length = 0;
  for (const c of G.cars) if ((c.role === 'rival' || c.role === 'mission') && c.id !== G.player.carId) { c.role = 'traffic'; c.targetSpeed = 200; }
  if (result === 'done') {
    G.player.money += def.reward;
    G.missionsCompleted++;
    G.nextMission++;
    G.banner = 'MISSION COMPLETE';
    G.bannerSub = `${def.name}  •  +$${def.reward}  •  +${def.rep} REP`;
    G.bannerColor = '#7ee081';
    G.bannerT = 3.5;
    G.audio.sfx('win');
    announce(`Mission complete: ${def.name}`);
    if (def.id === 16) { G.state = 'ending'; return; }
  } else {
    G.banner = 'MISSION FAILED';
    G.bannerSub = def.name;
    G.bannerColor = '#ff5252';
    G.bannerT = 3;
    G.audio.sfx('fail');
    announce(`Mission failed: ${def.name}`);
  }
  G.marker = null;
  G.objectiveText = '';
  setMissionMarker();
}

function enterCar(car) {
  const p = G.player;
  p.inCar = true;
  p.carId = car.id;
  car.role = 'player';
  car.driver = 'player';
  G.stats.carsStolen++;
  // Stealing in front of the cops is a crime.
  const copNear = G.cars.some((c) => (c.role === 'police' || c.role === 'roadblock') && Math.hypot(c.x - p.x, c.y - p.y) < 520);
  if (copNear) addWanted(G, 1, 'Car stolen in front of the cops!');
  G.audio.sfx('click');
  announce(`Driving ${car.type}.`);
}

function exitCar() {
  const p = G.player;
  const car = carById(G, p.carId);
  if (!car) { p.inCar = false; p.carId = 0; return; }
  const side = car.angle + Math.PI / 2;
  p.x = car.x + Math.cos(side) * (car.h / 2 + 16);
  p.y = car.y + Math.sin(side) * (car.h / 2 + 16);
  p.angle = car.angle;
  car.speed = 0;
  car.role = 'parked';
  p.inCar = false;
  p.carId = 0;
  announce('On foot.');
}

function respawn() {
  const p = G.player;
  p.dead = false;
  p.hp = 100;
  p.armor = 0;
  p.money = Math.max(0, Math.floor(p.money * 0.9));
  p.wanted = 0;
  p.inCar = false;
  p.carId = 0;
  if (G.safehouseOwned) { p.x = 2350; p.y = 3050; }
  else { p.x = G.city.start.x; p.y = G.city.start.y; }
  G.heli.active = false;
  G.footCops.length = 0;
  G.state = 'play';
  G.message = 'Back on the streets.';
  G.messageT = 2;
}

// ---------- interactions ----------
function contextAction() {
  const p = G.player;
  if (!p.inCar) {
    // Mission marker.
    if (!G.mission && G.marker && Math.hypot(p.x - G.marker.x, p.y - G.marker.y) < 110) {
      const def = missionById(G.nextMission);
      if (def) { startMissionBriefing(def); return; }
    }
    // Shops vs cars: whichever the player is closer to wins, so a car parked
    // in front of a shop door never blocks the shop (and vice versa).
    const shop = nearShop(G);
    const shopD = shop ? Math.hypot(shop.x - p.x, shop.y - p.y) : Infinity;
    const closeCar = nearestCar(G, p.x, p.y, 78);
    const carD = closeCar ? Math.hypot(closeCar.x - p.x, closeCar.y - p.y) : Infinity;
    if (closeCar && carD < shopD) { enterCar(closeCar); return; }
    if (shop) {
      if (shop.kind === 'gun') { G.shopOpen = { shop, menu: gunMenu(G), sel: 0, feedback: '' }; G.state = 'shop'; return; }
      if (shop.kind === 'safehouse') { G.message = useSafehouse(G); G.messageT = 3; return; }
      if (shop.kind === 'casino') { G.message = 'The tables are for the heist. Mission 14.'; G.messageT = 2.5; return; }
      if (shop.kind === 'hospital') {
        if (G.player.hp >= 100) { G.message = 'You are already at full health.'; G.messageT = 2; return; }
        if (G.player.money < 150) { G.message = 'Treatment costs $150.'; G.messageT = 2; return; }
        G.player.money -= 150; G.player.hp = 100;
        G.message = 'Patched up — full health. -$150';
        G.messageT = 2.5;
        G.audio.sfx('pickup');
        return;
      }
      if (shop.kind === 'taxi') { G.message = 'Grab a yellow taxi and fares will find you.'; G.messageT = 2.5; return; }
      if (shop.kind === 'race') { if (!G.race.active) startRace(G); return; }
      if (shop.kind === 'bar') { G.state = 'missionlist'; return; }
      return;
    }
    // (No car close enough and no shop: nothing to use here.)
  } else {
    // In a car: garage when parked at Dante's.
    const garage = G.city.shops.garage;
    const pc = carById(G, p.carId);
    if (pc && Math.hypot(pc.x - garage.x, pc.y - garage.y) < 120) {
      G.shopOpen = { shop: garage, menu: garageMenu(G), sel: 0, feedback: '' };
      G.state = 'shop';
      return;
    }
    exitCar();
  }
}

function computePrompt() {
  const p = G.player;
  G.prompt = '';
  if (G.state !== 'play') return;
  if (!p.inCar) {
    if (!G.mission && G.marker && Math.hypot(p.x - G.marker.x, p.y - G.marker.y) < 110) { G.prompt = `E — Start mission ${G.nextMission}: ${missionById(G.nextMission).name}`; return; }
    const shop = nearShop(G);
    const shopD = shop ? Math.hypot(shop.x - p.x, shop.y - p.y) : Infinity;
    const closeCar = nearestCar(G, p.x, p.y, 78);
    const carD = closeCar ? Math.hypot(closeCar.x - p.x, closeCar.y - p.y) : Infinity;
    if (closeCar && carD < shopD) { G.prompt = `E — Steal ${closeCar.type}`; return; }
    if (shop) {
      if (shop.kind === 'gun') G.prompt = 'E — Ammo-Nation (gun store)';
      else if (shop.kind === 'safehouse') G.prompt = G.safehouseOwned ? 'E — Safehouse: heal + save' : `E — Buy safehouse $${1500}`;
      else if (shop.kind === 'garage') G.prompt = 'E — Garage: bring a car';
      else if (shop.kind === 'casino') G.prompt = 'Casino Royale';
      else if (shop.kind === 'hospital') G.prompt = 'E — Vice General: heal $150';
      else if (shop.kind === 'taxi') G.prompt = 'Taxi stand';
      else if (shop.kind === 'race') G.prompt = 'E — Street race ($500)';
      else if (shop.kind === 'bar') G.prompt = "E — Sal's Bar (missions)";
      return;
    }
    const car = nearestCar(G, p.x, p.y, 78);
    if (car) { G.prompt = `E — Steal ${car.type}`; return; }
  } else {
    const garage = G.city.shops.garage;
    const pc = carById(G, p.carId);
    if (pc && Math.hypot(pc.x - garage.x, pc.y - garage.y) < 120) { G.prompt = "E — Dante's Customs (repair / repaint)"; return; }
    G.prompt = 'E — Exit car';
  }
}

function switchWeapon(n) {
  const order = ['fists', 'pistol', 'shotgun', 'smg', 'rifle'];
  const w = order[n];
  if (!w) return;
  if (w === 'fists' || (G.player.ammo[w] || 0) > 0 || G.player.weapon === w) {
    G.player.weapon = w;
    G.audio.sfx('click');
  }
}

// ---------- the update ----------
function update(dt) {
  const p = G.player;
  G.time += dt;
  if (G.messageT > 0) G.messageT -= dt;
  if (G.bannerT > 0) G.bannerT -= dt;
  if (p.shootCd > 0) p.shootCd -= dt;
  if (p.hurtCd > 0) p.hurtCd -= dt;
  if (p.punchAnim > 0) p.punchAnim -= dt;
  if (p.flash > 0) p.flash -= dt;

  // Traffic lights.
  for (const l of G.city.lights) {
    l.t -= dt;
    if (l.t <= 0) { l.ns = !l.ns; l.t = 6; }
  }

  updateWeather(G, dt);

  // --- input: movement, aim, shooting, actions ---
  const mouseWorld = { x: G.cam.x + input.mouseX, y: G.cam.y + input.mouseY };
  if (input.hit('KeyR')) G.audio.setStation((G.audio.station + 1) % 3);
  if (input.hit('KeyH')) { saveGame(G, false); }
  if (input.hit('KeyM')) { G.state = 'missionlist'; return; }
  if (input.hit('KeyP') || input.hit('Escape')) { G.state = 'pause'; announce('Paused.'); return; }
  if (input.hit('Digit1')) switchWeapon(0);
  if (input.hit('Digit2')) switchWeapon(1);
  if (input.hit('Digit3')) switchWeapon(2);
  if (input.hit('Digit4')) switchWeapon(3);
  if (input.hit('Digit5')) switchWeapon(4);
  if (input.hit('KeyE')) { contextAction(); if (G.state !== 'play') return; }

  if (!p.inCar) {
    const w = walkKeys(input);
    const len = Math.hypot(w.x, w.y);
    if (len > 0) {
      p.angle = Math.atan2(w.y, w.x);
      p.x += (w.x / len) * 175 * dt;
      p.y += (w.y / len) * 175 * dt;
      p.x = clamp(p.x, 285, WORLD_W - 20);
      p.y = clamp(p.y, 20, WORLD_H - 20);
      resolveBuildingCollision(G.city, p, 11);
    }
    p.aim = Math.atan2(mouseWorld.y - p.y, mouseWorld.x - p.x);
    if (input.mouseDown) playerShoot(G, mouseWorld.x, mouseWorld.y);
  } else {
    const car = carById(G, p.carId);
    if (!car || car.dead) {
      if (car && car.dead) { hurtPlayer(G, 35); }
      p.inCar = false; p.carId = 0;
    } else {
      const d = driveKeys(input);
      drivePlayerCar(G, car, dt, d.throttle, d.steer, input.down('Space'));
      p.x = car.x; p.y = car.y; p.angle = car.angle;
      p.aim = Math.atan2(mouseWorld.y - car.y, mouseWorld.x - car.x);
      if (input.mouseDown) playerShoot(G, mouseWorld.x, mouseWorld.y);
      G.audio.engine(Math.abs(car.speed) / 560, true);
    }
  }
  if (!p.inCar) G.audio.engine(0, false);

  // --- world systems ---
  for (const c of G.cars) if (c.role === 'traffic') updateTrafficCar(G, c, dt);
  collideCars(G);
  updatePeds(G, dt);
  updateEnemies(G, dt);
  updateBarrels(G);
  updatePolice(G, dt);
  updatePackages(G);
  updateJumps(G, dt);
  if (!G.mission) { updateTaxi(G, dt); updateRace(G, dt); }

  // Pickups.
  for (let i = G.pickups.length - 1; i >= 0; i--) {
    const pk = G.pickups[i];
    const d = Math.hypot(pk.x - p.x, pk.y - p.y);
    if (d < 34) {
      if (pk.kind === 'cash') { p.money += pk.amount; addFloater(G, pk.x, pk.y, `+$${pk.amount}`, '#7ee081'); }
      else if (pk.kind === 'health') { p.hp = Math.min(100, p.hp + 30); addFloater(G, pk.x, pk.y, '+30 HP', '#ff5252'); }
      else { p.ammo[p.weapon] = (p.ammo[p.weapon] || 0) + 12; addFloater(G, pk.x, pk.y, '+12 AMMO', '#ffd166'); }
      G.audio.sfx('pickup');
      G.pickups.splice(i, 1);
    }
  }

  // Mission tick.
  if (G.mission) {
    G.mission.t += dt;
    const res = G.mission.def.update(G, dt);
    if (res === 'done' || res === 'fail') endMission(res);
  }

  updateParticles(G, dt);
  computePrompt();

  // Camera follows the player (or their car), clamped to the world.
  const focus = p.inCar ? carById(G, p.carId) || p : p;
  G.viewW = canvas.width; G.viewH = canvas.height;
  G.cam.x = clamp(focus.x - G.viewW / 2, 0, Math.max(0, WORLD_W - G.viewW));
  G.cam.y = clamp(focus.y - G.viewH / 2, 0, Math.max(0, WORLD_H - G.viewH));

  // Death.
  if (p.dead) {
    p.deadT += dt;
    if (p.deadT > 1.2) {
      const copClose = G.footCops.some((f) => Math.hypot(f.x - p.x, f.y - p.y) < 60);
      G.deadHow = copClose ? 'busted' : 'wasted';
      G.state = 'dead';
      announce(G.deadHow === 'busted' ? 'Busted.' : 'Wasted.');
    }
  }
}

function draw() {
  const w = canvas.width, h = canvas.height;
  const ctx = renderer.ctx;
  if (G.state === 'title') { drawTitle(G, ctx, w, h); return; }
  renderer.draw(G);
  if (G.state === 'play' || G.state === 'pause' || G.state === 'missionlist' || G.state === 'briefing' || G.state === 'shop' || G.state === 'dead') drawHUD(G, ctx, w, h);
  if (G.state === 'pause') drawPause(G, ctx, w, h);
  else if (G.state === 'missionlist') drawMissionList(G, ctx, w, h);
  else if (G.state === 'briefing') drawBriefing(G, ctx, w, h);
  else if (G.state === 'shop') drawShop(G, ctx, w, h);
  else if (G.state === 'dead') drawDead(G, ctx, w, h);
  else if (G.state === 'ending') drawEnding(G, ctx, w, h);
}

// ---------- the loop ----------
let accumulator = 0;
let last = performance.now();
const MAX_FRAME = 0.25;

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, MAX_FRAME);
  last = now;
  if (G.state === 'title') {
    if (input.hit('Enter')) {
      if (G.saveExists && !G._newGameChosen) {
        // Enter continues; N starts fresh.
        if (loadGame(G)) { G.message = 'Save loaded.'; G.messageT = 2; setMissionMarker(); }
        G.state = 'play';
        announce('Playing. Vice Bay.');
      } else {
        G.state = 'play';
        announce('Playing. Vice Bay.');
      }
    } else if (input.hit('KeyN')) {
      G._newGameChosen = true;
      G.state = 'play';
      announce('Playing. Vice Bay.');
    }
    input.clearPressed();
    draw();
    return;
  }
  if (G.state === 'pause') {
    if (input.hit('KeyP') || input.hit('Escape') || input.hit('Enter')) { G.state = 'play'; }
    else if (input.hit('KeyH')) saveGame(G, false);
    input.clearPressed();
    draw();
    return;
  }
  if (G.state === 'missionlist') {
    if (input.hit('KeyM') || input.hit('Escape') || input.hit('Enter')) { G.state = 'play'; }
    input.clearPressed();
    draw();
    return;
  }
  if (G.state === 'briefing') {
    if (input.hit('Enter')) acceptMission();
    else if (input.hit('Escape')) { G.briefing = null; G.state = 'play'; }
    input.clearPressed();
    draw();
    return;
  }
  if (G.state === 'shop') {
    const s = G.shopOpen;
    if (input.hit('Escape')) { G.shopOpen = null; G.state = 'play'; }
    else if (input.hit('ArrowUp')) s.sel = (s.sel - 1 + s.menu.length) % s.menu.length;
    else if (input.hit('ArrowDown')) s.sel = (s.sel + 1) % s.menu.length;
    else if (input.hit('Enter')) {
      const it = s.menu[s.sel];
      s.feedback = s.shop.kind === 'garage' ? buyGarageItem(G, it.id) : buyGunItem(G, it.id);
      if (s.shop.kind === 'gun') s.menu = gunMenu(G);
      else s.menu = garageMenu(G);
    }
    input.clearPressed();
    draw();
    return;
  }
  if (G.state === 'dead') {
    if (input.hit('Enter')) respawn();
    input.clearPressed();
    draw();
    return;
  }
  if (G.state === 'ending') {
    if (input.hit('Enter')) { G.state = 'play'; setMissionMarker(); }
    input.clearPressed();
    draw();
    return;
  }
  // play
  accumulator += dt;
  let guard = 0;
  while (accumulator >= STEP && guard++ < 8) {
    update(STEP);
    accumulator -= STEP;
    // Edge-triggered keys (E, R, digits) are consumed by the first update of
    // the frame: without this, a slow frame that runs two updates would
    // process one keypress twice (enter a car, then immediately exit it).
    input.clearPressed();
    if (G.state !== 'play') break;
  }
  if (guard >= 8) accumulator = 0;
  draw();
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.state === 'play') { G.state = 'pause'; announce('Paused.'); }
});
canvas.addEventListener('mousedown', () => { G.audio.ensure(); if (G.state === 'title') { G.state = 'play'; announce('Playing. Vice Bay.'); } });
window.addEventListener('keydown', () => G.audio.ensure());

// ---------- staged screenshots ----------
function runShot(name) {
  if (helpEl) helpEl.style.display = 'none';
  stageShot(name, G);
  const focus = G.player.inCar ? carById(G, G.player.carId) || G.player : G.player;
  G.viewW = canvas.width; G.viewH = canvas.height;
  G.cam.x = clamp(focus.x - G.viewW / 2, 0, Math.max(0, WORLD_W - G.viewW));
  G.cam.y = clamp(focus.y - G.viewH / 2, 0, Math.max(0, WORLD_H - G.viewH));
  let painted = 0;
  function paint() {
    draw();
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

if (SHOT) runShot(SHOT);
else {
  announce('Vice Bay. Press Enter to start.');
  requestAnimationFrame(frame);
}
