// Verifica que qualitivity_intelligence_v6.html (el entregable trackeado)
// sea exactamente lo que build.py produce a partir de src/. Si este test
// falla, alguien editó el HTML monolítico directamente en vez de editar
// src/ y correr `python3 build.py` — la fuente de la verdad se desincronizó.
//
// Requiere que src/data/qualitivity_data.js ya exista (generarlo con
// `python3 extract_qualitivity.py --out src/data/qualitivity_data.js`).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TRACKED = path.join(ROOT, 'qualitivity_intelligence_v6.html');
const DATA_FILE = path.join(ROOT, 'src', 'data', 'qualitivity_data.js');

test('qualitivity_intelligence_v6.html == build.py(src/)', { skip: !existsSync(DATA_FILE) && 'falta src/data/qualitivity_data.js — correr extract_qualitivity.py primero' }, () => {
  const tmp = mkdtempSync(path.join(tmpdir(), 'w2p-build-'));
  const out = path.join(tmp, 'rebuilt.html');
  try {
    execFileSync('python3', ['build.py', '--out', out], { cwd: ROOT, stdio: 'pipe' });
    const tracked = readFileSync(TRACKED, 'utf8');
    const rebuilt = readFileSync(out, 'utf8');
    assert.equal(rebuilt, tracked,
      'el HTML trackeado difiere del build desde src/ — editar src/ y correr `python3 build.py`, no el monolito directamente');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
