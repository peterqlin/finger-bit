import { FINGER_JOINTS, FINGERS_INDEX_TO_PINKY, type FingerName, type Point3 } from './fingers';
import type { HandObservation } from './scan';

interface HandSpec {
  screenCenterX: number;
  /** Which side of the hand the index finger is on, as seen on screen. */
  indexSide: 'left' | 'right';
  lowered?: readonly FingerName[];
}

const LATERAL: Record<FingerName, number> = {
  index: 0.03,
  middle: 0.01,
  ring: -0.01,
  pinky: -0.03,
};
const IMAGE_SCALE = 3;

/**
 * A synthetic hand with fingers pointing up. Flipping `indexSide` is the same hand turned
 * 180° about its vertical axis, so the palm faces the other way.
 */
export function makeHand({ screenCenterX, indexSide, lowered = [] }: HandSpec): HandObservation {
  const side = indexSide === 'right' ? 1 : -1;
  const world: Point3[] = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
  for (const finger of FINGERS_INDEX_TO_PINKY) {
    const [mcpI, pipI, dipI, tipI] = FINGER_JOINTS[finger];
    const mcp = { x: LATERAL[finger] * side, y: -0.08, z: 0 };
    const pip = { ...mcp, y: mcp.y - 0.04 };
    const curled = lowered.includes(finger);
    const dip = curled ? { ...pip, z: 0.025 * side } : { ...pip, y: pip.y - 0.025 };
    const tip = curled ? { ...dip, y: dip.y + 0.02 } : { ...dip, y: dip.y - 0.02 };
    world[mcpI] = mcp;
    world[pipI] = pip;
    world[dipI] = dip;
    world[tipI] = tip;
  }
  const image = world.map((p) => ({
    x: 1 - (screenCenterX + p.x * IMAGE_SCALE),
    y: 0.7 + p.y * IMAGE_SCALE,
    z: 0,
  }));
  return { image, world };
}
