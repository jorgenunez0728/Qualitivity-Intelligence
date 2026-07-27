// Verifica que la capa de significancia estadística (WP5) quedó conectada
// en la app real: la correlación climática muestra p-value e intervalo de
// confianza, y la detección de anomalías reporta el conteo esperado en vez
// de un umbral crudo.
//
// Uso: node --test tests/e2e/stats_significance.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_PATH = path.resolve(__dirname, '..', '..', 'qualitivity_intelligence_v6.html');

function resolvePlaywright() {
  for (const c of ['playwright', '/opt/node22/lib/node_modules/playwright']) {
    try { return require(c); } catch { /* siguiente */ }
  }
  throw new Error('playwright no disponible');
}

async function withApp(fn) {
  const { chromium } = resolvePlaywright();
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto('file://' + APP_PATH, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => document.getElementById('lo').style.display === 'none', { timeout: 30000 });
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

test('Climate correlation muestra p-value e intervalo de confianza', async () => {
  await withApp(async (page) => {
    const text = await ask(page, 'Climate correlation analysis');
    assert.match(text, /p-value/i, 'debe mostrar la etiqueta p-value');
    assert.match(text, /95% CI/, 'debe mostrar el intervalo de confianza al 95%');
    assert.match(text, /significant|not significant/, 'debe declarar si es significativo');
  });
});

test('Dealer anomaly detection reporta el conteo esperado, no sólo un umbral crudo', async () => {
  await withApp(async (page) => {
    const text = await ask(page, 'Flag dealer anomalies');
    // O bien encuentra anomalías con columna "Expected", o declara
    // explícitamente que no hay ninguna al nivel p<0.05 — nunca un listado
    // por umbral crudo sin contexto estadístico.
    const hasExpectedCol = /Expected/.test(text);
    const declaresNone = /No statistically anomalous/.test(text);
    assert.ok(hasExpectedCol || declaresNone,
      'debe mostrar la columna Expected o declarar que no hay anomalías estadísticas');
  });
});
