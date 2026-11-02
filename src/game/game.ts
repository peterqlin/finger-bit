export type Random = () => number;

export interface GameConfig {
  lives: number;
  /** Time from matching an enemy to it dying. */
  killDelayMs: number;
  /** Starting time between spawns. */
  spawnIntervalMs: number;
  /** Starting time for an enemy to fall the full height of the playfield. */
  enemyFallMs: number;
  /** Score at which spawning and falling are twice as fast as at the start; the ramp is linear. */
  difficultyDoublesAtScore: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  lives: 1,
  killDelayMs: 0,
  spawnIntervalMs: 4000,
  enemyFallMs: 16000,
  difficultyDoublesAtScore: 120,
};

/** Holding every finger up starts a game from the ready or game-over screen. */
export const START_VALUE = 0xff;

export interface Enemy {
  id: number;
  target: number;
  /** Horizontal position, 0 (left edge) to 1 (right edge). */
  x: number;
  /** Distance travelled, 0 (spawn) to 1 (reached the player). */
  progress: number;
  /** Fraction of the playfield travelled per second, fixed at spawn. */
  speed: number;
  matchedAtMs: number | null;
}

export type GameStatus = 'ready' | 'playing' | 'over';

export interface GameState {
  config: GameConfig;
  status: GameStatus;
  /** The byte the player's hands are holding, or `null` when it can't be read. */
  held: number | null;
  /**
   * Whether `held` may match an enemy. A kill disarms it, and changing the held value re-arms
   * it, so one pose kills one enemy, like the register clearing after a match in Flippy Bit.
   */
  armed: boolean;
  enemies: Enemy[];
  elapsedMs: number;
  msUntilNextSpawn: number;
  nextEnemyId: number;
  lives: number;
  score: number;
  /** Enemies killed by the transition that produced this state, as they were when they died. */
  killed: Enemy[];
}

const SPAWN_MARGIN = 0.1;

export function createGame(config: GameConfig = DEFAULT_CONFIG): GameState {
  return {
    config,
    status: 'ready',
    held: null,
    armed: false,
    enemies: [],
    elapsedMs: 0,
    msUntilNextSpawn: 0,
    nextEnemyId: 0,
    lives: config.lives,
    score: 0,
    killed: [],
  };
}

export function difficultyMultiplier(config: GameConfig, score: number): number {
  return 1 + score / config.difficultyDoublesAtScore;
}

export function holdValue(state: GameState, value: number | null): GameState {
  if (value === state.held) return state;
  const holding = { ...state, held: value, armed: true, killed: [] };
  if (state.status !== 'playing') {
    return value === START_VALUE
      ? { ...createGame(state.config), status: 'playing', held: value }
      : holding;
  }
  return destroyDueEnemies(matchHeldValue(holding));
}

export function step(state: GameState, dtMs: number, random: Random): GameState {
  if (state.status !== 'playing') return state;
  const advanced: GameState = {
    ...state,
    elapsedMs: state.elapsedMs + dtMs,
    killed: [],
    enemies: state.enemies.map((enemy) => ({
      ...enemy,
      progress: enemy.progress + (enemy.speed * dtMs) / 1000,
    })),
  };
  const spawned = spawnEnemies(handleArrivals(destroyDueEnemies(advanced)), dtMs, random);
  return destroyDueEnemies(matchHeldValue(spawned));
}

/** Matches the oldest unmatched enemy showing the held value. */
function matchHeldValue(state: GameState): GameState {
  if (state.status !== 'playing' || !state.armed || state.held === null) return state;
  const match = state.enemies.find(
    (enemy) => enemy.matchedAtMs === null && enemy.target === state.held,
  );
  if (!match) return state;
  return {
    ...state,
    armed: false,
    enemies: state.enemies.map((enemy) =>
      enemy === match ? { ...enemy, matchedAtMs: state.elapsedMs } : enemy,
    ),
  };
}

function isKillDue(state: GameState, enemy: Enemy): boolean {
  return (
    enemy.matchedAtMs !== null && state.elapsedMs - enemy.matchedAtMs >= state.config.killDelayMs
  );
}

function destroyDueEnemies(state: GameState): GameState {
  const due = state.enemies.filter((enemy) => isKillDue(state, enemy));
  if (due.length === 0) return state;
  return {
    ...state,
    enemies: state.enemies.filter((enemy) => !due.includes(enemy)),
    score: state.score + due.length,
    killed: [...state.killed, ...due],
  };
}

function handleArrivals(state: GameState): GameState {
  const remaining = state.enemies.filter((enemy) => enemy.progress < 1);
  const arrivedCount = state.enemies.length - remaining.length;
  if (arrivedCount === 0) return state;
  const lives = Math.max(0, state.lives - arrivedCount);
  return { ...state, enemies: remaining, lives, status: lives === 0 ? 'over' : 'playing' };
}

function spawnEnemies(state: GameState, dtMs: number, random: Random): GameState {
  if (state.status === 'over') return state;
  const { config } = state;
  const interval = config.spawnIntervalMs / difficultyMultiplier(config, state.score);
  let next = { ...state, msUntilNextSpawn: state.msUntilNextSpawn - dtMs };
  while (next.msUntilNextSpawn <= 0) {
    next = {
      ...next,
      enemies: [...next.enemies, createEnemy(next, random)],
      nextEnemyId: next.nextEnemyId + 1,
      msUntilNextSpawn: next.msUntilNextSpawn + interval,
    };
  }
  return next;
}

function createEnemy(state: GameState, random: Random): Enemy {
  const { config } = state;
  return {
    id: state.nextEnemyId,
    target: 1 + Math.floor(random() * 255),
    x: SPAWN_MARGIN + random() * (1 - 2 * SPAWN_MARGIN),
    progress: 0,
    speed: (1000 / config.enemyFallMs) * difficultyMultiplier(config, state.score),
    matchedAtMs: null,
  };
}

export function toHex(byte: number): string {
  return byte.toString(16).toUpperCase().padStart(2, '0');
}
