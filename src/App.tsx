import { useState } from 'react';
import { BitReadout } from './ui/BitReadout';
import { CameraView } from './ui/CameraView';
import { DebugPanel } from './ui/DebugPanel';
import { DEFAULT_THRESHOLDS } from './vision/fingers';
import { useCamera } from './vision/useCamera';
import { useFingerByte } from './vision/useFingerByte';

const DEFAULT_HOLD_MS = 100;

export function App() {
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [holdMs, setHoldMs] = useState(DEFAULT_HOLD_MS);
  const { videoRef, status: cameraStatus } = useCamera();
  const { modelStatus, state } = useFingerByte(videoRef, cameraStatus.kind === 'ready', {
    thresholds,
    holdMs,
  });

  const error =
    cameraStatus.kind === 'error'
      ? cameraStatus.message
      : modelStatus.kind === 'error'
        ? modelStatus.message
        : null;
  const loading = !error && (cameraStatus.kind === 'starting' || modelStatus.kind === 'loading');

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold">Finger Bit</h1>
        <p className="text-sm text-muted">
          Hold up index–pinky on both hands. Fingers read left to right on screen as bits 7→0.
        </p>
      </header>

      <CameraView videoRef={videoRef} reading={state?.reading ?? null}>
        {(error || loading) && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg/80 p-6 text-center text-sm">
            {error ??
              (cameraStatus.kind === 'starting' ? 'Starting camera…' : 'Loading hand model…')}
          </div>
        )}
      </CameraView>

      <BitReadout
        bits={state?.reading.bits ?? Array(8).fill(null)}
        raw={state?.reading.byte ?? null}
        committed={state?.committed ?? null}
      />

      <DebugPanel
        stats={state?.stats ?? null}
        reading={state?.reading ?? null}
        thresholds={thresholds}
        onThresholdsChange={setThresholds}
        holdMs={holdMs}
        onHoldMsChange={setHoldMs}
      />
    </main>
  );
}
