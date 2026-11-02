import { HandLandmarker } from '@mediapipe/tasks-vision';
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
  type SyntheticEvent,
} from 'react';
import { FINGER_JOINTS } from '../vision/fingers';
import { toScreenX, type ByteReading, type NibbleReading } from '../vision/scan';

interface CameraViewProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  reading: ByteReading | null;
  children?: ReactNode;
}

const COLORS = { skeleton: '#7d8a99', raised: '#4ade80', lowered: '#f87171', label: '#d6e2ee' };

function drawNibble(
  ctx: CanvasRenderingContext2D,
  nibble: NibbleReading,
  firstBit: number,
  width: number,
  height: number,
) {
  const point = (i: number) => {
    const p = nibble.hand.image[i]!;
    return [toScreenX(p.x) * width, p.y * height] as const;
  };

  ctx.lineWidth = 2;
  ctx.strokeStyle = COLORS.skeleton;
  for (const { start, end } of HandLandmarker.HAND_CONNECTIONS) {
    ctx.beginPath();
    ctx.moveTo(...point(start));
    ctx.lineTo(...point(end));
    ctx.stroke();
  }

  nibble.slots.forEach((slot, i) => {
    const color = slot.raised ? COLORS.raised : COLORS.lowered;
    const joints = FINGER_JOINTS[slot.finger];
    ctx.lineWidth = 5;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(...point(joints[0]));
    for (const joint of joints.slice(1)) ctx.lineTo(...point(joint));
    ctx.stroke();

    const [x, y] = point(joints[0]);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.label;
    ctx.font = 'bold 14px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`b${firstBit - i}`, x, y + 22);
  });
}

/** The mirrored camera feed with each finger's slot and state drawn over it. */
export function CameraView({ videoRef, reading, children }: CameraViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [aspectRatio, setAspectRatio] = useState(4 / 3);
  const matchVideoAspect = (event: SyntheticEvent<HTMLVideoElement>) => {
    const { videoWidth, videoHeight } = event.currentTarget;
    if (videoWidth && videoHeight) setAspectRatio(videoWidth / videoHeight);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (reading?.high) drawNibble(ctx, reading.high, 7, width, height);
    if (reading?.low) drawNibble(ctx, reading.low, 3, width, height);
  }, [reading, aspectRatio]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-line bg-panel"
      style={{ aspectRatio }}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full -scale-x-100 object-cover"
        playsInline
        muted
        onLoadedMetadata={matchVideoAspect}
        onResize={matchVideoAspect}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {children}
    </div>
  );
}
