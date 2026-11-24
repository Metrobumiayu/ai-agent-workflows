// Missions: 10 story + side missions for Solara Bay. Each mission has start/update/objective.
// G.missionData is reset fresh on every start; rivals are always demoted to traffic when a
// race ends (or any mission resets) so no rival is ever left with undefined state.
import { clamp, dist2 } from './rng.js';
import { makeCar, addWanted, dropCash } from './entities.js';

function setMarker(G, x, y, label) { G.marker = { x, y, label }; }
function clearMarker(G) { G.marker = null; }
function complete(G, payout, text) {
  G.player.money += payout;
  G.audio.missionOk();
  G.message = `${text}  +$${payout}`;
  G.messageT = 3;
  G.missionDone = G.mission ? G.mission.num : 0;
  G.mission = null; G.missionData = {}; clearMarker(G);
  G.missionsCompleted = (G.missionsCompleted || 0) + 1;
  G.saveGame(true);
}
function fail(G, text) {
  G.audio.missionFail();
  G.message = `Mission failed: ${text}`;
  G.messageT = 3;
  G.mission = null; G.missionData = {}; clearMarker(G);
}
export function demoteRivals(G) {
  for (const c of G.cars) {
    if (c.rival) { c.rival = false; c.ai = 'traffic'; c.targetSpeed = 120; c.checkpoint = 0; }
  }
}
function payoutFor(num) { return [0, 300, 450, 500, 600, 2500, 800, 350, 400, 500, 5000][num] || 300; }

export const MISSIONS = [
  {
    id: 'first-wheels', num: 1, name: 'First Wheels', desc: 'Nadia needs wheels. Steal any car and bring it to Bay Auto Garage.',
    start(G) { setMarker(G, 2700, 2250, 'Bay Auto Garage'); G.missionData = { got: false }; },
    update(G) {
      const p = G.player, d = G.missionData;
      if (p.inCar && !d.got) { d.got = true; G.message = 'Nice ride. Now take it to the garage.'; G.messageT = 2; }
      if (d.got && p.inCar && dist2(p.x, p.y, 2700, 2250) < 110 * 110) complete(G, payoutFor(1), 'First Wheels complete!');
    },
    objective(G) { return G.missionData.got ? 'Drive to Bay Auto Garage' : 'Steal any car (E near a car)'; },
  },
  {
    id: 'courier', num: 2, name: 'Courier Run', desc: 'Three drops, one clock. Deliver the packages before time runs out.',
    start(G) {
      G.missionData = { stops: [{ x: 900, y: 900 }, { x: 4200, y: 900 }, { x: 3800, y: 2900 }], i: 0, t: 150 };
      setMarker(G, 900, 900, 'Drop 1/3');
    },
    update(G, dt) {
      const d = G.missionData; d.t -= dt;
      if (d.t <= 0) { fail(G, 'Out of time'); return; }
      const s = d.stops[d.i];
      if (s && dist2(G.player.x, G.player.y, s.x, s.y) < 100 * 100) {
        d.i++; G.audio.pickup(); dropCash(G, s.x, s.y, 50);
        if (d.i >= d.stops.length) { complete(G, payoutFor(2), 'Courier Run complete!'); return; }
        const n = d.stops[d.i]; setMarker(G, n.x, n.y, `Drop ${d.i + 1}/3`);
        G.message = `Package delivered. ${d.i}/3 done.`; G.messageT = 2;
      }
    },
    objective(G) { const d = G.missionData; return `Deliver package ${d.i + 1}/3 — ${Math.ceil(d.t)}s left`; },
  },
  {
    id: 'heat', num: 3, name: 'Heat Wave', desc: 'The cops are onto Nadia\'s crew. Survive 60 seconds at 3 stars.',
    start(G) { G.missionData = { t: 60 }; addWanted(G, 3); G.message = 'Survive the heat — 60 seconds!'; G.messageT = 3; },
    update(G, dt) {
      const d = G.missionData; d.t -= dt;
      if (G.player.wanted < 3) addWanted(G, 3 - G.player.wanted);
      if (d.t <= 0) {
        G.player.wanted = 0; G.wantedTimer = 14;
        for (const c of G.cars) if (c.ai === 'police') { c.ai = 'traffic'; c.targetSpeed = 120; }
        G.footPolice = []; G.heli.active = false;
        complete(G, payoutFor(3), 'Heat Wave survived!');
      }
    },
    objective(G) { return `Survive the heat — ${Math.ceil(G.missionData.t)}s left`; },
  },
  {
    id: 'payback', num: 4, name: 'Payback at the Docks', desc: 'Rival crew took Nadia\'s shipment. Go to the Docks and take it back.',
    start(G) {
      G.missionData = { spawned: false };
      setMarker(G, 4000, 2900, 'The Docks');
      G.enemies = [];
    },
    update(G) {
      const d = G.missionData;
      if (!d.spawned && dist2(G.player.x, G.player.y, 4000, 2900) < 350 * 350) {
        d.spawned = true;
        for (let i = 0; i < 4; i++) G.enemies.push({ x: 3900 + i * 70, y: 2850 + (i % 2) * 90, angle: 0, hp: 40, cd: 0, color: '#c04040' });
        G.message = 'Take down the rival crew!'; G.messageT = 2.5; addWanted(G, 1);
      }
      if (d.spawned && G.enemies.length === 0) complete(G, payoutFor(4), 'Payback complete!');
    },
    objective(G) { return G.missionData.spawned ? `Defeat the rival crew (${G.enemies.length} left)` : 'Go to the Docks'; },
  },
  {
    id: 'heist', num: 5, name: 'The Big Score', desc: 'Solara National Bank. Hold the vault for 6 seconds, then lose the 4-star getaway.',
    start(G) { G.missionData = { stage: 'vault', hold: 0 }; setMarker(G, 2400, 1800, 'Solara National Bank'); },
    update(G, dt) {
      const d = G.missionData, p = G.player;
      if (d.stage === 'vault') {
        if (dist2(p.x, p.y, 2400, 1800) < 120 * 120 && !p.inCar) {
          d.hold += dt;
          if (d.hold >= 6) {
            d.stage = 'getaway'; p.money += 0;
            G.player.wanted = 4; G.wantedTimer = 14;
            for (let i = 0; i < 2; i++) { const a = G.rng.range(0, 6.28); makeCar(G, 'police', clamp(p.x + Math.cos(a) * 450, 60, 4740), clamp(p.y + Math.sin(a) * 450, 60, 3540), a, 'police'); }
            setMarker(G, 900, 2900, 'Getaway — Beach');
            G.message = 'Vault cracked! Lose the cops at the Beach!'; G.messageT = 3;
            G.audio.missionOk();
          }
        } else d.hold = Math.max(0, d.hold - dt * 2);
      } else if (d.stage === 'getaway') {
        if (dist2(p.x, p.y, 900, 2900) < 120 * 120 && p.wanted <= 1) complete(G, payoutFor(5), 'The Big Score!');
      }
    },
    objective(G) {
      const d = G.missionData;
      return d.stage === 'vault' ? (d.hold > 0 ? `Cracking vault… ${Math.ceil(6 - d.hold)}s` : 'Enter the bank on foot (vault)') : 'Getaway! Reach the Beach with 1 star or less';
    },
  },
  {
    id: 'race', num: 6, name: 'Bay Grand Prix', desc: 'Six checkpoints across the city against three rivals. Win the race.',
    start(G) {
      const cps = [{ x: 2200, y: 600 }, { x: 4200, y: 1000 }, { x: 4200, y: 2200 }, { x: 1400, y: 2200 }, { x: 1000, y: 3000 }, { x: 2200, y: 2200 }];
      G.missionData = { checkpoints: cps, i: 0, over: false };
      // 3 rivals line up at the start, on the road
      const spots = [{ x: 2100, y: 2214 }, { x: 2200, y: 2214 }, { x: 2300, y: 2214 }];
      spots.forEach((s, i) => {
        const c = makeCar(G, 'sports', s.x, s.y, -Math.PI / 2, 'rival');
        c.rival = true; c.checkpoint = 0; c.rivalSkill = i; c.color = ['#d04040', '#40a0d0', '#e8c020'][i];
      });
      setMarker(G, 2200, 600, 'Checkpoint 1/6');
      G.message = 'Race! Hit all 6 checkpoints before the rivals.'; G.messageT = 3;
    },
    update(G) {
      const d = G.missionData;
      if (!d || d.over || !d.checkpoints) return;
      const p = G.player;
      const cp = d.checkpoints[d.i];
      if (cp && dist2(p.x, p.y, cp.x, cp.y) < 110 * 110) {
        d.i++; G.audio.pickup();
        if (d.i >= d.checkpoints.length) {
          d.over = true;
          const bestRival = Math.max(0, ...G.cars.filter((c) => c.rival).map((c) => c.checkpoint || 0));
          const won = true; // player finished all 6; rivals counted by checkpoints
          demoteRivals(G);
          complete(G, payoutFor(6), won ? 'Race won!' : 'Race complete!');
          return;
        }
        const n = d.checkpoints[d.i]; setMarker(G, n.x, n.y, `Checkpoint ${d.i + 1}/6`);
      }
      // rival finished first?
      for (const c of G.cars) if (c.rival && (c.checkpoint || 0) >= d.checkpoints.length) { d.over = true; demoteRivals(G); fail(G, 'A rival won the race'); return; }
    },
    objective(G) { const d = G.missionData; return `Race — checkpoint ${Math.min(d.i + 1, 6)}/6`; },
  },
  {
    id: 'taxi', num: 7, name: 'Cab Fare', desc: 'Drive a taxi. Three fares around the city — tips for fast drops.',
    start(G) {
      G.missionData = { fare: 0, stage: 'pickup', t: 0 };
      G.taxiSpots = [{ px: 1400, py: 1400, dx: 4200, dy: 600 }, { px: 3400, py: 1000, dx: 1000, dy: 3000 }, { px: 2200, py: 2600, dx: 4200, dy: 1800 }];
      const s = G.taxiSpots[0];
      setMarker(G, s.px, s.py, 'Passenger 1/3');
      G.message = 'Grab a taxi (yellow cab) and pick up the passenger.'; G.messageT = 3;
    },
    update(G, dt) {
      const d = G.missionData, p = G.player;
      const s = G.taxiSpots[d.fare];
      if (!s) return;
      if (d.stage === 'pickup') {
        if (p.inCar && dist2(p.x, p.y, s.px, s.py) < 100 * 100) {
          const car = G.cars.find((c) => c.id === p.carId);
          if (car && car.type === 'taxi') {
            d.stage = 'drop'; d.t = 90;
            setMarker(G, s.dx, s.dy, `Drop-off ${d.fare + 1}/3`);
            G.message = 'Passenger aboard — drive!'; G.messageT = 2;
          } else { G.message = 'You need a TAXI for fares.'; G.messageT = 2; }
        }
      } else {
        d.t -= dt;
        if (d.t <= 0) { fail(G, 'Passenger walked off'); return; }
        if (p.inCar && dist2(p.x, p.y, s.dx, s.dy) < 100 * 100) {
          const tip = Math.ceil(d.t);
          p.money += 150 + tip; G.audio.cash();
          d.fare++; d.stage = 'pickup';
          if (d.fare >= 3) { complete(G, payoutFor(7), 'Cab shift complete!'); return; }
          const n = G.taxiSpots[d.fare]; setMarker(G, n.px, n.py, `Passenger ${d.fare + 1}/3`);
          G.message = `Fare paid (+$${150 + tip}). Next passenger.`; G.messageT = 2;
        }
      }
    },
    objective(G) {
      const d = G.missionData;
      return d.stage === 'pickup' ? `Pick up passenger ${d.fare + 1}/3 (in a taxi)` : `Drop off passenger ${d.fare + 1}/3 — ${Math.ceil(d.t)}s`;
    },
  },
  {
    id: 'airport', num: 8, name: 'Flight Risk', desc: 'Nadia\'s contact lands in 2 minutes. Get to the Airport terminal — fast.',
    start(G) { G.missionData = { t: 120 }; setMarker(G, 3900, 1650, 'Airport Terminal'); },
    update(G, dt) {
      const d = G.missionData; d.t -= dt;
      if (d.t <= 0) { fail(G, 'The flight left'); return; }
      if (dist2(G.player.x, G.player.y, 3900, 1650) < 130 * 130) complete(G, payoutFor(8), 'Flight Risk complete!');
    },
    objective(G) { return `Reach the Airport — ${Math.ceil(G.missionData.t)}s left`; },
  },
  {
    id: 'marina', num: 9, name: 'Crate Dive', desc: 'Five crates went overboard at the Marina. Fish them out.',
    start(G) {
      G.missionData = { got: 0 };
      G.crates = [];
      for (let i = 0; i < 5; i++) G.crates.push({ x: 4450 + (i % 3) * 90, y: 400 + Math.floor(i / 3) * 260 + i * 40, taken: false });
      setMarker(G, 4450, 400, 'Marina crates 0/5');
    },
    update(G) {
      const d = G.missionData;
      for (const c of G.crates) {
        if (!c.taken && dist2(G.player.x, G.player.y, c.x, c.y) < 60 * 60) {
          c.taken = true; d.got++; G.audio.pickup(); dropCash(G, c.x, c.y, 40);
          setMarker(G, 4450, 400, `Marina crates ${d.got}/5`);
        }
      }
      if (d.got >= 5) complete(G, payoutFor(9), 'Crate Dive complete!');
    },
    objective(G) { return `Collect marina crates ${G.missionData.got}/5`; },
  },
  {
    id: 'finale', num: 10, name: 'Solara Sunset', desc: 'The finale. Steal a sports car, lose the heat, deliver the package, vanish.',
    start(G) { G.missionData = { step: 0 }; setMarker(G, 2200, 2200, 'Steal a sports car'); G.message = 'Finale: steal a sports car!'; G.messageT = 3; },
    update(G, dt) {
      const d = G.missionData, p = G.player;
      if (d.step === 0) {
        const car = G.cars.find((c) => c.id === p.carId);
        if (p.inCar && car && car.type === 'sports') {
          d.step = 1; G.player.wanted = 3; G.wantedTimer = 14; addWanted(G, 0);
          setMarker(G, 2200, 2200, 'Lose the cops (0 stars)');
          G.message = 'Heat is on — lose the cops!'; G.messageT = 2.5;
        }
      } else if (d.step === 1) {
        if (p.wanted === 0) {
          d.step = 2; setMarker(G, 1500, 3200, 'Deliver the package — Beach');
          G.message = 'Clean. Deliver the package to the Beach.'; G.messageT = 2.5;
        }
      } else if (d.step === 2) {
        if (dist2(p.x, p.y, 1500, 3200) < 110 * 110) {
          d.step = 3; setMarker(G, 4150, 1450, 'Escape to the Safehouse');
          G.message = 'Package delivered. Vanish to the safehouse.'; G.messageT = 2.5;
        }
      } else if (d.step === 3) {
        if (dist2(p.x, p.y, 4150, 1450) < 110 * 110) complete(G, payoutFor(10), 'SOLARA SUNSET — story complete!');
      }
    },
    objective(G) {
      return ['Steal a sports car', 'Lose the cops (0 stars)', 'Deliver the package to the Beach', 'Escape to the Safehouse'][G.missionData.step];
    },
  },
];

export function startMission(G, num) {
  demoteRivals(G);
  G.enemies = [];
  const def = MISSIONS.find((m) => m.num === num);
  if (!def) return false;
  G.mission = { id: def.id, num: def.num, name: def.name, def };
  G.missionData = {};
  def.start(G);
  G.message = `Mission ${def.num}: ${def.name}`; G.messageT = 3;
  return true;
}
export function updateMission(G, dt) {
  if (!G.mission) return;
  if (G.mission.failed) { G.mission = null; G.missionData = {}; clearMarker(G); return; }
  try { G.mission.def.update(G, dt); } catch (e) { console.error('mission error', e); }
}
export function missionObjective(G) {
  if (!G.mission) return G.missionsCompleted >= 10 ? 'Story complete — free roam!' : 'No mission — press N for next mission';
  try { return G.mission.def.objective(G); } catch (e) { return ''; }
}
