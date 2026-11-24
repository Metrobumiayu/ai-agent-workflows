// Vice Bay — the city itself. One job: build a deterministic open world from a seed:
// a road grid + highway ring, 11 districts with their own palettes, 200+ buildings,
// landmarks (tower, casino, stadium, lighthouse, runway, cranes, marina), traffic
// lights, shops, 24 hidden packages and 3 stunt jumps. Pure data + collision queries.
import { DISTRICTS, WORLD_W, WORLD_H } from './config.js';
import { makeRng, clamp } from './rng.js';

export const ROAD_W = 96;
export const HIGHWAY_W = 150;

export function buildCity(seed) {
  const rng = makeRng(seed * 7919 + 13);
  const roadsV = [300, 900, 1500, 2100, 2700, 3300, 3900, 4500, 5100, 5700, 6100];
  const roadsH = [300, 800, 1300, 1800, 2300, 2800, 3300, 3800, 4300];
  const buildings = [];
  const parks = [];
  const piers = [];
  const lights = [];

  const districtAt = (x, y) => {
    for (const d of DISTRICTS) if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
    return DISTRICTS[0];
  };
  // Ocean along the whole west edge; the beach is sand, the marina has piers.
  const water = [{ x: 0, y: 0, w: 270, h: WORLD_H }];
  const sand = [{ x: 270, y: 1600, w: 260, h: 1300 }];
  const inWater = (x, y) => x < 270;
  const inSand = (x, y) => x >= 270 && x < 530 && y >= 1600 && y < 2900;

  // Landmarks occupy whole blocks and are named, so the minimap and missions can point at them.
  const landmarkBlocks = [
    { cx: 2400, cy: 550, kind: 'tower', name: 'VICE TOWER', w: 260, h: 260 },
    { cx: 4500, cy: 550, kind: 'casino', name: 'CASINO ROYALE', w: 300, h: 220 },
    { cx: 5700, cy: 550, kind: 'stadium', name: 'VICE STADIUM', w: 340, h: 260 },
    { cx: 390, cy: 2150, kind: 'lighthouse', name: 'LIGHTHOUSE', w: 90, h: 90 },
    { cx: 5400, cy: 2050, kind: 'runway', name: 'RUNWAY 09', w: 900, h: 130 },
    { cx: 5400, cy: 2050, kind: 'terminal', name: 'VICE INTL', w: 260, h: 140 },
    { cx: 3600, cy: 2050, kind: 'cranes', name: 'PORT CRANES', w: 380, h: 200 },
    { cx: 600, cy: 800, kind: 'marina', name: 'MARINA', w: 420, h: 260 },
    { cx: 900, cy: 3550, kind: 'park', name: 'HARBOUR PARK', w: 420, h: 300 },
    { cx: 2700, cy: 3550, kind: 'plaza', name: 'SOUTHSIDE PLAZA', w: 420, h: 300 },
  ];
  const landmarks = [];
  for (const lm of landmarkBlocks) {
    landmarks.push({ ...lm, x: lm.cx - lm.w / 2, y: lm.cy - lm.h / 2 });
    if (lm.kind === 'tower' || lm.kind === 'casino' || lm.kind === 'stadium' || lm.kind === 'terminal') {
      buildings.push({ x: lm.cx - lm.w / 2, y: lm.cy - lm.h / 2, w: lm.w, h: lm.h, hgt: lm.kind === 'tower' ? 5 : 2, color: lm.kind === 'casino' ? '#7b1fa2' : lm.kind === 'stadium' ? '#37474f' : '#5d4037', district: districtAt(lm.cx, lm.cy).id, landmark: lm.kind, name: lm.name });
    }
    if (lm.kind === 'park' || lm.kind === 'plaza') parks.push({ x: lm.cx - lm.w / 2, y: lm.cy - lm.h / 2, w: lm.w, h: lm.h, kind: lm.kind });
    if (lm.kind === 'marina') for (let i = 0; i < 3; i++) piers.push({ x: 300 + i * 130, y: 700, w: 26, h: 260 });
  }
  const nearLandmark = (x, y) => landmarks.some((l) => x > l.x - 60 && x < l.x + l.w + 60 && y > l.y - 60 && y < l.y + l.h + 60);

  // Buildings fill every block between roads, except water, sand, runway, parks and landmark blocks.
  for (let ci = 0; ci < roadsV.length - 1; ci++) {
    for (let ri = 0; ri < roadsH.length - 1; ri++) {
      const bx0raw = roadsV[ci] + ROAD_W / 2 + 26;
      const by0 = roadsH[ri] + ROAD_W / 2 + 26;
      // The beach is sand: no building may stand on it (blocks touching the
      // sand band start at the waterline's edge instead).
      const bx0 = (by0 >= 1600 && by0 < 2900) ? Math.max(bx0raw, 540) : bx0raw;
      const bx1 = roadsV[ci + 1] - ROAD_W / 2 - 26;
      const by1 = roadsH[ri + 1] - ROAD_W / 2 - 26;
      const bw = bx1 - bx0, bh = by1 - by0;
      if (bw < 120 || bh < 100) continue;
      const cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2;
      if (inWater(cx, cy) || inSand(cx, cy)) continue;
      if (nearLandmark(cx, cy)) continue;
      if (cx > 4900 && cy > 1800 && cy < 2300) continue; // runway strip
      const d = districtAt(cx, cy);
      if (rng.chance(0.06)) { parks.push({ x: bx0, y: by0, w: bw, h: bh, kind: 'park' }); continue; }
      // Split the block into a small grid of buildings: 2–5 per block, so the
      // city clears 200 buildings and every street has a skyline.
      const n = rng.int(2, 5);
      const cols = n <= 4 ? 2 : 3;
      const rows = Math.ceil(n / cols);
      for (let i = 0; i < n; i++) {
        const gx = i % cols, gy = Math.floor(i / cols);
        const w = (bw - 20 - (cols - 1) * 16) / cols;
        const h = (bh - 20 - (rows - 1) * 16) / rows;
        const x = bx0 + 10 + gx * (w + 16);
        const y = by0 + 10 + gy * (h + 16);
        buildings.push({ x, y, w, h, hgt: rng.int(1, 3), color: rng.pick(d.roof), district: d.id });
      }
    }
  }

  // Traffic lights at the major downtown / neon / docks crossings.
  for (const [x, y] of [[2700, 800], [3300, 800], [3900, 800], [4500, 800], [2700, 1300], [3300, 1300], [4500, 1300], [2700, 2300], [3900, 2300], [4500, 2300], [3300, 3300], [4500, 3300]]) {
    lights.push({ x, y, ns: rng.chance(0.5), t: rng.range(0, 6) });
  }

  // Fixed points of interest, all on roads so the player can reach them.
  const shops = {
    bar: { kind: 'bar', name: "SAL'S BAR", x: 2250, y: 1250, label: "Sal's Bar — mission hub" },
    gun: { kind: 'gun', name: 'AMMO-NATION', x: 2650, y: 850, label: 'Gun store' },
    garage: { kind: 'garage', name: "DANTE'S CUSTOMS", x: 1750, y: 2050, label: 'Garage — repair / repaint' },
    safehouse: { kind: 'safehouse', name: "ROOK'S PAD", x: 2350, y: 3050, label: 'Safehouse — save + heal ($1500)' },
    casino: { kind: 'casino', name: 'CASINO ROYALE', x: 4500, y: 800, label: 'Casino Royale' },
    hospital: { kind: 'hospital', name: 'VICE GENERAL', x: 3300, y: 950, label: 'Hospital — heal $150' },
    taxi: { kind: 'taxi', name: 'TAXI STAND', x: 2350, y: 950, label: 'Taxi stand' },
    race: { kind: 'race', name: 'STREET RACE', x: 5750, y: 3050, label: 'Street race — $500 to win' },
  };
  const jumps = [
    { x: 1200, y: 2300, dir: 0, name: 'Beach jump' },
    { x: 4800, y: 3800, dir: 1, name: 'East End jump' },
    { x: 3300, y: 4300, dir: 0, name: 'South highway jump' },
  ];

  // 24 hidden packages: deterministic spots near landmarks, alleys and block corners.
  const packages = [];
  const prng = makeRng(seed * 31 + 7);
  let guard = 0;
  while (packages.length < 24 && guard++ < 400) {
    const x = prng.range(400, WORLD_W - 200);
    const y = prng.range(400, WORLD_H - 200);
    if (inWater(x, y)) continue;
    if (pointInBuilding(buildings, x, y)) continue;
    if (packages.some((p) => Math.hypot(p.x - x, p.y - y) < 500)) continue;
    packages.push({ x, y, taken: false });
  }

  return {
    seed, roadsV, roadsH, buildings, parks, piers, lights, water, sand, shops, jumps, packages,
    landmarks, districts: DISTRICTS,
    start: { x: 2250, y: 1400 },
    runway: { x: 4950, y: 1985, w: 900, h: 130 },
  };
}

export function pointInBuilding(buildings, x, y) {
  for (const b of buildings) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  return null;
}

export function districtAtPoint(city, x, y) {
  for (const d of city.districts) if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  return city.districts[0];
}

// Is the point on a road? Returns {axis:'v'|'h', at: roadCoord} or null.
export function roadAt(city, x, y) {
  for (const rx of city.roadsV) if (Math.abs(x - rx) <= ROAD_W / 2) return { axis: 'v', at: rx };
  for (const ry of city.roadsH) if (Math.abs(y - ry) <= ROAD_W / 2) return { axis: 'h', at: ry };
  return null;
}

export function isHighway(city, x, y) {
  return Math.abs(x - 300) <= HIGHWAY_W / 2 || Math.abs(x - 6100) <= HIGHWAY_W / 2 || Math.abs(y - 300) <= HIGHWAY_W / 2 || Math.abs(y - 4300) <= HIGHWAY_W / 2;
}

// Push a circle (x,y,r) out of buildings; returns true if it hit anything.
export function resolveBuildingCollision(city, obj, r) {
  let hit = false;
  for (const b of city.buildings) {
    const cx = clamp(obj.x, b.x, b.x + b.w);
    const cy = clamp(obj.y, b.y, b.y + b.h);
    const dx = obj.x - cx, dy = obj.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    hit = true;
    if (d2 < 0.01) { obj.x = b.x - r - 1; continue; }
    const d = Math.sqrt(d2);
    obj.x = cx + (dx / d) * r;
    obj.y = cy + (dy / d) * r;
  }
  return hit;
}
