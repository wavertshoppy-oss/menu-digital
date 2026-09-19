import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Plus,
  Minus,
  Search,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  X,
  Check,
  Filter,
} from 'lucide-react';
import { Producto, MovimientoInventario, TipoMovimientoInventario, UserAuth } from '../../types';
import { inventarioService } from '../../services/inventarioService';
import { productosService } from '../../services/productosService';
import { produccionService } from '../../services/produccionService';
import { formatCurrency, formatFechaCorta } from '../../utils/formatters';

interface InventarioViewProps {
  productos: Producto[];
  movimientos: MovimientoInventario[];
  user: UserAuth;
  onRefreshData?: () => void;
}

export const InventarioView: React.FC<InventarioViewProps> = ({
  productos,
  movimientos,
  user,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'stock' | 'movimientos'>('stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStockStatus, setFilterStockStatus] = useState<'todos' | 'bajo' | 'agotado'>('todos');
  
  // Quick Movement Modal
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [selectedProductForMove, setSelectedProductForMove] = useState<Producto | null>(null);
  const [tipoMovimiento, setTipoMovimiento] = useState<TipoMovimientoInventario>('entrada');
  const [cantidadMovimiento, setCantidadMovimiento] = useState<number>(10);
  const [motivoMovimiento, setMotivoMovimiento] = useState<string>('Reposición de stock');
  const [savingMovement, setSavingMovement] = useState(false);

  // Filtered Products
  const filteredProductos = useMemo(() => {
    return productos.filter((p) => {
      const matchSearch =
        p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.categoria.toLowerCase().includes(searchQuery.toLowerCase());

      const stock = p.stock ?? 0;
      const min = p.stockMinimo ?? 5;

      let matchStatus = true;
      if (filterStockStatus === 'bajo') {
        matchStatus = stock > 0 && stock <= min;
      } else if (filterStockStatus === 'agotado') {
        matchStatus = stock <= 0;
      }

      return matchSearch && matchStatus;
    });
  }, [productos, searchQuery, filterStockStatus]);

  const handleOpenMovement = (prod: Producto, defaultType: TipoMovimientoInventario = 'entrada') => {
    setSelectedProductForMove(prod);
    setTipoMovimiento(defaultType);
    setCantidadMovimiento(5);
    setMotivoMovimiento(defaultType === 'entrada' ? 'Reabastecimiento' : 'Muestra o consumo interno');
    setMovementModalOpen(true);
  };

  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForMove?.id) return;
    setSavingMovement(true);

    try {
      const qty = Number(cantidadMovimiento);
      const userName = user.displayName || user.email || 'Admin';
      const motivo = motivoMovimiento.trim();

      if (tipoMovimiento === 'entrada') {
        await inventarioService.registrarEntrada(selectedProductForMove, qty, motivo, userName);
      } else if ((tipoMovimiento as string) === 'produccion') {
        await produccionService.registrarProduccion({
          producto: selectedProductForMove.nombre,
          productoId: selectedProductForMove.id,
          cantidad: qty,
          lote: `LOT-${Date.now().toString().slice(-6)}`,
          responsable: userName,
          notas: motivo || 'Producción registrada desde Inventario',
          costoUnitario: selectedProductForMove.costo || 0.85,
        });
      } else if (tipoMovimiento === 'salida' || tipoMovimiento === 'merma') {
        await inventarioService.registrarSalida(selectedProductForMove, qty, motivo, userName);
      } else if (tipoMovimiento === 'desperdicio') {
        await inventarioService.registrarDesperdicio(selectedProductForMove, qty, motivo, userName);
      } else if (tipoMovimiento === 'ajuste') {
        await inventarioService.registrarAjuste(selectedProductForMove, qty, motivo, userName);
      } else {
        await inventarioService.registrarEntrada(selectedProductForMove, qty, motivo, userName);
      }

      setMovementModalOpen(false);
      onRefreshData?.();
    } catch (err: any) {
      alert('Error al registrar movimiento: ' + err.message);
    } finally {
      setSavingMovement(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2">
            <Boxes className="w-7 h-7 text-amber-600" />
            <span>Control de Inventario</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Supervisa existencias, registra entradas/salidas y recibe alertas automáticas de reposición.
          </p>
        </div>

        <div className="flex items-center p-1 bg-stone-200/80 rounded-xl">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'stock'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Nivel de Existencias
          </button>
          <button
            onClick={() => setActiveTab('movimientos')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'movimientos'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Historial Movimientos ({movimientos.length})
          </button>
        </div>
      </div>

      {activeTab === 'stock' && (
        <div className="space-y-4">
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por producto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterStockStatus('todos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  filterStockStatus === 'todos'
                    ? 'bg-amber-900 text-white'
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterStockStatus('bajo')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  filterStockStatus === 'bajo'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white border border-stone-200 text-amber-700 hover:bg-amber-50'
                }`}
              >
                Stock Bajo
              </button>
              <button
                onClick={() => setFilterStockStatus('agotado')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  filterStockStatus === 'agotado'
                    ? 'bg-rose-600 text-white'
                    : 'bg-white border border-stone-200 text-rose-700 hover:bg-rose-50'
                }`}
              >
                Agotados
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Producto</th>
                    <th className="p-3.5">Categoría</th>
                    <th className="p-3.5">Stock Actual</th>
                    <th className="p-3.5">Stock Mínimo</th>
                    <th className="p-3.5">Estado</th>
                    <th className="p-3.5 text-right">Ajuste Rápido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredProductos.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-stone-400">
                        No hay productos que coincidan con los criterios.
                      </td>
                    </tr>
                  ) : (
                    filteredProductos.map((prod) => {
                      const stock = prod.stock ?? 0;
                      const min = prod.stockMinimo ?? 5;
                      const isOutOfStock = stock <= 0;
                      const isLow = stock > 0 && stock <= min;

                      return (
                        <tr key={prod.id} className="hover:bg-stone-50/50">
                          <td className="p-3.5 font-bold text-stone-900">
                            {prod.nombre}
                          </td>
                          <td className="p-3.5 text-stone-500">
                            {prod.categoria}
                          </td>
                          <td className="p-3.5 font-serif font-black text-sm text-stone-900">
                            {stock} <span className="text-[10px] font-normal text-stone-400">uds.</span>
                          </td>
                          <td className="p-3.5 text-stone-500">
                            {min} uds.
                          </td>
                          <td className="p-3.5">
                            {isOutOfStock ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                <AlertTriangle className="w-3 h-3" />
                                Agotado
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                                <AlertTriangle className="w-3 h-3" />
                                Stock Bajo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Óptimo
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => handleOpenMovement(prod, 'entrada')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold hover:bg-emerald-100 cursor-pointer"
                              title="Registrar entrada de mercancía"
                            >
                              + Entrada
                            </button>
                            <button
                              onClick={() => handleOpenMovement(prod, 'salida')}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-bold hover:bg-rose-100 cursor-pointer"
                              title="Registrar salida o merma"
                            >
                              - Salida
                            </button>
                            <button
                              onClick={() => handleOpenMovement(prod, 'ajuste')}
                              className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 text-[11px] font-bold hover:bg-stone-200 cursor-pointer"
                              title="Ajuste manual de conteo físico"
                            >
                              Ajustar
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
        </div>
      )}

      {activeTab === 'movimientos' && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">Fecha</th>
                  <th className="p-3.5">Producto</th>
                  <th className="p-3.5">Tipo</th>
                  <th className="p-3.5">Cantidad</th>
                  <th className="p-3.5">Stock Anterior &rarr; Nuevo</th>
                  <th className="p-3.5">Motivo</th>
                  <th className="p-3.5">Responsable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {movimientos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-stone-400">
                      Aún no hay movimientos registrados en el inventario.
                    </td>
                  </tr>
                ) : (
                  movimientos.map((m) => (
                    <tr key={m.id} className="hover:bg-stone-50/50">
                      <td className="p-3.5 whitespace-nowrap text-stone-400">
                        {formatFechaCorta(m.createdAt || m.fecha)}
                      </td>
                      <td className="p-3.5 font-bold text-stone-900">
                        {m.productoNombre || m.producto}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.tipo === 'entrada' || (m.tipo as string) === 'produccion'
                              ? 'bg-emerald-100 text-emerald-800'
                              : m.tipo === 'salida' || (m.tipo as string) === 'merma'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {m.tipo}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-stone-900">
                        {m.cantidad} uds.
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-stone-500">
                        {m.stockAnterior ?? m.cantidadAnterior ?? 0} &rarr; <strong>{m.stockNuevo ?? m.cantidadNueva ?? 0}</strong>
                      </td>
                      <td className="p-3.5 text-stone-600">
                        {m.motivo || 'Sin motivo especificado'}
                      </td>
                      <td className="p-3.5 text-stone-500">
                        {m.responsable || m.usuario || 'Admin'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Movement Modal */}
      {movementModalOpen && selectedProductForMove && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif font-bold text-base text-stone-900">
                Movimiento: {selectedProductForMove.nombre}
              </h3>
              <button
                onClick={() => setMovementModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMovement} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Tipo de Movimiento</label>
                <select
                  value={tipoMovimiento}
                  onChange={(e) => setTipoMovimiento(e.target.value as TipoMovimientoInventario)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none"
                >
                  <option value="entrada">Entrada (+ Suma al stock)</option>
                  <option value="produccion">Producción de Cocina (+ Suma stock y registra lote)</option>
                  <option value="salida">Salida (- Resta del stock)</option>
                  <option value="merma">Merma / Pérdida (- Resta del stock)</option>
                  <option value="ajuste">Ajuste Manual (= Reemplaza stock)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  {tipoMovimiento === 'ajuste' ? 'Nuevo Stock Exacto' : 'Cantidad de Unidades'}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={cantidadMovimiento}
                  onChange={(e) => setCantidadMovimiento(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Motivo o Justificación</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Reabastecimiento de la cocina, merma de transporte..."
                  value={motivoMovimiento}
                  onChange={(e) => setMotivoMovimiento(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="p-3 bg-stone-50 rounded-xl text-[11px] text-stone-500">
                Stock actual: <strong>{selectedProductForMove.stock ?? 0} uds.</strong>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMovementModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingMovement}
                  className="px-5 py-2 rounded-xl bg-amber-900 hover:bg-amber-800 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {savingMovement ? 'Guardando...' : 'Confirmar Movimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
