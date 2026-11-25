"""
EL LOGO, ESCRIBIÉNDOSE. Saca de cada letra del logo de la escuela
(public/brand/escuela-emprendimiento.webp) la línea central de su pincel y la
parte en trazos, en el orden en que se escribiría: primero "ESCUELA DE" (en
blanco), después "EMPRENDIMIENTO" (en amarillo); cada letra de izquierda a
derecha, y dentro de ella el palo antes que los brazos, de arriba abajo.

La portada usa esos trazos como máscara: al dibujarlos, se va destapando el
logo de verdad, como si lo pintara una mano (src/lib/escritura.ts).

Uso: python3 scripts/logo/trazar.py   (necesita numpy, scipy, scikit-image)
Sale: src/data/trazo-escuela.json
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage
from skimage.morphology import skeletonize

RAIZ = Path(__file__).resolve().parents[2]
LOGO = RAIZ / "public/brand/escuela-emprendimiento.webp"
SALIDA = RAIZ / "src/data/trazo-escuela.json"

im = np.array(Image.open(LOGO).convert("RGBA"))
alto, ancho = im.shape[:2]
tinta = im[..., 3] > 90
blanco = tinta & (im[..., 2] > 170)
amarillo = tinta & ~blanco

from skan import Skeleton, summarize


def ramas(esq, minimo):
    """
    Las ramas del esqueleto (skan: entre extremos y cruces, y los lazos
    cerrados de la O o la D), sin las barbas cortas que deja en los bordes
    del pincel.
    """
    for _ in range(8):
        esqueleto = Skeleton(esq)
        resumen = summarize(esqueleto, separator="_")
        barbas = resumen.index[(resumen["branch_type"] == 1) & (resumen["branch_distance"] < minimo)].tolist()
        if not barbas or esqueleto.n_paths <= 1:
            break
        esq = esqueleto.prune_paths(barbas).skeleton_image.astype(bool)
        esq = skeletonize(esq)
    esqueleto = Skeleton(esq)
    tipos = summarize(esqueleto, separator="_")["branch_type"].tolist()
    salida = []
    for i in range(esqueleto.n_paths):
        camino = [tuple(int(v) for v in p) for p in esqueleto.path_coordinates(i)]
        if tipos[i] == 3 and len(camino) > 2:
            # Un lazo se escribe desde arriba.
            arriba = min(range(len(camino)), key=lambda k: (camino[k][0], camino[k][1]))
            camino = camino[arriba:] + camino[1 : arriba + 1]
        salida.append(camino)
    return salida


def simplificar(puntos, tolerancia=1.2):
    """Ramer-Douglas-Peucker."""
    if len(puntos) < 3:
        return puntos
    a, b = np.array(puntos[0], float), np.array(puntos[-1], float)
    # Un lazo empieza y acaba en el mismo sitio: se simplifica por mitades.
    if np.hypot(*(b - a)) < 3 and len(puntos) > 6:
        mitad = len(puntos) // 2
        return simplificar(puntos[: mitad + 1], tolerancia)[:-1] + simplificar(puntos[mitad:], tolerancia)
    ab = b - a
    largo = np.hypot(*ab) or 1.0
    distancias = [abs(ab[0] * (p[1] - a[1]) - ab[1] * (p[0] - a[0])) / largo for p in puntos]
    i = int(np.argmax(distancias))
    if distancias[i] > tolerancia:
        return simplificar(puntos[: i + 1], tolerancia)[:-1] + simplificar(puntos[i:], tolerancia)
    return [puntos[0], puntos[-1]]


def orientar(camino):
    """Como se escribe: los trazos más tumbados, de izquierda a derecha; los demás, de arriba abajo."""
    (y0, x0), (y1, x1) = camino[0], camino[-1]
    if camino[0] == camino[-1]:
        return camino
    tumbado = abs(x1 - x0) > abs(y1 - y0) * 1.2
    if (tumbado and x1 < x0) or (not tumbado and y1 < y0):
        return camino[::-1]
    return camino


trazos = []
for color, mascara in (("blanco", blanco), ("amarillo", amarillo)):
    mascara = ndimage.binary_opening(ndimage.binary_closing(mascara, iterations=2), iterations=1)
    etiquetas, n = ndimage.label(mascara)
    piezas = [(s, i + 1) for i, s in enumerate(ndimage.find_objects(etiquetas)) if (etiquetas[s] == i + 1).sum() > 250]
    piezas.sort(key=lambda p: p[0][1].start)
    for corte, etiqueta in piezas:
        letra = etiquetas == etiqueta
        grosor = ndimage.distance_transform_edt(letra)
        caminos = [orientar(c) for c in ramas(skeletonize(letra), minimo=float(np.percentile(grosor[letra], 95)) * 1.6) if len(c) >= 4]
        # Dentro de la letra: primero lo que empieza más a la izquierda; a igualdad, lo de arriba.
        caminos.sort(key=lambda c: (round(min(p[1] for p in c) / 18), min(p[0] for p in c)))
        for c in caminos:
            radio = max(grosor[p] for p in c)
            pts = simplificar(c)
            d = "M" + " L".join(f"{x:.0f} {y:.0f}" for y, x in pts)
            trazos.append({"color": color, "d": d, "ancho": round(float(radio) * 2 + 7, 1), "largo": len(c)})

SALIDA.write_text(json.dumps({"ancho": ancho, "alto": alto, "trazos": trazos}, ensure_ascii=False))
print(f"{len(trazos)} trazos, {sum(t['largo'] for t in trazos)} px de recorrido -> {SALIDA.relative_to(RAIZ)}", file=sys.stderr)
