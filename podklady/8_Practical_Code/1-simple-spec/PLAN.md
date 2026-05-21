# Imagineer — MVP Demo Plan

## Context

Imagineer is an on-demand custom 3D printing service: a user describes an object in text or uploads a reference image, the platform generates a 3D model with AI, the user previews it in the browser and downloads the STL/GLB. End-state production scope includes payments, fulfillment, print-readiness checks, and accounts — but **this build targets only the digital MVP demo**: input → AI generation → browser preview → file download. The working directory is empty (greenfield).

User-fixed decisions (not revisited):
- **Stack**: FastAPI (Python) + React + Vite + three.js
- **AI**: self-hosted open-source (TRELLIS or Hunyuan3D)
- **Scope**: digital flow only — no payments, no fulfillment, no auth, no print-readiness checks

## Model Choice

**Hunyuan3D 2.0 (Tencent) — specifically `Hunyuan3D-2mini`.**

The GOAL requires both text-to-3D and image-to-3D. Hunyuan3D 2.0 ships both pipelines from a single repo and weight bundle. TRELLIS is image-only and would force a text-to-image preprocessing step (SD/Flux) — two model loads, two failure modes, lossy intermediate. Strictly worse for this use case.

`Hunyuan3D-2mini` fits on 12–16 GB VRAM and generates in ~30–60s. Full `Hunyuan3D-2` needs ~24 GB and is slower — not worth it for a demo.

## Architecture (end-to-end flow)

```
Browser (React + Vite, :5173)
  │  user picks TEXT or IMAGE → submits prompt or uploads PNG/JPG
  ▼
POST /generate (multipart) → FastAPI (:8000)
  │  validate, mint job_id (uuid4), persist upload to data/uploads/{id}.png,
  │  insert {id, mode, status:"queued", ...} into module-level JOBS dict,
  │  asyncio.create_task(run_job(id)) → return 202 {job_id, status}
  ▼
Background asyncio task
  │  status→"running"; await asyncio.to_thread(pipeline.generate_*, ...)
  │  serialized via a single asyncio.Lock so concurrent requests don't OOM the GPU
  │  pipeline returns trimesh.Trimesh; export both:
  │    - data/models/{id}.glb   (preview)
  │    - data/models/{id}.stl   (print/download)
  │  status→"done"  (on exception → "error" with message)
  ▼
Browser polls GET /jobs/{id} (1.5s, backs off to 5s, pauses on tab hidden)
  │  when status=="done", load /models/{id}.glb in R3F viewer
  ▼
Download buttons → GET /models/{id}.glb / .stl  (FileResponse)
```

The Hunyuan3D pipeline lives **in the FastAPI process** as a module-level singleton behind an `asyncio.Lock`. A separate worker buys nothing on a single GPU (can't parallelize anyway, and would either double the model load or require IPC). The seam to extract later is `app/pipeline.py::generate(...)`.

## Backend Design (FastAPI)

### Endpoints

```
POST /generate         multipart/form-data: mode("text"|"image"), prompt?, image?
                       → 202 {job_id, status:"queued"}

GET  /jobs/{job_id}    → {job_id, status, mode, prompt, created_at, started_at,
                          finished_at, progress, glb_url, stl_url, error}

GET  /models/{id}.{ext}  ext ∈ {glb, stl}
                       → FileResponse, Cache-Control: public, max-age=3600

GET  /healthz          → {ok, model_loaded, gpu}
```

### Async pattern — chosen approach

`asyncio.create_task` + module-level `JOBS: dict[str, Job]` + a single `asyncio.Lock`.

Rejected alternatives:
- **FastAPI BackgroundTasks** — tied to request lifecycle, no introspection, can't be polled. Wrong tool.
- **Celery / RQ + Redis** — adds broker + worker process for zero benefit on a single-machine single-GPU demo. Worker would need to load the 5–8 GB model separately or build IPC. Pure overhead.

Critical: Hunyuan3D inference is synchronous PyTorch. Wrap it as `await asyncio.to_thread(run_pipeline, ...)` inside `async with gpu_lock:` so the event loop stays responsive for `/jobs/{id}` polling during generation.

### Storage

```
backend/data/
  uploads/   # {job_id}.{png|jpg}    — created at startup, gitignored
  models/    # {job_id}.glb, {job_id}.stl
```

No DB. JOBS dict is in-memory, lost on restart (artifacts on disk become orphans — acceptable for demo, document it).

### GLB → STL

`trimesh` handles it natively. After the pipeline returns a `trimesh.Trimesh`:

```python
mesh.export(glb_path, file_type="glb")   # preview, with materials/UVs
mesh.export(stl_path, file_type="stl")   # print, materials dropped (correct)
```

No remeshing or repair (print-readiness is explicitly out of scope).

### Backend layout

```
backend/
  app/
    main.py              # FastAPI app, CORS, route mounting, startup paths
    routes/
      generate.py        # POST /generate
      jobs.py            # GET /jobs/{id}
      models.py          # GET /models/{id}.{ext}
      health.py          # GET /healthz
    jobs.py              # Job dataclass, JOBS dict, gpu_lock, run_job()
    pipeline.py          # Hunyuan3D singleton: generate_text(), generate_image()
    storage.py           # path helpers
    config.py            # pydantic-settings: DATA_DIR, MODEL_NAME, DEVICE, CORS_ORIGINS
  data/{uploads,models}/.gitkeep
  pyproject.toml
  README.md
```

Deps: `fastapi`, `uvicorn[standard]`, `python-multipart`, `pydantic-settings`, `trimesh`, `torch` (CUDA build), plus Hunyuan3D's `requirements.txt` (`diffusers`, `transformers`, `accelerate`, `xatlas`, `pymeshlab`, `Pillow`).

## Frontend Design (React + Vite + TS)

### Component tree

```
src/
  App.tsx                      # layout, owns jobId state
  components/
    GenerateForm.tsx           # mode toggle, textarea, file dropzone, submit
    JobStatus.tsx              # status badge + progress + error display
    ModelViewer.tsx            # R3F Canvas + Stage + OrbitControls + GLBModel
    GLBModel.tsx               # useGLTF(url) inner component
    DownloadButtons.tsx        # GLB + STL links
  hooks/
    useGenerateJob.ts          # POST /generate
    useJobPolling.ts           # polls GET /jobs/{id} with backoff
  lib/
    api.ts                     # fetch wrappers, base URL via proxy
    types.ts                   # Job, JobStatus, GenerateRequest
  main.tsx
```

State: `useState<string|null>(jobId)` in `App.tsx`. That's it. No Redux/Zustand/Jotai. No TanStack Query.

### 3D viewer recipe (canonical)

```tsx
<Canvas camera={{ position: [0, 0, 3], fov: 50 }} dpr={[1, 2]}>
  <Suspense fallback={null}>
    <Stage environment="city" intensity={0.6}>
      <GLBModel url={glbUrl} />
    </Stage>
    <OrbitControls makeDefault />
  </Suspense>
</Canvas>

function GLBModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}
```

Plus `<Loader />` from drei outside the Canvas. Don't preload (URL is dynamic).

Deps: `three`, `@react-three/fiber`, `@react-three/drei`. Dev: `vite`, `@vitejs/plugin-react`, `typescript`, `@types/three`.

### Polling strategy

`useJobPolling(jobId)`:
- `setTimeout` recursion (not `setInterval`) so interval can grow and ticks don't overlap.
- Start at **1500ms**, back off to **3000ms** then **5000ms** if status doesn't change.
- Stop on `done` or `error`.
- Cleanup on unmount with a `cancelled` ref so resolving fetches don't reschedule.
- Pause when `document.visibilityState === "hidden"` (visibilitychange listener).

No websockets/SSE for the demo.

### Vite dev proxy (avoids CORS)

```ts
// vite.config.ts
server: {
  proxy: {
    '/generate': 'http://localhost:8000',
    '/jobs':     'http://localhost:8000',
    '/models':   'http://localhost:8000',
    '/healthz':  'http://localhost:8000',
  }
}
```

Also configure FastAPI `CORSMiddleware` with `allow_origins=["http://localhost:5173"]` as a fallback.

## Repo Layout

```
8_Practical_Code/1/
  backend/      (see backend layout above)
  frontend/     (see component tree above)
  .gitignore    # backend/data/uploads/*, backend/data/models/*, node_modules,
                # __pycache__, .venv, HF cache dirs
  README.md     # top-level run instructions
```

No Docker for MVP — Hunyuan3D + CUDA in Docker is a driver/runtime trap that eats a day. Native venv + native Node.

## Implementation Order

Each milestone is a working checkpoint. Don't skip ahead — every step de-risks the next.

1. **M1 — Skeletons.** Scaffold `backend/` (FastAPI hello world at `/healthz`) and `frontend/` (Vite + React + TS). Wire the Vite proxy. Confirm `:5173/healthz` returns JSON.
2. **M2 — Fake generate with real job lifecycle.** Implement `POST /generate`, `GET /jobs/{id}`, `GET /models/{id}.{ext}`, the JOBS dict, and `asyncio.create_task` running a stub that `await asyncio.sleep(5)` then copies a hand-placed `data/models/sample.glb` to `data/models/{id}.glb` (and `.stl`). Proves the full status/polling/download path with no GPU risk.
3. **M3 — Frontend wired to fake backend.** Build `GenerateForm` (text only first), `useGenerateJob`, `useJobPolling`, `JobStatus`, `DownloadButtons`. Submit → queued → running → done → downloads work. Still no 3D viewer.
4. **M4 — 3D viewer.** Add `ModelViewer` with R3F + drei `<Stage>` + `useGLTF` + `OrbitControls`. Render the sample GLB. Find and fix scale/framing issues now (use drei `<Bounds fit clip>` if needed) — before the AI is in the loop.
5. **M5 — Hunyuan3D integration, text mode.** Set up the GPU env (see below). Install Hunyuan3D 2.0. Build `pipeline.py` with the singleton loader and `generate_text(prompt) -> trimesh.Trimesh`. Replace M2 stub with `await asyncio.to_thread(...)` inside `async with gpu_lock`. Export GLB + STL via trimesh.
6. **M6 — Image upload mode.** Add file input + mode toggle to `GenerateForm`. Multipart upload. Backend saves to `data/uploads/`, branches to `pipeline.generate_image(image_path)`. Test first with a clean white-background reference.
7. **M7 — Polish.** Visibility-aware polling backoff. Drei `<Loader />`. Error display in `JobStatus`. Top-level README. Optional: small examples gallery.

## Critical Files

- `backend/app/pipeline.py` — Hunyuan3D singleton + generate functions
- `backend/app/jobs.py` — Job dataclass, JOBS dict, gpu_lock, run_job()
- `backend/app/main.py` — FastAPI app, CORS, route registration
- `backend/app/routes/generate.py` — `POST /generate`
- `frontend/src/components/ModelViewer.tsx` — R3F viewer
- `frontend/src/hooks/useJobPolling.ts` — polling hook with backoff
- `frontend/vite.config.ts` — dev proxy config

## GPU / Model Setup

Linux (or WSL2) + NVIDIA GPU + driver supporting CUDA 12.1+ + **≥12 GB VRAM** for `Hunyuan3D-2mini` (16 GB comfortable). Install matching torch:

```
pip install torch --index-url https://download.pytorch.org/whl/cu121
```

Clone `https://github.com/Tencent/Hunyuan3D-2`, install its `requirements.txt`, follow its README for compiled CUDA extensions. Weights auto-download from HF on first use (`tencent/Hunyuan3D-2mini`, ~5–8 GB, cached at `~/.cache/huggingface/hub/`). **Pre-download with `huggingface-cli download tencent/Hunyuan3D-2mini` before the demo** so the first request isn't a silent 8 GB download. Do a one-time warm-up from a Python REPL outside the API to catch dependency issues.

## Verification

1. `cd backend && uvicorn app.main:app --reload --port 8000`
2. `cd frontend && npm run dev`
3. Open `http://localhost:5173` — header renders, no console errors.
4. `curl http://localhost:5173/healthz` → `{"ok": true, ...}`.
5. **Text mode**: prompt "a small ceramic teapot, simple shape" → submit → status badge transitions queued → running → done in ~30–90s. Viewer shows a teapot-ish mesh with OrbitControls. Download GLB and STL — both open in Blender / glTF viewer.
6. **Image mode**: upload a clean PNG of a single object on plain background → same flow → mesh resembles the silhouette.
7. **Polling sanity**: Network tab shows `/jobs/{id}` ~1.5s apart, not flooding. Switching tabs pauses polling.
8. **Concurrency**: submit two jobs back-to-back. Second blocks on lock; neither crashes/OOMs.
9. **Errors**: empty-prompt text → 422. Oversized image → 413/422. Forced exception in pipeline → status `error` with message displayed in UI.

## Risks / Pitfalls

- **Cold-start latency.** First `/generate` after server start spends 20–60s loading Hunyuan3D into VRAM. Lazy-load on first call so `/healthz` works immediately. Surface "loading model…" vs "generating…" to the UI so it doesn't look hung.
- **CORS.** Use Vite proxy. Add FastAPI `CORSMiddleware` with explicit origin (not `*` with credentials).
- **Model weight download.** 5–8 GB; pre-download via `huggingface-cli` as a documented setup step.
- **Large GLB in browser.** Hunyuan3D meshes can be 10–50 MB. Acceptable for demo. If it bites later, post-process with `gltfpack` (out of scope now).
- **GPU OOM.** The `asyncio.Lock` is mandatory — without it concurrent requests will OOM.
- **Trimesh STL drops materials.** Correct (STL has no materials), worth knowing — downloaded STL looks untextured in viewers, that's the format not a bug.
- **Ephemeral JOBS.** Restart loses status, leaves disk artifacts orphaned. Acceptable for demo; document.
- **Hunyuan3D license.** Tencent's terms are permissive for research/non-commercial; verify before any external/public deployment.
