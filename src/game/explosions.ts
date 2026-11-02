import { toHex, type Enemy, type GameState, type Random } from './game';

export const EXPLOSION_MS = 400;

/** Burst left behind by a killed enemy, at the spot in the playfield where it died. */
export interface Explosion {
  enemyId: number;
  label: string;
  x: number;
  progress: number;
  startedAtMs: number;
  rotationRad: number;
}

/** Starts explosions for enemies killed between two states and drops burnt-out ones. */
export function explosionsAfter(
  explosions: Explosion[],
  before: GameState,
  after: GameState,
  random: Random,
): Explosion[] {
  if (after === before) return explosions;
  const started = after.killed.map((enemy) => explode(enemy, after, random));
  const burning = explosions.filter(
    (explosion) => after.elapsedMs - explosion.startedAtMs < EXPLOSION_MS,
  );
  if (started.length === 0 && burning.length === explosions.length) return explosions;
  return [...burning, ...started];
}

/** 0 when the explosion starts, 1 once it has burnt out. */
export function explosionProgress(explosion: Explosion, nowMs: number): number {
  return Math.min(1, Math.max(0, (nowMs - explosion.startedAtMs) / EXPLOSION_MS));
}

/** Kills land between frames, so wind the enemy back from the frame time to its moment of death. */
function explode(enemy: Enemy, after: GameState, random: Random): Explosion {
  const diedAtMs = enemy.matchedAtMs! + after.config.killDelayMs;
  const progressAtDeath = enemy.progress - (enemy.speed * (after.elapsedMs - diedAtMs)) / 1000;
  return {
    enemyId: enemy.id,
    label: toHex(enemy.target),
    x: enemy.x,
    progress: Math.min(Math.max(progressAtDeath, 0), 1),
    startedAtMs: diedAtMs,
    rotationRad: random() * 2 * Math.PI,
  };
}
