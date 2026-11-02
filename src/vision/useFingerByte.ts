import { useEffect, useRef, useState, type RefObject } from 'react';
import type { BendThresholds } from './fingers';
import { loadLandmarker, type Delegate } from './landmarker';
import { ByteReader, type ByteReading, type HandObservation } from './scan';
import { StabilityGate } from './stability';

export interface TrackingStats {
  fps: number;
  inferenceMs: number;
  delegate: Delegate;
}

export interface FingerByteState {
  reading: ByteReading;
  /** The byte once it has held steady for the hold time; what the game acts on. */
  committed: number | null;
  stats: TrackingStats;
}

export type ModelStatus =
  { kind: 'loading' } | { kind: 'ready' } | { kind: 'error'; message: string };

interface Options {
  thresholds: BendThresholds;
  holdMs: number;
}

const SMOOTHING = 0.1;

/** Runs hand tracking on every new camera frame and decodes the finger byte. */
export function useFingerByte(
  videoRef: RefObject<HTMLVideoElement | null>,
  cameraReady: boolean,
  { thresholds, holdMs }: Options,
) {
  const [modelStatus, setModelStatus] = useState<ModelStatus>({ kind: 'loading' });
  const [state, setState] = useState<FingerByteState | null>(null);
  const reader = useRef(new ByteReader(thresholds));
  const gate = useRef(new StabilityGate<number | null>(holdMs));

  useEffect(() => {
    reader.current.thresholds = thresholds;
    gate.current.holdMs = holdMs;
  }, [thresholds, holdMs]);

  useEffect(() => {
    const video = videoRef.current;
    if (!cameraReady || !video) return;
    let stopped = false;
    let lastFrameAt = 0;
    let fps = 0;
    let inferenceMs = 0;

    const scheduleNext = (step: () => void) => {
      if ('requestVideoFrameCallback' in video) video.requestVideoFrameCallback(step);
      else requestAnimationFrame(step);
    };

    loadLandmarker().then(
      ({ landmarker, delegate }) => {
        if (stopped) return;
        setModelStatus({ kind: 'ready' });
        const step = () => {
          if (stopped) return;
          const now = performance.now();
          const result = landmarker.detectForVideo(video, now);
          const elapsed = performance.now() - now;
          inferenceMs = inferenceMs ? inferenceMs + (elapsed - inferenceMs) * SMOOTHING : elapsed;
          if (lastFrameAt) {
            const instant = 1000 / (now - lastFrameAt);
            fps = fps ? fps + (instant - fps) * SMOOTHING : instant;
          }
          lastFrameAt = now;

          const hands: HandObservation[] = result.landmarks.map((image, i) => ({
            image,
            world: result.worldLandmarks[i]!,
          }));
          const reading = reader.current.read(hands);
          const committed = gate.current.push(reading.byte, now);
          setState({ reading, committed, stats: { fps, inferenceMs, delegate } });
          scheduleNext(step);
        };
        scheduleNext(step);
      },
      (error: unknown) => {
        if (!stopped) {
          setModelStatus({
            kind: 'error',
            message: `Could not load the hand model: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      },
    );

    return () => {
      stopped = true;
    };
  }, [videoRef, cameraReady]);

  return { modelStatus, state };
}
