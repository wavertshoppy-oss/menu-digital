import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase';
import { UserAuth, UserRole } from '../types';
import { usuariosService, normalizeRole } from './usuariosService';

const SESSION_KEY = 'delicias_belgi_auth_session';

export const authService = {
  onAuthStateChanged(callback: (user: UserAuth | null) => void): () => void {
    return this.subscribe(callback);
  },

  suscribirUsuario(callback: (user: UserAuth | null) => void): () => void {
    return this.subscribe(callback);
  },

  /**
   * Subscribes to Firebase Authentication state changes for real authenticated users.
   */
  subscribe(callback: (user: UserAuth | null) => void): () => void {
    if (isFirebaseConfigured() && auth) {
      return onAuthStateChanged(auth, async (firebaseUser: User | null) => {
        if (firebaseUser && firebaseUser.email) {
          try {
            const role = await usuariosService.getUserRole(
              firebaseUser.uid,
              firebaseUser.email,
              firebaseUser.displayName
            );
            const userAuth: UserAuth = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
              role,
            };
            callback(userAuth);
          } catch (err: any) {
            if (err.message === 'USUARIO_DESACTIVADO') {
              console.warn('User account is deactivated. Signing out.');
              try {
                if (auth) await signOut(auth);
              } catch {}
            }
            callback(null);
          }
        } else {
          callback(null);
        }
      });
    }

    // Fallback session handling when Firebase auth is connecting or in local fallback
    const checkSession = async () => {
      try {
        const saved = sessionStorage.getItem(SESSION_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const verifiedRole = await usuariosService.getUserRole(parsed.uid, parsed.email);
          callback({
            ...parsed,
            role: verifiedRole,
          });
        } else {
          callback(null);
        }
      } catch {
        callback(null);
      }
    };

    checkSession();
    const handleStorage = () => checkSession();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  },

  /**
   * Real Email + Password authentication.
   */
  async login(email: string, password: string): Promise<UserAuth> {
    if (!email || !password) {
      throw new Error('Por favor ingrese correo y contraseña.');
    }

    const cleanEmail = email.trim().toLowerCase();

    if (isFirebaseConfigured() && auth) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const u = userCredential.user;
        let role: UserRole = 'cajero';
        try {
          role = await usuariosService.getUserRole(u.uid, u.email, u.displayName);
        } catch (roleErr: any) {
          if (roleErr.message === 'USUARIO_DESACTIVADO') {
            if (auth) await signOut(auth);
            throw new Error('Esta cuenta ha sido desactivada por el Administrador. No tienes acceso al sistema.');
          }
          throw roleErr;
        }

        const userAuth: UserAuth = {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName || (u.email ? u.email.split('@')[0] : 'Usuario'),
          role,
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(userAuth));
        return userAuth;
      } catch (error: any) {
        if (error.message && error.message.includes('desactivada')) {
          throw error;
        }
        let msg = 'Error al iniciar sesión.';
        if (
          error.code === 'auth/invalid-credential' ||
          error.code === 'auth/user-not-found' ||
          error.code === 'auth/wrong-password'
        ) {
          msg = 'Credenciales inválidas. Verifique correo y contraseña.';
        } else if (error.code === 'auth/invalid-email') {
          msg = 'El formato del correo no es válido.';
        } else if (error.code === 'auth/unauthorized-domain') {
          msg =
            'Dominio no autorizado en Firebase Auth. Agregue el dominio en Firebase Console > Authentication > Configuración > Dominios autorizados.';
        } else if (error.code === 'auth/too-many-requests') {
          msg = 'Demasiados intentos de inicio de sesión fallidos. Espere un momento y vuelva a intentar.';
        } else if (error.code === 'auth/network-request-failed') {
          msg = 'Error de conexión de red al comunicarse con Firebase.';
        } else if (error.message) {
          msg = error.message;
        }
        throw new Error(msg);
      }
    }

    // Local / Offline validation fallback
    if (!cleanEmail.includes('@')) {
      throw new Error('Por favor ingrese un correo electrónico válido.');
    }
    if (password.length < 4) {
      throw new Error('La contraseña debe tener al menos 4 caracteres.');
    }

    const role = await usuariosService.getUserRole('usr-' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'), cleanEmail);
    const localUser: UserAuth = {
      uid: 'usr-' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'),
      email: cleanEmail,
      displayName: cleanEmail.split('@')[0],
      role,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(localUser));
    return localUser;
  },

  async logout(): Promise<void> {
    if (isFirebaseConfigured() && auth) {
      try {
        await signOut(auth);
      } catch (e) {
        console.warn('Error signing out of Firebase:', e);
      }
    }
    sessionStorage.removeItem(SESSION_KEY);
  },

  getCurrentUser(): UserAuth | null {
    if (isFirebaseConfigured() && auth && auth.currentUser && auth.currentUser.email) {
      return {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        displayName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
        role: 'admin', // Will be resolved asynchronously via onAuthStateChanged
      };
    }
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          role: normalizeRole(parsed.role),
        };
      }
      return null;
    } catch {
      return null;
    }
  },
};
