export interface Point3 {
  x: number;
  y: number;
  z: number;
}

export type FingerName = 'index' | 'middle' | 'ring' | 'pinky';

export const WRIST = 0;

/** MediaPipe hand landmark indices for each finger's MCP, PIP, DIP and tip. Thumbs are unused. */
export const FINGER_JOINTS: Record<FingerName, readonly [number, number, number, number]> = {
  index: [5, 6, 7, 8],
  middle: [9, 10, 11, 12],
  ring: [13, 14, 15, 16],
  pinky: [17, 18, 19, 20],
};

export const FINGERS_INDEX_TO_PINKY: readonly FingerName[] = ['index', 'middle', 'ring', 'pinky'];

export interface BendThresholds {
  /** A finger whose total bend drops below this many degrees counts as raised. */
  extendBelow: number;
  /** A finger whose total bend rises above this many degrees counts as lowered. */
  curlAbove: number;
}

export const DEFAULT_THRESHOLDS: BendThresholds = { extendBelow: 90, curlAbove: 100 };

function sub(a: Point3, b: Point3): Point3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function angleBetweenDegrees(u: Point3, v: Point3): number {
  const dot = u.x * v.x + u.y * v.y + u.z * v.z;
  const lengths = Math.hypot(u.x, u.y, u.z) * Math.hypot(v.x, v.y, v.z);
  if (lengths === 0) return 0;
  const cos = Math.min(1, Math.max(-1, dot / lengths));
  return (Math.acos(cos) * 180) / Math.PI;
}

/**
 * Total bend of a finger in degrees: the sum of the turns at its MCP, PIP and DIP joints.
 * 0 is perfectly straight; a finger curled into the palm is around 180+. Joint angles don't
 * change with hand orientation, so palm-facing and back-facing hands read the same.
 */
export function fingerBend(world: readonly Point3[], finger: FingerName): number {
  const [mcp, pip, dip, tip] = FINGER_JOINTS[finger].map((i) => world[i]!) as [
    Point3,
    Point3,
    Point3,
    Point3,
  ];
  const wrist = world[WRIST]!;
  const segments = [sub(mcp, wrist), sub(pip, mcp), sub(dip, pip), sub(tip, dip)];
  let total = 0;
  for (let i = 1; i < segments.length; i++) {
    total += angleBetweenDegrees(segments[i - 1]!, segments[i]!);
  }
  return total;
}

/**
 * Raised/lowered with hysteresis: inside the band between the thresholds the finger keeps
 * its previous state, so a finger hovering near one threshold doesn't flicker.
 */
export function isFingerRaised(
  bend: number,
  wasRaised: boolean | undefined,
  thresholds: BendThresholds,
): boolean {
  if (bend < thresholds.extendBelow) return true;
  if (bend > thresholds.curlAbove) return false;
  return wasRaised ?? bend < (thresholds.extendBelow + thresholds.curlAbove) / 2;
}
