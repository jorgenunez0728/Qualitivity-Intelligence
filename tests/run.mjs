#!/usr/bin/env node
// Corre toda la suite (unitarias + e2e). `node --test tests/` por sí solo
// intenta tratar tests/golden/report_0727.json como archivo de prueba y
// falla; este runner apunta sólo a los *.test.mjs reales.
//
// Uso: node tests/run.mjs
import { run } from 'node:test';
import { tap } from 'node:test/reporters';
import { globSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const files = globSync('**/*.test.mjs', { cwd: dir }).map(f => path.join(dir, f));

if (!files.length) {
  console.error('No se encontraron archivos *.test.mjs bajo tests/');
  process.exit(1);
}

const stream = run({ files, concurrency: false });
stream.compose(tap).pipe(process.stdout);
stream.on('test:fail', () => { process.exitCode = 1; });
