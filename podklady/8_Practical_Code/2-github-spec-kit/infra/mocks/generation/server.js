// Mock generation provider. Speaks a tiny Meshy-shaped HTTP API:
//   POST /v2/text-to-3d            → { id }
//   POST /v2/image-to-3d           → { id }
//   GET  /v2/text-to-3d/:id        → { id, status, model_urls? }
//   GET  /v2/image-to-3d/:id       → idem
//   GET  /models/:id.glb           → application/octet-stream cube GLB
// Real provider latency simulated via MOCK_DELAY_MS.

import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';
import { buildCubeGlb } from './cube-glb.js';

const PORT = Number(process.env.PORT ?? 8787);
const DELAY_MS = Number(process.env.MOCK_DELAY_MS ?? 3000);

const jobs = new Map();
const palette = ['#ff7a59', '#42a5f5', '#66bb6a', '#ffca28', '#ab47bc', '#ef5350'];

function pickColor() {
  return palette[Math.floor(Math.random() * palette.length)];
}

function submit(kind) {
  const id = randomUUID();
  jobs.set(id, { id, kind, status: 'queued', createdAt: Date.now(), color: pickColor() });
  setTimeout(() => {
    const job = jobs.get(id);
    if (job) jobs.set(id, { ...job, status: 'succeeded', completedAt: Date.now() });
  }, DELAY_MS);
  return id;
}

function pollResponse(job, base) {
  const out = { id: job.id, status: job.status };
  if (job.status === 'succeeded') {
    const url = `${base}/models/${job.id}.glb`;
    out.model_urls = { glb: url, fbx: null };
    out.thumbnail_url = `${base}/thumbnails/${job.id}.png`;
  }
  return out;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);
  const base = `http://${req.headers.host}`;
  res.setHeader('content-type', 'application/json');

  try {
    if (req.method === 'POST' && u.pathname === '/v2/text-to-3d') {
      await readJson(req);
      const id = submit('text');
      res.statusCode = 202;
      return res.end(JSON.stringify({ id }));
    }
    if (req.method === 'POST' && u.pathname === '/v2/image-to-3d') {
      await readJson(req);
      const id = submit('image');
      res.statusCode = 202;
      return res.end(JSON.stringify({ id }));
    }
    const pollMatch = u.pathname.match(/^\/v2\/(text|image)-to-3d\/(.+)$/);
    if (req.method === 'GET' && pollMatch) {
      const job = jobs.get(pollMatch[2]);
      if (!job) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ error: 'not found' }));
      }
      return res.end(JSON.stringify(pollResponse(job, base)));
    }
    const glbMatch = u.pathname.match(/^\/models\/([0-9a-f-]+)\.glb$/i);
    if (req.method === 'GET' && glbMatch) {
      const job = jobs.get(glbMatch[1]);
      if (!job) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ error: 'not found' }));
      }
      const buf = buildCubeGlb({ colorHex: job.color });
      res.setHeader('content-type', 'model/gltf-binary');
      res.setHeader('content-length', buf.length);
      return res.end(buf);
    }
    if (u.pathname === '/healthz') {
      return res.end(JSON.stringify({ ok: true, jobs: jobs.size }));
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'unknown route' }));
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: String(err?.message ?? err) }));
  }
});

server.listen(PORT, () => {
  console.log(`[mock-generation] listening on :${PORT} (delay=${DELAY_MS}ms)`);
});
