import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  updateDoc,
  deleteDoc,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { UserRole, UsuarioDoc } from '../types';

const LOCAL_STORAGE_KEY = 'delicias_belgi_usuarios';

/**
 * Ensures strict enforcement of the ONLY TWO ALLOWED ROLES:
 * 1. 'admin' -> Administrador (Acceso total)
 * 2. 'cajero' -> Cajero (Acceso a Dashboard, Ventas e Inventario)
 */
export function normalizeRole(raw: any): UserRole {
  if (!raw) return 'cajero';
  const str = String(raw).trim().toLowerCase();
  if (str === 'admin' || str === 'administrador') {
    return 'admin';
  }
  return 'cajero';
}

export function getRoleDisplayName(role: UserRole | string): 'Administrador' | 'Cajero' {
  return normalizeRole(role) === 'admin' ? 'Administrador' : 'Cajero';
}

const DEFAULT_USUARIOS: UsuarioDoc[] = [
  {
    id: 'usr-admin-initial',
    uid: 'usr-admin-initial',
    email: 'admin@deliciasbelgi.com',
    nombre: 'Administrador Principal',
    role: 'admin',
    rol: 'admin',
    activo: true,
    fechaCreacion: '2026-01-01T08:00:00.000Z',
    createdAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'usr-cajero-initial',
    uid: 'usr-cajero-initial',
    email: 'caja@deliciasbelgi.com',
    nombre: 'Cajero Principal',
    role: 'cajero',
    rol: 'cajero',
    activo: true,
    fechaCreacion: '2026-01-01T08:00:00.000Z',
    createdAt: '2026-01-01T08:00:00.000Z',
  },
];

function getLocalUsuarios(): UsuarioDoc[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed: any[] = JSON.parse(raw);
      return parsed.map((u) => {
        const norm = normalizeRole(u.role || u.rol);
        return {
          ...u,
          uid: u.uid || u.id,
          id: u.uid || u.id,
          role: norm,
          rol: norm,
          activo: u.activo !== false,
          fechaCreacion: u.fechaCreacion || u.createdAt || new Date().toISOString(),
          createdAt: u.createdAt || u.fechaCreacion || new Date().toISOString(),
        };
      });
    }
  } catch (e) {
    console.warn('Error reading local usuarios:', e);
  }
  return DEFAULT_USUARIOS;
}

function saveLocalUsuarios(list: UsuarioDoc[]) {
  try {
    const normalized = list.map((u) => {
      const norm = normalizeRole(u.role || u.rol);
      return {
        ...u,
        uid: u.uid || u.id,
        id: u.uid || u.id,
        role: norm,
        rol: norm,
        activo: u.activo !== false,
        fechaCreacion: u.fechaCreacion || u.createdAt || new Date().toISOString(),
        createdAt: u.createdAt || u.fechaCreacion || new Date().toISOString(),
      };
    });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new Event('delicias_usuarios_changed'));
  } catch (e) {
    console.warn('Error saving local usuarios:', e);
  }
}

export const usuariosService = {
  normalizeRole,
  getRoleDisplayName,

  /**
   * Retrieves the role and profile for a given Firebase Auth UID.
   * If the document does not exist in the "usuarios" collection,
   * it securely initializes the document with UID as the key.
   */
  async getUserRole(uid: string, email?: string | null, displayName?: string | null): Promise<UserRole> {
    if (!uid) return 'cajero';

    const cleanEmail = (email || '').trim().toLowerCase();

    if (isFirebaseConfigured() && db) {
      try {
        const userDocRef = doc(db, 'usuarios', uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data.activo === false) {
            throw new Error('USUARIO_DESACTIVADO');
          }
          return normalizeRole(data.rol || data.role);
        }

        // The document does not exist yet in Firestore.
        // Determine the role for this initial document:
        const isKnownAdminEmail =
          cleanEmail === 'wavertshoppy@gmail.com' ||
          cleanEmail.includes('admin') ||
          cleanEmail.includes('administrador') ||
          cleanEmail.includes('gerente');

        const isKnownCajeroEmail =
          cleanEmail.includes('caj') ||
          cleanEmail.includes('caja') ||
          cleanEmail.includes('cajero');

        let assignedRole: UserRole = 'cajero';

        if (isKnownAdminEmail) {
          assignedRole = 'admin';
        } else if (isKnownCajeroEmail) {
          assignedRole = 'cajero';
        } else {
          // If no hint in email, check if there are any admin users registered in Firestore
          try {
            const allUsersSnap = await getDocs(collection(db, 'usuarios'));
            let hasAnyAdmin = false;
            allUsersSnap.forEach((d) => {
              const uData = d.data();
              if (normalizeRole(uData.rol || uData.role) === 'admin' && uData.activo !== false) {
                hasAnyAdmin = true;
              }
            });
            // If the collection has no active administrator, configure this user as admin
            if (!hasAnyAdmin) {
              assignedRole = 'admin';
            }
          } catch (listErr) {
            console.warn('Could not query all users, checking default:', listErr);
          }
        }

        const now = new Date().toISOString();
        const initialDoc: UsuarioDoc = {
          uid,
          id: uid,
          email: cleanEmail,
          nombre: displayName || (cleanEmail ? cleanEmail.split('@')[0] : 'Usuario'),
          rol: assignedRole,
          role: assignedRole,
          activo: true,
          fechaCreacion: now,
          createdAt: now,
        };

        await setDoc(userDocRef, initialDoc);
        return assignedRole;
      } catch (err: any) {
        if (err.message === 'USUARIO_DESACTIVADO') {
          throw err;
        }
        console.warn('Error reading/writing user profile from Firestore:', err);
      }
    }

    // Local fallback
    const local = getLocalUsuarios();
    const found = local.find(
      (u) => (cleanEmail && u.email.toLowerCase() === cleanEmail) || u.uid === uid || u.id === uid
    );
    if (found) {
      if (found.activo === false) {
        throw new Error('USUARIO_DESACTIVADO');
      }
      return normalizeRole(found.rol || found.role);
    }
    if (
      cleanEmail === 'wavertshoppy@gmail.com' ||
      cleanEmail.includes('admin')
    ) {
      return 'admin';
    }
    return 'cajero';
  },

  /**
   * Fetches all users from the Firestore "usuarios" collection.
   */
  async getAllUsuarios(): Promise<UsuarioDoc[]> {
    if (isFirebaseConfigured() && db) {
      try {
        const colRef = collection(db, 'usuarios');
        const snap = await getDocs(colRef);
        const list: UsuarioDoc[] = [];
        snap.forEach((d) => {
          const data = d.data();
          const norm = normalizeRole(data.rol || data.role);
          list.push({
            id: d.id,
            uid: data.uid || d.id,
            email: data.email || '',
            nombre: data.nombre || (data.email ? data.email.split('@')[0] : 'Usuario'),
            role: norm,
            rol: norm,
            activo: data.activo !== false,
            fechaCreacion: data.fechaCreacion || data.createdAt || '',
            createdAt: data.createdAt || data.fechaCreacion || '',
          });
        });
        if (list.length > 0) {
          saveLocalUsuarios(list);
          return list;
        }
      } catch (err) {
        console.warn('Error getting all usuarios from Firestore:', err);
      }
    }
    return getLocalUsuarios();
  },

  /**
   * Updates only the role of a user in the Firestore "usuarios" collection.
   */
  async updateUserRole(uid: string, newRole: UserRole): Promise<void> {
    const verifiedRole = normalizeRole(newRole);
    if (isFirebaseConfigured() && db && uid) {
      try {
        const userDocRef = doc(db, 'usuarios', uid);
        await updateDoc(userDocRef, {
          rol: verifiedRole,
          role: verifiedRole,
        });
      } catch (err) {
        console.warn('Error updating user role in Firebase:', err);
      }
    }
    const local = getLocalUsuarios();
    const idx = local.findIndex((u) => u.uid === uid || u.id === uid);
    if (idx !== -1) {
      local[idx].role = verifiedRole;
      local[idx].rol = verifiedRole;
      saveLocalUsuarios(local);
    }
  },

  /**
   * Subscribes in real-time to the "usuarios" collection in Firestore.
   */
  subscribeToUsuarios(callback: (items: UsuarioDoc[]) => void): () => void {
    // 1. Emit local state immediately
    callback(getLocalUsuarios());

    // 2. Listen to local storage events
    const handler = () => callback(getLocalUsuarios());
    window.addEventListener('delicias_usuarios_changed', handler);

    let unsubFirestore: (() => void) | null = null;
    if (isFirebaseConfigured() && db) {
      try {
        const colRef = collection(db, 'usuarios');
        unsubFirestore = onSnapshot(
          colRef,
          (snap: QuerySnapshot<DocumentData>) => {
            if (!snap.empty) {
              const list: UsuarioDoc[] = [];
              snap.forEach((d) => {
                const data = d.data();
                const norm = normalizeRole(data.rol || data.role);
                list.push({
                  id: d.id,
                  uid: data.uid || d.id,
                  email: data.email || '',
                  nombre: data.nombre || '',
                  role: norm,
                  rol: norm,
                  activo: data.activo !== false,
                  fechaCreacion: data.fechaCreacion || data.createdAt || '',
                  createdAt: data.createdAt || data.fechaCreacion || '',
                });
              });
              saveLocalUsuarios(list);
              callback(list);
            }
          },
          (err: Error) => {
            console.warn('Error snapshot usuarios:', err);
            callback(getLocalUsuarios());
          }
        );
      } catch (e) {
        console.warn('Error setup snapshot usuarios:', e);
      }
    }

    return () => {
      window.removeEventListener('delicias_usuarios_changed', handler);
      if (unsubFirestore) unsubFirestore();
    };
  },

  /**
   * Creates or links a user document in the "usuarios" collection using the UID as the document ID.
   */
  async createUsuario(data: Partial<UsuarioDoc>): Promise<UsuarioDoc> {
    const rawUid = (data.uid || data.id || '').trim();
    const uid = rawUid || 'usr-' + Date.now();
    const verifiedRole = normalizeRole(data.rol || data.role);
    const cleanEmail = (data.email || '').trim().toLowerCase();
    const cleanNombre = (data.nombre || '').trim() || (cleanEmail ? cleanEmail.split('@')[0] : 'Usuario');
    const now = new Date().toISOString();

    const newDoc: UsuarioDoc = {
      id: uid,
      uid: uid,
      email: cleanEmail,
      nombre: cleanNombre,
      role: verifiedRole,
      rol: verifiedRole,
      activo: data.activo !== false,
      fechaCreacion: data.fechaCreacion || now,
      createdAt: data.createdAt || now,
    };

    if (isFirebaseConfigured() && db) {
      try {
        const userDocRef = doc(db, 'usuarios', uid);
        await setDoc(userDocRef, newDoc);
      } catch (err) {
        console.warn('Error creating user doc in Firestore:', err);
        throw err;
      }
    }

    const local = getLocalUsuarios();
    const existingIdx = local.findIndex((u) => u.uid === uid || u.id === uid);
    if (existingIdx !== -1) {
      local[existingIdx] = newDoc;
    } else {
      local.push(newDoc);
    }
    saveLocalUsuarios(local);
    return newDoc;
  },

  /**
   * Updates an existing user document in "usuarios".
   */
  async updateUsuario(idOrUid: string, data: Partial<UsuarioDoc>): Promise<void> {
    const patch: any = { ...data };
    if (data.role || data.rol) {
      const norm = normalizeRole(data.role || data.rol);
      patch.role = norm;
      patch.rol = norm;
    }

    if (isFirebaseConfigured() && db && idOrUid) {
      try {
        const userDocRef = doc(db, 'usuarios', idOrUid);
        await updateDoc(userDocRef, patch);
      } catch (err) {
        console.warn('Error updating user doc in Firestore:', err);
      }
    }

    const local = getLocalUsuarios();
    const idx = local.findIndex((u) => u.id === idOrUid || u.uid === idOrUid);
    if (idx !== -1) {
      local[idx] = {
        ...local[idx],
        ...patch,
      };
      saveLocalUsuarios(local);
    }
  },

  /**
   * Deletes a user profile document from "usuarios".
   */
  async deleteUsuario(idOrUid: string): Promise<void> {
    if (isFirebaseConfigured() && db && idOrUid) {
      try {
        const userDocRef = doc(db, 'usuarios', idOrUid);
        await deleteDoc(userDocRef);
      } catch (err) {
        console.warn('Error deleting user doc in Firestore:', err);
      }
    }
    const local = getLocalUsuarios().filter((u) => u.id !== idOrUid && u.uid !== idOrUid);
    saveLocalUsuarios(local);
  },

  // Aliases for compatibility
  async createUserDoc(email: string, nombre: string, role: UserRole): Promise<void> {
    await this.createUsuario({ email, nombre, role: normalizeRole(role), rol: normalizeRole(role) });
  },

  async deleteUserDoc(uid: string): Promise<void> {
    return this.deleteUsuario(uid);
  },

  suscribirUsuarios(callback: (items: UsuarioDoc[]) => void): () => void {
    return this.subscribeToUsuarios(callback);
  },

  async crearUsuario(data: Partial<UsuarioDoc>): Promise<UsuarioDoc> {
    return this.createUsuario(data);
  },

  async actualizarUsuario(id: string, data: Partial<UsuarioDoc>): Promise<void> {
    return this.updateUsuario(id, data);
  },

  async eliminarUsuario(id: string): Promise<void> {
    return this.deleteUsuario(id);
  },
};
