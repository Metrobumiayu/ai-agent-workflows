// Vice Bay — clock, day/night and weather. One job: the sky. A game hour passes
// every 90 seconds; the sun sets, streetlights and neon take over, rain rolls in
// and out and the roads get slick (grip 0.85 in rain, 0.92 in drizzle).
export function createWeather() {
  return { rain: 0, kind: 'clear', timer: 120, grip: 1, drizzle: 0 };
}

export function updateWeather(G, dt) {
  const w = G.weather;
  // Clock: 1 game hour per 90 real seconds.
  G.clock.minutes += dt * (60 / 90);
  while (G.clock.minutes >= 60) { G.clock.minutes -= 60; G.clock.hours = (G.clock.hours + 1) % 24; if (G.clock.hours === 0) G.clock.day++; }
  // Weather state machine.
  w.timer -= dt;
  if (w.timer <= 0) {
    const r = G.rng.next();
    if (w.kind === 'clear') { w.kind = r < 0.45 ? 'drizzle' : r < 0.7 ? 'rain' : 'clear'; }
    else { w.kind = r < 0.6 ? 'clear' : w.kind; }
    w.timer = 60 + G.rng.range(0, 120);
  }
  const target = w.kind === 'rain' ? 1 : w.kind === 'drizzle' ? 0.45 : 0;
  w.rain += (target - w.rain) * Math.min(1, dt * 0.5);
  w.grip = 1 - w.rain * 0.15;
}

// 0 at noon, 1 at midnight: how dark the world is.
export function darkness(G) {
  const h = G.clock.hours + G.clock.minutes / 60;
  if (h >= 6 && h < 18) return 0;
  if (h >= 18 && h < 20) return (h - 18) / 2 * 0.85;
  if (h >= 20 || h < 4) return 0.85;
  return (1 - (h - 4) / 2) * 0.85;
}

export function isNight(G) { return darkness(G) > 0.4; }

export function clockLabel(G) {
  const h = String(G.clock.hours).padStart(2, '0');
  const m = String(Math.floor(G.clock.minutes)).padStart(2, '0');
  return `${h}:${m}`;
}

export function weatherLabel(G) {
  if (G.weather.rain > 0.6) return 'RAIN';
  if (G.weather.rain > 0.15) return 'DRIZZLE';
  return isNight(G) ? 'CLEAR NIGHT' : 'SUNNY';
}
