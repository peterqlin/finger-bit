import { describe, expect, it } from 'vitest';
import { StabilityGate } from './stability';

describe('StabilityGate', () => {
  it('commits a value only after it has held for the hold time', () => {
    const gate = new StabilityGate<number>(100);
    expect(gate.push(5, 0)).toBeNull();
    expect(gate.push(5, 50)).toBeNull();
    expect(gate.push(5, 100)).toBe(5);
  });

  it('keeps the last committed value while a new one is settling', () => {
    const gate = new StabilityGate<number>(100);
    gate.push(5, 0);
    gate.push(5, 100);
    expect(gate.push(9, 120)).toBe(5);
    expect(gate.push(9, 220)).toBe(9);
  });

  it('restarts the timer when the value flickers', () => {
    const gate = new StabilityGate<number>(100);
    gate.push(1, 0);
    gate.push(2, 60);
    expect(gate.push(1, 110)).toBeNull();
    expect(gate.push(1, 210)).toBe(1);
  });
});
