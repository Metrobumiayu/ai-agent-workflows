// input.js — Keyboard + mouse. Arrows/WASD move, E interacts, Space serves,
// P pauses, R restarts, M mutes, Enter starts. Clicking a station walks
// the chef toward it and interacts when close; clicking the floor sets a
// walk target.

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    pressed: new Set(), // edge-triggered keys, consumed each frame
    click: null, // {x, y} in canvas coords, consumed each frame
    moveTarget: null,
  };

  const keyMap = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
  };

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (keyMap[e.code]) input.keys.add(keyMap[e.code]);
    if (!e.repeat) {
      if (e.code === 'KeyE') input.pressed.add('interact');
      if (e.code === 'Space') input.pressed.add('serve');
      if (e.code === 'KeyP') input.pressed.add('pause');
      if (e.code === 'KeyR') input.pressed.add('restart');
      if (e.code === 'KeyM') input.pressed.add('mute');
      if (e.code === 'Enter') input.pressed.add('start');
      if (e.code === 'Digit1') input.pressed.add('bin-bun');
      if (e.code === 'Digit2') input.pressed.add('bin-patty');
      if (e.code === 'Digit3') input.pressed.add('bin-lettuce');
      if (e.code === 'Digit4') input.pressed.add('bin-tomato');
      if (e.code === 'Digit5') input.pressed.add('bin-cheese');
    }
  });
  window.addEventListener('keyup', (e) => {
    if (keyMap[e.code]) input.keys.delete(keyMap[e.code]);
  });

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    input.click = { x, y };
  });

  return input;
}

export function moveVector(input) {
  let dx = 0;
  let dy = 0;
  if (input.keys.has('left')) dx -= 1;
  if (input.keys.has('right')) dx += 1;
  if (input.keys.has('up')) dy -= 1;
  if (input.keys.has('down')) dy += 1;
  return { dx, dy };
}

export function consume(input, name) {
  if (input.pressed.has(name)) {
    input.pressed.delete(name);
    return true;
  }
  return false;
}

export function consumeClick(input) {
  const c = input.click;
  input.click = null;
  return c;
}
