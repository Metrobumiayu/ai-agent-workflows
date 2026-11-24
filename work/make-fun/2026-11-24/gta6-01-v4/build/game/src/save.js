// Vice Bay — save / load. One job: persist the player's progress to localStorage
// (position, money, health, armor, weapons, missions, reputation, safehouse,
// clock and collectibles) and restore it. Nothing else touches storage.
export const SAVE_KEY = 'vice-bay-save-v1';

export function saveGame(G, quiet) {
  try {
    const p = G.player;
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      x: p.x, y: p.y, money: p.money, hp: p.hp, armor: p.armor,
      weapon: p.weapon, ammo: p.ammo, rep: p.rep,
      missionsCompleted: G.missionsCompleted, nextMission: G.nextMission,
      safehouseOwned: G.safehouseOwned, hours: G.clock.hours, minutes: G.clock.minutes, day: G.clock.day,
      packages: G.city.packages.filter((k) => k.taken).length,
      stats: G.stats, day2: G.clock.day,
    }));
    G.saveExists = true;
    if (!quiet) { G.message = 'Game saved.'; G.messageT = 2; }
    return true;
  } catch { return false; }
}

export function loadGame(G) {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!s) return false;
    const p = G.player;
    p.x = s.x; p.y = s.y; p.money = s.money; p.hp = s.hp; p.armor = s.armor;
    p.weapon = s.weapon || 'pistol'; p.ammo = s.ammo || { pistol: 24 };
    p.rep = s.rep || 0;
    G.missionsCompleted = s.missionsCompleted || 0;
    G.nextMission = s.nextMission || 1;
    G.safehouseOwned = !!s.safehouseOwned;
    G.clock.hours = s.hours ?? 10; G.clock.minutes = s.minutes ?? 0; G.clock.day = s.day ?? 1;
    if (s.stats) G.stats = { ...G.stats, ...s.stats };
    return true;
  } catch { return false; }
}

export function saveExists() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}
