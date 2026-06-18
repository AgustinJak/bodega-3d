# Bodega 3D — Sendero 3D

Aplicación de escritorio para gestionar la biblioteca de modelos 3D de Sendero 3D:
catálogo de modelos, categorías, tags, imágenes, contador de impresiones, calculadora
de costos y apertura directa de los `.3mf` en BambuStudio.

Versión 2 — reescrita con Electron + React, manteniendo **100% compatibles los datos**
de la versión anterior.

## Descargar / Instalar

1. Andá a la sección **[Releases](../../releases)** y descargá el último `Bodega-3D-Setup-X.Y.Z.exe`.
2. Ejecutalo y seguí el asistente (se instala por usuario, no requiere administrador).
3. Listo: se crea el acceso directo en el Escritorio y el menú inicio.

## Actualizar desde la versión vieja (sin perder modelos)

Tus modelos y configuración **se conservan automáticamente**. Los datos viven en:

```
%APPDATA%\bodega-3d\storage\
   ├── bodega3d.db        (base de datos)
   ├── models\            (archivos 3D, thumbnails e imágenes)
   └── backups\           (copias automáticas, una por día)
```

La versión nueva usa exactamente esa misma carpeta, así que al abrirla vas a ver todos
tus modelos tal cual. Además, **hace un backup automático** de la base cada día al abrir,
por si acaso.

Podés instalar la versión nueva sin desinstalar la vieja (conviven). Una vez que confirmes
que todo está bien, podés desinstalar la vieja desde *Agregar o quitar programas*.

> 💡 Recomendación: antes de actualizar, hacé una copia manual de la carpeta
> `%APPDATA%\bodega-3d\storage` por las dudas.

## Funciones

- **Dashboard** con resumen (modelos, impresiones, categorías, tags).
- **Biblioteca de modelos**: grilla con búsqueda y filtro por categoría, detalle con
  galería de imágenes, tags, contador de impresiones e importación de `.3mf` / `.stl`.
- **Abrir en BambuStudio**: abre el archivo del modelo directamente en el slicer.
- **Calculadora de costos**: materiales, electricidad, desgaste de máquina y margen de error,
  con precios Minorista / Mayorista / Llaveros, y guardado del costeo por modelo.

## Desarrollo

Requiere Node.js. Desde la carpeta del proyecto:

```bash
npm install
npm run dev      # desarrollo con recarga en caliente
npm run build    # compila a out/
npm run dist     # genera el instalador Windows en dist/
```

---

Hecho para **Sendero 3D**.
