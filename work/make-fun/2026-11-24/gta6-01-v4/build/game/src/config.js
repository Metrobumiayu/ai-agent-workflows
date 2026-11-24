// Vice Bay — shared constants: world size, districts, vehicles, weapons, ranks.
// One job: every magic number the other modules agree on lives here.
export const WORLD_W = 6400;
export const WORLD_H = 4600;
export const STEP = 1 / 60;
export const TAU = Math.PI * 2;

// Eight districts, each with its own ground, road and accent identity. The renderer
// paints ground per district; the city generator places buildings from the palette.
export const DISTRICTS = [
  { id: 'downtown', name: 'Downtown', x: 2200, y: 300, w: 1800, h: 1300, ground: '#3d3a44', road: '#2b2930', accent: '#ffd166', roof: ['#4a4753', '#55525f', '#3f3c48'], neon: false },
  { id: 'neon', name: 'Neon Strip', x: 4000, y: 300, w: 1400, h: 1300, ground: '#33283d', road: '#241c2c', accent: '#ff2e88', roof: ['#4a2d55', '#3d2a4a', '#55305e'], neon: true },
  { id: 'uptown', name: 'Uptown', x: 5400, y: 300, w: 700, h: 1300, ground: '#2f3a33', road: '#252e29', accent: '#7ee081', roof: ['#3d4a40', '#46544a', '#38443c'], neon: false },
  { id: 'marina', name: 'Marina', x: 300, y: 300, w: 1200, h: 1300, ground: '#2e3d4d', road: '#25313e', accent: '#4fc3f7', roof: ['#3a4a5c', '#42566b', '#33424f'], neon: false },
  { id: 'beach', name: 'Vice Beach', x: 300, y: 1600, w: 1200, h: 1300, ground: '#8a7a52', road: '#6f6242', accent: '#ffb74d', roof: ['#a08b5e', '#8f7d55', '#b39a6b'], neon: false },
  { id: 'suburbs', name: 'Suburbs', x: 1500, y: 1600, w: 1900, h: 1300, ground: '#3a4436', road: '#2e362b', accent: '#a5d6a7', roof: ['#4a5546', '#525e4c', '#424e3e'], neon: false },
  { id: 'docks', name: 'The Docks', x: 3400, y: 1600, w: 1500, h: 1300, ground: '#3a3430', road: '#2d2825', accent: '#ff8a65', roof: ['#4a4038', '#55463c', '#403832'], neon: false },
  { id: 'airport', name: 'Vice Intl Airport', x: 4900, y: 1600, w: 1200, h: 1300, ground: '#33383d', road: '#282c30', accent: '#90caf9', roof: ['#41474d', '#4a5056', '#383e44'], neon: false },
  { id: 'southside', name: 'Southside', x: 1500, y: 2900, w: 3400, h: 1400, ground: '#40342e', road: '#322a25', accent: '#e57373', roof: ['#4d4038', '#57493e', '#453a32'], neon: false },
  { id: 'harbor', name: 'Harbor Point', x: 300, y: 2900, w: 1200, h: 1400, ground: '#2c3844', road: '#232e38', accent: '#80deea', roof: ['#38444f', '#404e5a', '#323e48'], neon: false },
  { id: 'eastend', name: 'East End', x: 4900, y: 2900, w: 1200, h: 1400, ground: '#383838', road: '#2b2b2b', accent: '#ce93d8', roof: ['#454545', '#4f4f4f', '#3d3d3d'], neon: false },
];

// Vehicle types: length/width in px, accel, top speed (px/s), turn rate, grip, hp, seats of flavour.
export const VEHICLES = {
  sedan:   { w: 46, h: 22, accel: 420, max: 430, turn: 2.9, grip: 0.94, hp: 100, colors: ['#c0392b', '#2980b9', '#7f8c8d', '#f39c12', '#ecf0f1'] },
  sports:  { w: 48, h: 21, accel: 620, max: 560, turn: 3.4, grip: 0.96, hp: 80, colors: ['#e74c3c', '#f1c40f', '#1abc9c', '#e67e22'] },
  muscle:  { w: 50, h: 23, accel: 540, max: 500, turn: 2.7, grip: 0.92, hp: 120, colors: ['#8e44ad', '#2c3e50', '#d35400', '#16a085'] },
  taxi:    { w: 46, h: 22, accel: 430, max: 440, turn: 2.9, grip: 0.94, hp: 100, colors: ['#f7dc00'] },
  truck:   { w: 62, h: 26, accel: 300, max: 360, turn: 2.2, grip: 0.9, hp: 220, colors: ['#95a5a6', '#5d6d7e', '#a04000'] },
  van:     { w: 54, h: 24, accel: 360, max: 400, turn: 2.5, grip: 0.92, hp: 140, colors: ['#7f8c8d', '#6c3483', '#1e8449'] },
  bus:     { w: 78, h: 28, accel: 240, max: 320, turn: 1.9, grip: 0.9, hp: 260, colors: ['#2e86c1', '#28b463'] },
  limo:    { w: 72, h: 22, accel: 480, max: 480, turn: 2.4, grip: 0.93, hp: 130, colors: ['#1c1c1c', '#f8f9f9'] },
  moto:    { w: 30, h: 12, accel: 700, max: 540, turn: 4.2, grip: 0.9, hp: 50, colors: ['#c0392b', '#2c3e50', '#f39c12'] },
  police:  { w: 48, h: 22, accel: 560, max: 520, turn: 3.2, grip: 0.96, hp: 140, colors: ['#1a1a2e'] },
};

// Weapons: damage per hit, fire interval (s), pellets, spread (rad), range, auto?
export const WEAPONS = {
  fists:   { name: 'Fists', damage: 12, rate: 0.35, pellets: 1, spread: 0.05, range: 34, price: 0, ammoPrice: 0, auto: false },
  pistol:  { name: 'P-9 Pistol', damage: 18, rate: 0.28, pellets: 1, spread: 0.06, range: 420, price: 150, ammoPrice: 60, auto: false },
  shotgun: { name: 'S-12 Shotgun', damage: 14, rate: 0.7, pellets: 5, spread: 0.22, range: 300, price: 400, ammoPrice: 60, auto: false },
  smg:     { name: 'VK-9 SMG', damage: 12, rate: 0.09, pellets: 1, spread: 0.12, range: 380, price: 700, ammoPrice: 60, auto: true },
  rifle:   { name: 'AR-77 Rifle', damage: 34, rate: 0.16, pellets: 1, spread: 0.03, range: 560, price: 1200, ammoPrice: 60, auto: true },
};

// Reputation ranks: rep needed, label, shop discount, what it unlocks.
export const RANKS = [
  { rep: 0, name: 'Rookie', discount: 0 },
  { rep: 60, name: 'Hustler', discount: 0.05 },
  { rep: 160, name: 'Enforcer', discount: 0.1 },
  { rep: 320, name: 'Boss', discount: 0.15 },
  { rep: 550, name: 'Kingpin', discount: 0.2 },
];

export const WANTED_MAX = 5;
export const PACKAGE_COUNT = 24;
export const PACKAGE_REWARD = 100;
export const START_MONEY = 250;
export const SAFEHOUSE_PRICE = 1500;
export const REPAIR_PRICE = 100;
export const REPAINT_PRICE = 50;
export const PLATING_PRICE = 600;
export const ARMOR_PRICE = 250;
