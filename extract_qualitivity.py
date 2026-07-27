#!/usr/bin/env python3
"""
extract_qualitivity.py — Genera el bloque de datos JS de Warranty 2 Prevention
a partir de los export CSV de Qualitivity (corte 0727 en adelante).

Reemplaza a la versión anterior, que leía un .xlsm por índice de columna.
Los export actuales son CSV/zip con un defecto crítico: cada archivo trae
**dos bloques del mismo esquema concatenados horizontalmente** (ver
tools/qualitivity_csv.py). Leerlos con csv.DictReader colapsa los encabezados
duplicados y devuelve en silencio el bloque equivocado — por eso las cifras
de versiones previas nunca cuadraban con el reporte oficial de Qualitivity.
Este script usa `read_ro()`, que sí distingue los bloques.

Uso
---
    python3 extract_qualitivity.py > data_block.js
    python3 extract_qualitivity.py --validate      # sólo diagnóstico, no genera nada
    python3 extract_qualitivity.py --out src/data/qualitivity_0727.js

Espera encontrar, en el directorio de trabajo (o via --dir), los archivos:
    Qualitivity 0727 RO 3M.csv
    Qualitivity 0727 RO DC.csv
    Qualitivity 0727 RO 12 M.zip
    Qualitivity 0727 DB Sales DC.csv
"""

import argparse
import collections
import csv
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tools'))
from qualitivity_csv import read_ro, to_num, normalize_part  # noqa: E402

DEFAULT_FILES = {
    '3M': 'Qualitivity 0727 RO 3M.csv',
    'DC': 'Qualitivity 0727 RO DC.csv',
    '12M': 'Qualitivity 0727 RO 12 M.zip',
    'sales': 'Qualitivity 0727 DB Sales DC.csv',
}

US_STATE_CODES = frozenset("""
AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT
NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC
""".split())

# Campos comunes a los tres RO, con su nombre canónico en la salida JS.
FIELD_MAP = {
    'no': 'No.', 'brand': 'Brand', 'model': 'Model', 'proj': 'Project Name',
    'partNo': 'Part no.', 'keyParts': 'Key parts no.', 'safety': 'safety part',
    'partNM': 'Part NM', 'system': 'System',
    'natCode': 'Nature code', 'natName': 'Nature name',
    'iqs': 'IQS', 'vds': 'VDS', 'cr': 'CR',
    'causeCode': 'Cause code', 'causeCode3': 'Cause code3', 'comment': 'Comment',
    'dtc1': 'DTC1', 'dtc2': 'DTC2', 'dtc3': 'DTC3',
    'prodMonth': 'Prod.4', 'salesMonth': 'Sales5', 'confMonth': 'Confirm. month',
    'stockP': 'Stock Peroid',
    # 'useP' se mantiene con ese nombre por compatibilidad con la app ya
    # existente, pero OJO: el valor está en DÍAS, no en meses (una venta el
    # 2026-04-10 con reparación el 2026-04-13 trae Use Period=3). Antes se
    # rotulaba como 'mo' en pantalla; ver 'misMonths' para el valor correcto
    # ya convertido, que es lo que debe usarse en cualquier promedio o KPI.
    'useP': 'Use Period', 'mileage': 'Mileage(km)', 'claims': 'Claims',
    'partCost': 'Part', 'laborCost': 'Labor Cost', 'outsource': 'Outsourcing',
    'totalCost': 'All',
    'nation': 'Sale nations', 'region': 'Region', 'saleMgtArea': 'Sale Mgt. area',
    'occArea': 'Occurrence area in detail', 'dealer': 'Dealer',
    'devName': 'Developer Name', 'faultCorp': 'Fault Corp Name',
    'salesType': 'Sales Type', 'vin': 'VIN',
}
NUMERIC_FIELDS = {'keyParts', 'stockP', 'useP', 'mileage', 'claims',
                  'partCost', 'laborCost', 'outsource', 'totalCost'}

# 12M trae 30,871 registros (vs 750 de 3M+DC) con el mismo esquema completo,
# incluido 'Comment' (promedio 476 caracteres, máx 2,627). Sin truncar, el
# bloque de datos pasa de ~2.4 MB a más de 40 MB, lo que vuelve pesado abrir
# el archivo único offline. Se trunca a 150 caracteres, igual que la
# convención ya usada para 3M/DC en versiones anteriores.
COMMENT_MAX_LEN = 150

# Sólo la RO de DC trae estas columnas (el cohorte real de venta retail para
# reclamos "before sales"); no existen en el esquema de 3M/12M. La app ya
# tiene lógica (window.addEventListener('load',...)) que reconstruye
# salesMonth para DC a partir de retailSalesMonth cuando Sales5 trae el
# centinela '1900-01', así que se preservan tal cual (nombre de mes en texto).
DC_EXTRA_FIELDS = {
    'retailSalesDate': 'Retail Sales Date',
    'retailSalesMonth': 'Retail Sales Month',
    'resultMonth': 'Result Month',
}


def resolve_state(dealer, nation):
    """
    Deriva el estado sólo cuando la nación es 'U.S.A'/'United States' y el
    prefijo del dealer es un código de estado válido. En cualquier otro caso
    devuelve None: derivarlo para todas las naciones (como hacía la versión
    anterior) producía ~116 "estados" falsos, incluyendo estados de EE.UU.
    asignados a dealers mexicanos o canadienses que comparten el prefijo.
    """
    if nation not in ('U.S.A', 'United States'):
        return None
    d = (dealer or '').strip().upper()
    prefix = d[:2]
    return prefix if prefix in US_STATE_CODES else None


def normalize_nation(raw):
    """DB Sales usa 'United States'; los RO usan 'U.S.A'. Un solo vocabulario."""
    return {'United States': 'U.S.A'}.get(raw, raw)


def build_record(raw, source):
    rec = {'_src': source}
    for out_key, csv_key in FIELD_MAP.items():
        val = raw.get(csv_key, '')
        if out_key in NUMERIC_FIELDS:
            val = to_num(val)
        else:
            val = val.strip() if isinstance(val, str) else val
            val = val if val else None
        rec[out_key] = val
    if source == 'DC':
        for out_key, csv_key in DC_EXTRA_FIELDS.items():
            val = (raw.get(csv_key, '') or '').strip()
            rec[out_key] = val or None
    if isinstance(rec.get('comment'), str) and len(rec['comment']) > COMMENT_MAX_LEN:
        rec['comment'] = rec['comment'][:COMMENT_MAX_LEN] + '…'
    rec['nation'] = normalize_nation(rec['nation'])
    rec['state'] = resolve_state(rec['dealer'], rec['nation'])
    days = rec.get('useP')
    rec['misMonths'] = round(days / 30.44, 2) if isinstance(days, (int, float)) else None
    rec['partNMKey'] = normalize_part(rec.get('partNM'))
    return rec


def extract_ro(path, source):
    raw_rows, _ = read_ro(path, 'A')
    return [build_record(r, source) for r in raw_rows]


def to_columnar(records):
    """
    {cols, rows} en vez de un array de objetos: 12M trae 30,871 registros con
    ~35 claves repetidas por fila, y el nombre de cada clave pesa más que
    muchos de sus valores. El formato columnar mide un 44% menos en JSON
    (probado sobre una muestra de 1,000 filas) por no repetir las claves.
    """
    if not records:
        return {'cols': [], 'rows': []}
    cols = list(records[0].keys())
    rows = [[r.get(c) for c in cols] for r in records]
    return {'cols': cols, 'rows': rows}


def extract_exposure(path):
    """
    VEHICLE_EXPOSURE: ventas retail agregadas por mes x proyecto x nación.

    Cobertura conocida (corte 0727): sólo 2026-05, 2026-06 y 2026-07, y sin
    BDM. Es una fracción del universo que alimenta el reporte oficial (12WM
    Jul'26 usa 272,197 ventas; este archivo tiene 61,017 en total). Se
    incluye la cobertura real en la salida para que el consumidor de los
    datos declare explícitamente cuándo el denominador no está disponible,
    en vez de calcular una tasa con una base incompleta.
    """
    by_month_proj_nation = collections.Counter()
    by_state = collections.Counter()
    months = set()
    car_code_to_proj = {
        '(CL4) K4 24 [8G]': 'CL4',
        '(BL7m) BL7 MEXICO [1C]': 'BL7M',
        '(NX4M) TUCSON MEXICO 24 [5D]': 'NX4M',
    }
    with open(path, encoding='utf-8-sig', errors='replace', newline='') as fh:
        for row in csv.DictReader(fh):
            date = (row.get('Retail sales date') or '').strip()
            month = date[:7]
            if not month:
                continue
            months.add(month)
            nation = normalize_nation((row.get('Sale nations') or '').strip())
            proj = car_code_to_proj.get((row.get('Quality STD car code') or '').strip(), 'OTHER')
            by_month_proj_nation[(month, proj, nation)] += 1
            state = resolve_state(row.get('Dealer'), nation)
            if state:
                by_state[state] += 1
    rows = [{'month': m, 'proj': p, 'nation': n, 'sales': c}
            for (m, p, n), c in sorted(by_month_proj_nation.items())]
    return {
        'rows': rows,
        'byState': dict(by_state),
        'coverageMonths': sorted(months),
        '_note': ('Cobertura parcial: sólo cubre los meses listados y no incluye BDM. '
                  'No usar como denominador fuera de esa ventana sin verificar.'),
    }


def validate(files):
    problems = []
    for key in ('3M', 'DC', '12M'):
        path = files[key]
        if not os.path.exists(path):
            problems.append(f'falta el archivo {key}: {path}')
            continue
        raw_a, fields_a = read_ro(path, 'A')
        raw_b, _ = read_ro(path, 'B')
        print(f'{key}: bloque A={len(raw_a)} filas, bloque B={len(raw_b)} filas, '
              f'{len(fields_a)} columnas/bloque', file=sys.stderr)
        bad_use_period = sum(1 for r in raw_a if to_num(r.get('Use Period')) is None
                              and (r.get('Use Period') or '').strip() not in ('',))
        if bad_use_period:
            print(f'  {key}: {bad_use_period} filas con Use Period no numérico '
                  '(se emiten como useP=null)', file=sys.stderr)
        months = sorted({r.get('Sales5', '') for r in raw_a if r.get('Sales5', '').strip()})
        print(f'  {key}: Sales5 cubre {months[0] if months else "?"} .. '
              f'{months[-1] if months else "?"} ({len(months)} meses)', file=sys.stderr)
        no_state_us = sum(1 for r in raw_a
                           if normalize_nation((r.get('Sale nations') or '').strip()) == 'U.S.A'
                           and not resolve_state(r.get('Dealer'), 'U.S.A'))
        if no_state_us:
            print(f'  {key}: {no_state_us} reclamos U.S.A. sin estado derivable '
                  '(prefijo de dealer no reconocido)', file=sys.stderr)

    sales_path = files['sales']
    if os.path.exists(sales_path):
        exp = extract_exposure(sales_path)
        print(f"sales: cobertura {exp['coverageMonths']} — {exp['_note']}", file=sys.stderr)
    else:
        problems.append(f'falta el archivo de ventas: {sales_path}')

    if problems:
        for p in problems:
            print(f'PROBLEMA: {p}', file=sys.stderr)
        return 1
    print('validate: sin problemas bloqueantes', file=sys.stderr)
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--dir', default='.', help='directorio con los CSV/zip fuente')
    ap.add_argument('--out', default=None, help='archivo de salida (por defecto: stdout)')
    ap.add_argument('--validate', action='store_true', help='solo valida, no genera datos')
    args = ap.parse_args()

    files = {k: os.path.join(args.dir, v) for k, v in DEFAULT_FILES.items()}

    if args.validate:
        sys.exit(validate(files))

    d3m = extract_ro(files['3M'], '3M')
    ddc = extract_ro(files['DC'], 'DC')
    d12m = extract_ro(files['12M'], '12M')
    exposure = extract_exposure(files['sales']) if os.path.exists(files['sales']) else None

    print(f'// Generado por extract_qualitivity.py — 3M={len(d3m)} DC={len(ddc)} '
          f'12M={len(d12m)}', file=sys.stderr)

    col12m = to_columnar(d12m)
    js = []
    js.append(f"const QUALITIVITY_DATA = {json.dumps({'3M': d3m, 'DC': ddc}, ensure_ascii=False)};")
    js.append(f"const QUALITIVITY_12M_COLS = {json.dumps(col12m['cols'], ensure_ascii=False)};")
    js.append(f"const QUALITIVITY_12M_ROWS = {json.dumps(col12m['rows'], ensure_ascii=False)};")
    if exposure is not None:
        # US_SALES_BY_STATE se conserva por compatibilidad con el mapa ya
        # existente en la app. A diferencia de la versión anterior (que
        # derivaba "estado" del prefijo del dealer para CUALQUIER nación),
        # aquí sólo cuenta ventas ya confirmadas como U.S.A. Su cobertura
        # real (ver VEHICLE_EXPOSURE.coverageMonths) es parcial: sólo
        # 2026-05..07, no la serie completa que necesitan 12WM/36WM.
        js.append(f"const US_SALES_BY_STATE = {json.dumps(exposure['byState'], ensure_ascii=False)};")
        js.append(f"const VEHICLE_EXPOSURE = {json.dumps(exposure, ensure_ascii=False)};")
    else:
        js.append("const US_SALES_BY_STATE = {};")
        js.append("const VEHICLE_EXPOSURE = null;")
    output = '\n'.join(js) + '\n'

    if args.out:
        with open(args.out, 'w', encoding='utf-8') as fh:
            fh.write(output)
        print(f'escrito: {args.out} ({len(output)/1024:.0f} KB)', file=sys.stderr)
    else:
        sys.stdout.write(output)


if __name__ == '__main__':
    main()
