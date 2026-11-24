// Solara Bay — every tuning number and colour in one place. The playfield is the world camera's
// 1280x720 logical view; the renderer scales it to the window, so no rule below depends on the screen.

export const VIEW = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The city: a grid of roads with named districts, a beach to the south and docks to the east. */
export const WORLD = { width: 3600, height: 2600, roadWidth: 96, blockGap: 400 };
export const ROADS_X = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000, 3400];
export const ROADS_Y = [200, 600, 1000, 1400, 1800, 2200];
export const BEACH_Y = 2320;
export const WATER_Y = 2500;

export const PLAYER = {
  radius: 14,
  walkSpeed: 230,
  runSpeed: 330,
  health: 100,
  punchRange: 34,
  punchDamage: 25,
  punchCooldown: 0.45,
};

export const CAR = {
  length: 54,
  width: 26,
  accel: 420,
  brake: 700,
  reverseAccel: 260,
  maxSpeed: 560,
  maxReverse: 180,
  turnRate: 2.9,
  grip: 0.92,
  health: 100,
};

export const TRAFFIC = {
  count: 26,
  minSpeed: 110,
  maxSpeed: 210,
  turnChance: 0.22,
  followGap: 70,
};

export const PEDS = { count: 34, minSpeed: 45, maxSpeed: 85 };

export const POLICE = {
  maxCars: 5,
  carSpeed: 520,
  ramDamage: 6,
  copSpeed: 200,
  copDamage: 8,
  copCooldown: 0.8,
  spawnDistance: 900,
};

export const WANTED = {
  maxStars: 5,
  stealCar: 1,
  punchPed: 1,
  shoot: 1,
  runOver: 2,
  killCop: 2,
  decaySeconds: 14,
  decayDistance: 520,
};

export const PISTOL = { ammo: 24, damage: 34, range: 420, cooldown: 0.28, spread: 0.05 };

export const PICKUPS = {
  cash: { count: 10, value: 50 },
  health: { count: 8, heal: 40 },
  ammo: { count: 6, ammo: 12 },
};

export const MISSION_REWARDS = [200, 350, 500, 800, 1500];

export const PALETTE = {
  backdrop: '#0e1420',
  grass: '#4d7a3a',
  grassDark: '#436e33',
  sidewalk: '#9aa0a8',
  road: '#33373e',
  roadLine: '#d8c95a',
  sand: '#e0c98f',
  water: '#2a7fa8',
  waterDeep: '#1d5f86',
  park: '#3f7a34',
  buildingGlass: '#5d7f9e',
  buildingBrick: '#8a5a44',
  buildingHouse: '#b98a5e',
  buildingWare: '#6e6a63',
  buildingRoof: '#2e3440',
  tree: '#2c5c26',
  treeLight: '#3a7a30',
  player: '#f2c94c',
  playerShirt: '#2e86de',
  pedShirt: ['#e5534b', '#4fc3f7', '#9b59b6', '#e67e22', '#1abc9c', '#ecf0f1'],
  cop: '#1c3a5e',
  copCar: '#1c3a5e',
  taxi: '#f2c94c',
  text: '#eef1f5',
  muted: '#aab2c0',
  hudPanel: 'rgba(10, 14, 22, 0.72)',
  star: '#ffd93b',
  starEmpty: '#5a6270',
  health: '#3ecf6e',
  healthLow: '#e5534b',
  marker: '#ffd93b',
  money: '#7be495',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the save lives between visits (this browser only). */
export const SAVE_KEY = 'solara-bay.save.v1';
export const BEST_KEY = 'solara-bay.best';
