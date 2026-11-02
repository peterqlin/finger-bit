/** Commits a value once it has held unchanged for `holdMs`; until then the last committed value stands. */
export class StabilityGate<T> {
  holdMs: number;
  private candidate: T | undefined;
  private candidateSince = 0;
  private committed: T | null = null;

  constructor(holdMs: number) {
    this.holdMs = holdMs;
  }

  push(value: T, timeMs: number): T | null {
    if (value !== this.candidate) {
      this.candidate = value;
      this.candidateSince = timeMs;
    }
    if (timeMs - this.candidateSince >= this.holdMs) this.committed = value;
    return this.committed;
  }
}
