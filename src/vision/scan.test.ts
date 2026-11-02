import { describe, expect, it } from 'vitest';
import { ByteReader, type HandObservation } from './scan';
import { makeHand } from './testHands';

function read(...hands: HandObservation[]) {
  return new ByteReader().read(hands);
}

// Mirrored selfie view: the player's right hand is on the right of the screen. With palms
// toward the camera each index finger points toward the middle; with palms away, outward.
const palmsIn = {
  left: { screenCenterX: 0.3, indexSide: 'right' },
  right: { screenCenterX: 0.7, indexSide: 'left' },
} as const;
const palmsOut = {
  left: { screenCenterX: 0.3, indexSide: 'left' },
  right: { screenCenterX: 0.7, indexSide: 'right' },
} as const;

describe('ByteReader', () => {
  it('reads all fingers up as 0xFF', () => {
    expect(read(makeHand(palmsIn.left), makeHand(palmsIn.right)).byte).toBe(0xff);
  });

  it('palms in with right index down equals palms out with right pinky down', () => {
    const a = read(makeHand(palmsIn.left), makeHand({ ...palmsIn.right, lowered: ['index'] }));
    const b = read(makeHand(palmsOut.left), makeHand({ ...palmsOut.right, lowered: ['pinky'] }));
    expect(a.byte).toBe(0b1111_0111);
    expect(b.byte).toBe(a.byte);
  });

  it('orders bits by screen position, not by finger name', () => {
    const reading = read(
      makeHand({ ...palmsOut.left, lowered: ['index'] }),
      makeHand({ ...palmsOut.right, lowered: ['index', 'middle'] }),
    );
    expect(reading.bits).toEqual([0, 1, 1, 1, 1, 1, 0, 0]);
    expect(reading.byte).toBe(0x7c);
  });

  it('does not depend on the order hands are detected in', () => {
    const left = makeHand({ ...palmsIn.left, lowered: ['middle'] });
    const right = makeHand(palmsIn.right);
    expect(read(right, left).byte).toBe(read(left, right).byte);
  });

  it('reports a lone hand as one nibble by which half of the frame it is in', () => {
    const lone = read(makeHand({ ...palmsIn.right, lowered: ['pinky'] }));
    expect(lone.high).toBeNull();
    expect(lone.low?.value).toBe(0b1110);
    expect(lone.bits).toEqual([null, null, null, null, 1, 1, 1, 0]);
    expect(lone.byte).toBeNull();
  });

  it('reads no hands as all unknown', () => {
    expect(read().bits).toEqual(Array(8).fill(null));
  });
});
