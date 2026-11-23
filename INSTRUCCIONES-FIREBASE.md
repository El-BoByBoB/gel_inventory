# Gel Studio: versión con Firebase configurado

Esta es la versión de Gel Studio para el proyecto Firebase `gel-studio`, enlazada a una única cuenta autorizada mediante su UID. Los archivos `firebase-config.js` y `firestore.rules` ya contienen los valores suministrados. **No contiene la contraseña del usuario.**

## Antes de publicar (importante)

1. En https://console.firebase.google.com/ abre el proyecto `gel-studio`.
2. En **Authentication → Sign-in method** comprueba que **Email/Password** está habilitado. No necesitas habilitar Google ni permitir registro público.
3. En **Authentication → Users** comprueba que el usuario creado tiene el UID `AJdPk0tjUZfQHRslx2OAjEOAxRC3`.
4. En **Firestore Database → Rules** asegúrate de haber pegado y **publicado** las reglas de `firestore.rules`. Son la barrera real de seguridad. No uses "allow read, write: if true" ni "if request.auth != null" sin el UID.
5. Si recibes el error `auth/unauthorized-domain`, ve a **Authentication → Settings → Authorized domains** y añade `el-bobybob.github.io`, sin `https://` y sin `/gel_inventory/`. El inicio de sesión con Email/Password no suele requerir este paso, pero es útil comprobar la configuración del dominio si Firebase informa ese error.
6. **Exporta un respaldo JSON** desde la aplicación anterior si ya hay registros. La versión nueva usa la base de datos en la nube, no muestra automáticamente los datos que tenías guardados en el navegador.

## Subir esta versión a GitHub Pages

1. Abre el repositorio https://github.com/El-BoByBoB/gel_inventory .
2. Descomprime el ZIP. En la carpeta descomprimida encontrarás `index.html`, `app.js`, `cloud.js`, `styles.css`, `firebase-config.js`, `service-worker.js`, `manifest.webmanifest` y `icons/`.
3. Sube **todos los archivos y la carpeta `icons/`** a la raíz de la rama `main` (no subas únicamente el ZIP). Reemplaza los archivos antiguos.
4. Haz **Commit changes**. GitHub Pages seguirá usando el mismo enlace: https://el-bobybob.github.io/gel_inventory/ .
5. Cuando aparezca la versión nueva, inicia sesión con el correo y contraseña del usuario creado en Firebase Authentication. No hay botón de registro. Una persona puede usar su cuenta en varios dispositivos, incluido iPhone, Android o tablet.

## Compartir un inventario entre dispositivos

- Crea un gel desde el celular y comprueba que aparece en la tablet.
- Para recuperar registros antiguos, tras iniciar sesión abre **Respaldos y datos**. Si usas el mismo navegador que antes, puede aparecer **Importar geles de la versión anterior**. Si no, importa el archivo JSON que exportaste.
- **Importar respaldo y borrar todo afectan al inventario compartido**. Haz una copia antes de hacerlo.
- Si la PWA instalada sigue mostrando la versión antigua, ciérrala y abre el sitio en el navegador. Puede tardar en activarse el nuevo service worker; recarga y vuelve a abrirla.

## Seguridad

- GitHub Pages y el código web son públicos, como tiene que ser para este alojamiento. La clave `apiKey` de Firebase **no es una contraseña secreta**. Tus datos se protegen con Authentication + las reglas publicadas que comprueban el UID.
- Una persona que no haya iniciado sesión no puede leer ni escribir los geles en Firestore. Una cuenta distinta tampoco podrá, aunque conozca el enlace o la configuración pública.
- La misma cuenta puede usarse simultáneamente en varios dispositivos. Quien conozca su contraseña puede entrar, así que no la compartas.
- El inicio de sesión y la sincronización requieren internet. La app puede mostrar caché previamente cargada, pero no promete modo sin conexión completo.
- El proyecto usa Firebase JS SDK modular desde la CDN de Google. No requiere Node.js, npm ni compilar el proyecto para GitHub Pages. La sección `getAnalytics` que muestra Firebase en el ejemplo original no es necesaria para esta app.

## Solución de problemas

- **Correo o contraseña incorrectos:** confirmar en Firebase Authentication → Users.
- **No se permite acceso / permission-denied:** confirmar las reglas publicadas y el UID de la cuenta.
- **No se pudo cargar Firebase:** comprobar conexión y que se hayan subido `cloud.js` y `firebase-config.js` a la raíz del repositorio.
- **Pantalla antigua:** comprobar GitHub → Actions → Pages build and deployment y recargar, por el caché del dispositivo.
