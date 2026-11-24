// Solara Bay — story missions (Vic & Mara), objectives, save/load.
import { ROADS_X, ROADS_Y } from './world.js';

export const MISSIONS = [
  {
    name: '1 — First Wheels', title: 'FIRST WHEELS',
    brief: 'Mara: "We need wheels, Vic. Steal a car — any car with a driver. Parked ones are free, but slow."',
    steps: [
      { text: 'Steal a car (press E near a traffic car)', target: null },
    ],
    reward: 150,
  },
  {
    name: '2 — Courier Run', title: 'COURIER RUN',
    brief: 'Mara: "Package at the docks. Get it to the beach house in 90 seconds. No cops, no crashes."',
    steps: [
      { text: 'Pick up the package at the docks', target: { x: 1800, y: 2150, r: 70 } },
      { text: 'Deliver the package to the beach house', target: { x: 3150, y: 1000, r: 70 }, timer: 90 },
    ],
    reward: 300,
  },
  {
    name: '3 — Heat Wave', title: 'HEAT WAVE',
    brief: 'Vic: "The whole PD is on us. Survive the heat — keep 2+ stars for 45 seconds, then lose them."',
    steps: [
      { text: 'Raise your wanted level to 2 stars (steal a car or hit a cop)', target: null },
      { text: 'Survive with 2+ stars for 45 seconds', target: null, survive: 45 },
      { text: 'Lose the cops — get back to 0 stars', target: null },
    ],
    reward: 400,
  },
  {
    name: '4 — Payback', title: 'PAYBACK',
    brief: 'Mara: "Rico\'s crew jumped us at the docks. Four of them. Make them regret it."',
    steps: [
      { text: 'Go to the docks and take down Rico\'s 4 rivals (F to punch, mouse to shoot)', target: { x: 1800, y: 2150, r: 120 } },
    ],
    reward: 500,
  },
  {
    name: '5 — The Big Score', title: 'THE BIG SCORE',
    brief: 'Vic: "The Solara Bay Bank. In, grab the cash, out — then lose the heat at the safehouse."',
    steps: [
      { text: 'Reach the Solara Bay Bank downtown', target: { x: 1500, y: 1300, r: 90 } },
      { text: 'Hold the bank — stay inside the vault zone', target: { x: 1500, y: 1300, r: 90 }, hold: 8 },
      { text: 'Escape to the safehouse in Residential', target: { x: 600, y: 600, r: 80 } },
    ],
    reward: 2000,
  },
];

export function missionObjective(state) {
  if (state.mission >= MISSIONS.length) return 'All missions complete — Solara Bay is yours, Vic.';
  const m = MISSIONS[state.mission];
  const step = m.steps[state.step] || m.steps[m.steps.length - 1];
  return m.name + ': ' + step.text;
}

export function missionTarget(state) {
  if (state.mission >= MISSIONS.length) return null;
  const m = MISSIONS[state.mission];
  const step = m.steps[state.step];
  return step ? step.target || null : null;
}

export function advanceMission(state, events) {
  // Called when a step's condition is met; returns true if mission completed.
  const m = MISSIONS[state.mission];
  if (!m) return false;
  state.step++;
  if (state.step >= m.steps.length) {
    state.money += m.reward;
    state.mission++;
    state.step = 0;
    state.missionTimer = 0;
    state.holdTimer = 0;
    state.surviveTimer = 0;
    events.push({ type: 'mission-complete', name: m.title, reward: m.reward });
    return true;
  }
  state.missionTimer = 0; state.holdTimer = 0; state.surviveTimer = 0;
  const next = m.steps[state.step];
  if (next && next.timer) state.missionTimer = next.timer;
  events.push({ type: 'mission-step', text: next ? next.text : '' });
  return false;
}

export function startMission(state) {
  const m = MISSIONS[state.mission];
  if (!m) return;
  state.step = 0; state.missionTimer = 0; state.holdTimer = 0; state.surviveTimer = 0;
  const s = m.steps[0];
  if (s && s.timer) state.missionTimer = s.timer;
}

export const SAVE_KEY = 'solara-save-v2';
export function saveGame(state) {
  try {
    const data = {
      money: state.money, hp: state.hp, ammo: state.ammo, wanted: state.wanted,
      mission: state.mission, step: state.step, x: state.x, y: state.y,
      angle: state.angle, time: state.gameTime, savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch { return false; }
}
export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
export function hasSave() { return loadSave() !== null; }
