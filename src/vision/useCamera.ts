import { useEffect, useRef, useState } from 'react';

export type CameraStatus =
  { kind: 'starting' } | { kind: 'ready' } | { kind: 'error'; message: string };

function describeError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'Camera permission was denied. Allow camera access for this page and reload.';
  }
  if (error instanceof DOMException && error.name === 'NotFoundError') {
    return 'No camera was found.';
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return 'This browser does not expose the camera here. The page must be served over HTTPS or localhost.';
  }
  return error instanceof Error ? error.message : String(error);
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<CameraStatus>({ kind: 'starting' });

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        const video = videoRef.current;
        if (cancelled || !video) return;
        video.srcObject = stream;
        await video.play();
        if (!cancelled) setStatus({ kind: 'ready' });
      } catch (error) {
        if (!cancelled) setStatus({ kind: 'error', message: describeError(error) });
      }
    }

    start();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return { videoRef, status };
}
