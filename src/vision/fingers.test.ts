import { describe, expect, it } from 'vitest';
import { DEFAULT_THRESHOLDS, fingerBend, isFingerRaised } from './fingers';
import { makeHand } from './testHands';

describe('fingerBend', () => {
  it('is near 0 for a straight finger and large for a curled one', () => {
    const hand = makeHand({ screenCenterX: 0.5, indexSide: 'left', lowered: ['ring'] });
    expect(fingerBend(hand.world, 'middle')).toBeLessThan(20);
    expect(fingerBend(hand.world, 'ring')).toBeGreaterThan(150);
  });

  it('is the same whichever way the palm faces', () => {
    const palm = makeHand({ screenCenterX: 0.5, indexSide: 'left', lowered: ['index'] });
    const back = makeHand({ screenCenterX: 0.5, indexSide: 'right', lowered: ['index'] });
    expect(fingerBend(back.world, 'index')).toBeCloseTo(fingerBend(palm.world, 'index'));
  });
});

describe('isFingerRaised', () => {
  const { extendBelow, curlAbove } = DEFAULT_THRESHOLDS;
  const between = (extendBelow + curlAbove) / 2;

  it('decides outright outside the hysteresis band', () => {
    expect(isFingerRaised(extendBelow - 1, false, DEFAULT_THRESHOLDS)).toBe(true);
    expect(isFingerRaised(curlAbove + 1, true, DEFAULT_THRESHOLDS)).toBe(false);
  });

  it('keeps the previous state inside the band', () => {
    expect(isFingerRaised(between, true, DEFAULT_THRESHOLDS)).toBe(true);
    expect(isFingerRaised(between, false, DEFAULT_THRESHOLDS)).toBe(false);
  });
});
