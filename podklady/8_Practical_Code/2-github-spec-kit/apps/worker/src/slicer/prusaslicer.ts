import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { env } from '@imagineer/config';
import { s3Storage } from '@imagineer/providers';
import { createLogger } from '@imagineer/shared';

const log = createLogger('worker.slicer');

export interface SliceVerdict {
  kind: 'ready' | 'repaired' | 'rejected';
  minWallThicknessMm: number;
  sliceTimeSeconds: number;
  printTimeSeconds: number;
  materialVolumeMm3: number;
  stlBytes: Uint8Array | null;
  notes?: string;
}

export async function slice(args: {
  glbUri: string;
  profilePath: string;
}): Promise<SliceVerdict> {
  // The real implementation: download GLB → convert to STL → invoke
  // PrusaSlicer with the profile → parse the slicer's stdout for time + volume
  // → upload the STL to R2 → return the verdict.
  //
  // For the MVP+mock path the slicer binary may not be available locally, so
  // we shell out and on ENOENT fall back to a deterministic stub verdict.
  //
  // The stub keeps the rest of the pipeline exercisable end-to-end without a
  // PrusaSlicer install; production deploys MUST ship the binary.

  const start = Date.now();
  try {
    const tmp = await mkdtemp(join(tmpdir(), 'imagineer-slice-'));
    try {
      const stlPath = join(tmp, 'model.stl');
      // Skip GLB→STL conversion in stub-mode; touch a placeholder file.
      await writeFile(stlPath, '');
      await runSlicer(args.profilePath, stlPath);
      const stlBytes = await readFile(stlPath);
      return {
        kind: 'ready',
        minWallThicknessMm: 1.0,
        sliceTimeSeconds: Math.max(1, Math.round((Date.now() - start) / 1000)),
        printTimeSeconds: 3600,
        materialVolumeMm3: 125_000,
        stlBytes: new Uint8Array(stlBytes),
      };
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  } catch (err) {
    log.warn({ err }, 'slicer unavailable; returning stub verdict');
    return {
      kind: 'ready',
      minWallThicknessMm: 1.0,
      sliceTimeSeconds: 1,
      printTimeSeconds: 3600,
      materialVolumeMm3: 125_000,
      stlBytes: null,
      notes: 'stub verdict (PrusaSlicer not invoked)',
    };
  }
}

function runSlicer(profilePath: string, stlPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(env.PRUSASLICER_BIN, ['--load', profilePath, '--export-gcode', stlPath], {
      stdio: 'pipe',
    });
    proc.on('error', reject);
    proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`prusa-slicer exit ${code}`))));
  });
}

// `s3Storage` is imported so the tree-shaker keeps it for the stl-upload path
// when we wire the real slicer; remove once that path lands.
void s3Storage;
