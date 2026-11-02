import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { explosionsAfter, type Explosion } from './explosions';
import { createGame, holdValue, step, type GameState } from './game';

/** Caps a single step so returning to a backgrounded tab doesn't teleport enemies onto the player. */
const MAX_FRAME_MS = 100;

interface Snapshot {
  game: GameState;
  explosions: Explosion[];
}

function createGameStore() {
  let snapshot: Snapshot = { game: createGame(), explosions: [] };
  const listeners = new Set<() => void>();

  function advance(game: GameState) {
    const explosions = explosionsAfter(snapshot.explosions, snapshot.game, game, Math.random);
    if (game === snapshot.game && explosions === snapshot.explosions) return;
    snapshot = { game, explosions };
    listeners.forEach((listener) => listener());
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    tick: (dtMs: number) => advance(step(snapshot.game, dtMs, Math.random)),
    hold: (value: number | null) => advance(holdValue(snapshot.game, value)),
  };
}

export function useGame() {
  const [store] = useState(createGameStore);
  const { game, explosions } = useSyncExternalStore(store.subscribe, store.getSnapshot);

  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    function loop(now: number) {
      store.tick(Math.min(now - previous, MAX_FRAME_MS));
      previous = now;
      frame = requestAnimationFrame(loop);
    }
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [store]);

  const hold = useCallback((value: number | null) => store.hold(value), [store]);

  return { game, explosions, hold };
}
