#!/usr/bin/env python3
"""
build.py — Ensambla src/ en el archivo único qualitivity_intelligence_v6.html.

El entregable para KMX sigue siendo un solo HTML de doble clic: este script
sólo existe para que EDITAR el código no signifique trabajar dentro de un
archivo de 5,395 líneas. Cada corte entre módulos cae exactamente en un
marcador de sección que el código ya traía (`// ===== NOMBRE =====`); no se
movió una sola línea al modularizar (ver migrate.py en el historial si hace
falta repetir el proceso sobre otro corte).

Uso
---
    python3 extract_qualitivity.py --out src/data/qualitivity_data.js   # una vez, o tras nuevo export
    python3 build.py                        # -> qualitivity_intelligence_v6.html
    python3 build.py --out dist/w2p.html    # salida alternativa (no toca el archivo tracked)
    python3 build.py --check                # sólo valida que todo exista y el JS compile
"""
import argparse
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
DEFAULT_OUT = os.path.join(ROOT, 'qualitivity_intelligence_v6.html')

# Orden exacto en que los módulos JS se concatenan — debe coincidir con el
# orden original del archivo monolítico, porque hay dependencias de
# declaración (una función usada en 04-generators.js puede estar definida en
# 02-engine-viz.js, por ejemplo `flt`/`ag`).
JS_MODULES = [
    '00-data-config.js',
    '01-nlp.js',
    '02-engine-viz.js',
    '03-stats-climate.js',
    '04-generators.js',
    '05-analytics-features.js',
    '06-kpi-dashboard.js',
    '07-app-features.js',
    '08-init-import.js',
]

# El bloque de datos de Qualitivity (confidencial, con VIN y códigos de
# dealer) se regenera con extract_qualitivity.py y NO se commitea suelto;
# las constantes climáticas NOAA son estáticas y sí viven en el repo.
DATA_QUALITIVITY = os.path.join(SRC, 'data', 'qualitivity_data.js')
DATA_CLIMATE = os.path.join(SRC, 'data', 'climate_constants.js')


def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def build(out_path):
    missing = [p for p in (DATA_QUALITIVITY, DATA_CLIMATE) if not os.path.exists(p)]
    if missing:
        for p in missing:
            print(f'falta: {p}', file=sys.stderr)
        print('\nGenera el bloque de datos primero:\n'
              '  python3 extract_qualitivity.py --out src/data/qualitivity_data.js',
              file=sys.stderr)
        return 1

    shell = read(os.path.join(SRC, 'shell.html'))
    styles = read(os.path.join(SRC, 'styles.css')).rstrip('\n')
    vendor_qrcode = read(os.path.join(SRC, 'vendor', 'qrcode.js')).rstrip('\n')
    data = (read(DATA_QUALITIVITY).rstrip('\n') + '\n\n'
            + read(DATA_CLIMATE).rstrip('\n'))
    app = ''.join(read(os.path.join(SRC, 'js', m)) for m in JS_MODULES).rstrip('\n')

    out = (shell
           .replace('{{STYLES}}', styles)
           .replace('{{DATA}}', data)
           .replace('{{VENDOR_QRCODE}}', vendor_qrcode)
           .replace('{{APP}}', app))

    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(out)
    print(f'escrito: {out_path} ({len(out)/1024/1024:.1f} MB)', file=sys.stderr)
    return 0


def check():
    """Valida que cada módulo JS compile por separado (node --check) antes de ensamblar."""
    ok = True
    for m in JS_MODULES:
        path = os.path.join(SRC, 'js', m)
        r = subprocess.run(['node', '--check', path], capture_output=True, text=True)
        status = 'OK' if r.returncode == 0 else 'FALLA'
        print(f'{m}: {status}', file=sys.stderr)
        if r.returncode != 0:
            print(r.stderr, file=sys.stderr)
            ok = False
    vendor = os.path.join(SRC, 'vendor', 'qrcode.js')
    r = subprocess.run(['node', '--check', vendor], capture_output=True, text=True)
    print(f'vendor/qrcode.js: {"OK" if r.returncode == 0 else "FALLA"}', file=sys.stderr)
    ok = ok and r.returncode == 0
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                  formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--out', default=DEFAULT_OUT, help='archivo de salida')
    ap.add_argument('--check', action='store_true',
                     help='sólo valida que cada módulo JS compile, no ensambla nada')
    args = ap.parse_args()

    if args.check:
        sys.exit(check())
    sys.exit(build(args.out))


if __name__ == '__main__':
    main()
