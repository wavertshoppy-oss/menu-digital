import React, { useState, useEffect, useMemo } from 'react';
import {
  Factory,
  Plus,
  Search,
  Check,
  X,
  AlertCircle,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Package,
  Trash2,
  Eye,
  RefreshCw,
  CheckCircle2,
  Clock,
  User,
} from 'lucide-react';
import { ProduccionRegistro, Producto, UserAuth } from '../../types';
import { produccionService } from '../../services/produccionService';
import { formatCurrency, formatFechaCorta } from '../../utils/formatters';

interface ProduccionViewProps {
  producciones: ProduccionRegistro[];
  productos: Producto[];
  user: UserAuth;
  onRefreshData?: () => void;
}

export const ProduccionView: React.FC<ProduccionViewProps> = ({
  producciones: propProducciones,
  productos,
  user,
  onRefreshData,
}) => {
  // Local state synced with props & real-time subscription for zero latency
  const [listaProducciones, setListaProducciones] = useState<ProduccionRegistro[]>(propProducciones);
  const [modalOpen, setModalOpen] = useState(false);
  const [detalleModal, setDetalleModal] = useState<ProduccionRegistro | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bannerMensaje, setBannerMensaje] = useState<string | null>(null);
  const [nuevoLoteDestacado, setNuevoLoteDestacado] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sync with prop changes
  useEffect(() => {
    if (propProducciones && propProducciones.length > 0) {
      setListaProducciones(propProducciones);
    }
  }, [propProducciones]);

  // Direct active subscription to produccionService
  useEffect(() => {
    const unsub = produccionService.suscribirProduccion((items) => {
      setListaProducciones(items);
    });
    return () => unsub?.();
  }, []);

  // Form State
  const [selectedProductoNombre, setSelectedProductoNombre] = useState<string>(
    productos[0]?.nombre || 'Boli Gourmet Nutella & Frutos Rojos'
  );
  const [cantidad, setCantidad] = useState<number>(30);
  const [lote, setLote] = useState<string>(`LOT-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`);
  const [costoUnitario, setCostoUnitario] = useState<number>(0.85);
  const [responsable, setResponsable] = useState<string>(user.displayName || user.email || 'Maestro Heladero');
  const [notas, setNotas] = useState<string>('Lote elaborado con frutas frescas y cacao de primera calidad.');

  // Auto-dismiss banner after 8 seconds
  useEffect(() => {
    if (bannerMensaje) {
      const timer = setTimeout(() => setBannerMensaje(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [bannerMensaje]);

  // Filtered List
  const filteredProducciones = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return listaProducciones;
    return listaProducciones.filter((p) => {
      const prodName = (p.producto || '').toLowerCase();
      const lotCode = (p.lote || '').toLowerCase();
      const resp = (p.responsable || p.usuario || '').toLowerCase();
      const obs = (p.observacion || p.notas || '').toLowerCase();
      return prodName.includes(q) || lotCode.includes(q) || resp.includes(q) || obs.includes(q);
    });
  }, [listaProducciones, searchQuery]);

  // Summary Metrics
  const stats = useMemo(() => {
    const totalLotes = listaProducciones.length;
    const totalUnidades = listaProducciones.reduce((acc, p) => acc + (Number(p.cantidad) || 0), 0);
    const totalInversion = listaProducciones.reduce(
      (acc, p) => acc + (Number(p.costoTotal) || (Number(p.costoUnitario) || 0) * (Number(p.cantidad) || 0)),
      0
    );
    const ultimoLote = listaProducciones[0] || null;
    return { totalLotes, totalUnidades, totalInversion, ultimoLote };
  }, [listaProducciones]);

  const handleOpenModal = () => {
    if (productos.length > 0) {
      setSelectedProductoNombre(productos[0].nombre);
      setCostoUnitario(productos[0].costo || 0.85);
    }
    const fechaCode = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(Math.random() * 90 + 10);
    setLote(`LOT-${fechaCode}-${randomSuffix}`);
    setCantidad(25);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleProductoChange = (nombre: string) => {
    setSelectedProductoNombre(nombre);
    const found = productos.find((p) => p.nombre === nombre);
    if (found && found.costo) {
      setCostoUnitario(found.costo);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductoNombre) {
      setErrorMsg('Selecciona un producto a elaborar.');
      return;
    }
    if (cantidad <= 0) {
      setErrorMsg('La cantidad elaborada debe ser mayor a 0.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const prod = productos.find((p) => p.nombre === selectedProductoNombre);

      const nuevoRegistro = await produccionService.registrarProduccion({
        producto: selectedProductoNombre,
        productoId: prod?.id,
        cantidad: Number(cantidad),
        lote: lote.trim(),
        costoUnitario: Number(costoUnitario),
        costoTotal: Number(costoUnitario) * Number(cantidad),
        fecha: new Date().toISOString(),
        responsable: responsable.trim(),
        notas: notas.trim(),
        estado: 'completado',
      });

      // Immediate optimistic update in table
      setListaProducciones((prev) => [nuevoRegistro, ...prev.filter((p) => p.id !== nuevoRegistro.id)]);
      setNuevoLoteDestacado(nuevoRegistro.id || nuevoRegistro.lote || 'new');
      setBannerMensaje(
        `¡Lote ${nuevoRegistro.lote || 'nuevo'} registrado con éxito! Se sumaron +${nuevoRegistro.cantidad} unidades a ${nuevoRegistro.producto} y ya se refleja en este módulo de producción.`
      );

      setModalOpen(false);
      onRefreshData?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al registrar lote de producción');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduccion = async (prod: ProduccionRegistro) => {
    if (
      !window.confirm(
        `¿Deseas anular y eliminar el lote "${prod.lote || 'Sin código'}" (${prod.producto})? Se eliminará de la base de datos Firestore y se restarán -${prod.cantidad} unidades del stock.`
      )
    ) {
      return;
    }

    setDeletingId(prod.id || 'del');
    try {
      const targetProd = productos.find((p) => p.id === prod.productoId || p.nombre === prod.producto);
      await produccionService.eliminarProduccion(prod, targetProd, user.displayName || user.email || 'Admin');
      setListaProducciones((prev) => prev.filter((p) => p.id !== prod.id));
      setBannerMensaje(`El lote ${prod.lote || ''} fue eliminado de Firestore y las ${prod.cantidad} unidades fueron deducidas del inventario.`);
      setDetalleModal(null);
      onRefreshData?.();
    } catch (err: any) {
      alert('Error al eliminar lote: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2.5">
            <Factory className="w-7 h-7 text-amber-600" />
            <span>Módulo de Producción & Lotes</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Registra y audita la fabricación de bolis, helados y dulces artesanales. Cada lote actualiza el stock automáticamente y se refleja aquí al instante.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => onRefreshData?.()}
            title="Recargar datos"
            className="p-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold shadow-md transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Lote Elaborado</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {bannerMensaje && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{bannerMensaje}</span>
          </div>
          <button
            onClick={() => setBannerMensaje(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Lotes Registrados</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif font-black text-2xl text-stone-900">{stats.totalLotes}</div>
          <div className="text-[11px] text-stone-400 mt-0.5">Historial de elaboración</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Unidades Fabricadas</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif font-black text-2xl text-emerald-950">+{stats.totalUnidades} <span className="text-xs font-normal text-stone-400">uds.</span></div>
          <div className="text-[11px] text-stone-400 mt-0.5">Añadidas al inventario</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Costo de Producción</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif font-black text-2xl text-stone-900">{formatCurrency(stats.totalInversion)}</div>
          <div className="text-[11px] text-stone-400 mt-0.5">Inversión acumulada</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Último Lote</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="font-bold text-stone-900 text-xs truncate">
            {stats.ultimoLote ? stats.ultimoLote.producto : 'Sin lotes'}
          </div>
          <div className="text-[11px] font-mono text-amber-800 mt-0.5 truncate">
            {stats.ultimoLote ? stats.ultimoLote.lote : '-'}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por producto, lote, maestro o notas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20 shadow-2xs"
          />
        </div>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="px-3 py-2 text-xs text-stone-500 hover:text-stone-800 font-semibold cursor-pointer"
          >
            Limpiar búsqueda
          </button>
        )}
      </div>

      {/* Production History Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-2">
            <Factory className="w-4 h-4 text-amber-800" />
            <h2 className="font-serif font-bold text-sm text-stone-800">
              Lotes Registrados en el Sistema ({filteredProducciones.length})
            </h2>
          </div>
          <span className="text-[11px] text-stone-400">
            Actualización en tiempo real
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-600">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">Lote / Fecha</th>
                <th className="p-3.5">Producto Elaborado</th>
                <th className="p-3.5">Cantidad</th>
                <th className="p-3.5">Stock Afectado</th>
                <th className="p-3.5">Costo Unit. / Total</th>
                <th className="p-3.5">Responsable</th>
                <th className="p-3.5">Estado</th>
                <th className="p-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredProducciones.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-stone-400">
                    <Factory className="w-10 h-10 mx-auto mb-2 text-stone-300 opacity-60" />
                    <p className="font-semibold text-stone-600">No se encontraron lotes de producción.</p>
                    <p className="text-xs text-stone-400 mt-1">
                      Haz clic en "Nuevo Lote Elaborado" para registrar tu primera tanda.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducciones.map((prod) => {
                  const isHighlighted = nuevoLoteDestacado === (prod.id || prod.lote);
                  const cUnit = Number(prod.costoUnitario) || Number(prod.costo) || 0;
                  const cTot = Number(prod.costoTotal) || cUnit * prod.cantidad;

                  return (
                    <tr
                      key={prod.id}
                      className={`transition-colors ${
                        isHighlighted
                          ? 'bg-amber-50/70 border-l-4 border-l-amber-600 font-medium'
                          : 'hover:bg-stone-50/60'
                      }`}
                    >
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-stone-900 block text-[11px]">
                          {prod.lote || 'LOT-AUTO'}
                        </span>
                        <span className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 inline" />
                          {formatFechaCorta(prod.fecha || prod.createdAt)}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-stone-900 block">{prod.producto}</span>
                        {prod.notas && (
                          <span className="text-[11px] text-stone-400 line-clamp-1 italic">
                            "{prod.notas}"
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 font-serif font-black text-amber-950 text-sm whitespace-nowrap">
                        +{prod.cantidad} <span className="text-[10px] font-normal text-stone-400">uds.</span>
                      </td>

                      <td className="p-3.5 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                        {prod.stockAnterior !== undefined && prod.stockNuevo !== undefined ? (
                          <span>
                            {prod.stockAnterior} &rarr; <strong className="text-emerald-700">{prod.stockNuevo}</strong>
                          </span>
                        ) : (
                          <span className="text-stone-400">Sumado a stock</span>
                        )}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-mono text-stone-700 font-semibold">{formatCurrency(cTot)}</div>
                        <div className="text-[10px] text-stone-400">({formatCurrency(cUnit)} / ud)</div>
                      </td>

                      <td className="p-3.5 text-stone-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-stone-400" />
                          <span>{prod.responsable || prod.usuario || 'Maestro Heladero'}</span>
                        </div>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <Check className="w-3 h-3" />
                          {prod.estado === 'completado' ? 'Completado' : prod.estado || 'En Stock'}
                        </span>
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setDetalleModal(prod)}
                            title="Ver detalles completos"
                            className="p-1.5 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduccion(prod)}
                            disabled={deletingId === prod.id}
                            title="Anular lote y revertir stock"
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Production Batch Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Factory className="w-5 h-5 text-amber-800" />
                <h3 className="font-serif font-bold text-lg text-stone-900">
                  Registrar Lote de Producción
                </h3>
              </div>
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
                <label className="block font-bold text-stone-700 mb-1">Producto a Elaborar *</label>
                <select
                  value={selectedProductoNombre}
                  onChange={(e) => handleProductoChange(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20 font-semibold text-stone-800"
                >
                  {productos.map((p) => (
                    <option key={p.id} value={p.nombre}>
                      {p.nombre} ({p.categoria}) — Stock actual: {p.stock ?? 0} uds.
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Código de Lote *</label>
                  <input
                    type="text"
                    required
                    value={lote}
                    onChange={(e) => setLote(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Cantidad Elaborada (Uds.) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={cantidad}
                    onChange={(e) => setCantidad(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none font-black text-sm text-amber-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Costo Unitario ($)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={costoUnitario}
                    onChange={(e) => setCostoUnitario(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Responsable</label>
                  <input
                    type="text"
                    value={responsable}
                    onChange={(e) => setResponsable(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Notas de Producción / Calidad</label>
                <textarea
                  rows={2}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Detalles sobre temperatura, pulpa de fruta, cacao o lote de leche..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span>
                    Al confirmar, se sumarán automáticamente <strong>+{cantidad} unidades</strong> al stock de <strong>{selectedProductoNombre}</strong> y este lote se reflejará de inmediato en la tabla de producción e inventario.
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
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
                  className="px-5 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {saving ? 'Registrando...' : 'Finalizar Lote de Producción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detalle de Lote Modal */}
      {detalleModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Factory className="w-5 h-5 text-amber-700" />
                <h3 className="font-serif font-bold text-base text-stone-900">
                  Detalle del Lote: {detalleModal.lote || 'Sin Código'}
                </h3>
              </div>
              <button
                onClick={() => setDetalleModal(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-500 font-medium">Producto:</span>
                <span className="font-bold text-stone-900">{detalleModal.producto}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-500 font-medium">Cantidad Producida:</span>
                <span className="font-black text-amber-900 font-serif text-sm">+{detalleModal.cantidad} unidades</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-500 font-medium">Fecha y Hora:</span>
                <span className="text-stone-700">{formatFechaCorta(detalleModal.fecha || detalleModal.createdAt)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-500 font-medium">Costo Total:</span>
                <span className="font-mono font-bold text-stone-900">
                  {formatCurrency(detalleModal.costoTotal || (Number(detalleModal.costoUnitario) || 0) * detalleModal.cantidad)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-stone-100">
                <span className="text-stone-500 font-medium">Responsable:</span>
                <span className="text-stone-800">{detalleModal.responsable || detalleModal.usuario || 'Maestro Heladero'}</span>
              </div>
              {detalleModal.stockAnterior !== undefined && detalleModal.stockNuevo !== undefined && (
                <div className="flex justify-between py-1.5 border-b border-stone-100">
                  <span className="text-stone-500 font-medium">Impacto en Stock:</span>
                  <span className="font-mono text-stone-700">
                    {detalleModal.stockAnterior} &rarr; <strong className="text-emerald-700">{detalleModal.stockNuevo} uds.</strong>
                  </span>
                </div>
              )}
              {detalleModal.notas && (
                <div className="py-1.5">
                  <span className="text-stone-500 font-medium block mb-1">Notas:</span>
                  <p className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-stone-700 text-[11px]">
                    {detalleModal.notas}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDeleteProduccion(detalleModal)}
                disabled={deletingId === detalleModal.id}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold cursor-pointer text-xs transition-colors border border-rose-200 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Lote de Firestore</span>
              </button>
              <button
                type="button"
                onClick={() => setDetalleModal(null)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold cursor-pointer text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
