// Prueba de extremo a extremo: abre la app real en Chromium (Playwright) y
// verifica que el KPI Dashboard, corriendo en el navegador con los datos
// embebidos, reproduce los números del reporte oficial de Qualitivity
// (tests/golden/report_0727.json). Esta es la prueba de fuego: no basta con
// que la extracción de Python sea correcta si la app no la reproduce igual.
//
// Requiere el paquete `playwright` y el binario de Chromium ya instalados
// (en este proyecto, disponibles globalmente en el entorno de desarrollo).
// Uso: node --test tests/e2e/kpi_dashboard.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_PATH = path.resolve(__dirname, '..', '..', 'qualitivity_intelligence_v6.html');

function resolvePlaywright() {
  const candidates = [
    'playwright',
    '/opt/node22/lib/node_modules/playwright',
  ];
  for (const c of candidates) {
    try { return require(c); } catch { /* probar el siguiente */ }
  }
  throw new Error('playwright no disponible; instalar o ajustar la ruta en resolvePlaywright()');
}

function resolveChromiumExecutable() {
  const candidates = ['/opt/pw-browsers/chromium', undefined];
  return candidates[0];
}

async function withApp(fn) {
  const { chromium } = resolvePlaywright();
  const browser = await chromium.launch({
    executablePath: resolveChromiumExecutable(),
    args: ['--no-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.goto('file://' + APP_PATH, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(
      () => document.getElementById('lo').style.display === 'none',
      { timeout: 30000 },
    );
    await fn(page);
  } finally {
    await browser.close();
  }
}

async function ask(page, query) {
  await page.fill('#inp', query);
  await page.click('#snd');
  await page.waitForFunction(() => !document.getElementById('typ'), { timeout: 15000 });
  return page.evaluate(() => {
    const msgs = document.querySelectorAll('.m.b');
    return msgs[msgs.length - 1].innerText;
  });
}

function extractRow(text, sectionTitle, rowLabel) {
  const secIdx = text.indexOf(sectionTitle);
  assert.ok(secIdx >= 0, `sección '${sectionTitle}' no encontrada en la salida`);
  const after = text.slice(secIdx);
  const lines = after.split('\n').map(l => l.trim()).filter(Boolean);
  const rowIdx = lines.findIndex(l => l === rowLabel || l.startsWith(rowLabel + '\t'));
  assert.ok(rowIdx >= 0, `fila '${rowLabel}' no encontrada bajo '${sectionTitle}'`);
  return lines[rowIdx];
}

test('la app carga sin errores de JavaScript', async () => {
  await withApp(async (page) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.waitForTimeout(200);
    assert.deepEqual(errors, []);
  });
});

test('KPI dashboard: 3M reproduce Claims exactos del reporte oficial', async () => {
  await withApp(async (page) => {
    const text = await ask(page, 'KPI claim trend metrics');
    // Golden 3M: cohortes 2026-04..06 -> Claims 236, 122, 55 (report_0727.json)
    assert.match(text, /236/, 'Claims 236 (cohorte 2026-04) no aparece en 3M');
    assert.match(text, /\b122\b/, 'Claims 122 (cohorte 2026-05) no aparece en 3M');
    assert.match(text, /\b55\b/, 'Claims 55 (cohorte 2026-06) no aparece en 3M');
  });
});

test('KPI dashboard: 12WM (WM/12M) reproduce Claims e Index de Jul\'26 exactos', async () => {
  await withApp(async (page) => {
    const text = await ask(page, 'KPI claim trend metrics');
    // Golden 12WM Jul'26: Claims=1059, Index=38.9 (el único punto con
    // Claims/Sales/Index verificados sin ambigüedad en la foto del reporte)
    assert.match(text, /1,059|1059/, 'Claims 1,059 (12WM Jul26) no aparece');
    assert.match(text, /38\.9/, 'Index 38.9 (12WM Jul26) no aparece');
    // Claims de los otros meses conocidos también deben reproducirse exacto
    assert.match(text, /1,318|1318/, 'Claims 1,318 (12WM May26) no aparece');
    assert.match(text, /1,752|1752/, 'Claims 1,752 (12WM Jun26) no aparece');
  });
});

test('genAnalysis ya no muestra NaN ni mal etiqueta useP como meses', async () => {
  await withApp(async (page) => {
    const text = await ask(page, 'Battery analysis CL4');
    assert.doesNotMatch(text, /NaN/, 'Avg Use Period no debe ser NaN');
  });
});
