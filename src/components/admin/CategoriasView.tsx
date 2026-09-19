import React, { useState } from 'react';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  AlertCircle,
  Package,
} from 'lucide-react';
import { Categoria, Producto } from '../../types';
import { categoriasService } from '../../services/categoriasService';

interface CategoriasViewProps {
  categorias: Categoria[];
  productos: Producto[];
  onRefreshData?: () => void;
}

export const CategoriasView: React.FC<CategoriasViewProps> = ({
  categorias,
  productos,
  onRefreshData,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Categoria | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setEditingCat(null);
    setNombre('');
    setDescripcion('');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (cat: Categoria) => {
    setEditingCat(cat);
    setNombre(cat.nombre);
    setDescripcion(cat.descripcion || '');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorMsg('El nombre de la categoría es requerido.');
      return;
    }
    setSaving(true);
    setErrorMsg(null);

    try {
      if (editingCat?.id) {
        await categoriasService.actualizarCategoria(editingCat.id, {
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
        });
      } else {
        await categoriasService.crearCategoria({
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          activo: true,
        });
      }

      setModalOpen(false);
      onRefreshData?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar categoría');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: Categoria) => {
    if (!cat.id) return;
    const prodsInCat = productos.filter((p) => p.categoria === cat.nombre);
    if (prodsInCat.length > 0) {
      if (!window.confirm(`La categoría "${cat.nombre}" tiene ${prodsInCat.length} producto(s) asignado(s). ¿Deseas eliminarla de todas formas? Se eliminará de Firestore y los productos podrán ser reasignados.`)) {
        return;
      }
    } else {
      if (!window.confirm(`¿Seguro que deseas eliminar la categoría "${cat.nombre}"? Se borrará de la base de datos Firestore.`)) {
        return;
      }
    }

    try {
      await categoriasService.eliminarCategoria(cat.id);
      onRefreshData?.();
    } catch (err: any) {
      alert('Error al eliminar categoría: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2">
            <FolderTree className="w-7 h-7 text-amber-600" />
            <span>Gestión de Categorías</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Organiza las secciones del menú artesanal y clasifica los productos de Delicias Belgi.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold shadow-md transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Categoría</span>
        </button>
      </div>

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categorias.map((cat) => {
          const prodsCount = productos.filter((p) => p.categoria === cat.nombre).length;
          return (
            <div
              key={cat.id || cat.nombre}
              className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between hover:border-amber-400 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
                    <FolderTree className="w-5 h-5" />
                  </span>
                  <span className="text-[11px] font-bold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-lg">
                    {prodsCount} {prodsCount === 1 ? 'producto' : 'productos'}
                  </span>
                </div>

                <h3 className="font-serif text-base font-bold text-stone-900 mt-3">
                  {cat.nombre}
                </h3>
                <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                  {cat.descripcion || 'Sin descripción'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(cat)}
                  className="p-1.5 rounded-lg text-stone-500 hover:text-amber-900 hover:bg-amber-50 cursor-pointer"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(cat)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif font-bold text-base text-stone-900">
                {editingCat ? 'Editar Categoría' : 'Nueva Categoría'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Nombre de la Categoría *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Galletas Finas, Postres Belgas..."
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Descripción</label>
                <textarea
                  rows={2}
                  placeholder="Breve detalle de los productos en esta categoría..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-amber-900 hover:bg-amber-800 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : editingCat ? 'Actualizar' : 'Crear Categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
