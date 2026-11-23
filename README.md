# Gel Studio

Inventario gratuito de geles de uñas para iPhone y otros dispositivos, como **PWA** (aplicación web instalable). Sin cuentas ni servicios externos.

## Funciones

- Añadir, editar, duplicar y eliminar geles.
- Marca, código, nombre del color, muestra visual del tono, tipo de gel, precio, cantidad y notas.
- Agrupar por tipo, marca o color y filtrar por esas tres categorías.
- Buscar por marca, código, color, tipo y notas; ordenar por nombre, fecha, precio o cantidad.
- Contadores de productos, unidades y valor del inventario (USD).
- Guardado local, uso sin internet una vez instalada y archivos descargados para respaldar (JSON) o abrir en Excel/Sheets (CSV).

## Publicar GRATIS usando GitHub Pages

1. Crea un repositorio en GitHub, por ejemplo `gel-studio`.
2. Sube **el contenido de esta carpeta**, no el ZIP sin extraer. `index.html` debe quedar en la raíz del repositorio y la carpeta `icons/` debe permanecer intacta.
3. En el repositorio, abre **Settings → Pages → Build and deployment → Deploy from a branch**.
4. Selecciona `main` y `/(root)`, guarda y abre el enlace de GitHub Pages cuando esté publicado.
5. En el **iPhone**, abre el enlace en **Safari** y toca **Compartir → Añadir a pantalla de inicio**. Si se muestra **Abrir como app web**, déjalo activado y pulsa **Añadir**.

Alternativa: cualquier hosting HTTPS estático (por ejemplo, Netlify) funciona.

## Importante sobre tus datos

El inventario se almacena **en el dispositivo y en la instalación de la app**, no en GitHub ni en iCloud. La instalación desde la pantalla de inicio puede tener datos separados de los de la pestaña Safari. Cuando pruebes la app, instálala primero y añade los geles desde su icono.

**Haz respaldos JSON** desde el icono de descarga en la esquina superior derecha, sobre todo antes de borrar datos, cambiar teléfono, reinstalar o hacer cambios importantes. En iOS, el almacenamiento local no sustituye un respaldo en la nube. Exporta también CSV si necesitas una lista para Excel o Sheets.

Para probar en PC: sirve `python -m http.server 8000` dentro de la carpeta y abre `http://localhost:8000`. El modo sin conexión requiere servir la app por HTTP localhost o HTTPS, no por `file://`.

## Personalización

Código en HTML/CSS/JavaScript, sin librerías ni compilación. Puedes cambiar los colores y diseño en `styles.css` y ampliar funciones en `app.js`. El formato JSON de exportación facilita migrarlo a una futura app Flutter.
