// Vice Bay — the renderer. One job: paint the world on the canvas every frame:
// districts and ocean, the road grid with markings and traffic lights, 200+
// buildings with lit windows, landmarks, cars, peds, the helicopter, particles,
// then the night lighting pass (streetlight pools, neon, headlights) and rain.
import { WORLD_W, WORLD_H, VEHICLES } from './config.js';
import { darkness, isNight } from './weather.js';
import { carById } from './vehicles.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const light = document.createElement('canvas');
  const lctx = light.getContext('2d');

  function drawGround(G) {
    const { cam } = G;
    // Ocean + base land.
    ctx.fillStyle = '#1b4d6b';
    ctx.fillRect(-cam.x, -cam.y, WORLD_W, WORLD_H);
    ctx.fillStyle = '#33302a';
    ctx.fillRect(-cam.x + 270, -cam.y, WORLD_W - 270, WORLD_H);
    // Districts.
    for (const d of G.city.districts) {
      ctx.fillStyle = d.ground;
      ctx.fillRect(d.x - cam.x, d.y - cam.y, d.w, d.h);
    }
    // Sand.
    for (const s of G.city.sand) {
      ctx.fillStyle = '#c2a878';
      ctx.fillRect(s.x - cam.x, s.y - cam.y, s.w, s.h);
    }
    // Parks.
    for (const p of G.city.parks) {
      ctx.fillStyle = p.kind === 'plaza' ? '#6b6258' : '#3f6b3a';
      ctx.fillRect(p.x - cam.x, p.y - cam.y, p.w, p.h);
      if (p.kind === 'park') {
        ctx.fillStyle = '#2f5b2e';
        for (let i = 0; i < 8; i++) {
          const tx = p.x + 30 + ((i * 53) % (p.w - 60));
          const ty = p.y + 30 + ((i * 71) % (p.h - 60));
          ctx.beginPath(); ctx.arc(tx - cam.x, ty - cam.y, 14, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    // Runway.
    const r = G.city.runway;
    ctx.fillStyle = '#22262b';
    ctx.fillRect(r.x - cam.x, r.y - cam.y, r.w, r.h);
    ctx.fillStyle = '#e8e8e8';
    for (let x = r.x + 20; x < r.x + r.w - 20; x += 60) ctx.fillRect(x - cam.x, r.y + r.h / 2 - 3 - cam.y, 34, 6);
    ctx.font = 'bold 26px monospace';
    ctx.fillStyle = '#e8e8e8';
    ctx.fillText('09', r.x + 30 - cam.x, r.y + 40 - cam.y);
    // Marina piers + boats.
    ctx.fillStyle = '#6b4f2a';
    for (const pier of G.city.piers) ctx.fillRect(pier.x - cam.x, pier.y - cam.y, pier.w, pier.h);
    ctx.fillStyle = '#f5f5f5';
    for (let i = 0; i < 5; i++) ctx.fillRect(330 + i * 46 - cam.x, 760 + (i % 2) * 90 - cam.y, 34, 12);
    // District labels on the ground.
    ctx.font = 'bold 34px monospace';
    ctx.textAlign = 'center';
    for (const d of G.city.districts) {
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillText(d.name.toUpperCase(), d.x + d.w / 2 - cam.x, d.y + d.h / 2 - cam.y);
    }
    ctx.textAlign = 'left';
  }

  function drawRoads(G) {
    const { cam } = G;
    ctx.fillStyle = '#232228';
    for (const rx of G.city.roadsV) ctx.fillRect(rx - 48 - cam.x, -cam.y, 96, WORLD_H);
    for (const ry of G.city.roadsH) ctx.fillRect(-cam.x, ry - 48 - cam.y, WORLD_W, 96);
    // Highway ring: wider, warmer asphalt.
    ctx.fillStyle = '#2e2a33';
    ctx.fillRect(300 - 75 - cam.x, -cam.y, 150, WORLD_H);
    ctx.fillRect(6100 - 75 - cam.x, -cam.y, 150, WORLD_H);
    ctx.fillRect(-cam.x, 300 - 75 - cam.y, WORLD_W, 150);
    ctx.fillRect(-cam.x, 4300 - 75 - cam.y, WORLD_W, 150);
    // Lane dashes.
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (const rx of G.city.roadsV) for (let y = 0; y < WORLD_H; y += 70) ctx.fillRect(rx - 2 - cam.x, y - cam.y, 4, 34);
    for (const ry of G.city.roadsH) for (let x = 0; x < WORLD_W; x += 70) ctx.fillRect(x - cam.x, ry - 2 - cam.y, 34, 4);
    // Crosswalks at light intersections.
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (const l of G.city.lights) {
      for (let i = -3; i <= 3; i++) {
        ctx.fillRect(l.x + i * 14 - 4 - cam.x, l.y - 62 - cam.y, 8, 18);
        ctx.fillRect(l.x + i * 14 - 4 - cam.x, l.y + 44 - cam.y, 8, 18);
      }
    }
    // Traffic lights.
    for (const l of G.city.lights) {
      ctx.fillStyle = '#111';
      ctx.fillRect(l.x + 52 - cam.x, l.y - 62 - cam.y, 10, 30);
      ctx.fillStyle = l.ns ? '#37d67a' : '#e74c3c';
      ctx.beginPath(); ctx.arc(l.x + 57 - cam.x, l.y - 46 - cam.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = l.ns ? '#e74c3c' : '#37d67a';
      ctx.beginPath(); ctx.arc(l.x - 57 - cam.x, l.y + 46 - cam.y, 4, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawBuildings(G) {
    const { cam } = G;
    const night = isNight(G);
    for (const b of G.city.buildings) {
      const x = b.x - cam.x, y = b.y - cam.y;
      // Drop shadow for height.
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x + 6, y + 8, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(x, y, b.w, b.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, b.w - 2, b.h - 2);
      // Roof detail.
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(x + 8, y + 8, b.w - 16, b.h - 16);
      // Windows: lit at night.
      if (b.w > 60 && b.h > 50) {
        const cols = Math.floor((b.w - 20) / 26);
        const rows = Math.floor((b.h - 20) / 30);
        for (let cx = 0; cx < cols; cx++) {
          for (let cy = 0; cy < rows; cy++) {
            const lit = night && ((cx * 7 + cy * 13 + b.x) % 5 < 2);
            ctx.fillStyle = lit ? '#ffd166' : 'rgba(0,0,0,0.25)';
            ctx.fillRect(x + 12 + cx * 26, y + 12 + cy * 30, 12, 16);
          }
        }
      }
      // Landmark treatment.
      if (b.landmark === 'tower') {
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 3;
        ctx.strokeRect(x - 4, y - 4, b.w + 8, b.h + 8);
        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('VICE TOWER', x + b.w / 2 - 52, y - 10);
        ctx.fillStyle = '#ff5252';
        ctx.beginPath(); ctx.arc(x + b.w / 2, y - 22, 5, 0, Math.PI * 2); ctx.fill();
      }
      if (b.landmark === 'casino') {
        ctx.fillStyle = '#ff2e88';
        ctx.font = 'bold 22px monospace';
        ctx.fillText('★ CASINO ROYALE ★', x + b.w / 2 - 92, y - 10);
        ctx.fillStyle = 'rgba(255,46,136,0.25)';
        ctx.fillRect(x - 10, y - 10, b.w + 20, b.h + 20);
      }
      if (b.landmark === 'stadium') {
        ctx.fillStyle = '#eceff1';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('VICE STADIUM', x + b.w / 2 - 58, y + b.h / 2 + 6);
      }
    }
    // Lighthouse.
    for (const lm of G.city.landmarks) {
      if (lm.kind !== 'lighthouse') continue;
      const x = lm.x - cam.x, y = lm.y - cam.y;
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(x, y, lm.w, lm.h);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(x, y + 26, lm.w, 18);
      ctx.fillRect(x, y + 58, lm.w, 18);
      ctx.fillStyle = '#ffd166';
      ctx.beginPath(); ctx.arc(x + lm.w / 2, y - 6, 8, 0, Math.PI * 2); ctx.fill();
      if (night) {
        ctx.fillStyle = 'rgba(255,209,102,0.18)';
        ctx.beginPath();
        ctx.moveTo(x + lm.w / 2, y);
        ctx.lineTo(x + lm.w / 2 + 420, y - 60);
        ctx.lineTo(x + lm.w / 2 + 420, y + 60);
        ctx.closePath(); ctx.fill();
      }
    }
    // Port cranes.
    for (const lm of G.city.landmarks) {
      if (lm.kind !== 'cranes') continue;
      const x = lm.x - cam.x, y = lm.y - cam.y;
      ctx.strokeStyle = '#ffb74d';
      ctx.lineWidth = 6;
      for (let i = 0; i < 3; i++) {
        const cx = x + 40 + i * 130;
        ctx.beginPath(); ctx.moveTo(cx, y + lm.h); ctx.lineTo(cx, y + 20); ctx.lineTo(cx + 90, y + 20); ctx.stroke();
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(cx - 14, y + lm.h - 40, 60, 40);
      }
    }
  }

  function drawCar(G, c) {
    const { cam } = G;
    const x = c.x - cam.x, y = c.y - cam.y;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(c.angle);
    const def = VEHICLES[c.type];
    // Wheels.
    ctx.fillStyle = '#111';
    const ww = 10, wh = 5;
    ctx.fillRect(-def.w / 2 + 6, -def.h / 2 - 3, ww, wh);
    ctx.fillRect(-def.w / 2 + 6, def.h / 2 - 2, ww, wh);
    ctx.fillRect(def.w / 2 - 16, -def.h / 2 - 3, ww, wh);
    ctx.fillRect(def.w / 2 - 16, def.h / 2 - 2, ww, wh);
    // Body.
    ctx.fillStyle = c.dead ? '#222' : c.color;
    ctx.beginPath();
    ctx.roundRect(-def.w / 2, -def.h / 2, def.w, def.h, 7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (!c.dead) {
      // Windshield + roof.
      ctx.fillStyle = 'rgba(20,30,40,0.85)';
      ctx.fillRect(def.w / 2 - 18, -def.h / 2 + 3, 10, def.h - 6);
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(-6, -def.h / 2 + 3, 14, def.h - 6);
      if (c.type === 'taxi') {
        ctx.fillStyle = '#111';
        ctx.fillRect(-4, -def.h / 2 - 6, 16, 6);
        ctx.fillStyle = '#f7dc00';
        ctx.font = 'bold 7px monospace';
        ctx.fillText('TAXI', -2, -def.h / 2 - 8);
      }
      if (c.role === 'police' || c.role === 'roadblock') {
        ctx.fillStyle = '#fff';
        ctx.fillRect(-2, -def.h / 2 + 2, 12, def.h - 4);
        ctx.fillStyle = '#1565c0';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('VCPD', -8, 3);
        // Light bar, flashing.
        const flash = Math.floor(G.time * 6) % 2 === 0;
        ctx.fillStyle = flash ? '#ff1744' : '#2979ff';
        ctx.fillRect(-4, -def.h / 2 - 2, 8, 5);
        ctx.fillStyle = flash ? '#2979ff' : '#ff1744';
        ctx.fillRect(-4, def.h / 2 - 3, 8, 5);
      }
      if (c.type === 'bus') {
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        for (let i = 0; i < 4; i++) ctx.fillRect(-def.w / 2 + 8 + i * 16, -def.h / 2 + 3, 10, 6);
      }
      // Damage.
      if (c.hp < c.maxHp * 0.5) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(-def.w / 2 + 2, -def.h / 2 + 2, 12, def.h - 4);
      }
    } else {
      ctx.fillStyle = 'rgba(255,120,0,0.5)';
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    // Headlight cones at night.
    if (isNight(G) && !c.dead && Math.abs(c.speed) > 5) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(c.angle);
      const grad = ctx.createLinearGradient(def.w / 2, 0, def.w / 2 + 130, 0);
      grad.addColorStop(0, 'rgba(255,240,180,0.28)');
      grad.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(def.w / 2, -8);
      ctx.lineTo(def.w / 2 + 130, -34);
      ctx.lineTo(def.w / 2 + 130, 34);
      ctx.lineTo(def.w / 2, 8);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  function drawPed(G, p) {
    const { cam } = G;
    const x = p.x - cam.x, y = p.y - cam.y;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(x, y + 7, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Facing tick.
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(p.angle) * 12, y + Math.sin(p.angle) * 12); ctx.stroke();
    if (p.state === 'flee') {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('!', x - 3, y - 14);
    }
    if (p.fare) {
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('$', x - 4, y - 14);
    }
  }

  function drawPlayer(G) {
    const p = G.player;
    const { cam } = G;
    if (p.inCar) return;
    const x = p.x - cam.x, y = p.y - cam.y;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(x, y + 8, 11, 5, 0, 0, Math.PI * 2); ctx.fill();
    // Body: Rook in his teal jacket.
    ctx.fillStyle = '#00897b';
    ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#004d40';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#f5d0a9';
    ctx.beginPath(); ctx.arc(x + Math.cos(p.angle) * 4, y + Math.sin(p.angle) * 4, 5, 0, Math.PI * 2); ctx.fill();
    // Aim line + weapon.
    ctx.strokeStyle = p.weapon === 'fists' ? '#004d40' : '#222';
    ctx.lineWidth = 3;
    const reach = p.punchAnim > 0 ? 26 : 18;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(p.aim) * reach, y + Math.sin(p.aim) * reach); ctx.stroke();
    if (p.flash > 0) {
      ctx.fillStyle = 'rgba(255,224,130,0.9)';
      ctx.beginPath(); ctx.arc(x + Math.cos(p.aim) * 24, y + Math.sin(p.aim) * 24, 7, 0, Math.PI * 2); ctx.fill();
    }
    if (p.hurtCd > 0.4) {
      ctx.strokeStyle = 'rgba(255,0,0,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.stroke();
    }
  }

  function drawHeli(G) {
    const h = G.heli;
    if (!h.active) return;
    const { cam } = G;
    // Shadow on the ground.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(h.x + 40 - cam.x, h.y + 60 - cam.y, 26, 12, 0, 0, Math.PI * 2); ctx.fill();
    // Searchlight cone at night.
    if (isNight(G) && h.beam) {
      ctx.fillStyle = 'rgba(255,244,180,0.14)';
      ctx.beginPath();
      ctx.moveTo(h.x - cam.x, h.y - cam.y);
      ctx.arc(G.player.x - cam.x, G.player.y - cam.y, 90, 0, Math.PI * 2);
      ctx.closePath(); ctx.fill();
    }
    const x = h.x - cam.x, y = h.y - cam.y;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(h.rotor);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(34, 0); ctx.stroke();
    ctx.rotate(-h.rotor);
    ctx.fillStyle = '#1a237e';
    ctx.beginPath(); ctx.ellipse(0, 0, 22, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3949ab';
    ctx.beginPath(); ctx.ellipse(6, 0, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff1744';
    ctx.beginPath(); ctx.arc(-18, 0, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawMarker(G) {
    if (!G.marker) return;
    const { cam } = G;
    const x = G.marker.x - cam.x, y = G.marker.y - cam.y;
    const bob = Math.sin(G.time * 4) * 6;
    // Beacon column.
    const grad = ctx.createLinearGradient(x, y - 180, x, y);
    grad.addColorStop(0, 'rgba(255,209,102,0)');
    grad.addColorStop(1, 'rgba(255,209,102,0.5)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 4, y - 180, 8, 180);
    // Diamond + label.
    ctx.save();
    ctx.translate(x, y - 46 + bob);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(-11, -11, 22, 22);
    ctx.strokeStyle = '#7a5c00';
    ctx.lineWidth = 2;
    ctx.strokeRect(-11, -11, 22, 22);
    ctx.restore();
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(G.marker.label, x, y - 66 + bob);
    ctx.textAlign = 'left';
    // Ground ring.
    ctx.strokeStyle = 'rgba(255,209,102,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 26 + Math.sin(G.time * 3) * 4, 0, Math.PI * 2); ctx.stroke();
  }

  function drawParticles(G) {
    const { cam } = G;
    for (const p of G.particles) {
      const a = Math.max(0, p.life / p.max);
      if (p.kind === 'smoke') {
        ctx.fillStyle = `rgba(154,160,166,${a * 0.5})`;
        ctx.beginPath(); ctx.arc(p.x - cam.x, p.y - cam.y, p.size, 0, Math.PI * 2); ctx.fill();
      } else if (p.kind === 'flash') {
        ctx.fillStyle = `rgba(255,243,196,${a})`;
        ctx.beginPath(); ctx.arc(p.x - cam.x, p.y - cam.y, p.size * a, 0, Math.PI * 2); ctx.fill();
      } else if (p.kind === 'tracer') {
        ctx.strokeStyle = `rgba(255,224,130,${a})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x - cam.x, p.y - cam.y);
        ctx.lineTo(p.x2 - cam.x, p.y2 - cam.y);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = a;
        ctx.beginPath(); ctx.arc(p.x - cam.x, p.y - cam.y, p.size * a + 1, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    for (const f of G.floaters) {
      ctx.fillStyle = f.color;
      ctx.globalAlpha = Math.min(1, f.life / f.max * 1.5);
      ctx.fillText(f.text, f.x - cam.x, f.y - cam.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  function drawNight(G) {
    const d = darkness(G);
    if (d <= 0.02) return;
    const w = canvas.width, h = canvas.height;
    light.width = w; light.height = h;
    lctx.clearRect(0, 0, w, h);
    lctx.fillStyle = `rgba(6,8,26,${d * 0.62})`;
    lctx.fillRect(0, 0, w, h);
    // Cut light pools: player, streetlights, neon district, headlights.
    lctx.globalCompositeOperation = 'destination-out';
    const hole = (wx, wy, r, a) => {
      const sx = wx - G.cam.x, sy = wy - G.cam.y;
      if (sx < -r || sx > w + r || sy < -r || sy > h + r) return;
      const g = lctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      g.addColorStop(0, `rgba(0,0,0,${a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = g;
      lctx.beginPath(); lctx.arc(sx, sy, r, 0, Math.PI * 2); lctx.fill();
    };
    const p = G.player;
    const pc = p.inCar ? carById(G, p.carId) : null;
    hole(pc ? pc.x : p.x, pc ? pc.y : p.y, 260, 0.9);
    for (const lx of G.city.roadsV) for (const ly of G.city.roadsH) hole(lx, ly, 120, 0.55);
    const neon = G.city.districts.find((x) => x.id === 'neon');
    hole(neon.x + neon.w / 2, neon.y + neon.h / 2, 420, 0.6);
    for (const s of Object.values(G.city.shops)) hole(s.x, s.y, 130, 0.7);
    lctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(light, 0, 0);
    // Neon glow on the Strip itself.
    if (G.city.districts.find((x) => x.id === 'neon')) {
      ctx.fillStyle = `rgba(255,46,136,${0.05 + 0.03 * Math.sin(G.time * 2)})`;
      const n = G.city.districts.find((x) => x.id === 'neon');
      ctx.fillRect(n.x - G.cam.x, n.y - G.cam.y, n.w, n.h);
    }
  }

  function drawRain(G) {
    const rain = G.weather.rain;
    if (rain < 0.05) return;
    ctx.strokeStyle = `rgba(180,200,230,${0.25 + rain * 0.35})`;
    ctx.lineWidth = 1;
    const w = canvas.width, h = canvas.height;
    const n = Math.floor(rain * 90);
    for (let i = 0; i < n; i++) {
      const x = ((i * 137.5) % (w + 100)) + (G.time * 900 % 100);
      const y = ((i * 89.3) % (h + 100));
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 8, y + 22);
      ctx.stroke();
    }
  }

  function draw(G) {
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    if (G.shake > 0.3) ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
    drawGround(G);
    drawRoads(G);
    drawBuildings(G);
    // Shops, jumps, packages, pickups.
    const { cam } = G;
    ctx.font = 'bold 12px monospace';
    for (const s of Object.values(G.city.shops)) {
      const x = s.x - cam.x, y = s.y - cam.y;
      ctx.fillStyle = s.kind === 'gun' ? '#ff5252' : s.kind === 'garage' ? '#ffb74d' : s.kind === 'safehouse' ? '#7ee081' : s.kind === 'casino' ? '#ff2e88' : '#4fc3f7';
      ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.fillText(s.kind === 'gun' ? 'G' : s.kind === 'garage' ? 'W' : s.kind === 'safehouse' ? 'H' : s.kind === 'casino' ? '$' : s.kind === 'hospital' ? '+' : s.kind === 'bar' ? 'B' : s.kind === 'taxi' ? 'T' : 'R', x - 4, y + 4);
      // Shop labels stay out of the HUD corners (top-left stats, top-right clock)
      // and out of the top strip where the objective banner sits.
      const inHud = (x < 290 && y < 115) || (x > w - 250 && y < 90) || y < 100;
      if (!inHud) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText(s.name, x + 18, y + 4);
      }
    }
    for (const j of G.city.jumps) {
      ctx.fillStyle = '#ff8a65';
      ctx.beginPath();
      ctx.moveTo(j.x - cam.x - 26, j.y - cam.y + 14);
      ctx.lineTo(j.x - cam.x + 26, j.y - cam.y + 14);
      ctx.lineTo(j.x - cam.x + 10, j.y - cam.y - 14);
      ctx.lineTo(j.x - cam.x - 10, j.y - cam.y - 14);
      ctx.closePath(); ctx.fill();
    }
    for (const pkg of G.city.packages) {
      if (pkg.taken) continue;
      const x = pkg.x - cam.x, y = pkg.y - cam.y;
      const glint = 0.5 + 0.5 * Math.sin(G.time * 5 + pkg.x);
      ctx.fillStyle = `rgba(255,209,102,${0.5 + glint * 0.5})`;
      ctx.fillRect(x - 6, y - 6, 12, 12);
      ctx.strokeStyle = '#7a5c00';
      ctx.strokeRect(x - 6, y - 6, 12, 12);
    }
    for (const pk of G.pickups) {
      const x = pk.x - cam.x, y = pk.y - cam.y;
      ctx.fillStyle = pk.kind === 'cash' ? '#7ee081' : pk.kind === 'health' ? '#ff5252' : '#ffd166';
      ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(pk.kind === 'cash' ? '$' : pk.kind === 'health' ? '+' : 'A', x - 3, y + 4);
    }
    for (const b of G.barrels) {
      const x = b.x - cam.x, y = b.y - cam.y;
      ctx.fillStyle = '#d32f2f';
      ctx.fillRect(x - 9, y - 9, 18, 18);
      ctx.fillStyle = '#ffeb3b';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('!', x - 2, y + 4);
    }
    for (const c of G.cars) drawCar(G, c);
    for (const p of G.peds) drawPed(G, p);
    for (const f of G.footCops) {
      const x = f.x - cam.x, y = f.y - cam.y;
      ctx.fillStyle = '#1a237e';
      ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('PD', x - 7, y + 3);
    }
    for (const e of G.enemies) {
      const x = e.x - cam.x, y = e.y - cam.y;
      ctx.fillStyle = '#8e44ad';
      ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#4a235a';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ff5252';
      ctx.fillRect(x - 12, y - 20, 24, 4);
      ctx.fillStyle = '#37d67a';
      ctx.fillRect(x - 12, y - 20, 24 * Math.max(0, e.hp / e.maxHp), 4);
    }
    drawPlayer(G);
    drawHeli(G);
    drawMarker(G);
    drawParticles(G);
    drawNight(G);
    drawRain(G);
    ctx.restore();
    // Vignette.
    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  return { draw, ctx };
}
