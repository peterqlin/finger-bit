import {
  DEFAULT_THRESHOLDS,
  FINGER_JOINTS,
  FINGERS_INDEX_TO_PINKY,
  fingerBend,
  isFingerRaised,
  type BendThresholds,
  type FingerName,
  type Point3,
} from './fingers';

/** One detected hand. `image` is normalized to the raw (unmirrored) camera frame; `world` is metric 3D. */
export interface HandObservation {
  image: readonly Point3[];
  world: readonly Point3[];
}

export type Nibble = 'high' | 'low';
export type Bit = 0 | 1;

export interface FingerSlot {
  finger: FingerName;
  raised: boolean;
  bend: number;
  /** Knuckle position in the mirrored view the player sees, normalized 0–1. */
  knuckle: { x: number; y: number };
}

export interface NibbleReading {
  hand: HandObservation;
  /** Fingers ordered left to right on screen; the first is the nibble's most significant bit. */
  slots: FingerSlot[];
  value: number;
}

export interface ByteReading {
  high: NibbleReading | null;
  low: NibbleReading | null;
  /** MSB first, as read left to right on screen. `null` where that hand isn't visible. */
  bits: (Bit | null)[];
  /** Only set when both hands are visible. */
  byte: number | null;
}

export function toScreenX(imageX: number): number {
  return 1 - imageX;
}

function knuckleScreenX(hand: HandObservation, finger: FingerName): number {
  return toScreenX(hand.image[FINGER_JOINTS[finger][0]]!.x);
}

function handScreenX(hand: HandObservation): number {
  const xs = FINGERS_INDEX_TO_PINKY.map((finger) => knuckleScreenX(hand, finger));
  return xs.reduce((sum, x) => sum + x, 0) / xs.length;
}

/**
 * Left-to-right finger order on screen. Decided once per hand from the outer knuckles,
 * which are far enough apart to stay stable when the middle ones jitter.
 */
export function fingersLeftToRight(hand: HandObservation): readonly FingerName[] {
  const indexIsLeft = knuckleScreenX(hand, 'index') < knuckleScreenX(hand, 'pinky');
  return indexIsLeft ? FINGERS_INDEX_TO_PINKY : [...FINGERS_INDEX_TO_PINKY].reverse();
}

/** The left hand on screen is the high nibble. A lone hand goes by which half of the frame it's in. */
export function assignNibbles(
  hands: readonly HandObservation[],
): Record<Nibble, HandObservation | null> {
  const sorted = [...hands].sort((a, b) => handScreenX(a) - handScreenX(b));
  if (sorted.length >= 2) return { high: sorted[0]!, low: sorted[1]! };
  const only = sorted[0];
  if (!only) return { high: null, low: null };
  return handScreenX(only) < 0.5 ? { high: only, low: null } : { high: null, low: only };
}

/** Reads a byte from hand observations, remembering each finger's state between frames for hysteresis. */
export class ByteReader {
  thresholds: BendThresholds;
  private raised = new Map<string, boolean>();

  constructor(thresholds: BendThresholds = DEFAULT_THRESHOLDS) {
    this.thresholds = thresholds;
  }

  read(hands: readonly HandObservation[]): ByteReading {
    const assigned = assignNibbles(hands);
    const high = this.readNibble('high', assigned.high);
    const low = this.readNibble('low', assigned.low);
    const bits = [high, low].flatMap((nibble) =>
      nibble ? nibble.slots.map((slot): Bit => (slot.raised ? 1 : 0)) : [null, null, null, null],
    );
    const byte = high && low ? (high.value << 4) | low.value : null;
    return { high, low, bits, byte };
  }

  private readNibble(nibble: Nibble, hand: HandObservation | null): NibbleReading | null {
    if (!hand) {
      for (const finger of FINGERS_INDEX_TO_PINKY) this.raised.delete(`${nibble}:${finger}`);
      return null;
    }
    const slots = fingersLeftToRight(hand).map((finger): FingerSlot => {
      const key = `${nibble}:${finger}`;
      const bend = fingerBend(hand.world, finger);
      const raised = isFingerRaised(bend, this.raised.get(key), this.thresholds);
      this.raised.set(key, raised);
      const mcp = hand.image[FINGER_JOINTS[finger][0]]!;
      return { finger, raised, bend, knuckle: { x: toScreenX(mcp.x), y: mcp.y } };
    });
    const value = slots.reduce((acc, slot) => (acc << 1) | (slot.raised ? 1 : 0), 0);
    return { hand, slots, value };
  }
}
