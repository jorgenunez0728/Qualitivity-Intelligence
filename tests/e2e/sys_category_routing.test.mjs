// Verifica que las 8 categorías inteligentes (SYS_CAT) enrutan a una vista
// con filtro aplicado (analysis o failuremode), en vez de caer al fuzzy
// matcher de partes o a un filtro muerto.
//
// Bugs reales encontrados y corregidos al escribir esta prueba:
//  - "Powertrain analysis" y "Safety analysis" caían en un fuzzy-match débil
//    sobre una parte casi inexistente (CASE-TRANSMISSION, BOLT-SAFETY LOCK)
//    porque el matcher de partes (Level 2) corría ANTES que la detección de
//    categoría, y esta se borraba en cuanto había un partNM ya asignado.
//  - "Braking system analysis" no activaba ninguna categoría: el regex
//    /brake/ no es subcadena de "braking" (braking ≠ br-a-k-e).
//  - El filtro safety='Y' garantizaba 0 resultados siempre: el campo
//    'safety part' viene 'N' en el 100% de los 31,664 registros.
//
// Uso: node --test tests/e2e/sys_category_routing.test.mjs

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

const CASES = [
  { query: 'Electrical system analysis', label: 'Electrical' },
  { query: 'Powertrain engine transmission analysis', label: 'Powertrain' },
  { query: 'HVAC air conditioning analysis', label: 'HVAC' },
  { query: 'Braking system analysis', label: 'Braking' },
  { query: 'Steering suspension alignment analysis', label: 'Steering' },
  { query: 'Infotainment display audio analysis', label: 'Infotainment' },
  { query: 'Body trim doors handles analysis', label: 'Body' },
  { query: 'Safety airbag analysis', label: 'Safety' },
];

test('las 8 categorías SYS_CAT muestran su propio título, no un fuzzy-match ni 0 claims', async () => {
  const { chromium } = resolvePlaywright();
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto('file://' + APP_PATH, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => document.getElementById('lo').style.display === 'none', { timeout: 30000 });

    for (const { query, label } of CASES) {
      await page.fill('#inp', query);
      await page.click('#snd');
      await page.waitForFunction(() => !document.getElementById('typ'), { timeout: 15000 });
      const text = await page.evaluate(() => {
        const msgs = document.querySelectorAll('.m.b');
        return msgs[msgs.length - 1].innerText;
      });
      assert.doesNotMatch(
        text, /No claims found/,
        `'${query}' no debe devolver 0 claims`,
      );
      assert.match(
        text, new RegExp(label, 'i'),
        `'${query}' debe mostrar la etiqueta de su categoría ('${label}'), no un fuzzy-match sobre otra parte`,
      );
    }
  } finally {
    await browser.close();
  }
});
