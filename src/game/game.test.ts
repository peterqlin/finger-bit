import { describe, expect, it } from 'vitest';
import {
  createGame,
  DEFAULT_CONFIG,
  difficultyMultiplier,
  holdValue,
  START_VALUE,
  step,
  type Enemy,
  type GameConfig,
  type GameState,
} from './game';

const NEVER_SPAWN = Number.POSITIVE_INFINITY;
const fixedRandom = () => 0.5;

function playing(config: Partial<GameConfig> = {}): GameState {
  return { ...createGame({ ...DEFAULT_CONFIG, ...config }), status: 'playing' };
}

function gameWith(enemies: Partial<Enemy>[], config: Partial<GameConfig> = {}): GameState {
  return {
    ...playing({ spawnIntervalMs: NEVER_SPAWN, ...config }),
    msUntilNextSpawn: NEVER_SPAWN,
    enemies: enemies.map((enemy, id) => ({
      id,
      target: 0x01,
      x: 0.5,
      progress: 0,
      speed: 0.1,
      matchedAtMs: null,
      ...enemy,
    })),
  };
}

describe('matching', () => {
  it('matches the oldest enemy when several share a value', () => {
    const state = holdValue(gameWith([{}, {}], { killDelayMs: 100 }), 0x01);

    expect(state.enemies.map((enemy) => enemy.matchedAtMs)).toEqual([0, null]);
  });

  it('kills only one enemy per pose', () => {
    const once = holdValue(gameWith([{}, {}]), 0x01);
    const stillHolding = step(once, 16, fixedRandom);

    expect(stillHolding.enemies).toHaveLength(1);
    expect(stillHolding.score).toBe(1);
  });

  it('re-arms once the held value changes', () => {
    const once = holdValue(gameWith([{}, {}]), 0x01);
    const again = holdValue(holdValue(once, null), 0x01);

    expect(again.enemies).toEqual([]);
    expect(again.score).toBe(2);
  });

  it('matches an enemy that spawns showing the value already held', () => {
    const holding = holdValue(gameWith([]), 0x80);
    const spawned = step(
      { ...holding, msUntilNextSpawn: 0, config: { ...holding.config, spawnIntervalMs: 1000 } },
      0,
      () => 0.5,
    );

    expect(spawned.score).toBe(1);
  });

  it('ignores a held value that matches nothing', () => {
    const state = holdValue(gameWith([{ target: 0x03 }]), 0x02);

    expect(state.enemies[0]?.matchedAtMs).toBeNull();
    expect(state.armed).toBe(true);
  });
});

describe('killing', () => {
  it('kills immediately when the delay is zero', () => {
    const state = holdValue(gameWith([{}], { killDelayMs: 0 }), 0x01);

    expect(state.enemies).toEqual([]);
    expect(state.score).toBe(1);
  });

  it('kills a matched enemy only after the delay', () => {
    const matched = holdValue(gameWith([{}], { killDelayMs: 500 }), 0x01);

    expect(step(matched, 499, fixedRandom).enemies).toHaveLength(1);
    expect(step(matched, 500, fixedRandom).score).toBe(1);
  });

  it('lets a matched enemy reach the player before its delay ends', () => {
    const matched = holdValue(gameWith([{ progress: 0.99 }], { killDelayMs: 1000 }), 0x01);
    const after = step(matched, 200, fixedRandom);

    expect(after.score).toBe(0);
    expect(after.status).toBe('over');
  });
});

describe('lives', () => {
  it('loses a life when an enemy reaches the player', () => {
    const state = step(gameWith([{ progress: 0.99 }], { lives: 3 }), 1000, fixedRandom);

    expect(state.lives).toBe(2);
    expect(state.status).toBe('playing');
  });

  it('ends the game when lives run out', () => {
    expect(step(gameWith([{ progress: 0.99 }]), 1000, fixedRandom).status).toBe('over');
  });
});

describe('starting', () => {
  it('holds still until started', () => {
    const ready = createGame();

    expect(step(ready, 1000, fixedRandom)).toBe(ready);
  });

  it('starts when every finger goes up', () => {
    const started = holdValue(createGame(), START_VALUE);

    expect(started.status).toBe('playing');
    expect(started.armed).toBe(false);
  });

  it('restarts from game over with a fresh run', () => {
    const over = { ...step(gameWith([{ progress: 0.99 }]), 1000, fixedRandom), score: 7 };
    const restarted = holdValue(over, START_VALUE);

    expect(restarted.status).toBe('playing');
    expect(restarted.score).toBe(0);
    expect(restarted.enemies).toEqual([]);
  });

  it('does not restart while the start pose is still held from the last run', () => {
    const over = { ...holdValue(createGame(), START_VALUE), status: 'over' as const };

    expect(holdValue(over, START_VALUE)).toBe(over);
  });

  it('ignores other values before starting', () => {
    expect(holdValue(createGame(), 0x0f).status).toBe('ready');
  });
});

describe('spawning', () => {
  it('spawns once per interval', () => {
    const state = playing({ spawnIntervalMs: 1000 });

    expect(step(state, 0, fixedRandom).enemies).toHaveLength(1);
    expect(step(state, 2500, fixedRandom).enemies).toHaveLength(3);
  });

  it('never spawns 00', () => {
    const state = step(playing({ spawnIntervalMs: 1000 }), 0, () => 0);

    expect(state.enemies[0]?.target).toBe(0x01);
  });
});

describe('difficulty', () => {
  const config = { spawnIntervalMs: 1000, enemyFallMs: 10_000, difficultyDoublesAtScore: 60 };
  const atScore = (score: number) => ({ ...playing(config), score, held: 0 });

  it('doubles at the configured score and ramps linearly', () => {
    const full = { ...DEFAULT_CONFIG, ...config };

    expect(difficultyMultiplier(full, 0)).toBe(1);
    expect(difficultyMultiplier(full, 30)).toBe(1.5);
    expect(difficultyMultiplier(full, 60)).toBe(2);
  });

  it('spawns faster enemies more often as the score rises', () => {
    const fresh = step(atScore(0), 2400, fixedRandom);
    const doubled = step(atScore(60), 2400, fixedRandom);

    expect(fresh.enemies).toHaveLength(3);
    expect(doubled.enemies).toHaveLength(5);
    expect(doubled.enemies[0]?.speed).toBeCloseTo(2 * fresh.enemies[0]!.speed);
  });
});
