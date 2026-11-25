// config.js — The Golden Ladle: tuning, ingredients and recipes.
// All numbers here shape the 3-minute shift: how fast orders arrive,
// how long a dish takes, and what score wins the shift.

export const CANVAS_W = 1280;
export const CANVAS_H = 720;
export const HUD_H = 64;
export const BOARD_H = 96;

export const SHIFT_SECONDS = 180;
export const TARGET_SCORE = 300;

export const PLAYER_SPEED = 280;
export const PLAYER_RADIUS = 22;
export const INTERACT_RANGE = 78;

export const CHOP_SECONDS = 2.5;
export const COOK_SECONDS = 4.0;
export const BURN_SECONDS = 4.0; // cooked patty burns this long after it is done

export const ORDER_START_SECONDS = 48;
export const ORDER_MIN_SECONDS = 30;
export const ORDER_SPAWN_SECONDS = 11;
export const MAX_ORDERS_START = 2;
export const MAX_ORDERS_CAP = 4;

export const BASE_POINTS = 50;
export const TIME_BONUS_MAX = 30;
export const STREAK_BONUS = 6;
export const EXPIRE_PENALTY = 10;

// Ingredients: what the bins hand out, and what prep each one needs.
export const INGREDIENTS = {
  bun:     { name: 'Bun',     color: '#e8b96a', prep: 'none',  chop: false, cook: false },
  patty:   { name: 'Patty',   color: '#8a5a33', prep: 'cook',  chop: false, cook: true },
  lettuce: { name: 'Lettuce', color: '#6fbf4a', prep: 'chop',  chop: true,  cook: false },
  tomato:  { name: 'Tomato',  color: '#e84a3a', prep: 'chop',  chop: true,  cook: false },
  cheese:  { name: 'Cheese',  color: '#f5c542', prep: 'none',  chop: false, cook: false },
};

// A dish is a set of prepared ingredients. Order of assembly does not matter.
export const RECIPES = [
  {
    id: 'classic',
    name: 'Classic Burger',
    needs: ['bun', 'patty-cooked', 'lettuce-chopped'],
    price: 55,
  },
  {
    id: 'cheese',
    name: 'Cheese Burger',
    needs: ['bun', 'patty-cooked', 'cheese'],
    price: 60,
  },
  {
    id: 'salad',
    name: 'Garden Salad',
    needs: ['lettuce-chopped', 'tomato-chopped'],
    price: 45,
  },
  {
    id: 'stack',
    name: 'Golden Stack',
    needs: ['bun', 'patty-cooked', 'tomato-chopped', 'cheese'],
    price: 80,
  },
];

export function recipeById(id) {
  return RECIPES.find((r) => r.id === id);
}

// Turn an item {kind, state} into the token a recipe matches on.
export function itemToken(item) {
  if (!item) return null;
  if (item.kind === 'plate') return 'plate';
  if (item.state === 'cooked') return item.kind + '-cooked';
  if (item.state === 'chopped') return item.kind + '-chopped';
  return item.kind;
}

// Does the plate's contents match the recipe exactly (same multiset)?
export function plateMatchesRecipe(plateContents, recipe) {
  const have = plateContents.map(itemToken).sort();
  const want = [...recipe.needs].sort();
  if (have.length !== want.length) return false;
  return have.every((t, i) => t === want[i]);
}
