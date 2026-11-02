import type { BendThresholds } from '../vision/fingers';
import type { ByteReading } from '../vision/scan';
import type { TrackingStats } from '../vision/useFingerByte';

interface DebugPanelProps {
  stats: TrackingStats | null;
  reading: ByteReading | null;
  thresholds: BendThresholds;
  onThresholdsChange: (thresholds: BendThresholds) => void;
  holdMs: number;
  onHoldMsChange: (holdMs: number) => void;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}

function Slider({ label, value, min, max, unit, onChange }: SliderProps) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <span className="w-28 shrink-0 text-muted">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="min-w-0 flex-1 accent-accent"
      />
      <span className="w-14 text-right tabular-nums">
        {value}
        {unit}
      </span>
    </label>
  );
}

export function DebugPanel({
  stats,
  reading,
  thresholds,
  onThresholdsChange,
  holdMs,
  onHoldMsChange,
}: DebugPanelProps) {
  const slots = reading
    ? [reading.high, reading.low].flatMap((n) => n?.slots ?? [null, null, null, null])
    : [];

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-panel p-4">
      <div className="grid grid-cols-3 gap-2 text-sm">
        <Stat label="FPS" value={stats ? stats.fps.toFixed(0) : '–'} />
        <Stat label="Inference" value={stats ? `${stats.inferenceMs.toFixed(1)} ms` : '–'} />
        <Stat label="Delegate" value={stats?.delegate ?? '–'} />
      </div>

      <div>
        <div className="mb-1 text-xs text-muted uppercase">Bend per slot (°)</div>
        <div className="grid grid-cols-8 gap-1.5 text-center text-xs tabular-nums">
          {slots.map((slot, i) => (
            <div
              key={i}
              className={slot ? (slot.raised ? 'text-accent' : 'text-danger') : 'text-muted'}
            >
              <div>{slot ? slot.bend.toFixed(0) : '–'}</div>
              <div className="text-[10px] text-muted">{slot?.finger ?? ''}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Slider
          label="Raised below"
          value={thresholds.extendBelow}
          min={10}
          max={thresholds.curlAbove}
          unit="°"
          onChange={(extendBelow) => onThresholdsChange({ ...thresholds, extendBelow })}
        />
        <Slider
          label="Lowered above"
          value={thresholds.curlAbove}
          min={thresholds.extendBelow}
          max={220}
          unit="°"
          onChange={(curlAbove) => onThresholdsChange({ ...thresholds, curlAbove })}
        />
        <Slider
          label="Hold to commit"
          value={holdMs}
          min={0}
          max={500}
          unit="ms"
          onChange={onHoldMsChange}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted uppercase">{label}</div>
      <div className="tabular-nums">{value}</div>
    </div>
  );
}
