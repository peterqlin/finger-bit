import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

// Must match the exact @mediapipe/tasks-vision version in package.json: the JS API and the
// WASM runtime it loads are released together.
const MEDIAPIPE_VERSION = '1.2.0';
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export type Delegate = 'GPU' | 'CPU';

export interface LoadedLandmarker {
  landmarker: HandLandmarker;
  delegate: Delegate;
}

async function create(): Promise<LoadedLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
  const createWith = (delegate: Delegate) =>
    HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: 'VIDEO',
      numHands: 2,
    });
  try {
    return { landmarker: await createWith('GPU'), delegate: 'GPU' };
  } catch {
    return { landmarker: await createWith('CPU'), delegate: 'CPU' };
  }
}

let loading: Promise<LoadedLandmarker> | null = null;

/** Loads the model once per page; later callers share the same instance. */
export function loadLandmarker(): Promise<LoadedLandmarker> {
  loading ??= create().catch((error: unknown) => {
    loading = null;
    throw error;
  });
  return loading;
}
