"""
Convierte "Info de emprendedores - Plataforma.xlsx" en src/data/emprendedores.json.

Paso semilla de la Fase 1. En la Fase 2 la fuente pasa a ser Strapi y este
script deja de correr, pero el JSON que produce define el shape que Strapi
debe replicar (ver src/lib/directorio.ts).

Uso:
    python scripts/importar_excel.py "C:/ruta/Info de emprendedores - Plataforma.xlsx"

Requiere: pip install openpyxl
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

import openpyxl

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "src" / "data" / "emprendedores.json"

# La hoja trae dos filas de relleno antes de los encabezados.
FILA_ENCABEZADOS = 3  # 1-indexed
COL_NUMERO, COL_NOMBRE, COL_COMUNIDAD = 2, 3, 4
COL_EMPRENDIMIENTO, COL_DESCRIPCION = 5, 6
COL_FOTO, COL_TELEFONO, COL_WHATSAPP = 7, 8, 9

# Categorías derivadas de la columna EMPRENDIMIENTO, que es texto libre.
# Se evalúan en orden: la primera que coincide gana.
REGLAS_CATEGORIA: list[tuple[str, tuple[str, ...]]] = [
    ("belleza", ("maquillad", "peluquer", "belleza", "cejas", "uñas")),
    ("confeccion", ("confeccion", "costura", "bordado", "corte", "sublimad")),
    ("construccion", ("obra", "construccion", "hormigon", "encofrado", "pilar",
                      "moldes", "soldadura", "maquinaria")),
    ("agropecuario", ("pollo", "cerdo", "arroz", "siembra", "cosecha",
                      "cria", "ganad", "cultiv")),
    ("comercio", ("tienda", "abarrotes", "venta", "servicios virtuales",
                  "recarga", "papeleria")),
]


def sin_tildes(texto: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", texto)
        if unicodedata.category(c) != "Mn"
    )


def crear_slug(nombre: str) -> str:
    """Nombre + primer apellido. 'Kerly Verónica Huacón Castro' -> 'kerly-huacon'."""
    partes = [p for p in sin_tildes(nombre).strip().split() if p]
    if len(partes) >= 4:
        elegidas = [partes[0], partes[2]]   # nombre + primer apellido
    elif len(partes) == 3:
        elegidas = [partes[0], partes[1]]
    else:
        elegidas = partes
    bruto = "-".join(elegidas).lower()
    return re.sub(r"[^a-z0-9]+", "-", bruto).strip("-")


def clasificar(emprendimiento: str) -> str | None:
    texto = sin_tildes(emprendimiento).lower()
    for categoria, palabras in REGLAS_CATEGORIA:
        if any(palabra in texto for palabra in palabras):
            return categoria
    return None


def normalizar_telefono(crudo: str | None) -> tuple[str | None, str | None]:
    """Devuelve (display, url_whatsapp). Ecuador: 12 dígitos con el 593."""
    if not crudo:
        return None, None
    digitos = re.sub(r"\D", "", str(crudo))
    if not digitos:
        return None, None
    if digitos.startswith("0"):           # formato local 09xxxxxxxx
        digitos = "593" + digitos[1:]
    if not digitos.startswith("593") or len(digitos) != 12:
        print(f"  ! teléfono con formato inesperado, se omite: {crudo!r}")
        return None, None
    display = f"+{digitos[:3]} {digitos[3:5]} {digitos[5:8]} {digitos[8:]}"
    return display, f"https://wa.me/{digitos}"


def extraer_id_drive(valor: str | None, enlace: str | None) -> str | None:
    for candidato in (enlace, valor):
        if not candidato:
            continue
        m = re.search(r"/d/([a-zA-Z0-9_-]{20,})", str(candidato))
        if m:
            return m.group(1)
    return None


def en_parrafos(texto: str | None) -> list[str]:
    if not texto:
        return []
    bloques = re.split(r"\n\s*\n", str(texto).strip())
    return [re.sub(r"\s*\n\s*", " ", b).strip() for b in bloques if b.strip()]


# Campos que no vienen del Excel sino de la edición del equipo: el resumen
# corto, el oficio reescrito, el nombre público y las fotos retiradas (p. ej.
# porque sale un menor). Se conservan entre importaciones, por slug.
CAMPOS_EDITORIALES = ("resumen", "oficio", "nombrePublico", "fotoRetirada")


def leer_editoriales() -> dict[str, dict]:
    if not SALIDA.exists():
        return {}
    previos = json.loads(SALIDA.read_text(encoding="utf-8"))
    return {
        r["slug"]: {c: r[c] for c in CAMPOS_EDITORIALES if c in r}
        for r in previos
    }


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 1

    ruta_excel = Path(sys.argv[1])
    if not ruta_excel.exists():
        print(f"No existe el archivo: {ruta_excel}")
        return 1

    hoja = openpyxl.load_workbook(ruta_excel, data_only=True).worksheets[0]

    editoriales = leer_editoriales()
    registros: list[dict] = []
    slugs_usados: set[str] = set()

    for fila in range(FILA_ENCABEZADOS + 1, hoja.max_row + 1):
        def celda(col: int):
            return hoja.cell(row=fila, column=col)

        nombre = celda(COL_NOMBRE).value
        if not nombre or not str(nombre).strip():
            continue

        nombre = re.sub(r"\s+", " ", str(nombre).strip())
        comunidad = str(celda(COL_COMUNIDAD).value or "").strip()
        emprendimiento = str(celda(COL_EMPRENDIMIENTO).value or "").strip()
        parrafos = en_parrafos(celda(COL_DESCRIPCION).value)

        c_foto = celda(COL_FOTO)
        drive_id = extraer_id_drive(
            c_foto.value, c_foto.hyperlink.target if c_foto.hyperlink else None
        )

        c_wa = celda(COL_WHATSAPP)
        crudo_wa = c_wa.hyperlink.target if c_wa.hyperlink else c_wa.value
        telefono, whatsapp = normalizar_telefono(celda(COL_TELEFONO).value)
        if not whatsapp and crudo_wa:
            # Caso Celia Morán: hay teléfono pero no enlace, o viceversa.
            telefono, whatsapp = normalizar_telefono(crudo_wa)

        slug = crear_slug(nombre)
        if slug in slugs_usados:
            slug = f"{slug}-{int(celda(COL_NUMERO).value or fila)}"
        slugs_usados.add(slug)

        categoria = clasificar(emprendimiento) if emprendimiento else None

        # Solo se publica quien tiene con qué llenar una ficha digna.
        publicado = bool(emprendimiento and parrafos and drive_id and categoria)

        if emprendimiento and not categoria:
            print(f"  ! sin categoría, queda despublicado: {nombre} — {emprendimiento!r}")

        registros.append({
            "slug": slug,
            "nombre": nombre,
            "comunidad": comunidad,
            "categoria": categoria,
            "emprendimiento": emprendimiento or None,
            "parrafos": parrafos,
            "fotoDriveId": drive_id,
            "foto": f"{slug}.jpg" if drive_id else None,
            "telefono": telefono,
            "whatsapp": whatsapp,
            "publicado": publicado,
            **editoriales.get(slug, {}),
        })
        if registros[-1].get("fotoRetirada"):
            registros[-1]["fotoDriveId"] = None
            registros[-1]["foto"] = None

    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(
        json.dumps(registros, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    publicados = [r for r in registros if r["publicado"]]
    print(f"\n{len(registros)} filas leídas, {len(publicados)} publicables -> {SALIDA}")
    for r in publicados:
        wa = "wa" if r["whatsapp"] else "SIN WHATSAPP"
        print(f"  · {r['slug']:<20} {r['categoria']:<14} {r['comunidad']:<12} {wa}")
    for r in registros:
        if not r["publicado"]:
            print(f"  · {r['slug']:<20} (borrador: datos incompletos)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
