// The screenshot scenes behind ?shot=start|drive|chase|mission. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a road-following autopilot
// (waypoints on the road grid, braking into turns), so the frame is what a short game really
// looks like and the same seed always gives the same frame.

import { STEP } from './config.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const DRIVE_SECONDS = 6.5;
const CHASE_SECONDS = 6;
const MISSION_SECONDS = 10;

/** Put the player in a fresh car on the main avenue, pointed north, ready to drive. */
function giveCar(world) {
  const s = world.state;
  const car = {
    x: 1800, y: 1250, angle: -Math.PI / 2, speed: 0, health: 100, kind: 'player',
    color: '#c0392b', driver: false, roadAxis: 'x', road: 1800, lane: 24, dir: 1,
    turnTimer: 5, stuck: 0, ramTimer: 0,
  };
  s.cars.push(car);
  s.player.inCar = car;
  s.player.x = car.x;
  s.player.y = car.y;
  s.player.angle = car.angle;
  return car;
}

function noActions() {
  return { enter: false, punch: false, shoot: false, save: false, run: false };
}

function noInput(world) {
  const p = world.state.player;
  return { move: { x: 0, y: 0 }, actions: noActions(), mouseWorld: { x: p.x, y: p.y } };
}

/**
 * Steer the player's car toward the current waypoint. `route` is { points, index, loop }.
 * Brakes into sharp turns so the car stays on the road instead of clipping block corners.
 */
function routeInput(world, route) {
  const p = world.state.player;
  const car = p.inCar;
  if (!car) return noInput(world);
  const points = route.points;
  let wp = points[route.index];
  const dx = wp.x - car.x;
  const dy = wp.y - car.y;
  const d = Math.hypot(dx, dy);
  if (d < 80) {
    if (route.index < points.length - 1) route.index += 1;
    else if (route.loop) route.index = 0;
    wp = points[route.index];
  }
  const want = Math.atan2(wp.y - car.y, wp.x - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const steer = Math.max(-1, Math.min(1, diff * 2.2));
  // At the final stop, coast to a halt near the marker.
  const stopping = !route.loop && route.index === points.length - 1 && Math.hypot(wp.x - car.x, wp.y - car.y) < 80;
  const throttle = stopping ? 0 : Math.abs(diff) > 0.55 ? 1 : -1;
  return { move: { x: steer, y: throttle }, actions: noActions(), mouseWorld: { x: p.x, y: p.y } };
}

/**
 * Set `world` to the named scene (start, drive, chase or mission; any other name is start) and
 * return the screen to draw over it and the extras the renderer shows.
 */
export function stageShot(name, world) {
  const s = world.state;
  world.reset();
  if (name !== 'drive' && name !== 'chase' && name !== 'mission') {
    for (let i = 0; i < START_SECONDS / STEP; i++) {
      world.step(STEP, noInput(world));
    }
    return { screen: SCREEN_TITLE, extras: { best: 1250, hasSave: true } };
  }

  if (name === 'drive') {
    giveCar(world);
    // A long loop around the downtown blocks: north, east, south, west.
    const route = { points: [{ x: 1800, y: 600 }, { x: 2600, y: 600 }, { x: 2600, y: 1400 }, { x: 1800, y: 1400 }], index: 0, loop: true };
    for (let i = 0; i < DRIVE_SECONDS / STEP; i++) {
      world.step(STEP, routeInput(world, route));
    }
    return { screen: SCREEN_PLAY, extras: { best: 0, hasSave: false } };
  }

  if (name === 'chase') {
    const getaway = giveCar(world);
    getaway.health = 250; // the getaway car holds together for the whole chase
    // Clear traffic off the chase loop, so the getaway car is never boxed in by a jam.
    const nearLoop = (c) => {
      const dx = Math.max(1800 - c.x, 0, c.x - 2600);
      const dy = Math.max(600 - c.y, 0, c.y - 1400);
      return Math.hypot(dx, dy) < 130;
    };
    s.cars = s.cars.filter((c) => c.kind !== 'traffic' || !nearLoop(c));
    s.mission.index = 1;
    s.mission.step = 0;
    s.mission.timer = 0;
    s.wanted = 3;
    // A patrol car right behind the player, so the chase is in the frame.
    s.cars.push({
      x: 1800, y: 1700, angle: -Math.PI / 2, speed: 200, health: 100, kind: 'police',
      color: '#1c3a5e', driver: false, roadAxis: 'x', road: 1800, lane: -24, dir: 1,
      turnTimer: 5, stuck: 0, ramTimer: 0,
    });
    world.showMessage('WANTED — 3 stars! Lose the Solara PD!', 5);
    // The downtown loop at speed: the chase reads as a chase, not a crash.
    const route = { points: [{ x: 1800, y: 600 }, { x: 2600, y: 600 }, { x: 2600, y: 1400 }, { x: 1800, y: 1400 }], index: 0, loop: true };
    for (let i = 0; i < CHASE_SECONDS / STEP; i++) {
      world.step(STEP, routeInput(world, route));
    }
    return { screen: SCREEN_PLAY, extras: { best: 0, hasSave: false } };
  }

  // mission: Courier Run, driving the roads toward the first drop with the marker on the HUD.
  // The car stops just short of the drop, so the marker stays on screen.
  s.mission.index = 1;
  s.mission.step = 0;
  s.mission.timer = 0;
  giveCar(world);
  const route = { points: [{ x: 1800, y: 1800 }, { x: 720, y: 1800 }], index: 0, loop: false };
  for (let i = 0; i < MISSION_SECONDS / STEP; i++) {
    world.step(STEP, routeInput(world, route));
  }
  return { screen: SCREEN_PLAY, extras: { best: 0, hasSave: false } };
}
