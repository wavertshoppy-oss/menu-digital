import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  Image as ImageIcon,
  DollarSign,
  Boxes,
} from 'lucide-react';
import { Producto, Categoria } from '../../types';
import { productosService } from '../../services/productosService';
import { formatCurrency } from '../../utils/formatters';

interface ProductosViewProps {
  productos: Producto[];
  categorias: Categoria[];
  onRefreshData?: () => void;
}

export const ProductosView: React.FC<ProductosViewProps> = ({
  productos,
  categorias,
  onRefreshData,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Producto>>({
    nombre: '',
    categoria: 'Bolis Gourmet',
    precio: 2.5,
    costo: 1.0,
    stock: 20,
    stockMinimo: 5,
    descripcion: '',
    imagen: '',
    disponible: true,
  });

  const catOptions = useMemo(() => {
    if (categorias.length > 0) {
      return categorias.map((c) => c.nombre);
    }
    return ['Bolis Gourmet', 'Helados', 'Cheesecakes', 'Repostería', 'Bebidas'];
  }, [categorias]);

  const filteredProductos = useMemo(() => {
    return productos.filter((p) => {
      const matchCat = selectedCategory === 'Todas' || p.categoria === selectedCategory;
      const matchSearch =
        p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.descripcion.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [productos, selectedCategory, searchQuery]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      nombre: '',
      categoria: catOptions[0] || 'Bolis Gourmet',
      precio: 2.5,
      costo: 1.0,
      stock: 20,
      stockMinimo: 5,
      descripcion: '',
      imagen: '',
      disponible: true,
    });
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (prod: Producto) => {
    setEditingProduct(prod);
    setFormData({
      nombre: prod.nombre,
      categoria: prod.categoria,
      precio: prod.precio,
      costo: prod.costo ?? 1.0,
      stock: prod.stock ?? 0,
      stockMinimo: prod.stockMinimo ?? 5,
      descripcion: prod.descripcion || '',
      imagen: prod.imagen || '',
      disponible: prod.disponible !== false,
    });
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre?.trim()) {
      setErrorMsg('El nombre del producto es obligatorio.');
      return;
    }
    setSaving(true);
    setErrorMsg(null);

    try {
      if (editingProduct?.id) {
        await productosService.actualizarProducto(editingProduct.id, {
          ...formData,
          precio: Number(formData.precio) || 0,
          costo: Number(formData.costo) || 0,
          stock: Number(formData.stock) || 0,
          stockMinimo: Number(formData.stockMinimo) || 5,
        });
      } else {
        await productosService.crearProducto({
          nombre: formData.nombre.trim(),
          categoria: formData.categoria || catOptions[0] || 'Helados',
          precio: Number(formData.precio) || 0,
          costo: Number(formData.costo) || 0,
          stock: Number(formData.stock) || 0,
          stockMinimo: Number(formData.stockMinimo) || 5,
          descripcion: formData.descripcion || '',
          imagen: formData.imagen || 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=600&q=80',
          disponible: formData.disponible !== false,
        });
      }

      setModalOpen(false);
      onRefreshData?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar producto');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (prodId: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este producto?')) return;
    try {
      await productosService.eliminarProducto(prodId);
      onRefreshData?.();
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const handleToggleDisponible = async (prod: Producto) => {
    if (!prod.id) return;
    try {
      await productosService.actualizarProducto(prod.id, {
        disponible: !prod.disponible,
      });
      onRefreshData?.();
    } catch (err: any) {
      alert('Error al cambiar disponibilidad: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2">
            <Package className="w-7 h-7 text-amber-600" />
            <span>Catálogo de Productos</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Gestiona productos, precios, recetas base, costos de insumo e inventario disponible en tienda.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold shadow-md transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Producto</span>
        </button>
      </div>

      {/* Filters & Categories */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre o descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {['Todas', ...catOptions].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-amber-900 text-white'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-600">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">Producto</th>
                <th className="p-3.5">Categoría</th>
                <th className="p-3.5">Precio Venta</th>
                <th className="p-3.5">Costo Base</th>
                <th className="p-3.5">Stock</th>
                <th className="p-3.5">Estado</th>
                <th className="p-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredProductos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-stone-400">
                    No hay productos en esta categoría o búsqueda.
                  </td>
                </tr>
              ) : (
                filteredProductos.map((prod) => {
                  const isLow = (prod.stock ?? 0) <= (prod.stockMinimo ?? 5);
                  return (
                    <tr key={prod.id} className="hover:bg-stone-50/50">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={prod.imagen || 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=150&q=80'}
                            alt={prod.nombre}
                            className="w-10 h-10 rounded-xl object-cover border border-stone-200 bg-stone-100 shrink-0"
                          />
                          <div>
                            <span className="font-serif font-bold text-stone-900 block text-xs">
                              {prod.nombre}
                            </span>
                            <span className="text-[11px] text-stone-400 line-clamp-1 max-w-xs">
                              {prod.descripcion}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-stone-100 text-stone-700">
                          {prod.categoria}
                        </span>
                      </td>
                      <td className="p-3.5 font-serif font-bold text-stone-900 text-sm">
                        {formatCurrency(prod.precio)}
                      </td>
                      <td className="p-3.5 text-stone-500 font-mono text-[11px]">
                        {formatCurrency(prod.costo ?? 0)}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            isLow
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {prod.stock ?? 0} uds.
                        </span>
                      </td>
                      <td className="p-3.5">
                        <button
                          onClick={() => handleToggleDisponible(prod)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
                            prod.disponible !== false
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                          }`}
                          title="Alternar visibilidad en la tienda pública"
                        >
                          {prod.disponible !== false ? (
                            <>
                              <Eye className="w-3 h-3" />
                              <span>Disponible</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3" />
                              <span>Oculto</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap space-x-1.5">
                        <button
                          onClick={() => handleOpenEdit(prod)}
                          className="p-1.5 rounded-lg text-stone-600 hover:text-amber-900 hover:bg-amber-50 cursor-pointer"
                          title="Editar producto"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => prod.id && handleDelete(prod.id)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Eliminar producto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif font-bold text-lg text-stone-900">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto Artesanal'}
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
                <label className="block font-bold text-stone-700 mb-1">Nombre del producto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Boli Gourmet de Fresa & Leche Condensada"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Categoría</label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                  >
                    {catOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Precio de Venta ($) *</label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Costo Unitario ($)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={formData.costo}
                    onChange={(e) => setFormData({ ...formData, costo: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Stock Actual</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    value={formData.stockMinimo}
                    onChange={(e) => setFormData({ ...formData, stockMinimo: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Descripción</label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre ingredientes, textura o presentación..."
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">URL de Imagen</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={formData.imagen}
                  onChange={(e) => setFormData({ ...formData, imagen: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="prod-disponible-chk"
                  checked={formData.disponible}
                  onChange={(e) => setFormData({ ...formData, disponible: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-900 focus:ring-amber-900"
                />
                <label htmlFor="prod-disponible-chk" className="font-semibold text-stone-700 cursor-pointer">
                  Producto activo y disponible para clientes en tienda
                </label>
              </div>

              <div className="pt-3 border-t border-stone-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingProduct ? 'Actualizar' : 'Guardar Producto'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
