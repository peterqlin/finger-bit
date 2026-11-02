import { HandLandmarker } from '@mediapipe/tasks-vision';
import { useEffect, useRef, useState, type RefObject, type SyntheticEvent } from 'react';
import { FINGER_JOINTS } from '../vision/fingers';
import { toScreenX, type ByteReading, type NibbleReading } from '../vision/scan';

interface CameraViewProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  reading: ByteReading | null;
  showSlotLabels: boolean;
}

interface VideoSize {
  width: number;
  height: number;
}

/** Maps a normalized point in the mirrored video to canvas pixels under `object-fit: cover`. */
type Project = (screenX: number, y: number) => readonly [number, number];

const COLORS = { skeleton: '#7d8a99', raised: '#4ade80', lowered: '#f87171', label: '#d6e2ee' };

function coverProjection(video: VideoSize, width: number, height: number): Project {
  const scale = Math.max(width / video.width, height / video.height);
  const drawnWidth = video.width * scale;
  const drawnHeight = video.height * scale;
  const offsetX = (width - drawnWidth) / 2;
  const offsetY = (height - drawnHeight) / 2;
  return (screenX, y) => [offsetX + screenX * drawnWidth, offsetY + y * drawnHeight];
}

function drawNibble(
  ctx: CanvasRenderingContext2D,
  nibble: NibbleReading,
  firstBit: number,
  project: Project,
  showSlotLabels: boolean,
) {
  const point = (i: number) => {
    const p = nibble.hand.image[i]!;
    return project(toScreenX(p.x), p.y);
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

    if (showSlotLabels) {
      ctx.fillStyle = COLORS.label;
      ctx.font = 'bold 14px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`b${firstBit - i}`, x, y + 22);
    }
  });
}

/** The mirrored camera feed filling its container, with each finger's state drawn over it. */
export function CameraView({ videoRef, reading, showSlotLabels }: CameraViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoSize, setVideoSize] = useState<VideoSize | null>(null);
  const trackVideoSize = (event: SyntheticEvent<HTMLVideoElement>) => {
    const { videoWidth, videoHeight } = event.currentTarget;
    if (videoWidth && videoHeight) setVideoSize({ width: videoWidth, height: videoHeight });
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
    if (!videoSize) return;
    const project = coverProjection(videoSize, width, height);
    if (reading?.high) drawNibble(ctx, reading.high, 7, project, showSlotLabels);
    if (reading?.low) drawNibble(ctx, reading.low, 3, project, showSlotLabels);
  }, [reading, videoSize, showSlotLabels]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-bg">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full -scale-x-100 object-cover opacity-70"
        playsInline
        muted
        onLoadedMetadata={trackVideoSize}
        onResize={trackVideoSize}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
