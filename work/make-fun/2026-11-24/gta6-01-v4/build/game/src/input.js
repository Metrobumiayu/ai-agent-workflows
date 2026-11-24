// Vice Bay — keyboard + mouse input. One job: edge-triggered keys (pressed this frame)
// and held keys, plus mouse position/buttons in canvas pixels.
export function createInput(canvas) {
  const input = {
    keys: new Set(), pressed: new Set(),
    mouseX: 0, mouseY: 0, mouseIn: false, mouseDown: false, mouseClicked: false,
    down(code) { return input.keys.has(code); },
    hit(code) { return input.pressed.has(code); },
    clearPressed() { input.pressed.clear(); input.mouseClicked = false; },
  };
  const GAME_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyE', 'KeyR', 'KeyM', 'KeyT', 'KeyF', 'Enter', 'Escape', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'KeyP', 'KeyH', 'KeyC']);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Tab') e.preventDefault();
    if (!e.repeat) input.pressed.add(e.code);
    input.keys.add(e.code);
    if (GAME_KEYS.has(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => input.keys.delete(e.code));
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouseX = (e.clientX - r.left) * (canvas.width / r.width);
    input.mouseY = (e.clientY - r.top) * (canvas.height / r.height);
    input.mouseIn = true;
  });
  canvas.addEventListener('mousedown', (e) => { input.mouseDown = true; input.mouseClicked = true; });
  canvas.addEventListener('mouseup', () => { input.mouseDown = false; });
  window.addEventListener('blur', () => { input.keys.clear(); input.mouseDown = false; });
  return input;
}

// WASD/arrows as a -1..1 steering + throttle pair.
export function driveKeys(input) {
  const up = input.down('KeyW') || input.down('ArrowUp');
  const dn = input.down('KeyS') || input.down('ArrowDown');
  const lf = input.down('KeyA') || input.down('ArrowLeft');
  const rt = input.down('KeyD') || input.down('ArrowRight');
  return { throttle: (up ? 1 : 0) - (dn ? 1 : 0), steer: (lf ? -1 : 0) + (rt ? 1 : 0) };
}
export function walkKeys(input) {
  const up = input.down('KeyW') || input.down('ArrowUp');
  const dn = input.down('KeyS') || input.down('ArrowDown');
  const lf = input.down('KeyA') || input.down('ArrowLeft');
  const rt = input.down('KeyD') || input.down('ArrowRight');
  return { x: (rt ? 1 : 0) - (lf ? 1 : 0), y: (dn ? 1 : 0) - (up ? 1 : 0) };
}
