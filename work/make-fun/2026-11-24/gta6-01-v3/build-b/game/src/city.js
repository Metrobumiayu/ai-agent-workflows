// Solara Bay city generation: districts, road grid, buildings, props, shops, spawn points.
// World is 4800 x 3600. Roads on a 400px grid; highway ring around the edge.
import { makeRng, clamp } from './rng.js';

export const WORLD_W = 4800;
export const WORLD_H = 3600;
export const ROAD = 400; // grid spacing
export const ROAD_W = 56;

export const DISTRICTS = [
  { name: 'Downtown', x: 1600, y: 1100, w: 1500, h: 1100, color: '#3d4a6b', label: 'DOWNTOWN' },
  { name: 'Suburbs', x: 100, y: 100, w: 1300, h: 900, color: '#4a6b4a', label: 'SUBURBS' },
  { name: 'Marina', x: 3900, y: 300, w: 800, h: 1000, color: '#2e6b7a', label: 'MARINA' },
  { name: 'Beach', x: 1000, y: 2700, w: 2200, h: 800, color: '#b89a5e', label: 'BEACH' },
  { name: 'Airport', x: 3600, y: 1400, w: 1100, h: 900, color: '#5a5a6b', label: 'AIRPORT' },
  { name: 'Docks', x: 3400, y: 2500, w: 1300, h: 1000, color: '#6b5a3d', label: 'DOCKS' },
];

export function districtAt(x, y) {
  for (const d of DISTRICTS) if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  return DISTRICTS[0];
}

// Major intersections get traffic lights (every other grid crossing).
export function buildCity(seed) {
  const rng = makeRng(seed);
  const buildings = [];
  const trees = [];
  const lamps = [];
  const containers = [];
  const cranes = [];
  const boats = [];
  const planes = [];
  const lights = [];

  const vRoads = []; for (let x = 200; x < WORLD_W; x += ROAD) vRoads.push(x);
  const hRoads = []; for (let y = 200; y < WORLD_H; y += ROAD) hRoads.push(y);

  const onRoad = (x, y) => {
    for (const rx of vRoads) if (Math.abs(x - rx) < ROAD_W / 2 + 8) return true;
    for (const ry of hRoads) if (Math.abs(y - ry) < ROAD_W / 2 + 8) return true;
    return false;
  };
  const inWater = (x, y) => x > 4400 && y < 1300; // marina basin east edge
  const onRunway = (x, y) => x > 3750 && x < 4550 && y > 1750 && y < 1900;
  const onBeachSand = (x, y) => y > 3050 && y < 3500 && x > 1000 && x < 3200;

  // Buildings per block (between roads), taller in Downtown.
  for (let bx = 0; bx < 11; bx++) {
    for (let by = 0; by < 8; by++) {
      const x0 = 200 + bx * ROAD + ROAD_W / 2 + 14;
      const y0 = 200 + by * ROAD + ROAD_W / 2 + 14;
      const bw = ROAD - ROAD_W - 28, bh = ROAD - ROAD_W - 28;
      const cx = x0 + bw / 2, cy = y0 + bh / 2;
      if (inWater(cx, cy) || onRunway(cx, cy)) continue;
      const d = districtAt(cx, cy);
      if (d.name === 'Airport' && rng.chance(0.6)) continue;
      if (d.name === 'Beach' && onBeachSand(cx, cy)) continue;
      if (d.name === 'Docks' && rng.chance(0.55)) continue;
      const downtown = d.name === 'Downtown';
      const n = downtown ? rng.int(2, 3) : rng.int(1, 2);
      for (let i = 0; i < n; i++) {
        const w = downtown ? rng.range(70, 150) : rng.range(60, 120);
        const h = downtown ? rng.range(70, 150) : rng.range(60, 110);
        const x = clamp(x0 + rng.range(0, Math.max(1, bw - w)), x0, x0 + bw - w);
        const y = clamp(y0 + rng.range(0, Math.max(1, bh - h)), y0, y0 + bh - h);
        const tall = downtown ? rng.int(3, 9) : rng.int(1, 3);
        const palette = downtown
          ? ['#5a6b8c', '#6b5a7a', '#4a6b7a', '#7a6b4a']
          : d.name === 'Suburbs' ? ['#8c7a5a', '#7a8c6b', '#a08c6b', '#6b7a8c']
          : d.name === 'Marina' ? ['#4a7a8c', '#5a8c7a', '#6b8ca0']
          : ['#8c8c7a', '#7a6b5a', '#9a8c7a'];
        buildings.push({
          x, y, w, h, tall, color: rng.pick(palette),
          windows: [], tower: downtown && tall >= 7,
        });
        const b = buildings[buildings.length - 1];
        const cols = Math.max(2, Math.floor(w / 26)), rows = Math.max(2, Math.floor(h / 26));
        for (let cxi = 0; cxi < cols; cxi++) for (let cyi = 0; cyi < rows; cyi++)
          b.windows.push({ x: x + 8 + cxi * ((w - 16) / cols), y: y + 8 + cyi * ((h - 16) / rows), lit: rng.chance(0.45) });
      }
      // trees / lamps in the block
      const tn = rng.int(0, 3);
      for (let i = 0; i < tn; i++) trees.push({ x: x0 + rng.range(10, bw), y: y0 + rng.range(10, bh), r: rng.range(7, 12) });
      if (rng.chance(0.7)) lamps.push({ x: x0 + 6, y: y0 + 6 });
    }
  }
  // Solara Tower — the landmark skyscraper in Downtown.
  buildings.push({ x: 2280, y: 1560, w: 170, h: 170, tall: 12, color: '#3a5a8c', windows: [], tower: true, landmark: 'Solara Tower' });
  const st = buildings[buildings.length - 1];
  for (let cxi = 0; cxi < 6; cxi++) for (let cyi = 0; cyi < 6; cyi++)
    st.windows.push({ x: st.x + 10 + cxi * 26, y: st.y + 10 + cyi * 26, lit: rng.chance(0.6) });

  // Docks: containers + cranes
  for (let i = 0; i < 26; i++) {
    const x = 3500 + rng.range(0, 1100), y = 2600 + rng.range(0, 800);
    if (onRoad(x, y)) continue;
    containers.push({ x, y, w: 90, h: 34, color: rng.pick(['#b04030', '#3080b0', '#b08030', '#40a060', '#8040a0']), rot: rng.chance(0.5) ? 0 : Math.PI / 2 });
  }
  cranes.push({ x: 3600, y: 2550 }, { x: 4100, y: 2550 }, { x: 4500, y: 2900 });

  // Marina: boats bobbing in the basin
  for (let i = 0; i < 9; i++) boats.push({ x: 4450 + rng.range(0, 260), y: 350 + rng.range(0, 850), len: rng.range(46, 80), phase: rng.range(0, 6.28), color: rng.pick(['#e8e8e8', '#d0d8e8', '#f0e0c0']) });
  // Boardwalk along the beach
  // Airport: terminal + 3 parked planes + runway
  planes.push({ x: 3950, y: 1650, rot: 0.2 }, { x: 4200, y: 2050, rot: -0.3 }, { x: 3800, y: 2150, rot: 0.5 });

  // Traffic lights at major intersections (every 800px crossing)
  for (const rx of vRoads) for (const ry of hRoads) {
    if ((Math.round(rx / ROAD) + Math.round(ry / ROAD)) % 2 === 0) lights.push({ x: rx, y: ry, t: rng.range(0, 8), state: 'green' });
  }

  // Shops / services (on roadside spots)
  const shops = [
    { kind: 'gun', name: 'Ironclad Guns', x: 1900, y: 1450, color: '#8c2f2f' },
    { kind: 'garage', name: 'Bay Auto Garage', x: 2700, y: 2250, color: '#2f5a8c' },
    { kind: 'safehouse', name: 'Safehouse — Marina Loft', x: 4150, y: 1450, color: '#2f8c5a' },
    { kind: 'gun', name: 'Dockside Arms', x: 3700, y: 2750, color: '#8c2f2f' },
    { kind: 'garage', name: 'Sunset Motors', x: 1100, y: 2650, color: '#2f5a8c' },
  ];
  const hospital = { x: 2300, y: 1050, name: 'Solara General' };
  const bank = { x: 2400, y: 1800, name: 'Solara National Bank' };
  const start = { x: 2300, y: 2200 };

  return { buildings, trees, lamps, containers, cranes, boats, planes, lights, shops, hospital, bank, start, vRoads, hRoads, onRoad, inWater, onRunway };
}

export function nearestRoadPoint(city, x, y) {
  let best = null, bd = 1e18;
  for (const rx of city.vRoads) for (const ry of city.hRoads) {
    const d = Math.min(Math.abs(x - rx), Math.abs(y - ry));
    if (d < bd) { bd = d; best = { x: rx, y }; }
  }
  return best;
}
