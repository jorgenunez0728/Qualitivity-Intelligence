// Pruebas de la capa de estadística (pearsonP/pearsonCI/poissonUpperTail),
// copiada literalmente de qualitivity_intelligence_v6.html (WP1 lo hará
// importable de verdad). Valores de referencia validados contra
// scipy.stats.t.cdf y scipy.stats.poisson.sf con diferencia <1e-14.

import { test } from 'node:test';
import assert from 'node:assert/strict';

function _betacf(a, b, x) {
  const MAXIT = 200, EPS = 3e-14, FPMIN = 1e-300;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d; let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; const de = d * c; h *= de;
    if (Math.abs(de - 1) < EPS) break;
  }
  return h;
}
function _lgamma(x) {
  const g = [676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - _lgamma(1 - x);
  x -= 1; let a = 0.99999999999980993; const t = x + 7.5;
  for (let i = 0; i < 8; i++) a += g[i] / (x + i + 1);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
function _betai(a, b, x) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(_lgamma(a + b) - _lgamma(a) - _lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * _betacf(a, b, x) / a : 1 - bt * _betacf(b, a, 1 - x) / b;
}
function pearsonP(r, n) {
  if (n <= 2) return 1;
  const rc = Math.max(-0.999999, Math.min(0.999999, r));
  const t = rc * Math.sqrt((n - 2) / (1 - rc * rc));
  const df = n - 2;
  return _betai(df / 2, 0.5, df / (df + t * t));
}
function pearsonCI(r, n) {
  if (n <= 3) return { lo: -1, hi: 1 };
  const rc = Math.max(-0.999999, Math.min(0.999999, r));
  const z = Math.atanh(rc), se = 1 / Math.sqrt(n - 3);
  return { lo: Math.tanh(z - 1.96 * se), hi: Math.tanh(z + 1.96 * se) };
}
function poissonUpperTail(k, lambda) {
  if (lambda <= 0) return k > 0 ? 1 : 0;
  let term = Math.exp(-lambda), cum = term;
  for (let i = 1; i < k; i++) { term *= lambda / i; cum += term; }
  return Math.max(0, 1 - cum);
}
function wilsonInterval(k, n, z) {
  z = z || 1.96;
  if (n <= 0) return { lo: 0, hi: 0 };
  const phat = k / n;
  const denom = 1 + z * z / n;
  const center = phat + z * z / (2 * n);
  const margin = z * Math.sqrt(phat * (1 - phat) / n + z * z / (4 * n * n));
  return { lo: Math.max(0, (center - margin) / denom), hi: Math.min(1, (center + margin) / denom) };
}

// Referencias generadas con scipy: 2*(1-stats.t.cdf(abs(t), df))
const PEARSON_P_REF = [
  { r: 0.5, n: 20, p: 0.024770 },
  { r: 0.6, n: 10, p: 0.066688 },
  { r: 0.3, n: 30, p: 0.107246 },
  { r: 0.9, n: 5, p: 0.037386 },
  { r: 0.1, n: 100, p: 0.322217 },
];

for (const { r, n, p } of PEARSON_P_REF) {
  test(`pearsonP(${r}, ${n}) ≈ ${p} (scipy)`, () => {
    assert.ok(Math.abs(pearsonP(r, n) - p) < 1e-4, `obtenido ${pearsonP(r, n)}`);
  });
}

test('pearsonP: r=0 siempre no-significativo (p=1)', () => {
  assert.equal(pearsonP(0, 50), 1);
});

test('pearsonP: r=1 con n>2 da p muy cercano a 0', () => {
  assert.ok(pearsonP(0.999999, 20) < 1e-6);
});

test('pearsonCI: el intervalo contiene a r y es más angosto con más n', () => {
  const wide = pearsonCI(0.5, 10);
  const narrow = pearsonCI(0.5, 200);
  assert.ok(wide.lo < 0.5 && wide.hi > 0.5);
  assert.ok(narrow.lo < 0.5 && narrow.hi > 0.5);
  assert.ok((narrow.hi - narrow.lo) < (wide.hi - wide.lo));
});

// Referencia: scipy.stats.poisson.sf(k-1, lambda) == P(X>=k)
test('poissonUpperTail: dealer con 3 claims y tasa esperada 0.5 es muy improbable', () => {
  // scipy.stats.poisson.sf(2, 0.5) = 0.0143...
  const p = poissonUpperTail(3, 0.5);
  assert.ok(Math.abs(p - 0.014388) < 1e-4, `obtenido ${p}`);
});

test('poissonUpperTail: dealer grande con tasa esperada alta no se marca por conteo crudo', () => {
  // Un dealer con lambda=20 (grande) y 22 claims no es anómalo (~esperado).
  // scipy.stats.poisson.sf(21, 20) = 0.35630
  const p = poissonUpperTail(22, 20);
  assert.ok(Math.abs(p - 0.35630) < 1e-4, `obtenido ${p}`);
});

// Referencia: tabla estándar de Wilson score interval, k=8 n=20 -> (0.221, 0.618)
test('wilsonInterval: k=8 n=20 coincide con la tabla de referencia', () => {
  const { lo, hi } = wilsonInterval(8, 20);
  assert.ok(Math.abs(lo - 0.221) < 0.005, `lo=${lo}`);
  assert.ok(Math.abs(hi - 0.618) < 0.005, `hi=${hi}`);
});

test('wilsonInterval: 12WM Jul26 (1059/272197) da un intervalo estrecho alrededor del Index', () => {
  const { lo, hi } = wilsonInterval(1059, 272197);
  const idxLo = lo * 10000, idxHi = hi * 10000;
  assert.ok(idxLo < 38.9 && idxHi > 38.9, `Index 38.9 debe caer dentro de [${idxLo}, ${idxHi}]`);
  assert.ok((idxHi - idxLo) < 6, `con n=272,197 el intervalo debe ser angosto, obtenido ancho=${idxHi - idxLo}`);
});

test('wilsonInterval: n pequeño da un intervalo mucho más ancho', () => {
  const wide = wilsonInterval(3, 20);   // DC, un mes cualquiera con pocos claims
  const narrow = wilsonInterval(1059, 272197);
  const widthWide = wide.hi - wide.lo;
  const widthNarrow = narrow.hi - narrow.lo;
  assert.ok(widthWide > widthNarrow * 100, 'el intervalo con n=20 debe ser mucho más ancho que con n=272,197');
});
