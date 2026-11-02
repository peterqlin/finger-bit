# Finger Bit

Read a byte from your hands through the camera. Hold up index through pinky on both hands; the eight fingers are scanned left to right on screen as bits 7→0, whichever way your palms face. Thumbs are ignored. Each hand is one hex digit.

Enemies fall carrying hex bytes; hold up the matching fingers to destroy them before they reach the bottom. Hold `FF` (every finger up) to start. Add `?debug` to the URL for live bend angles and threshold sliders.

Runs entirely in the browser with MediaPipe Hand Landmarker; no backend.

```sh
npm install
npm run dev        # local dev server (camera works on localhost)
npx vitest         # tests in watch mode
npm run lint
npm run build      # static output in dist/
```
