import { useEffect, useState } from 'react';
import { START_VALUE, toHex } from '../game/game';
import { useGame } from '../game/useGame';
import { DEFAULT_THRESHOLDS } from '../vision/fingers';
import { useCamera } from '../vision/useCamera';
import { useFingerByte } from '../vision/useFingerByte';
import { BitReadout } from './BitReadout';
import { CameraView } from './CameraView';
import { DebugPanel } from './DebugPanel';
import { Playfield } from './Playfield';

const DEFAULT_HOLD_MS = 100;
const SHOW_DEBUG = new URLSearchParams(window.location.search).has('debug');

export function GameScreen() {
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [holdMs, setHoldMs] = useState(DEFAULT_HOLD_MS);
  const { videoRef, status: cameraStatus } = useCamera();
  const { modelStatus, state: vision } = useFingerByte(videoRef, cameraStatus.kind === 'ready', {
    thresholds,
    holdMs,
  });
  const { game, explosions, hold } = useGame();
  const committed = vision?.committed ?? null;

  useEffect(() => hold(committed), [committed, hold]);

  const error =
    cameraStatus.kind === 'error'
      ? cameraStatus.message
      : modelStatus.kind === 'error'
        ? modelStatus.message
        : null;
  const loading = !error && (cameraStatus.kind === 'starting' || modelStatus.kind === 'loading');
  const isPlaying = game.status === 'playing';

  return (
    <main className="relative h-dvh w-full overflow-hidden select-none">
      <CameraView
        videoRef={videoRef}
        reading={vision?.reading ?? null}
        showSlotLabels={SHOW_DEBUG}
      />

      <div className="absolute inset-x-0 top-0 bottom-28 px-3 pt-[env(safe-area-inset-top)]">
        <Playfield enemies={game.enemies} explosions={explosions} nowMs={game.elapsedMs} />
      </div>

      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] left-4 text-3xl font-bold tabular-nums drop-shadow">
        {game.score}
      </div>

      <div className="absolute inset-x-0 bottom-0 flex h-28 items-center justify-center pb-[env(safe-area-inset-bottom)]">
        <span
          className={`text-7xl font-bold tabular-nums drop-shadow ${
            committed === null
              ? 'text-muted'
              : isPlaying && !game.armed
                ? 'text-accent/40'
                : 'text-accent'
          }`}
        >
          {committed === null ? '--' : toHex(committed)}
        </span>
      </div>

      {!isPlaying && !loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          {game.status === 'over' && (
            <div className="text-5xl font-bold drop-shadow">{game.score}</div>
          )}
          <div className="rounded-md border border-accent bg-panel/85 px-4 py-2 text-5xl font-bold text-accent">
            {toHex(START_VALUE)}
          </div>
          <div className="text-sm text-muted drop-shadow">hold to start</div>
        </div>
      )}

      {(error || loading) && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg/80 p-6 text-center text-sm">
          {error ?? (cameraStatus.kind === 'starting' ? 'Starting camera…' : 'Loading hand model…')}
        </div>
      )}

      {SHOW_DEBUG && (
        <aside className="absolute top-14 right-3 flex max-h-[calc(100%-10rem)] w-80 max-w-[calc(100%-1.5rem)] flex-col gap-3 overflow-y-auto rounded-xl bg-bg/85 p-3">
          <BitReadout
            bits={vision?.reading.bits ?? Array(8).fill(null)}
            raw={vision?.reading.byte ?? null}
            committed={committed}
          />
          <DebugPanel
            stats={vision?.stats ?? null}
            reading={vision?.reading ?? null}
            thresholds={thresholds}
            onThresholdsChange={setThresholds}
            holdMs={holdMs}
            onHoldMsChange={setHoldMs}
          />
        </aside>
      )}
    </main>
  );
}
