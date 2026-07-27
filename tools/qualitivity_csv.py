#!/usr/bin/env python3
"""
qualitivity_csv.py — Lector de los export RO de Qualitivity.

Por qué existe este módulo
--------------------------
Los CSV `RO *.csv` NO son tablas simples: traen **dos bloques del mismo esquema
concatenados horizontalmente**. En el export 0727:

    RO 3M.csv  → 188 columnas: bloque A = 0..93,  bloque B = 94..187
    RO DC.csv  → 205 columnas: bloque A = 0..102, bloque B = 103..204
    RO 12M.zip → 199 columnas: bloque A = 0..98,  bloque B = 99..198 (30,871 filas, ambas iguales)

El bloque A es el **corte oficial vigente** (el que alimenta el reporte PowerBI
"Claim Trend"); el bloque B es un conjunto histórico más amplio. RO 12M viene
comprimido en un .zip con un único CSV adentro; `read_ro` lo descomprime en
memoria de forma transparente.

Esto importa mucho: `csv.DictReader` colapsa los encabezados duplicados y se
queda **sólo con el bloque B**, de modo que cualquier extracción basada en
DictReader lee el conjunto equivocado en silencio y nunca cuadra con el
reporte. `read_ro()` lee por posición y devuelve el bloque A por defecto.

Además los campos `Comment` contienen saltos de línea, así que el conteo de
líneas físicas del archivo (5,169 en RO 3M) no es el número de registros (900).
"""

import csv
import io
import sys
import zipfile

# El separador de los dos bloques es la reaparición de la primera columna, 'No.'
BLOCK_KEY = 'No.'


def _split_blocks(header):
    """Devuelve los índices donde arranca cada bloque del esquema."""
    return [i for i, h in enumerate(header) if h.strip() == BLOCK_KEY] or [0]


def _open_text(path):
    """Abre un CSV normal o, si viene comprimido (RO 12M), el único CSV dentro del zip."""
    if str(path).lower().endswith('.zip'):
        zf = zipfile.ZipFile(path)
        names = [n for n in zf.namelist() if n.lower().endswith('.csv')]
        if len(names) != 1:
            raise ValueError(f'{path}: se esperaba 1 CSV dentro del zip, hay {len(names)}')
        return io.TextIOWrapper(zf.open(names[0]), encoding='utf-8-sig', errors='replace')
    return open(path, encoding='utf-8-sig', errors='replace', newline='')


def read_ro(path, block='A'):
    """
    Lee un export RO (CSV o el zip que lo envuelve) y devuelve (registros, campos).

    block='A' → corte oficial vigente (por defecto, el que cuadra con el reporte)
    block='B' → conjunto histórico ampliado
    block='raw' → todas las columnas, con sufijo para los duplicados
    """
    with _open_text(path) as fh:
        reader = csv.reader(fh)
        header = next(reader)
        rows = [r for r in reader if any((c or '').strip() for c in r)]

    starts = _split_blocks(header)
    if block == 'raw' or len(starts) == 1:
        lo, hi = 0, len(header)
    elif block == 'A':
        lo, hi = starts[0], (starts[1] if len(starts) > 1 else len(header))
    elif block == 'B':
        lo, hi = starts[1], (starts[2] if len(starts) > 2 else len(header))
    else:
        raise ValueError(f'bloque desconocido: {block!r}')

    fields = [h.strip() for h in header[lo:hi]]
    records = []
    for r in rows:
        rec = {}
        for offset, name in enumerate(fields):
            idx = lo + offset
            rec[name] = (r[idx] if idx < len(r) else '') or ''
        # Una fila pertenece al bloque sólo si su columna clave viene poblada;
        # el bloque A queda vacío en las filas que no forman parte del corte.
        if rec.get(BLOCK_KEY, '').strip():
            records.append(rec)
    return records, fields


def to_num(value):
    """
    Coerción numérica estricta.

    Qualitivity usa '-1' y '' como centinelas de "sin dato". Devolverlos como 0
    (o dejarlos como string) es lo que producía sumas por concatenación y
    'NaN' en pantalla, así que aquí se convierten en None explícito.
    """
    if value is None:
        return None
    s = str(value).strip()
    if s in ('', '-1', 'None', 'nan', '#N/A'):
        return None
    try:
        return int(s)
    except ValueError:
        pass
    try:
        return float(s)
    except ValueError:
        return None


def normalize_part(name):
    """
    Nombre de parte canónico para agrupar.

    El reporte agrupa la variante con sufijo '(KMA)' junto con la parte base:
    en 3M Jul'26, WHEEL ALIGNMENT (KMA) [5,3,0,0] + WHEEL ALIGNMENT [2,1,2,0]
    da exactamente el [7,4,2,0] publicado.
    """
    s = (name or '').strip()
    if s.endswith('(KMA)'):
        s = s[:-len('(KMA)')].strip()
    return s


if __name__ == '__main__':
    for path in sys.argv[1:]:
        for blk in ('A', 'B'):
            recs, fields = read_ro(path, blk)
            print(f'{path} · bloque {blk}: {len(recs)} registros, {len(fields)} columnas')
