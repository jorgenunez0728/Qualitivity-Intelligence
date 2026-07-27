// Prueba de unidad para parseMonth(), extraída literalmente del cuerpo de la
// función en qualitivity_intelligence_v6.html (no hay build step todavía —
// WP1 lo resolverá con módulos importables; por ahora se copia el mismo
// código para no depender de parsear HTML en cada test).
//
// El bug que esto previene: antes usaba `lo.includes(k)`, así que "smart
// key"/"market" (contienen "mar") se interpretaban como marzo, "junction"
// (contiene "jun") como junio, y "general" (contiene "ene") como enero —
// filtrando datos en silencio en cualquier consulta de mapa o tendencia.

import { test } from 'node:test';
import assert from 'node:assert/strict';

function parseMonth(q) {
  const lo = q.toLowerCase();
  const monthMap = {
    jan: 0, ene: 0, feb: 1, mar: 2, apr: 3, abr: 3, may: 4, jun: 5, jul: 6, aug: 7, ago: 7, sep: 8, oct: 9, nov: 10, dec: 11, dic: 11,
    january: 0, enero: 0, february: 1, febrero: 1, march: 2, marzo: 2, april: 3, abril: 3, mayo: 4, june: 5, junio: 5, july: 6, julio: 6,
    august: 7, agosto: 7, september: 8, septiembre: 8, october: 9, octubre: 9, november: 10, noviembre: 10, december: 11, diciembre: 11,
    '1월': 0, '2월': 1, '3월': 2, '4월': 3, '5월': 4, '6월': 5, '7월': 6, '8월': 7, '9월': 8, '10월': 9, '11월': 10, '12월': 11,
  };
  for (const [k, v] of Object.entries(monthMap)) {
    const pat = /[가-힣]/.test(k) ? '(?<!\\d)' + k : '\\b' + k + '\\b';
    if (new RegExp(pat).test(lo)) return v;
  }
  return undefined;
}

test('no confunde "smart key" con marzo', () => {
  assert.equal(parseMonth('smart key claims'), undefined);
});

test('no confunde "market" con marzo', () => {
  assert.equal(parseMonth('top parts by market'), undefined);
});

test('no confunde "junction" con junio', () => {
  assert.equal(parseMonth('junction box claims'), undefined);
});

test('no confunde "general" con enero (ene)', () => {
  assert.equal(parseMonth('general dealer report'), undefined);
});

test('sigue reconociendo meses genuinos en inglés', () => {
  assert.equal(parseMonth('december quality issues'), 11);
  assert.equal(parseMonth('battery claims in march'), 2);
});

test('sigue reconociendo meses genuinos en español', () => {
  assert.equal(parseMonth('reclamos de bateria en marzo'), 2);
  assert.equal(parseMonth('mapa de enero'), 0);
});

test('sigue reconociendo meses genuinos en coreano', () => {
  assert.equal(parseMonth('1월 지도'), 0);
  assert.equal(parseMonth('12월 배터리'), 11);
});

test('no confunde "12월" (diciembre) con "2월" (febrero) por subcadena', () => {
  assert.equal(parseMonth('12월 배터리'), 11);
  assert.equal(parseMonth('10월 클레임'), 9);
  assert.equal(parseMonth('11월 지도'), 10);
});
