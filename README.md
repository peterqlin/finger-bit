# Finger Bit

Read a byte from your hands through the camera. Hold up index through pinky on both hands; the eight fingers are scanned left to right on screen as bits 7→0, whichever way your palms face. Thumbs are ignored. Each hand is one hex digit.

Runs entirely in the browser with MediaPipe Hand Landmarker; no backend.

```sh
npm install
npm run dev        # local dev server (camera works on localhost)
npx vitest         # tests in watch mode
npm run lint
npm run build      # static output in dist/
```
