import { describe, expect, it } from 'vitest';
import { EXPLOSION_MS, explosionProgress, explosionsAfter } from './explosions';
import { createGame, DEFAULT_CONFIG, holdValue, step, type Enemy, type GameState } from './game';

const fixedRandom = () => 0.5;

function gameWith(enemies: Partial<Enemy>[], killDelayMs = 400): GameState {
  return {
    ...createGame({ ...DEFAULT_CONFIG, killDelayMs, spawnIntervalMs: Infinity }),
    status: 'playing',
    msUntilNextSpawn: Infinity,
    enemies: enemies.map((enemy, id) => ({
      id,
      target: 0x01,
      x: 0.3,
      progress: 0,
      speed: 0.1,
      matchedAtMs: null,
      ...enemy,
    })),
  };
}

describe('explosionsAfter', () => {
  it('explodes an instantly killed enemy where it was', () => {
    const before = gameWith([{ progress: 0.4 }], 0);
    const after = holdValue(before, 0x01);

    expect(explosionsAfter([], before, after, fixedRandom)).toMatchObject([
      { enemyId: 0, label: '01', x: 0.3, progress: 0.4, startedAtMs: 0 },
    ]);
  });

  it('explodes a delayed kill at the moment and place it died', () => {
    const matched = holdValue(gameWith([{ progress: 0.2 }], 400), 0x01);
    const before = step(matched, 300, fixedRandom);
    const after = step(before, 200, fixedRandom);
    const [explosion] = explosionsAfter([], before, after, fixedRandom);

    expect(explosion?.startedAtMs).toBe(400);
    expect(explosion?.progress).toBeCloseTo(0.24);
  });

  it('does not explode enemies that reach the player', () => {
    const before = gameWith([{ progress: 0.99 }]);
    const after = step(before, 1000, fixedRandom);

    expect(explosionsAfter([], before, after, fixedRandom)).toEqual([]);
  });

  it('drops explosions once they burn out', () => {
    const before = gameWith([{ progress: 0.4 }], 0);
    const killed = holdValue(before, 0x01);
    const explosions = explosionsAfter([], before, killed, fixedRandom);
    const later = step(killed, EXPLOSION_MS, fixedRandom);

    expect(explosionsAfter(explosions, killed, later, fixedRandom)).toEqual([]);
  });
});

describe('explosionProgress', () => {
  it('runs from 0 to 1 over the explosion', () => {
    const explosion = {
      enemyId: 0,
      label: '01',
      x: 0,
      progress: 0,
      startedAtMs: 100,
      rotationRad: 0,
    };

    expect(explosionProgress(explosion, 100)).toBe(0);
    expect(explosionProgress(explosion, 100 + EXPLOSION_MS / 2)).toBe(0.5);
    expect(explosionProgress(explosion, 100 + EXPLOSION_MS * 2)).toBe(1);
  });
});
