#!/usr/bin/env python3
"""
reconcile.py — Compara lo que se calcula desde los CSV contra el reporte oficial.

    python3 tools/reconcile.py

Sale con código 1 si alguna sección marcada como bloqueante no cuadra, para que
sirva de compuerta antes de publicar cifras.

Qué reproduce hoy
-----------------
3M  · Claims por cohorte y las 27 filas de Top Issues → exacto.
DC  · aproximado; ver DELTA_DC abajo.
WM  · el numerador es reproducible, el denominador no: el export de ventas sólo
      cubre 2026-05..07, y 12WM/36WM necesitan 12 y 36 meses.
"""

import collections
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qualitivity_csv import read_ro, normalize_part  # noqa: E402

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GOLDEN = os.path.join(RAIZ, 'tests', 'golden', 'report_0727.json')

CSV_3M = os.path.join(RAIZ, 'Qualitivity 0727 RO 3M.csv')
CSV_DC = os.path.join(RAIZ, 'Qualitivity 0727 RO DC.csv')
CSV_12M = os.path.join(RAIZ, 'Qualitivity 0727 RO 12 M.zip')
CSV_SALES = os.path.join(RAIZ, 'Qualitivity 0727 DB Sales DC.csv')

MES_EN = {'January': '01', 'February': '02', 'March': '03', 'April': '04',
          'May': '05', 'June': '06', 'July': '07', 'August': '08',
          'September': '09', 'October': '10', 'November': '11', 'December': '12'}


def _mes_dc(nombre, anio='2026'):
    """DC guarda el cohorte como nombre de mes en inglés ('June'), no como YYYY-MM."""
    mm = MES_EN.get((nombre or '').strip())
    return f'{anio}-{mm}' if mm else ''


def cohortes_3M(registros):
    c = collections.Counter(r.get('Sales5', '') for r in registros)
    return c


def cohortes_DC(registros):
    return collections.Counter(_mes_dc(r.get('Retail Sales Month', '')) for r in registros)


def top_issues(registros, campo_mes, meses, mapear_mes=None):
    g = collections.defaultdict(collections.Counter)
    for r in registros:
        mes = r.get(campo_mes, '')
        if mapear_mes:
            mes = mapear_mes(mes)
        clave = (r.get('Project Name', ''), normalize_part(r.get('Part NM', '')))
        g[clave][mes] += 1
    return {k: [v.get(m, 0) for m in meses] for k, v in g.items()}


def _fmt(ok):
    return '\033[32m✓\033[0m' if ok else '\033[31m✗\033[0m'


def revisar(nombre, obtenido, esperado, detalle=''):
    ok = obtenido == esperado
    print(f'  {_fmt(ok)} {nombre:38s} obtenido={obtenido} esperado={esperado}{detalle}')
    return ok


def main():
    golden = json.load(open(GOLDEN, encoding='utf-8'))
    fallos = []
    bloqueantes = []

    # ── 3M ────────────────────────────────────────────────────────────────
    print('\n═══ 3M Claim Trend ═══')
    r3m, _ = read_ro(CSV_3M, 'A')
    print(f'  bloque A: {len(r3m)} registros')
    coh = cohortes_3M(r3m)
    for fila in golden['3M']['tabla']:
        mes, esp = fila['sales'], fila['claims']
        got = coh.get(mes, 0)
        if got == 0:
            print(f'  ~ Claims {mes}                        sin cobertura en este corte '
                  f'(el export arranca en 2026-04); reporte={esp}')
            continue
        ok = revisar(f'Claims cohorte {mes}', got, esp)
        if not ok:
            fallos.append(f'3M claims {mes}'); bloqueantes.append(True)

    meses = golden['3M']['top_issues_meses']
    ti = top_issues(r3m, 'Sales5', meses)
    aciertos = 0
    for proj, parte, esp, total in golden['3M']['top_issues']:
        got = ti.get((proj, parte), [0] * len(meses))
        if got == esp:
            aciertos += 1
        else:
            fallos.append(f'3M top-issue {proj}/{parte}: {got} != {esp}')
            bloqueantes.append(True)
    n = len(golden['3M']['top_issues'])
    print(f'  {_fmt(aciertos == n)} Top Issues                             {aciertos}/{n} filas exactas')

    # ── DC ────────────────────────────────────────────────────────────────
    print('\n═══ DC Claim Trend ═══')
    rdc, _ = read_ro(CSV_DC, 'A')
    print(f'  bloque A: {len(rdc)} registros')
    cohd = cohortes_DC(rdc)
    for fila in golden['DC']['tabla']:
        revisar(f"Claims cohorte {fila['sales']}", cohd.get(fila['sales'], 0), fila['claims'],
                '   (ver DELTA_DC)')

    mesesd = golden['DC']['top_issues_meses']
    tid = top_issues(rdc, 'Retail Sales Month', mesesd, mapear_mes=_mes_dc)
    ad = sum(1 for p, pt, esp, _ in golden['DC']['top_issues']
             if tid.get((p, pt), [0] * len(mesesd)) == esp)
    nd = len(golden['DC']['top_issues'])
    print(f'  {"~"} Top Issues                             {ad}/{nd} filas exactas   (ver DELTA_DC)')

    # ── WM (12/36) — aproximación conocida, ver nota en el golden ──────────
    print('\n═══ WM Claim Trend (12WM / 36WM) — aproximación ═══')
    r12m, _ = read_ro(CSV_12M, 'A')
    print(f'  bloque A: {len(r12m)} registros')

    def _ym(s):
        try:
            y, m = s.split('-')
            return int(y) * 12 + int(m)
        except Exception:
            return None

    for seccion, horizonte in (('12WM', 12), ('36WM', 36)):
        fila = golden[seccion]['tabla'][-1]  # Jul'26, la única columna confiable
        cutoff = _ym(fila['result'])
        sales_start = cutoff - horizonte + 1
        n = sum(
            1 for r in r12m
            if _ym(r.get('Sales5', '')) is not None
            and _ym(r.get('Confirm. month', '')) == cutoff
            and sales_start <= _ym(r.get('Sales5', '')) <= cutoff
        )
        esp = fila['claims']
        pct = 100 * n / esp if esp else 0
        print(f'  ~ {seccion} Claims {fila["result"]}                    obtenido={n} esperado={esp}  ({pct:.0f}%)')
    print('  Regla usada: Confirm.month == mes de corte AND Sales5 dentro de la ventana.')
    print('  Es la mejor aproximación encontrada (ver nota "_reconciliacion" en el golden);')
    print('  no cierra exacto con ninguna combinación de columnas de fecha probada.')

    # ── Exposición ────────────────────────────────────────────────────────
    print('\n═══ Base de exposición (denominador) ═══')
    import csv as _csv
    meses_venta = collections.Counter()
    with open(CSV_SALES, encoding='utf-8-sig', errors='replace', newline='') as fh:
        for row in _csv.DictReader(fh):
            meses_venta[(row.get('Retail sales date') or '')[:7]] += 1
    cobertura = sorted(m for m in meses_venta if m)
    print(f'  meses cubiertos por el export de ventas: {cobertura}')
    for seccion, requeridos in (('3M', 6), ('12WM', 12), ('36WM', 36)):
        falta = requeridos - len(cobertura)
        estado = 'suficiente' if falta <= 0 else f'FALTAN {falta} meses'
        print(f'  {_fmt(falta <= 0)} {seccion:5s} requiere {requeridos:2d} meses de ventas → {estado}')

    # ── Veredicto ─────────────────────────────────────────────────────────
    print('\n═══ Resumen ═══')
    if not any(bloqueantes):
        print('  3M reconciliado contra el reporte oficial.')
    for f in fallos[:10]:
        print(f'  · {f}')
    print(f"""
  DELTA_DC: DC queda con una diferencia pequeña y no explicada
    (obtenido [49, 64, 19] vs reporte [46, 63, 19]).
    Descartado: Status='Include' → [45, 48, 10]; dedup VIN+parte → [49, 61, 19].
    Indicio: el Index publicado de mayo (20.7) implica ~44 claims, no 46, así que
    el propio fixture de mayo es dudoso. Confirmar contra el PowerBI en vivo.

  Denominador: 12WM y 36WM no son calculables con este export.
    Pedir: ventas retail mensuales por mes x Project Name x Sale nations,
    de 2023-07 a 2026-07, incluyendo BDM.""")
    return 1 if any(bloqueantes) else 0


if __name__ == '__main__':
    sys.exit(main())
