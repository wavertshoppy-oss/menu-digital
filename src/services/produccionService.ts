import {
  collection,
  addDoc,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { ProduccionRegistro, Producto } from '../types';
import { productosService } from './productosService';
import { inventarioService } from './inventarioService';

export const INITIAL_PRODUCCIONES: ProduccionRegistro[] = [
  {
    id: 'prod-init-1',
    productoId: 'bol-1',
    producto: 'Boli Gourmet Nutella & Frutos Rojos',
    cantidad: 40,
    fecha: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    usuario: 'Administrador Belgi',
    responsable: 'Maestro Heladero Carlos',
    observacion: 'Lote matutino con avellanas tostadas y reducción artesanal de frutos del bosque.',
    notas: 'Lote matutino con avellanas tostadas y reducción artesanal de frutos del bosque.',
    costo: 0.85,
    costoUnitario: 0.85,
    costoTotal: 34.0,
    lote: 'LOT-20260918-01',
    estado: 'completado',
    stockAnterior: 15,
    stockNuevo: 55,
    createdAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
  },
  {
    id: 'prod-init-2',
    productoId: 'bol-2',
    producto: 'Boli Artesanal Coco Tierno & Leche Condensada',
    cantidad: 35,
    fecha: new Date(Date.now() - 3600 * 1000 * 26).toISOString(),
    usuario: 'Administrador Belgi',
    responsable: 'Chef Pastelera Andrea',
    observacion: 'Elaboración con pulpa de coco 100% natural fresco recién rallado.',
    notas: 'Elaboración con pulpa de coco 100% natural fresco recién rallado.',
    costo: 0.70,
    costoUnitario: 0.70,
    costoTotal: 24.5,
    lote: 'LOT-20260917-02',
    estado: 'completado',
    stockAnterior: 10,
    stockNuevo: 45,
    createdAt: new Date(Date.now() - 3600 * 1000 * 26).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 26).toISOString(),
  },
  {
    id: 'prod-init-3',
    productoId: 'hel-1',
    producto: 'Helado Belga Chocolate Oscuro 70%',
    cantidad: 20,
    fecha: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
    usuario: 'Administrador Belgi',
    responsable: 'Maestro Heladero Carlos',
    observacion: 'Chocolatería belga premium importada fundida a temperatura controlada.',
    notas: 'Chocolatería belga premium importada fundida a temperatura controlada.',
    costo: 1.25,
    costoUnitario: 1.25,
    costoTotal: 25.0,
    lote: 'LOT-20260916-01',
    estado: 'completado',
    stockAnterior: 8,
    stockNuevo: 28,
    createdAt: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
  },
];

const LOCAL_STORAGE_KEY = 'delicias_belgi_producciones';

function getLocalProducciones(): ProduccionRegistro[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p, i) => normalizeProduccion(p.id || `loc-${i}`, p));
      }
    }
  } catch (e) {
    console.warn('LocalStorage error reading producciones:', e);
  }
  return INITIAL_PRODUCCIONES.map((p, i) => normalizeProduccion(p.id || `init-${i}`, p));
}

function saveLocalProducciones(items: ProduccionRegistro[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('delicias_producciones_changed'));
  } catch (e) {
    console.warn('LocalStorage error saving producciones:', e);
  }
}

function normalizeProduccion(id: string, data: any): ProduccionRegistro {
  const cantidad = Math.max(0, Number(data.cantidad) || 0);
  const costoUnitario =
    data.costoUnitario !== undefined
      ? Number(data.costoUnitario)
      : data.costo !== undefined
      ? Number(data.costo)
      : 0.85;
  const costoTotal =
    data.costoTotal !== undefined
      ? Number(data.costoTotal)
      : Math.round(costoUnitario * cantidad * 100) / 100;

  return {
    id,
    productoId: String(data.productoId || ''),
    producto: String(data.producto || data.productoNombre || 'Producto Elaborado'),
    cantidad,
    fecha: data.fecha || data.createdAt || new Date().toISOString(),
    usuario: String(data.usuario || data.responsable || data.usuarioEmail || 'Administrador'),
    responsable: String(data.responsable || data.usuario || 'Maestro Heladero'),
    observacion: data.observacion ? String(data.observacion) : (data.notas ? String(data.notas) : ''),
    notas: data.notas ? String(data.notas) : (data.observacion ? String(data.observacion) : ''),
    costo: costoUnitario,
    costoUnitario,
    costoTotal,
    lote: data.lote ? String(data.lote) : `LOT-${id.slice(-6).toUpperCase()}`,
    estado: data.estado ? String(data.estado) : 'completado',
    stockAnterior: data.stockAnterior !== undefined ? Number(data.stockAnterior) : undefined,
    stockNuevo: data.stockNuevo !== undefined ? Number(data.stockNuevo) : undefined,
    createdAt: data.createdAt || data.fecha || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

export const produccionService = {
  subscribeToProducciones(callback: (items: ProduccionRegistro[]) => void): () => void {
    // 1. Immediately emit local data so UI is instantly populated
    const initialLocal = getLocalProducciones();
    callback(initialLocal);

    // 2. Always listen to local custom events for instant optimistic updates
    const handler = () => {
      callback(getLocalProducciones());
    };
    window.addEventListener('delicias_producciones_changed', handler);

    let unsubFirestore: (() => void) | null = null;

    // 3. Connect to Firestore if configured
    if (isFirebaseConfigured() && db) {
      try {
        const colRef = collection(db, 'producciones');
        unsubFirestore = onSnapshot(
          colRef,
          (snapshot) => {
            if (snapshot.empty) {
              callback(getLocalProducciones());
              return;
            }
            const list: ProduccionRegistro[] = [];
            snapshot.forEach((d) => {
              list.push(normalizeProduccion(d.id, d.data()));
            });
            list.sort((a, b) => new Date(b.fecha || b.createdAt || '').getTime() - new Date(a.fecha || a.createdAt || '').getTime());
            saveLocalProducciones(list);
            callback(list);
          },
          (error) => {
            console.warn('Error onSnapshot producciones, using fallback:', error);
            callback(getLocalProducciones());
          }
        );
      } catch (err) {
        console.warn('Error in subscribeToProducciones:', err);
      }
    }

    return () => {
      window.removeEventListener('delicias_producciones_changed', handler);
      if (unsubFirestore) {
        unsubFirestore();
      }
    };
  },

  subscribeToProduccion(callback: (items: ProduccionRegistro[]) => void): () => void {
    return this.subscribeToProducciones(callback);
  },

  suscribirProduccion(callback: (items: ProduccionRegistro[]) => void): () => void {
    return this.subscribeToProducciones(callback);
  },

  suscribirProducciones(callback: (items: ProduccionRegistro[]) => void): () => void {
    return this.subscribeToProducciones(callback);
  },

  async registrarProduccion(
    productoOrData: Producto | {
      producto: string;
      productoId?: string;
      cantidad: number;
      lote?: string;
      costoUnitario?: number;
      costoTotal?: number;
      fecha?: string;
      responsable?: string;
      usuario?: string;
      notas?: string;
      observacion?: string;
      estado?: string;
    },
    cantidadParam?: number,
    fechaParam?: string,
    usuarioParam: string = 'Administrador',
    observacionParam: string = ''
  ): Promise<ProduccionRegistro> {
    const isObjectPayload = !('precio' in productoOrData) && typeof productoOrData === 'object' && 'cantidad' in productoOrData;

    let productoNombre = '';
    let productoId = '';
    let qty = 1;
    let fecha = new Date().toISOString();
    let usuario = usuarioParam;
    let observacion = observacionParam;
    let lote: string | undefined;
    let costoUnitario: number | undefined;
    let costoTotal: number | undefined;
    let estado: string | undefined;

    if (isObjectPayload) {
      const pData = productoOrData as any;
      productoNombre = pData.producto;
      productoId = pData.productoId || '';
      qty = Math.max(1, Number(pData.cantidad) || 1);
      fecha = pData.fecha || new Date().toISOString();
      usuario = pData.responsable || pData.usuario || usuarioParam;
      observacion = pData.notas || pData.observacion || '';
      lote = pData.lote;
      costoUnitario = pData.costoUnitario;
      costoTotal = pData.costoTotal;
      estado = pData.estado;
    } else {
      const prod = productoOrData as Producto;
      productoNombre = prod.nombre;
      productoId = prod.id || '';
      qty = Math.max(1, Number(cantidadParam) || 1);
      fecha = fechaParam || new Date().toISOString();
      usuario = usuarioParam;
      observacion = observacionParam;
    }

    const now = new Date().toISOString();
    let cantAnterior = 0;
    if (productoId) {
      const prod = await productosService.getProductoById(productoId);
      cantAnterior = Number(prod?.stock ?? 0);
    }
    const cantNueva = cantAnterior + qty;

    // 1. Update stock in product
    if (productoId) {
      await productosService.updateProducto(productoId, {
        stock: cantNueva,
        disponible: true,
      });
    }

    // 2. Register inventory movement
    await inventarioService.registrarMovimiento({
      productoId: productoId,
      producto: productoNombre,
      productoNombre: productoNombre,
      cantidadAnterior: cantAnterior,
      cantidadNueva: cantNueva,
      diferencia: qty,
      cantidad: qty,
      tipo: 'produccion',
      motivo: `Producción Lote ${lote || ''} (+${qty})`,
      usuario,
      responsable: usuario,
      fecha: fecha || now,
    });

    // 3. Save to Firestore producciones
    const payload = {
      productoId,
      producto: productoNombre,
      cantidad: qty,
      fecha: fecha || now,
      usuario,
      responsable: usuario,
      observacion: observacion.trim(),
      notas: observacion.trim(),
      lote: lote || `LOT-${Date.now().toString().slice(-6)}`,
      costoUnitario,
      costoTotal,
      estado: estado || 'completado',
      stockAnterior: cantAnterior,
      stockNuevo: cantNueva,
      createdAt: now,
      updatedAt: now,
    };

    let docId = 'prod-rec-' + Date.now();
    if (isFirebaseConfigured() && db) {
      try {
        const colRef = collection(db, 'producciones');
        const docRef = await addDoc(colRef, payload);
        docId = docRef.id;
      } catch (error: any) {
        console.warn('Aviso: Producción guardada en almacenamiento local (Firestore usando fallback):', error?.message || error);
      }
    }

    const created: ProduccionRegistro = { id: docId, ...payload };
    const local = getLocalProducciones();
    local.unshift(created);
    saveLocalProducciones(local);
    return created;
  },

  async editarProduccion(
    produccionId: string,
    producto: Producto,
    nuevaCantidad: number,
    nuevaFecha: string,
    observacion: string,
    usuario: string = 'Administrador'
  ): Promise<void> {
    const qty = Math.max(1, Number(nuevaCantidad));
    const now = new Date().toISOString();

    // Find original production to compute difference
    const all = getLocalProducciones();
    const original = all.find((p) => p.id === produccionId);
    const cantOriginal = original ? Number(original.cantidad) : qty;
    const diff = qty - cantOriginal;

    if (diff !== 0 && producto.id) {
      const currentStock = Number(producto.stock ?? 0);
      const updatedStock = Math.max(0, currentStock + diff);
      await productosService.updateProducto(producto.id, {
        stock: updatedStock,
        disponible: updatedStock > 0,
      });

      await inventarioService.registrarMovimiento({
        productoId: producto.id,
        producto: producto.nombre,
        productoNombre: producto.nombre,
        cantidadAnterior: currentStock,
        cantidadNueva: updatedStock,
        diferencia: diff,
        cantidad: Math.abs(diff),
        tipo: diff > 0 ? 'entrada' : 'salida',
        motivo: `Ajuste por edición de Producción (${diff > 0 ? '+' : ''}${diff})`,
        usuario,
        fecha: now,
      });
    }

    const updatePayload = {
      cantidad: qty,
      fecha: nuevaFecha || now,
      observacion: observacion.trim(),
      usuario,
      updatedAt: now,
    };

    if (isFirebaseConfigured() && db) {
      try {
        const docRef = doc(db, 'producciones', produccionId);
        await setDoc(docRef, updatePayload, { merge: true });
      } catch (e: any) {
        console.warn('Aviso: Producción editada en almacenamiento local (Firestore usando fallback):', e?.message || e);
      }
    }

    const idx = all.findIndex((p) => p.id === produccionId);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updatePayload };
      saveLocalProducciones(all);
    }
  },

  async eliminarProduccion(
    produccion: ProduccionRegistro,
    producto?: Producto,
    usuario: string = 'Administrador'
  ): Promise<void> {
    const qty = Number(produccion.cantidad) || 0;
    const now = new Date().toISOString();

    // Revert added stock
    if (producto && producto.id && qty > 0) {
      const currentStock = Number(producto.stock ?? 0);
      const revertedStock = Math.max(0, currentStock - qty);
      await productosService.updateProducto(producto.id, {
        stock: revertedStock,
        disponible: revertedStock > 0,
      });

      await inventarioService.registrarMovimiento({
        productoId: producto.id,
        producto: producto.nombre,
        productoNombre: producto.nombre,
        cantidadAnterior: currentStock,
        cantidadNueva: revertedStock,
        diferencia: -qty,
        cantidad: qty,
        tipo: 'salida',
        motivo: `Anulación de Producción (-${qty})`,
        usuario,
        fecha: now,
      });
    }

    if (produccion.id && isFirebaseConfigured() && db) {
      try {
        const docRef = doc(db, 'producciones', produccion.id);
        await deleteDoc(docRef);
      } catch (e: any) {
        console.warn('Aviso: Producción eliminada localmente (Firestore usando fallback):', e?.message || e);
      }
    }

    const all = getLocalProducciones();
    const filtered = all.filter((p) => p.id !== produccion.id);
    saveLocalProducciones(filtered);
  },

  async deleteProduccion(id: string, producto?: Producto, usuario: string = 'Administrador'): Promise<void> {
    const all = getLocalProducciones();
    const target = all.find((p) => p.id === id);
    if (target) {
      return this.eliminarProduccion(target, producto, usuario);
    }
    if (isFirebaseConfigured() && db && id) {
      try {
        const docRef = doc(db, 'producciones', id);
        await deleteDoc(docRef);
      } catch (e) {
        console.warn('Error deleting produccion from Firebase:', e);
      }
    }
    saveLocalProducciones(all.filter((p) => p.id !== id));
  },

  async clearAllProducciones(): Promise<void> {
    if (isFirebaseConfigured() && db) {
      try {
        const colRef = collection(db, 'producciones');
        const snap = await getDocs(colRef);
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
      } catch (e) {
        console.warn('Error clearing Firestore producciones:', e);
      }
    }
    saveLocalProducciones([]);
  },
};
