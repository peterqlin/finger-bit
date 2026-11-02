import type { Bit } from '../vision/scan';

interface BitReadoutProps {
  bits: (Bit | null)[];
  raw: number | null;
  committed: number | null;
}

function hex(byte: number | null): string {
  return byte === null ? '??' : byte.toString(16).toUpperCase().padStart(2, '0');
}

export function BitReadout({ bits, raw, committed }: BitReadoutProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs text-muted uppercase">Committed</div>
          <div className="text-6xl font-bold text-accent tabular-nums" data-testid="committed">
            {hex(committed)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted uppercase">Live</div>
          <div className="text-2xl tabular-nums">{hex(raw)}</div>
        </div>
      </div>
      <div className="grid grid-cols-8 gap-1.5">
        {bits.map((bit, i) => (
          <div
            key={i}
            className={`flex min-h-14 flex-col items-center justify-center rounded-lg border ${
              bit === 1 ? 'border-accent bg-accent/20' : 'border-line bg-panel'
            } ${i === 3 ? 'mr-1.5' : ''}`}
          >
            <span className={`text-2xl font-bold ${bit === null ? 'text-muted' : ''}`}>
              {bit ?? '?'}
            </span>
            <span className="text-[10px] text-muted">b{7 - i}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
