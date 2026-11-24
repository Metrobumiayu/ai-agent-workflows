// Solara Bay — world generation + static world rendering (seeded, deterministic).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const WORLD = { w: 3600, h: 2600 };
export const ROADS_X = [300, 900, 1500, 2100, 2700, 3300];
export const ROADS_Y = [300, 800, 1300, 1800, 2300];
export const ROAD_W = 96;

export function onRoad(x, y, pad = 0) {
  const hw = ROAD_W / 2 + pad;
  for (const rx of ROADS_X) if (Math.abs(x - rx) < hw) return true;
  for (const ry of ROADS_Y) if (Math.abs(y - ry) < hw) return true;
  return false;
}
export function inWater(x, y) { return y > 2460 || x > 3480; }
export function inSand(x, y) { return (y > 2380 && y <= 2460) || (x > 3400 && x <= 3480 && y <= 2380); }

export function districtAt(x, y) {
  if (y > 2050) return 'docks';
  if (x < 900 && y > 1400) return 'industrial';
  if (x > 2900) return 'beach';
  if (x > 1200 && x < 2400 && y > 500 && y < 1600) return 'downtown';
  return 'residential';
}

const PALETTES = {
  downtown: ['#3a4a6b', '#4a5a7d', '#2f3d5c', '#5b6b8c', '#46587a'],
  residential: ['#c96f4a', '#d9a05b', '#7ba05b', '#5b8ca0', '#b0563f', '#8a7ba0'],
  beach: ['#e8c98a', '#f2d8a0', '#7fc4c9', '#e8a87c'],
  docks: ['#6b6f75', '#7a7d84', '#5a6b7a', '#8a7f6b'],
  industrial: ['#7a7468', '#8c8578', '#6b655c', '#9a8f7d'],
};

export function genWorld(seed = 1337) {
  const rnd = mulberry32(seed);
  const buildings = [];
  const trees = [];
  const props = [];
  // Buildings live strictly inside blocks between roads (never on a road).
  const xs = [0, ...ROADS_X, WORLD.w];
  const ys = [0, ...ROADS_Y, WORLD.h];
  for (let bi = 0; bi < xs.length - 1; bi++) {
    for (let bj = 0; bj < ys.length - 1; bj++) {
      const x0 = xs[bi] + (bi === 0 ? 24 : ROAD_W / 2 + 26);
      const x1 = xs[bi + 1] - (bi === xs.length - 2 ? 24 : ROAD_W / 2 + 26);
      const y0 = ys[bj] + (bj === 0 ? 24 : ROAD_W / 2 + 26);
      const y1 = ys[bj + 1] - (bj === ys.length - 2 ? 24 : ROAD_W / 2 + 26);
      const bw = x1 - x0, bh = y1 - y0;
      if (bw < 90 || bh < 90) continue;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const d = districtAt(cx, cy);
      if (inWater(cx, cy) || inSand(cx, cy)) continue;
      if (d === 'docks' && rnd() < 0.45) { // container yard: props instead of buildings
        for (let k = 0; k < 4; k++) props.push({ x: x0 + 30 + rnd() * (bw - 60), y: y0 + 30 + rnd() * (bh - 60), w: 46, h: 20, c: ['#b3543f', '#3f7ab3', '#4a9a5b', '#c9a13f'][k % 4], kind: 'container' });
        continue;
      }
      const n = d === 'downtown' ? 2 : (rnd() < 0.6 ? 2 : 1);
      for (let k = 0; k < n; k++) {
        const w = Math.min(bw - 40, 90 + rnd() * (d === 'downtown' ? 170 : 120));
        const h = Math.min(bh - 40, 80 + rnd() * (d === 'downtown' ? 150 : 100));
        const bx = x0 + 20 + rnd() * Math.max(1, bw - w - 40);
        const by = y0 + 20 + rnd() * Math.max(1, bh - h - 40);
        const pal = PALETTES[d];
        buildings.push({
          x: bx, y: by, w, h,
          c: pal[Math.floor(rnd() * pal.length)],
          roof: d === 'downtown' ? '#232c42' : '#4a3a30',
          tall: d === 'downtown' ? 0.55 + rnd() * 0.45 : 0.15 + rnd() * 0.25,
          district: d,
        });
      }
      // trees / props inside the block
      const nt = 1 + Math.floor(rnd() * 3);
      for (let k = 0; k < nt; k++) {
        const tx = x0 + 16 + rnd() * (bw - 32), ty = y0 + 16 + rnd() * (bh - 32);
        if (inWater(tx, ty) || inSand(tx, ty)) continue;
        if (buildings.some(b => tx > b.x - 14 && tx < b.x + b.w + 14 && ty > b.y - 14 && ty < b.y + b.h + 14)) continue;
        trees.push({ x: tx, y: ty, r: 9 + rnd() * 7 });
      }
    }
  }
  // Boardwalk props along the beach strip
  for (let y = 120; y < 2350; y += 170) props.push({ x: 3360, y, w: 10, h: 44, c: '#e8c98a', kind: 'board' });
  return { buildings, trees, props };
}

export function collideBuildings(x, y, r, buildings) {
  // Circle vs building rects: push out, return corrected position.
  let nx = x, ny = y;
  for (const b of buildings) {
    const cx = Math.max(b.x, Math.min(nx, b.x + b.w));
    const cy = Math.max(b.y, Math.min(ny, b.y + b.h));
    const dx = nx - cx, dy = ny - cy, d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      if (d2 < 0.001) { ny = b.y - r; continue; }
      const d = Math.sqrt(d2);
      nx = cx + (dx / d) * r; ny = cy + (dy / d) * r;
    }
  }
  return { x: nx, y: ny };
}

export function drawWorld(ctx, cam, vw, vh, world, t) {
  const x0 = cam.x, y0 = cam.y, x1 = cam.x + vw, y1 = cam.y + vh;
  // ground
  ctx.fillStyle = '#5d8a4a'; ctx.fillRect(x0, y0, vw, vh);
  // water + sand
  ctx.fillStyle = '#2f7fc9'; ctx.fillRect(Math.max(x0, 0), Math.max(y0, 2460), Math.min(x1, WORLD.w) - Math.max(x0, 0), Math.min(y1, WORLD.h) - Math.max(y0, 2460));
  ctx.fillStyle = '#2f7fc9'; ctx.fillRect(Math.max(x0, 3480), y0, Math.min(x1, WORLD.w) - Math.max(x0, 3480), vh);
  ctx.fillStyle = '#e8d29a';
  ctx.fillRect(Math.max(x0, 0), Math.max(y0, 2380), Math.min(x1, WORLD.w) - Math.max(x0, 0), Math.min(y1, 2460) - Math.max(y0, 2380));
  ctx.fillRect(Math.max(x0, 3400), y0, Math.min(x1, 3480) - Math.max(x0, 3400), vh);
  // animated water shimmer
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const wy = 2500 + i * 18 + Math.sin(t * 0.001 + i) * 3;
    if (wy < y0 || wy > y1) continue;
    ctx.beginPath(); ctx.moveTo(Math.max(x0, 0), wy); ctx.lineTo(Math.min(x1, 1200 + i * 400), wy); ctx.stroke();
  }
  // sidewalks + roads
  ctx.fillStyle = '#9aa0a8';
  for (const rx of ROADS_X) ctx.fillRect(rx - ROAD_W / 2 - 10, y0, ROAD_W + 20, vh);
  for (const ry of ROADS_Y) ctx.fillRect(x0, ry - ROAD_W / 2 - 10, vw, ROAD_W + 20);
  ctx.fillStyle = '#33383f';
  for (const rx of ROADS_X) ctx.fillRect(rx - ROAD_W / 2, y0, ROAD_W, vh);
  for (const ry of ROADS_Y) ctx.fillRect(x0, ry - ROAD_W / 2, vw, ROAD_W);
  // centre dashes
  ctx.fillStyle = '#e8d44d';
  for (const rx of ROADS_X) {
    for (let y = Math.floor(y0 / 44) * 44; y < y1; y += 44) {
      if (ROADS_Y.some(ry => Math.abs(y - ry) < ROAD_W / 2 + 8)) continue;
      ctx.fillRect(rx - 3, y, 6, 22);
    }
  }
  for (const ry of ROADS_Y) {
    for (let x = Math.floor(x0 / 44) * 44; x < x1; x += 44) {
      if (ROADS_X.some(rx => Math.abs(x - rx) < ROAD_W / 2 + 8)) continue;
      ctx.fillRect(x, ry - 3, 22, 6);
    }
  }
  // district labels on the ground
  ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.font = 'bold 44px Arial'; ctx.textAlign = 'center';
  const labels = [['DOWNTOWN', 1800, 1050], ['RESIDENTIAL', 600, 550], ['BEACH', 3150, 1150], ['DOCKS', 1800, 2150], ['INDUSTRIAL', 600, 2050]];
  for (const [txt, lx, ly] of labels) if (lx > x0 - 200 && lx < x1 + 200 && ly > y0 - 100 && ly < y1 + 100) ctx.fillText(txt, lx, ly);
  // props (containers / boards)
  for (const p of world.props) {
    if (p.x + p.w < x0 || p.x > x1 || p.y + p.h < y0 || p.y > y1) continue;
    ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.strokeRect(p.x, p.y, p.w, p.h);
  }
  // buildings with fake-3D shade + windows
  for (const b of world.buildings) {
    if (b.x + b.w < x0 || b.x > x1 || b.y + b.h < y0 || b.y > y1) continue;
    const sh = b.h * b.tall * 0.35;
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath(); ctx.moveTo(b.x + 8, b.y + b.h); ctx.lineTo(b.x + b.w + 8, b.y + b.h); ctx.lineTo(b.x + b.w + 8 + sh * 0.4, b.y + b.h + sh * 0.4); ctx.lineTo(b.x + 8 + sh * 0.4, b.y + b.h + sh * 0.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = b.c; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof; ctx.fillRect(b.x + 5, b.y + 5, b.w - 10, b.h - 10);
    ctx.fillStyle = 'rgba(255,240,180,.5)';
    const cols = Math.max(1, Math.floor(b.w / 26)), rows = Math.max(1, Math.floor(b.h / 26));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      if ((i * 7 + j * 13 + ((b.x | 0) % 5)) % 3 === 0) ctx.fillRect(b.x + 10 + i * 26, b.y + 10 + j * 26, 10, 12);
    }
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.strokeRect(b.x, b.y, b.w, b.h);
  }
  // trees
  for (const tr of world.trees) {
    if (tr.x < x0 - 30 || tr.x > x1 + 30 || tr.y < y0 - 30 || tr.y > y1 + 30) continue;
    ctx.fillStyle = '#2f6b2f'; ctx.beginPath(); ctx.arc(tr.x, tr.y, tr.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a9a3f'; ctx.beginPath(); ctx.arc(tr.x - 3, tr.y - 3, tr.r * 0.65, 0, Math.PI * 2); ctx.fill();
  }
}
