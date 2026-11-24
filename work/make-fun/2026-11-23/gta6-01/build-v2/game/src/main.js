// Solara Bay — open-world crime game. Vanilla JS + Canvas, no libraries, no network.
import { WORLD, ROADS_X, ROADS_Y, ROAD_W, genWorld, drawWorld, onRoad, inWater, collideBuildings, districtAt } from './world.js';
import { makeCar, makePed, spawnTraffic, spawnParked, spawnPeds, updateTraffic, updatePeds, drivePlayerCar, collideCars, drawCar, drawPed, PD_COLOR, CAR_COLORS } from './entities.js';
import { MISSIONS, missionObjective, missionTarget, advanceMission, startMission, saveGame, loadSave, hasSave } from './missions.js';
import { initAudio, setEngine, setSiren, playShot, playPickup, playPunch, playBusted, playMission } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let vw = 1280, vh = 720;
function resize() { vw = window.innerWidth; vh = window.innerHeight; canvas.width = vw; canvas.height = vh; }
window.addEventListener('resize', resize); resize();

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const $ = id => document.getElementById(id);
const bannerEl = $('banner'), toastEl = $('toast');

// ---------- state ----------
const S = {
  state: 'title', // title | playing | paused | busted | wasted
  x: 600, y: 600, angle: -Math.PI / 2, hp: 100, money: 150, ammo: 24,
  wanted: 0, mission: 0, step: 0, gameTime: 9 * 60, // minutes since midnight
  car: null, speed: 0, crimeTimer: 99, decayTimer: 0, holdTimer: 0, surviveTimer: 0,
  missionTimer: 0, bustedTimer: 0, rivalsSpawned: false, rivalsLeft: 0,
  shootCd: 0, punchCd: 0, stealCd: 0, bannerT: 0, toastT: 0, carHp: 100, ramTakenCd: 0,
  cam: { x: 0, y: 0 }, tracers: [], shake: 0, endReason: '',
};
let world = genWorld(1337);
let traffic = [], parked = [], peds = [], police = [], footCops = [], rivals = [];
let rndState = 1337;
function rnd() { rndState |= 0; rndState = (rndState + 0x6D2B79F5) | 0; let t = Math.imul(rndState ^ (rndState >>> 15), 1 | rndState); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }

function resetWorld() {
  rndState = 1337;
  traffic = spawnTraffic(rnd, world, 26);
  parked = spawnParked(rnd, world, 10);
  peds = spawnPeds(rnd, world, 34);
  police = []; footCops = []; rivals = [];
  S.rivalsSpawned = false; S.rivalsLeft = 0;
}
resetWorld();

function allCars() { return [...traffic, ...parked, ...police, ...(S.car ? [S.car] : [])]; }

// ---------- input ----------
const keys = {};
const mouse = { x: vw / 2, y: vh / 2, down: false };
window.addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  keys[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === 'p' || e.key === 'Escape') togglePause();
  if (e.key.toLowerCase() === 'm' && S.state === 'playing') { if (saveGame(S)) showToast('Game saved'); }
  if (e.key.toLowerCase() === 'f' && S.state === 'playing') doPunch();
  if (e.key.toLowerCase() === 'e' && S.state === 'playing') tryEnterExitCar();
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
canvas.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
canvas.addEventListener('mousedown', e => { if (e.button === 0) mouse.down = true; initAudio(); });
window.addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());

function inputVec() {
  return {
    up: !!(keys['w'] || keys['arrowup']),
    down: !!(keys['s'] || keys['arrowdown']),
    left: !!(keys['a'] || keys['arrowleft']),
    right: !!(keys['d'] || keys['arrowright']),
  };
}

function showBanner(text, sub) {
  bannerEl.textContent = text + (sub ? '  ' + sub : '');
  bannerEl.style.display = 'block';
  S.bannerT = 3;
}
function showToast(text) { toastEl.textContent = text; toastEl.style.display = 'block'; S.toastT = 3; }
function showScreen(id) {
  for (const s of ['titleScreen', 'pauseScreen', 'endScreen']) $(s).classList.add('hidden');
  if (id) $(id).classList.remove('hidden');
}

function startGame(fromSave) {
  initAudio();
  if (fromSave) {
    const sv = loadSave();
    if (sv) {
      S.money = sv.money; S.hp = sv.hp; S.ammo = sv.ammo; S.wanted = sv.wanted;
      S.mission = sv.mission; S.step = sv.step; S.x = sv.x; S.y = sv.y; S.angle = sv.angle;
      S.gameTime = sv.time || 9 * 60;
      startMission(S);
    }
  } else {
    S.money = 150; S.hp = 100; S.ammo = 24; S.wanted = 0; S.mission = 0; S.step = 0;
    S.x = 600; S.y = 600; S.angle = -Math.PI / 2; S.car = null; S.gameTime = 9 * 60;
    S.crimeTimer = 99; S.rivalsSpawned = false; S.rivalsLeft = 0;
    resetWorld();
    startMission(S);
  }
  S.state = 'playing';
  showScreen(null);
  showToast(MISSIONS[S.mission] ? MISSIONS[S.mission].brief : 'Free roam — Solara Bay is yours.');
}
$('btnStart').addEventListener('click', () => startGame(false));
$('btnContinue').addEventListener('click', () => startGame(true));
$('btnResume').addEventListener('click', togglePause);
$('btnRespawn').addEventListener('click', respawn);
if (hasSave()) $('btnContinue').classList.remove('hidden');

function togglePause() {
  if (S.state === 'playing') { S.state = 'paused'; showScreen('pauseScreen'); }
  else if (S.state === 'paused') { S.state = 'playing'; showScreen(null); }
}

function respawn() {
  S.hp = 100; S.wanted = 0; S.car = null;
  S.x = 1200; S.y = 1500; S.angle = 0; // hospital
  police = []; footCops = [];
  S.state = 'playing'; showScreen(null);
  showToast('You wake up at Solara General. The city waits.');
}

function endGame(kind) {
  S.state = kind;
  S.endReason = kind;
  const lost = Math.floor(S.money * 0.2);
  S.money -= lost;
  $('endTitle').textContent = kind === 'busted' ? 'BUSTED' : 'WASTED';
  $('endTitle').style.color = kind === 'busted' ? '#6fb3ff' : '#ff5a4a';
  $('endSub').textContent = kind === 'busted'
    ? `The Solara Bay PD caught up with you. You lost $${lost} in fines.`
    : `You got wasted on the streets of Solara Bay. Hospital bill: $${lost}.`;
  showScreen('endScreen');
  playBusted();
  setSiren(false); setEngine(0, false);
}

// ---------- wanted ----------
function addWanted(n) {
  S.wanted = clamp(S.wanted + n, 0, 5);
  S.crimeTimer = 0;
}

// ---------- cars: enter / exit / steal ----------
function nearestCar(maxD) {
  let best = null, bd = maxD;
  for (const c of [...traffic, ...parked]) {
    if (c.dead) continue;
    const d = dist(S.x, S.y, c.x, c.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
function tryEnterExitCar() {
  if (S.stealCd > 0) return;
  S.stealCd = 0.35;
  if (S.car) {
    // exit: step out beside the car
    const c = S.car;
    c.speed = 0; c.kind = 'parked'; c.driver = false;
    if (!parked.includes(c)) parked.push(c);
    S.x = c.x + Math.cos(c.angle + Math.PI / 2) * 34;
    S.y = c.y + Math.sin(c.angle + Math.PI / 2) * 34;
    S.angle = c.angle;
    S.car = null; S.carHp = 100;
    return;
  }
  const c = nearestCar(70);
  if (!c) return;
  const stolen = c.kind === 'traffic' && c.driver;
  if (stolen) {
    // driver flees on foot
    const d = makePed(c.x, c.y);
    d.flee = 3; d.angle = Math.atan2(S.y - c.y, S.x - c.x) + Math.PI;
    peds.push(d);
    c.driver = false;
    addWanted(1);
    showToast('Car stolen! Wanted level up.');
  } else {
    showToast('You take the parked car.');
  }
  c.kind = 'player'; c.hp = 100;
  traffic = traffic.filter(t => t !== c);
  parked = parked.filter(t => t !== c);
  S.car = c; S.carHp = c.hp;
  S.x = c.x; S.y = c.y; S.angle = c.angle;
  if (S.mission === 0 && S.step === 0) {
    const ev = [];
    advanceMission(S, ev);
    handleEvents(ev);
  }
}

// ---------- combat ----------
function doPunch() {
  if (S.punchCd > 0 || S.car) return;
  S.punchCd = 0.45;
  playPunch();
  let hitAny = false;
  const targets = [...peds, ...rivals, ...footCops];
  for (const p of targets) {
    if (p.dead) continue;
    const d = dist(S.x, S.y, p.x, p.y);
    if (d < 48) {
      p.hp -= 12;
      p.x += Math.cos(S.angle) * 14; p.y += Math.sin(S.angle) * 14;
      hitAny = true;
      if (p.hp <= 0) { p.dead = true; if (p.isRival) S.rivalsLeft--; }
    }
  }
  if (hitAny) {
    const hitCiv = targets.some(p => p.dead && !p.isRival && !p.isCop);
    if (hitCiv) addWanted(1);
  }
}

function doShoot() {
  if (S.ammo <= 0) { S.shootCd = 0.3; showToast('Out of ammo — find ammo? Press M to save, keep fighting with F.'); return; }
  S.ammo--;
  S.shootCd = 0.16;
  playShot();
  // aim from player (or car) toward mouse in world space
  const wx = S.cam.x + mouse.x, wy = S.cam.y + mouse.y;
  const ox = S.car ? S.car.x : S.x, oy = S.car ? S.car.y : S.y;
  const ang = Math.atan2(wy - oy, wx - ox);
  const range = 460;
  let bestD = range, best = null, bestKind = null;
  const consider = (x, y, obj, kind) => {
    const dx = x - ox, dy = y - oy;
    const along = dx * Math.cos(ang) + dy * Math.sin(ang);
    if (along < 10 || along > range) return;
    const perp = Math.abs(-dx * Math.sin(ang) + dy * Math.cos(ang));
    if (perp < 22 && along < bestD) { bestD = along; best = obj; bestKind = kind; }
  };
  for (const p of [...peds, ...rivals, ...footCops]) if (!p.dead) consider(p.x, p.y, p, 'ped');
  for (const c of [...traffic, ...parked, ...police]) if (!c.dead && c !== S.car) consider(c.x, c.y, c, 'car');
  S.tracers.push({ x1: ox, y1: oy, x2: ox + Math.cos(ang) * bestD, y2: oy + Math.sin(ang) * bestD, t: 0.08 });
  if (best) {
    if (bestKind === 'ped') {
      best.hp -= 20;
      if (best.hp <= 0) {
        best.dead = true;
        if (best.isRival) { S.rivalsLeft--; showToast(`Rival down! ${S.rivalsLeft} left.`); }
        else if (!best.isCop) addWanted(1);
      }
    } else {
      best.hp -= 14;
      if (best.hp <= 0) { best.dead = true; if (best.kind === 'police') showToast('Police car disabled!'); }
    }
  }
}

// ---------- police ----------
const RAM_DAMAGE = 6, BUMP_CD = 0.25;
function spawnPoliceCar() {
  // spawn on the road nearest the player, 450-650px away along it
  for (let tries = 0; tries < 20; tries++) {
    const horiz = Math.random() < 0.5;
    let x, y, angle;
    if (horiz) {
      const ry = ROADS_Y.reduce((a, b) => Math.abs(b - S.y) < Math.abs(a - S.y) ? b : a);
      x = S.x + (Math.random() < 0.5 ? -1 : 1) * (450 + Math.random() * 200);
      y = ry + (Math.random() < 0.5 ? -22 : 22);
      angle = x < S.x ? 0 : Math.PI;
    } else {
      const rx = ROADS_X.reduce((a, b) => Math.abs(b - S.x) < Math.abs(a - S.x) ? b : a);
      x = rx + (Math.random() < 0.5 ? -22 : 22);
      y = S.y + (Math.random() < 0.5 ? -1 : 1) * (450 + Math.random() * 200);
      angle = y < S.y ? Math.PI / 2 : -Math.PI / 2;
    }
    x = clamp(x, 60, WORLD.w - 60); y = clamp(y, 60, WORLD.h - 240);
    if (dist(x, y, S.x, S.y) < 380) continue;
    const c = makeCar(x, y, angle, PD_COLOR, 'police');
    c.speed = 200;
    police.push(c);
    return;
  }
}
// Police navigation: steer at the player, sliding around buildings instead of
// getting pinned on them (try the direct angle, then ±40°, then ±80°).
function movePoliceCar(p, dt) {
  const targetSpeed = 300 + S.wanted * 45;
  p.speed = Math.min(targetSpeed, p.speed + 420 * dt);
  const desired = Math.atan2(S.y - p.y, S.x - p.x);
  const step = p.speed * dt;
  const candidates = [desired, desired + 0.7, desired - 0.7, desired + 1.4, desired - 1.4];
  for (const a of candidates) {
    const nx = p.x + Math.cos(a) * step, ny = p.y + Math.sin(a) * step;
    const fixed = collideBuildings(nx, ny, 18, world.buildings);
    if (fixed.x === nx && fixed.y === ny) {
      p.angle = a;
      p.x = clamp(nx, 30, WORLD.w - 30); p.y = clamp(ny, 30, WORLD.h - 230);
      return;
    }
  }
  p.angle += Math.PI / 2; p.speed *= 0.5;
}
function updatePolice(dt) {
  const want = Math.min(S.wanted, 4);
  while (police.filter(p => !p.dead).length < want) spawnPoliceCar();
  if (S.wanted === 0) {
    // cops give up and drive off
    for (const p of police) p.dead = true;
    police = police.filter(p => !p.dead);
    footCops = [];
  }
  for (const p of police) {
    if (p.dead) continue;
    p.ramCd = Math.max(0, p.ramCd - dt);
    p.bumpCd = Math.max(0, p.bumpCd - dt);
    movePoliceCar(p, dt);
    // ram / bump the player — damage throttled so a pack of cops can't insta-wreck
    // the player's car (ramDamage 6, bump cooldown 0.25s per car, shared 0.5s
    // intake throttle on the player's car so it never gets pinned to a stop).
    const d = dist(p.x, p.y, S.x, S.y);
    if (d < 42 && p.bumpCd <= 0 && S.ramTakenCd <= 0) {
      p.bumpCd = BUMP_CD;
      p.ramCd = 1.2;
      p.speed *= 0.45; // the rammer bounces off instead of grinding the player
      S.ramTakenCd = 0.5;
      if (S.car) {
        S.car.hp -= RAM_DAMAGE; S.carHp = S.car.hp; S.shake = 0.25;
        if (S.car.hp <= 0) { S.car.dead = true; S.car = null; showToast('Your car is wrecked!'); }
      } else {
        S.hp -= 10; S.shake = 0.3;
        if (S.hp <= 0) endGame('wasted');
      }
    }
    // player ramming a police car damages it
    if (S.car && Math.abs(S.car.speed) > 220 && d < 40 && p.ramCd <= 0) {
      p.ramCd = 1.0;
      p.hp -= 10;
      if (p.hp <= 0) { p.dead = true; showToast('Police car disabled!'); }
    }
  }
  police = police.filter(p => !p.dead);
  // foot cops at 3+ stars
  const wantCops = S.wanted >= 3 ? 2 : 0;
  while (footCops.filter(c => !c.dead).length < wantCops) {
    const c = makePed(S.x + (Math.random() < 0.5 ? -160 : 160), S.y + (Math.random() < 0.5 ? -160 : 160));
    c.isCop = true; c.hp = 40; c.speed = 190;
    footCops.push(c);
  }
  for (const c of footCops) {
    if (c.dead) continue;
    c.punchCd = Math.max(0, c.punchCd - dt);
    const a = Math.atan2(S.y - c.y, S.x - c.x);
    c.angle = a;
    c.x += Math.cos(a) * c.speed * dt;
    c.y += Math.sin(a) * c.speed * dt;
    const d = dist(c.x, c.y, S.x, S.y);
    if (d < 26 && !S.car && c.punchCd <= 0) {
      c.punchCd = 0.8;
      S.hp -= 8;
      if (S.hp <= 0) endGame('wasted');
    }
    // busted only counts on foot — a cop can't drag you out of a moving car
    if (d < 22 && !S.car) {
      S.bustedTimer += dt;
      if (S.bustedTimer > 2.5) endGame('busted');
    } else S.bustedTimer = Math.max(0, S.bustedTimer - dt * 2);
  }
  footCops = footCops.filter(c => !c.dead);
}

// ---------- missions ----------
function handleEvents(events) {
  for (const ev of events) {
    if (ev.type === 'mission-complete') {
      showBanner('MISSION COMPLETE', `${ev.name}  +$${ev.reward}`);
      playMission();
      saveGame(S);
    } else if (ev.type === 'mission-step') {
      showToast(ev.text);
    }
  }
}
function updateMissions(dt) {
  if (S.mission >= MISSIONS.length) return;
  const m = MISSIONS[S.mission];
  const step = m.steps[S.step];
  if (!step) return;
  const ev = [];
  const tgt = step.target;
  const atTarget = tgt ? dist(S.x, S.y, tgt.x, tgt.y) < tgt.r : false;
  if (S.mission === 1) {
    if (S.step === 0 && atTarget) { playPickup(); advanceMission(S, ev); }
    else if (S.step === 1) {
      S.missionTimer -= dt;
      if (atTarget) { playPickup(); advanceMission(S, ev); }
      else if (S.missionTimer <= 0) {
        S.step = 0; startMission(S);
        showToast('Too slow! The package run reset — try again.');
      }
    }
  } else if (S.mission === 2) {
    if (S.step === 0 && S.wanted >= 2) advanceMission(S, ev);
    else if (S.step === 1) {
      if (S.wanted >= 2) { S.surviveTimer += dt; if (S.surviveTimer >= 45) advanceMission(S, ev); }
      else S.surviveTimer = Math.max(0, S.surviveTimer - dt);
    } else if (S.step === 2 && S.wanted === 0) advanceMission(S, ev);
  } else if (S.mission === 3) {
    if (!S.rivalsSpawned && atTarget) {
      S.rivalsSpawned = true;
      for (let i = 0; i < 4; i++) {
        const r = makePed(1800 + (i - 1.5) * 70, 2150 + (i % 2) * 50);
        r.isRival = true; r.hp = 40; r.speed = 120; r.shirt = '#222';
        rivals.push(r);
      }
      S.rivalsLeft = 4;
      showToast("Rico's crew is here — take them all down!");
    }
    if (S.rivalsSpawned && S.rivalsLeft <= 0) advanceMission(S, ev);
  } else if (S.mission === 4) {
    if (S.step === 0 && atTarget) { addWanted(3); showToast('The vault is open — grab the cash!'); advanceMission(S, ev); }
    else if (S.step === 1) {
      if (atTarget) {
        S.holdTimer += dt;
        if (S.holdTimer >= (step.hold || 8)) { S.money += 500; advanceMission(S, ev); }
      } else S.holdTimer = Math.max(0, S.holdTimer - dt);
    } else if (S.step === 2 && atTarget) advanceMission(S, ev);
  }
  handleEvents(ev);
}

// ---------- player update ----------
function updatePlayer(dt) {
  const inp = inputVec();
  S.stealCd = Math.max(0, S.stealCd - dt);
  S.shootCd = Math.max(0, S.shootCd - dt);
  S.punchCd = Math.max(0, S.punchCd - dt);
  S.ramTakenCd = Math.max(0, S.ramTakenCd - dt);
  S.crimeTimer += dt;
  S.gameTime += dt * 0.5; // 1 game minute per 2 real seconds
  if (S.gameTime >= 1440) S.gameTime -= 1440;

  if (S.car) {
    drivePlayerCar(S.car, inp, dt, world, dmg => { S.car.hp -= dmg; S.carHp = S.car.hp; });
    S.x = S.car.x; S.y = S.car.y; S.angle = S.car.angle; S.speed = S.car.speed;
    S.carHp = S.car.hp;
    if (S.car.hp <= 0) { S.car.dead = true; S.car = null; showToast('Your car is wrecked!'); }
    // running over peds in a car
    for (const p of [...peds, ...rivals, ...footCops]) {
      if (p.dead) continue;
      if (dist(S.x, S.y, p.x, p.y) < 26 && Math.abs(S.speed) > 120) {
        p.hp = 0; p.dead = true;
        if (p.isRival) S.rivalsLeft--;
        else if (!p.isCop) addWanted(1);
      }
    }
  } else {
    const spd = 230;
    let mx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    let my = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
    if (mx || my) {
      const m = Math.hypot(mx, my); mx /= m; my /= m;
      S.angle = Math.atan2(my, mx);
      let nx = S.x + mx * spd * dt, ny = S.y + my * spd * dt;
      const fixed = collideBuildings(nx, ny, 14, world.buildings);
      nx = fixed.x; ny = fixed.y;
      nx = clamp(nx, 30, WORLD.w - 30); ny = clamp(ny, 30, WORLD.h - 230);
      S.x = nx; S.y = ny; S.speed = spd;
    } else S.speed = 0;
    // aim with mouse while on foot
    const wx = S.cam.x + mouse.x, wy = S.cam.y + mouse.y;
    if (mouse.down || dist(wx, wy, S.x, S.y) > 40) S.angle = Math.atan2(wy - S.y, wx - S.x);
  }

  // shooting (mouse held or clicked — handled in the update loop, never in the event)
  if (mouse.down && S.shootCd <= 0 && S.state === 'playing') doShoot();

  // wanted decay: calm + unseen = heat drops
  if (S.wanted > 0 && S.crimeTimer > 10) {
    const nearestCop = police.length ? Math.min(...police.map(p => dist(p.x, p.y, S.x, S.y))) : 9999;
    if (nearestCop > 350 && footCops.length === 0) {
      S.decayTimer += dt;
      if (S.decayTimer > 7) { S.decayTimer = 0; S.wanted--; showToast('Heat dropping…'); }
    } else S.decayTimer = 0;
  }

  // hp regen slowly when calm
  if (S.wanted === 0 && S.hp > 0 && S.hp < 100) S.hp = Math.min(100, S.hp + 1.2 * dt);
  // ammo pickup: driving over a parked car area? No — ammo crates near hospital
  if (dist(S.x, S.y, 1200, 1500) < 40 && S.ammo < 24) { S.ammo = 24; playPickup(); showToast('Ammo restocked at the hospital.'); }
}

// ---------- per-frame update ----------
function update(dt) {
  if (S.state !== 'playing') return;
  updatePlayer(dt);
  for (const c of traffic) updateTraffic(c, dt, rnd);
  updatePeds(peds, dt, allCars(), S);
  updatePeds(rivals, dt, allCars(), S);
  // rivals chase the player once spawned
  for (const r of rivals) {
    if (r.dead) continue;
    const a = Math.atan2(S.y - r.y, S.x - r.x);
    const d = dist(r.x, r.y, S.x, S.y);
    if (d < 420) {
      r.angle = a;
      r.x += Math.cos(a) * 130 * dt; r.y += Math.sin(a) * 130 * dt;
      if (d < 30 && r.punchCd <= 0) { r.punchCd = 0.9; S.hp -= 7; if (S.hp <= 0) endGame('wasted'); }
    }
  }
  rivals = rivals.filter(r => !r.dead);
  updatePolice(dt);
  // car-vs-car collisions (player car vs traffic/police)
  if (S.car) {
    for (const c of [...traffic, ...police]) {
      if (c.dead || c === S.car) continue;
      if (c.kind === 'police') {
        // police bounce off the player's car — they never shove it around
        const d = dist(S.car.x, S.car.y, c.x, c.y);
        if (d < 34 && d > 0.01) {
          const ux = (c.x - S.car.x) / d, uy = (c.y - S.car.y) / d;
          c.x += ux * (34 - d); c.y += uy * (34 - d);
        }
        continue;
      }
      const ov = collideCars(S.car, c);
      if (ov > 0) {
        const rel = Math.abs(S.car.speed) + Math.abs(c.speed);
        if (rel > 240) { S.car.hp -= 3; c.hp -= 5; S.shake = 0.2; if (c.kind === 'traffic') addWanted(0); }
        if (c.hp <= 0) c.dead = true;
        if (S.car.hp <= 0) { S.car.dead = true; S.car = null; showToast('Your car is wrecked!'); }
      }
    }
  }
  traffic = traffic.filter(c => !c.dead);
  // traffic vs traffic: simple separation so they don't stack
  for (let i = 0; i < traffic.length; i++) for (let j = i + 1; j < traffic.length; j++) collideCars(traffic[i], traffic[j]);
  updateMissions(dt);
  for (const tr of S.tracers) tr.t -= dt;
  S.tracers = S.tracers.filter(t => t.t > 0);
  S.bannerT = Math.max(0, S.bannerT - dt);
  S.toastT = Math.max(0, S.toastT - dt);
  if (S.bannerT === 0) bannerEl.style.display = 'none';
  if (S.toastT === 0) toastEl.style.display = 'none';
  S.shake = Math.max(0, S.shake - dt);
  // camera: snap to player (no lag)
  S.cam.x = clamp(S.x - vw / 2, 0, Math.max(0, WORLD.w - vw));
  S.cam.y = clamp(S.y - vh / 2, 0, Math.max(0, WORLD.h - vh));
  setEngine(S.car ? Math.abs(S.speed) / 560 : 0, !!S.car);
  setSiren(S.wanted > 0);
}

// ---------- rendering ----------
function drawMinimap() {
  const mw = 200, mh = 140, mx = vw - mw - 16, my = 16;
  const sx = mw / WORLD.w, sy = mh / WORLD.h;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
  ctx.fillStyle = '#1d3a24'; ctx.fillRect(mx, my, mw, mh);
  ctx.fillStyle = '#2f7fc9'; ctx.fillRect(mx, my + 2460 * sy, mw, mh - 2460 * sy);
  ctx.fillRect(mx + 3480 * sx, my, mw - 3480 * sx, mh);
  ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
  for (const rx of ROADS_X) { ctx.beginPath(); ctx.moveTo(mx + rx * sx, my); ctx.lineTo(mx + rx * sx, my + mh); ctx.stroke(); }
  for (const ry of ROADS_Y) { ctx.beginPath(); ctx.moveTo(mx, my + ry * sy); ctx.lineTo(mx + mw, my + ry * sy); ctx.stroke(); }
  const tgt = missionTarget(S);
  if (tgt) {
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath(); ctx.arc(mx + tgt.x * sx, my + tgt.y * sy, 5, 0, Math.PI * 2); ctx.fill();
  }
  for (const p of police) { ctx.fillStyle = '#ff3b30'; ctx.fillRect(mx + p.x * sx - 2, my + p.y * sy - 2, 4, 4); }
  // player arrow
  ctx.save();
  ctx.translate(mx + S.x * sx, my + S.y * sy); ctx.rotate(S.angle);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -4); ctx.lineTo(-5, 4); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.strokeRect(mx - 4, my - 4, mw + 8, mh + 8);
  ctx.restore();
}

function drawHUD() {
  const pad = 16;
  ctx.save();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  // money + hp panel
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(pad, pad, 250, 86);
  ctx.fillStyle = '#4ae05a'; ctx.font = 'bold 26px Arial';
  ctx.fillText('$' + S.money.toLocaleString(), pad + 12, pad + 8);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial';
  ctx.fillText('HP', pad + 12, pad + 44);
  ctx.fillStyle = '#222'; ctx.fillRect(pad + 46, pad + 44, 180, 12);
  ctx.fillStyle = S.hp > 40 ? '#4ae05a' : '#ff5a4a'; ctx.fillRect(pad + 47, pad + 45, 178 * (S.hp / 100), 10);
  ctx.fillStyle = '#fff'; ctx.fillText('AMMO ' + S.ammo, pad + 12, pad + 64);
  // wanted stars
  ctx.font = 'bold 30px Arial';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < S.wanted ? '#ffb400' : 'rgba(255,255,255,.25)';
    ctx.fillText('★', pad + 260 + i * 30, pad + 6);
  }
  // clock + district
  const hh = String(Math.floor(S.gameTime / 60) % 24).padStart(2, '0');
  const mm = String(Math.floor(S.gameTime % 60)).padStart(2, '0');
  ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Arial';
  ctx.fillText(`${hh}:${mm}  •  ${districtAt(S.x, S.y).toUpperCase()}`, pad, pad + 104);
  // objective
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  const obj = missionObjective(S);
  ctx.font = 'bold 15px Arial';
  const ow = ctx.measureText(obj).width + 24;
  ctx.fillRect(pad, vh - 58, Math.min(ow, vw - 32), 42);
  ctx.fillStyle = '#ffe14d'; ctx.fillText('◆ ' + obj, pad + 12, vh - 46);
  // speed
  if (S.car) {
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(vw - 240, vh - 58, 224, 42);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'right';
    ctx.fillText(Math.round(Math.abs(S.speed) * 0.18) + ' mph', vw - 28, vh - 46);
    ctx.textAlign = 'left';
  }
  drawMinimap();
  ctx.restore();
}

function draw() {
  ctx.save();
  if (S.shake > 0) ctx.translate((Math.random() - 0.5) * S.shake * 30, (Math.random() - 0.5) * S.shake * 30);
  ctx.translate(-S.cam.x, -S.cam.y); // world coords -> screen coords
  const t = performance.now();
  drawWorld(ctx, S.cam, vw, vh, world, t);
  // mission target beam + ground marker
  const tgt = missionTarget(S);
  if (tgt && S.state === 'playing') {
    const pulse = 0.5 + Math.sin(t / 200) * 0.2;
    ctx.fillStyle = `rgba(255,225,77,${pulse * 0.35})`;
    ctx.fillRect(tgt.x - 26, tgt.y - 130, 52, 130);
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath(); ctx.arc(tgt.x, tgt.y, 26 + Math.sin(t / 200) * 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center'; ctx.fillText('▼', tgt.x, tgt.y - 6);
  }
  for (const c of [...parked, ...traffic, ...police]) if (!c.dead) drawCar(ctx, c, t);
  if (S.car) drawCar(ctx, S.car, t);
  for (const p of [...peds, ...rivals, ...footCops]) drawPed(ctx, p);
  // player on foot
  if (!S.car && S.state !== 'title') {
    ctx.save(); ctx.translate(S.x, S.y);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0, 5, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8b73c'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2c89b'; ctx.beginPath(); ctx.arc(Math.cos(S.angle) * 4, Math.sin(S.angle) * 4 - 2, 5.5, 0, Math.PI * 2); ctx.fill();
    // gun direction
    ctx.strokeStyle = '#222'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(S.angle) * 16, Math.sin(S.angle) * 16); ctx.stroke();
    ctx.restore();
  }
  // tracers
  for (const tr of S.tracers) {
    ctx.strokeStyle = `rgba(255,240,150,${tr.t / 0.08})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(tr.x1, tr.y1); ctx.lineTo(tr.x2, tr.y2); ctx.stroke();
  }
  ctx.restore();
  // off-screen target arrow (screen space)
  if (tgt && S.state === 'playing') {
    const sx = tgt.x - S.cam.x, sy = tgt.y - S.cam.y;
    if (sx < 0 || sx > vw || sy < 0 || sy > vh) {
      const cx = clamp(sx, 60, vw - 60), cy = clamp(sy, 60, vh - 60);
      const ang = Math.atan2(tgt.y - S.y, tgt.x - S.x);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
      ctx.fillStyle = '#ffe14d'; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -10); ctx.lineTo(-10, 10); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  if (S.state === 'playing' || S.state === 'paused') drawHUD();
}

// ---------- debug hooks (read-only state + test helpers for playtest) ----------
window.__solara = {
  get x() { return S.x; }, get y() { return S.y; }, get angle() { return S.angle; },
  get wanted() { return S.wanted; }, get money() { return S.money; },
  get hp() { return S.hp; }, get ammo() { return S.ammo; },
  get mission() { return S.mission; }, get step() { return S.step; },
  get state() { return S.state; }, get inCar() { return !!S.car; },
  get speed() { return S.speed; }, get carHp() { return S.carHp; },
  get police() { return police.filter(p => !p.dead).length; },
  get rivalsLeft() { return S.rivalsLeft; },
  get objective() { return missionObjective(S); },
  get traffic() { return traffic.length; }, get peds() { return peds.filter(p => !p.dead).length; },
  get trafficPos() { return traffic.filter(c => !c.dead).map(c => ({ x: Math.round(c.x), y: Math.round(c.y) })); },
  get pedPos() { return [...peds, ...rivals].filter(p => !p.dead).slice(0, 40).map(p => ({ x: Math.round(p.x), y: Math.round(p.y), rival: !!p.isRival })); },
  get policePos() { return police.filter(p => !p.dead).map(p => ({ x: Math.round(p.x), y: Math.round(p.y) })); },
};
window.__solaraTest = {
  start: () => startGame(false),
  setWanted: n => { S.wanted = n; S.crimeTimer = 0; },
  setMission: (m, s) => { S.mission = m; S.step = s; startMission(S); },
  teleport: (x, y) => { if (S.car) { S.car.x = x; S.car.y = y; } S.x = x; S.y = y; },
  giveCar: () => { const c = makeCar(S.x + 40, S.y, 0, '#d23b2e', 'player'); S.car = c; S.x = c.x; S.y = c.y; },
  spawnPolice: n => { for (let i = 0; i < n; i++) spawnPoliceCar(); },
  banner: (t, s) => showBanner(t, s),
  setMoney: n => { S.money = n; },
  setAmmo: n => { S.ammo = n; },
};

// ---------- screenshot staging (?shot=) ----------
function applyShot() {
  const q = new URLSearchParams(location.search).get('shot');
  if (!q) return;
  if (q === 'start') {
    S.x = 1800; S.y = 1050;
    S.cam.x = clamp(S.x - vw / 2, 0, WORLD.w - vw); S.cam.y = clamp(S.y - vh / 2, 0, WORLD.h - vh);
    return;
  }
  startGame(false);
  if (q === 'drive') {
    window.__solaraTest.giveCar();
    S.car.x = 1500; S.car.y = 1300; S.car.angle = 0; S.car.speed = 320;
    S.x = S.car.x; S.y = S.car.y;
    S.mission = 1; S.step = 0; S.money = 300;
    showBanner('MISSION COMPLETE', 'FIRST WHEELS  +$150');
    S.bannerT = 60;
  } else if (q === 'chase') {
    window.__solaraTest.giveCar();
    S.car.x = 1500; S.car.y = 800; S.car.angle = Math.PI / 2; S.car.speed = 380;
    S.x = S.car.x; S.y = S.car.y;
    S.wanted = 3; S.crimeTimer = 0;
    for (let i = 0; i < 3; i++) {
      const p = makeCar(S.car.x + (i - 1) * 70, S.car.y - 190 - i * 40, Math.PI / 2, PD_COLOR, 'police');
      p.speed = 360; police.push(p);
    }
  } else if (q === 'mission') {
    S.mission = 1; S.step = 1; S.missionTimer = 72; startMission(S);
    S.mission = 1; S.step = 1; S.missionTimer = 72;
    window.__solaraTest.giveCar();
    S.car.x = 3150; S.car.y = 1080; S.car.angle = -Math.PI / 2; S.car.speed = 0;
    S.x = S.car.x; S.y = S.car.y;
    S.money = 450;
  }
  S.cam.x = clamp(S.x - vw / 2, 0, WORLD.w - vw);
  S.cam.y = clamp(S.y - vh / 2, 0, WORLD.h - vh);
}
applyShot();

// ---------- main loop ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}
// title screen: keep a slow camera drift over downtown
if (!new URLSearchParams(location.search).get('shot')) {
  S.x = 1800; S.y = 1050;
  S.cam.x = clamp(S.x - vw / 2, 0, WORLD.w - vw);
  S.cam.y = clamp(S.y - vh / 2, 0, WORLD.h - vh);
}
requestAnimationFrame(frame);
