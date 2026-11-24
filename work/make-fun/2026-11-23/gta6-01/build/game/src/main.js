// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between five screens: title, play, paused, busted and wasted.
//
// ?seed=N fixes the city and the traffic. ?shot=start|drive|chase|mission (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets window.__shotReady.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BUSTED, EVENT_MISSION_DONE, EVENT_WASTED } from './world.js';
import { ACTION_CONFIRM, ACTION_ENTER, ACTION_PAUSE, ACTION_PUNCH, ACTION_SAVE, ACTION_SHOOT, createInput } from './input.js';
import { createRenderer, SCREEN_BUSTED, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();
// Debug handle for automated playtests (read-only from the page's own console).
window.__solara = world;
let continueRequested = false;

window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyC') continueRequested = true;
  if (event.code === 'KeyM') audio.toggle();
});

function runShot(name) {
  const scene = stageShot(name, world);
  renderer.snapTo(world.state);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.extras);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = world.readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame(fromSave) {
    if (fromSave) {
      const save = world.loadGame();
      if (save) {
        world.reset();
        world.applySave(save);
      } else {
        world.reset();
      }
    } else {
      world.reset();
    }
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing in Solara Bay. Follow the mission marker.');
  }

  function endGame(busted) {
    screen = busted ? SCREEN_BUSTED : SCREEN_OVER;
    if (world.state.player.money > best) {
      best = world.state.player.money;
      world.saveBest(best);
    }
    audio.busted();
    announce(busted ? 'Busted by the Solara PD.' : 'Wasted in Solara Bay.');
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) audio.unlock();
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) startGame(false);
      else if (continueRequested) { continueRequested = false; startGame(true); }
      return actions;
    }
    if (screen === SCREEN_OVER || screen === SCREEN_BUSTED) {
      if (actions & ACTION_CONFIRM) startGame(false);
      return actions;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    if ((actions & ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    if ((actions & ACTION_SAVE) && screen === SCREEN_PLAY) {
      if (world.saveGame()) announce('Game saved.');
    }
    return actions;
  }

  function step(actions) {
    const p = world.state.player;
    const move = input.move();
    const mouse = input.mouse();
    const mouseWorld = renderer.screenToWorld(mouse.x, mouse.y);
    const stepActions = {
      enter: !!(actions & ACTION_ENTER),
      punch: !!(actions & ACTION_PUNCH),
      // A click fires once (ACTION_SHOOT); holding the button keeps firing.
      shoot: !!(actions & ACTION_SHOOT) || mouse.down,
      save: false,
      run: input.running(),
    };
    if (stepActions.punch) audio.punch();
    if (stepActions.shoot && p.ammo > 0) audio.shoot();
    const events = world.step(STEP, { move, actions: stepActions, mouseWorld });
    if (events & EVENT_MISSION_DONE) {
      audio.missionDone();
      if (world.state.player.money > best) {
        best = world.state.player.money;
        world.saveBest(best);
      }
    }
    if (events & EVENT_BUSTED) endGame(true);
    else if (events & EVENT_WASTED) endGame(false);
    // Engine + siren + music follow the live state.
    const car = p.inCar;
    audio.tick(STEP, !!car, car ? Math.min(1, Math.abs(car.speed) / 560) : 0, world.state.wanted);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = handleActions();
    if (screen === SCREEN_TITLE) {
      // The title screen lives over a living city: traffic rolls on.
      while (accumulator >= STEP) {
        world.step(STEP, { move: { x: 0, y: 0 }, actions: { enter: false, punch: false, shoot: false, save: false, run: false }, mouseWorld: { x: 0, y: 0 } });
        accumulator -= STEP;
      }
    } else if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step(actions);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    const hasSave = world.loadGame() !== null;
    renderer.draw(world.state, screen, { best, hasSave });
  }

  // Leaving the tab pauses a running game rather than letting the cops close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Solara Bay. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
