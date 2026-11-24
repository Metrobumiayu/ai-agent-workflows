// Vice Bay — the economy. One job: everything that costs or earns money outside
// missions: the gun store, Dante's garage (repair / repaint / armor plating),
// the safehouse (buy once, save + heal forever), hidden packages, stunt jumps,
// free-roam taxi fares and the repeatable street race, plus reputation and ranks.
import { WEAPONS, RANKS, PACKAGE_REWARD, SAFEHOUSE_PRICE, REPAIR_PRICE, REPAINT_PRICE, PLATING_PRICE, ARMOR_PRICE } from './config.js';
import { addFloater } from './particles.js';
import { carById } from './vehicles.js';
import { nearestPed } from './pedestrians.js';

const PAINTS = ['#c0392b', '#2980b9', '#f39c12', '#1abc9c', '#8e44ad', '#e67e22', '#ecf0f1', '#1c1c1c'];

export function rankOf(rep) {
  let r = RANKS[0];
  for (const rank of RANKS) if (rep >= rank.rep) r = rank;
  return r;
}

export function addRep(G, n) {
  const before = rankOf(G.player.rep).name;
  G.player.rep += n;
  const after = rankOf(G.player.rep).name;
  if (after !== before) {
    G.message = `Rank up! You are now ${after} — shop discount ${Math.round(rankOf(G.player.rep).discount * 100)}%.`;
    G.messageT = 4;
    G.audio.sfx('win');
  }
}

export function shopPrice(G, base) {
  return Math.round(base * (1 - rankOf(G.player.rep).discount));
}

// What shop is the player standing at? Returns the shop or null.
export function nearShop(G) {
  const p = G.player;
  if (p.inCar) return null;
  for (const key of Object.keys(G.city.shops)) {
    const s = G.city.shops[key];
    if (Math.hypot(s.x - p.x, s.y - p.y) < 90) return s;
  }
  return null;
}

// Gun store menu: weapons, armor, ammo. Returns the list the HUD draws.
export function gunMenu(G) {
  const items = [];
  for (const key of ['pistol', 'shotgun', 'smg', 'rifle']) {
    const w = WEAPONS[key];
    const owned = (G.player.ammo[key] || 0) > 0 || G.player.weapon === key;
    items.push({ id: key, name: w.name, price: owned ? w.ammoPrice : w.price, desc: owned ? `Ammo +12 (have ${G.player.ammo[key] || 0})` : `Buy + 12 ammo — dmg ${w.damage}` });
  }
  items.push({ id: 'armor', name: 'Body Armor', price: ARMOR_PRICE, desc: `Absorbs damage (have ${Math.round(G.player.armor)})` });
  return items;
}

export function buyGunItem(G, id) {
  const p = G.player;
  if (id === 'armor') {
    const price = shopPrice(G, ARMOR_PRICE);
    if (p.money < price) return 'Not enough cash.';
    p.money -= price; p.armor = 100;
    G.audio.sfx('pickup');
    return 'Armor fitted — 100.';
  }
  const w = WEAPONS[id];
  const owned = (p.ammo[id] || 0) > 0 || p.weapon === id;
  const price = shopPrice(G, owned ? w.ammoPrice : w.price);
  if (p.money < price) return 'Not enough cash.';
  p.money -= price;
  p.ammo[id] = (p.ammo[id] || 0) + 12;
  if (p.weapon === 'fists') p.weapon = id;
  G.audio.sfx('pickup');
  return owned ? `${w.name} ammo +12.` : `${w.name} bought — 12 rounds included.`;
}

export function garageMenu(G) {
  const car = playerCar(G);
  const items = [
    { id: 'repair', name: 'Repair', price: REPAIR_PRICE, desc: car ? `HP ${Math.ceil(car.hp)}/${car.maxHp}` : 'No car' },
    { id: 'repaint', name: 'Repaint', price: REPAINT_PRICE, desc: 'New random paint' },
    { id: 'plating', name: 'Armor plating', price: PLATING_PRICE, desc: car && car.plated ? 'Already fitted' : '+60 HP, better grip' },
    { id: 'nitro', name: 'Nitro boost', price: 200, desc: 'One tank — 8s of +50% speed' },
  ];
  return items;
}

function playerCar(G) { return G.player.inCar ? carById(G, G.player.carId) : null; }

export function buyGarageItem(G, id) {
  const p = G.player;
  const car = playerCar(G);
  if (!car) return 'Bring a car into the garage.';
  const price = shopPrice(G, id === 'repair' ? REPAIR_PRICE : id === 'repaint' ? REPAINT_PRICE : id === 'plating' ? PLATING_PRICE : 200);
  if (p.money < price) return 'Not enough cash.';
  if (id === 'repair') {
    if (car.hp >= car.maxHp) return 'Already in perfect shape.';
    p.money -= price; car.hp = car.maxHp;
    return 'Repaired to full.';
  }
  if (id === 'repaint') {
    p.money -= price;
    car.color = PAINTS[Math.floor(Math.random() * PAINTS.length)];
    car.repainted = car.color;
    return `Repainted ${car.color}.`;
  }
  if (id === 'plating') {
    if (car.plated) return 'Already fitted.';
    p.money -= price; car.plated = true; car.maxHp += 60; car.hp += 60;
    return 'Armor plating fitted (+60 HP).';
  }
  p.money -= price; car.nitro = 8;
  return 'Nitro fitted — hold nothing, it fires on its own when you floor it.';
}

// Safehouse: buy once, then standing there heals and saves.
export function useSafehouse(G) {
  const p = G.player;
  if (!G.safehouseOwned) {
    if (p.money < SAFEHOUSE_PRICE) return `Need $${SAFEHOUSE_PRICE} to buy the pad.`;
    p.money -= SAFEHOUSE_PRICE;
    G.safehouseOwned = true;
    p.hp = 100;
    G.saveGame(false);
    return "Rook's Pad is yours — healed and saved.";
  }
  p.hp = 100;
  G.saveGame(false);
  return 'Healed and saved.';
}

// Hidden packages: walk over one to collect it.
export function updatePackages(G) {
  const p = G.player;
  for (const pkg of G.city.packages) {
    if (pkg.taken) continue;
    if (Math.hypot(pkg.x - p.x, pkg.y - p.y) < 34) {
      pkg.taken = true;
      G.stats.packages++;
      p.money += PACKAGE_REWARD;
      addRep(G, 4);
      addFloater(G, pkg.x, pkg.y, `Package ${G.stats.packages}/24  +$${PACKAGE_REWARD}`, '#ffd166');
      G.audio.sfx('pickup');
      G.message = `Hidden package ${G.stats.packages}/24 found!`;
      G.messageT = 2.5;
    }
  }
}

// Stunt jumps: cross a ramp fast and the airtime pays.
export function updateJumps(G, dt) {
  const pc = playerCar(G);
  if (!pc) return;
  for (const j of G.city.jumps) {
    if (j.used) continue;
    if (Math.hypot(pc.x - j.x, pc.y - j.y) < 60 && Math.abs(pc.speed) > 300) {
      j.used = true;
      const bonus = 150 + Math.floor(Math.abs(pc.speed) / 10);
      G.player.money += bonus;
      addRep(G, 6);
      G.stats.jumps++;
      addFloater(G, j.x, j.y, `STUNT JUMP! +$${bonus}`, '#ff8a65');
      G.shake = Math.min(12, G.shake + 5);
      G.audio.sfx('win');
      G.message = 'Stunt jump! Airtime pays.';
      G.messageT = 2.5;
    }
  }
}

// Free-roam taxi: driving a taxi, a fare ped appears nearby; deliver them.
export function updateTaxi(G, dt) {
  const pc = playerCar(G);
  const t = G.taxi;
  if (!pc || pc.type !== 'taxi') {
    if (t.active) { t.active = false; G.marker = null; }
    return;
  }
  if (!t.active) {
    t.spawnT -= dt;
    if (t.spawnT <= 0) {
      const ped = nearestPed(G, pc.x, pc.y, 700);
      if (ped) {
        ped.fare = true;
        t.active = true;
        t.phase = 'pickup';
        t.ped = ped;
        t.timer = 60;
        G.marker = { x: ped.x, y: ped.y, label: 'FARE' };
        G.message = 'A fare is waving you down!';
        G.messageT = 2;
      } else t.spawnT = 5;
    }
    return;
  }
  t.timer -= dt;
  if (t.timer <= 0) { t.active = false; if (t.ped) t.ped.fare = false; G.message = 'Fare gave up.'; G.messageT = 2; return; }
  if (t.phase === 'pickup') {
    if (t.ped) G.marker = { x: t.ped.x, y: t.ped.y, label: 'FARE' };
    if (t.ped && Math.hypot(pc.x - t.ped.x, pc.y - t.ped.y) < 60) {
      t.phase = 'drop';
      t.dest = { x: 900 + Math.random() * 5000, y: 500 + Math.random() * 3600 };
      t.timer = 75;
      t.ped.fare = false;
      t.ped.dead = true; // they are in the cab now
      G.marker = { x: t.dest.x, y: t.dest.y, label: 'DROP-OFF' };
      G.audio.sfx('pickup');
    }
  } else if (Math.hypot(pc.x - t.dest.x, pc.y - t.dest.y) < 80) {
    const fare = 60 + Math.floor(Math.random() * 90);
    G.player.money += fare;
    G.stats.fares++;
    addRep(G, 2);
    addFloater(G, t.dest.x, t.dest.y, `+$${fare}`, '#7ee081');
    G.audio.sfx('win');
    t.active = false;
    t.spawnT = 8;
    G.message = `Fare delivered +$${fare}.`;
    G.messageT = 2;
  }
}

// Repeatable street race: press E at the start line, beat the clock through 4 gates.
export function startRace(G) {
  const gates = [{ x: 5750, y: 3800 }, { x: 4500, y: 3800 }, { x: 4500, y: 2800 }, { x: 5750, y: 3050 }];
  G.race = { active: true, gates, i: 0, timer: 120 };
  G.marker = { x: gates[0].x, y: gates[0].y, label: 'GATE 1/4' };
  G.objectiveText = 'Street race — 4 gates, 120s, $500 to win';
  G.message = 'Race started!';
  G.messageT = 2;
}

export function updateRace(G, dt) {
  const r = G.race;
  if (!r.active) return;
  r.timer -= dt;
  if (r.timer <= 0) { r.active = false; G.message = 'Race failed — too slow.'; G.messageT = 2; G.audio.sfx('fail'); return; }
  const pc = playerCar(G);
  if (pc && Math.hypot(pc.x - r.gates[r.i].x, pc.y - r.gates[r.i].y) < 90) {
    r.i++;
    G.audio.sfx('pickup');
    if (r.i >= r.gates.length) {
      r.active = false;
      G.player.money += 500;
      G.stats.racesWon++;
      addRep(G, 10);
      addFloater(G, pc.x, pc.y, '+$500 RACE WIN', '#ffd166');
      G.audio.sfx('win');
      G.message = 'Race won! +$500';
      G.messageT = 3;
      return;
    }
    G.marker = { x: r.gates[r.i].x, y: r.gates[r.i].y, label: `GATE ${r.i + 1}/4` };
  }
  G.objectiveText = `Street race — gate ${r.i + 1}/4, ${Math.ceil(r.timer)}s`;
}
