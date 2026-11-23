'use strict';

// Login y guardado compartido. Las contraseñas nunca se guardan en el repositorio.
const authGate = document.getElementById('authGate');
const authMessage = document.getElementById('authLoading');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const mainApp = document.getElementById('mainApp');
const syncStatus = document.getElementById('syncStatus');
const config = window.GEL_STUDIO_FIREBASE_CONFIG;

function showGate(message = '', canLogin = false) {
  mainApp.hidden = true;
  authGate.hidden = false;
  loginForm.hidden = !canLogin;
  authMessage.hidden = !message;
  authMessage.textContent = message;
}

function showInventory() {
  authGate.hidden = true;
  mainApp.hidden = false;
}

function authError(error) {
  const code = error?.code || '';
  if (['auth/invalid-credential','auth/wrong-password','auth/user-not-found'].includes(code)) return 'Correo o contraseña incorrectos.';
  if (code === 'auth/too-many-requests') return 'Demasiados intentos. Inténtalo más tarde.';
  if (code === 'auth/network-request-failed') return 'No hay conexión a internet.';
  if (code === 'auth/operation-not-allowed') return 'Activa Email/Password en Firebase Authentication.';
  return error?.message || 'No se pudo conectar a Firebase.';
}

async function start() {
  if (!config || !config.apiKey || /PEGA_AQUI/.test(config.apiKey) || !config.projectId || /PEGA_AQUI/.test(config.projectId)) {
    showGate('Falta configurar Firebase. Lee el archivo INSTRUCCIONES-FIREBASE.md que viene en el ZIP.');
    return;
  }
  try {
    // Se importan dinámicamente para mostrar un error claro si no hay internet o si falla la CDN.
    const [fapp, fauth, fdb] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js')
    ]);
    const app = fapp.initializeApp(config);
    const auth = fauth.getAuth(app);
    const db = fdb.getFirestore(app);
    let currentUser = null;
    let unsubscribe = null;
    let loaded = false;

    async function replaceAll(entries) {
      if (!currentUser || !loaded) throw Error('El inventario todavía no está listo.');
      if (!navigator.onLine) throw Error('Debes conectarte a internet para reemplazar el inventario.');
      // Primero leemos los documentos existentes. En lotes de hasta 400, para no exceder límites.
      const col = fdb.collection(db, 'inventories', currentUser.uid, 'gels');
      const existing = await fdb.getDocs(col);
      const desiredIds = new Set(entries.map(item => item.id));
      const operations = [
        ...existing.docs.filter(d => !desiredIds.has(d.id)).map(d => ({type:'delete', ref:d.ref})),
        ...entries.map(item => ({type:'set', ref:fdb.doc(col,item.id), item}))
      ];
      for (let i = 0; i < operations.length; i += 400) {
        const batch = fdb.writeBatch(db);
        operations.slice(i,i+400).forEach(op => op.type === 'delete' ? batch.delete(op.ref) : batch.set(op.ref,op.item));
        await batch.commit();
      }
      // Si no hay registros, no se necesitan escrituras.
    }

    window.gelStudioCloud = {
      async saveItem(item) {
        if (!currentUser || !loaded) throw Error('Inicia sesión y espera a que cargue el inventario.');
        if (!navigator.onLine) throw Error('Conéctate a internet para guardar.');
        await fdb.setDoc(fdb.doc(db, 'inventories',currentUser.uid,'gels',item.id),item);
      },
      async removeItem(id) {
        if (!currentUser || !loaded) throw Error('Inicia sesión y espera a que cargue el inventario.');
        if (!navigator.onLine) throw Error('Conéctate a internet para eliminar.');
        await fdb.deleteDoc(fdb.doc(db,'inventories',currentUser.uid,'gels',id));
      },
      replaceAll
    };

    loginForm.addEventListener('submit', async event => {
      event.preventDefault();
      loginError.hidden = true;
      const button = document.getElementById('loginBtn');
      button.disabled = true;
      button.textContent = 'Entrando…';
      try {
        await fauth.setPersistence(auth, fauth.browserLocalPersistence);
        await fauth.signInWithEmailAndPassword(auth,
          document.getElementById('loginEmail').value.trim(),
          document.getElementById('loginPassword').value);
        document.getElementById('loginPassword').value = '';
      } catch (error) {
        loginError.textContent = authError(error);
        loginError.hidden = false;
      } finally {
        button.disabled = false;
        button.textContent = 'Entrar a mi inventario';
      }
    });
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      try { await fauth.signOut(auth); } catch (error) { alert(authError(error)); }
    });

    fauth.onAuthStateChanged(auth, user => {
      if (unsubscribe) { unsubscribe(); unsubscribe = null; }
      currentUser = user;
      loaded = false;
      window.gelStudioApp.setSignedOut();
      if (!user) {
        showGate('',true);
        loginError.hidden = true;
        return;
      }
      showGate('Cargando tu inventario compartido…');
      const col = fdb.collection(db,'inventories',user.uid,'gels');
      unsubscribe = fdb.onSnapshot(col,{includeMetadataChanges:true}, snapshot => {
        if (auth.currentUser?.uid !== user.uid) return;
        loaded = true;
        window.gelStudioApp.setInventory(snapshot.docs.map(d => ({...d.data(), id:d.id})));
        syncStatus.textContent = snapshot.metadata.fromCache ? 'Sin conexión · datos guardados' : (snapshot.metadata.hasPendingWrites ? 'Sincronizando…' : 'Sincronizado');
        showInventory();
      }, async error => {
        loaded = false;
        if (error.code === 'permission-denied') {
          showGate('Esta cuenta no tiene permiso. Revisa el UID en las reglas de Firestore.');
          // Mostrar una salida de emergencia sin dejar la información visible.
          authMessage.innerHTML = 'Esta cuenta no tiene permiso. Revisa el UID en las reglas de Firestore. <button id="emergencyLogout" class="text-button" type="button">Cambiar usuario</button>';
          document.getElementById('emergencyLogout').addEventListener('click',() => fauth.signOut(auth));
        } else showGate('No se pudo cargar el inventario: '+authError(error));
      });
    }, error => showGate('Error al verificar la cuenta: '+authError(error)));
  } catch (error) {
    console.error('Firebase no está disponible',error);
    showGate('No se pudo cargar Firebase. Comprueba que la configuración esté correcta y que tengas internet. Detalle: '+authError(error));
  }
}

start();
