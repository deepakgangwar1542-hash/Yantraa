# CircuitLab — run doc

Next.js 16 (App Router) + React 19 + pnpm project. Not a git repo.

## Reproduce the uncommitted artifacts

1. Install dependencies (pnpm):
   ```
   pnpm install
   ```
   (On Windows without corepack: `node node_modules/corepack/dist/pnpm.cjs install`, or use npm — the lockfile is `pnpm-lock.yaml`.)

2. Local MediaPipe assets in `public/mediapipe/` (served offline, no CDN):
   - `public/mediapipe/wasm/*` — copy from `node_modules/@mediapipe/tasks-vision/wasm/` (the four `vision_wasm*` files).
   - `public/mediapipe/models/hand_landmarker.task` — the MediaPipe Hands landmarker model (~7.4 MB), downloadable from `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`.

3. No `.env` files needed — the app runs with defaults (the AI chat gateway requires an API key at runtime; the rest of the app — 3D Lab, Library, hand control — works fully offline).

## Run the dev server

Next 16 dev server on port 3000 (Next auto-picks another port if 3000 is taken):

```
pnpm dev
```

Equivalent direct invocation used by this thread's preview (avoids pnpm shim issues on Windows):

```
node node_modules/next/dist/bin/next dev
```

Detached start (Windows):

```
powershell -NoProfile -Command "(Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -RedirectStandardOutput '.freebuff/preview-<id>.log' -RedirectStandardError '.freebuff/preview-<id>.log.err' -WindowStyle Hidden -PassThru).Id"
```

Verify it answers: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` → 200. The first request triggers a compile and may take ~10–20 s.
