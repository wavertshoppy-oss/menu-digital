import React, { useState, useMemo } from 'react';
import {
  BadgeDollarSign,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Receipt,
  User,
  Smartphone,
  CreditCard,
  Banknote,
  Check,
  X,
  AlertCircle,
  Clock,
  Printer,
  Minus,
} from 'lucide-react';
import { Venta, Producto, MetodoPago, VentaItem, UserAuth } from '../../types';
import { ventasService } from '../../services/ventasService';
import { formatCurrency, formatFechaCorta } from '../../utils/formatters';

interface VentasViewProps {
  ventas: Venta[];
  productos: Producto[];
  user: UserAuth;
  onRefreshData?: () => void;
}

export const VentasView: React.FC<VentasViewProps> = ({
  ventas,
  productos,
  user,
  onRefreshData,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'pos' | 'historial'>('pos');
  
  // POS State
  const [posCart, setPosCart] = useState<{ producto: Producto; cantidad: number }[]>([]);
  const [selectedCategoria, setSelectedCategoria] = useState<string>('Todas');
  const [productSearch, setProductSearch] = useState<string>('');
  const [clienteNombre, setClienteNombre] = useState<string>('Cliente Ocasional');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('Efectivo');
  const [montoRecibido, setMontoRecibido] = useState<string>('');
  const [notasVenta, setNotasVenta] = useState<string>('');
  const [loadingSale, setLoadingSale] = useState<boolean>(false);
  const [saleSuccessMessage, setSaleSuccessMessage] = useState<string | null>(null);

  // History State
  const [historySearch, setHistorySearch] = useState<string>('');
  const [selectedVentaTicket, setSelectedVentaTicket] = useState<Venta | null>(null);

  // Categories for POS filter
  const categorias = useMemo(() => {
    const set = new Set<string>();
    productos.forEach((p) => {
      if (p.categoria) set.add(p.categoria);
    });
    return ['Todas', ...Array.from(set)];
  }, [productos]);

  // Filtered products for POS
  const filteredProductos = useMemo(() => {
    return productos.filter((p) => {
      const matchCat = selectedCategoria === 'Todas' || p.categoria === selectedCategoria;
      const matchSearch =
        p.nombre.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.categoria.toLowerCase().includes(productSearch.toLowerCase());
      return matchCat && matchSearch && p.disponible !== false;
    });
  }, [productos, selectedCategoria, productSearch]);

  // POS Calculations
  const subtotal = posCart.reduce((acc, item) => acc + item.producto.precio * item.cantidad, 0);
  const total = subtotal;
  const recibidoNum = parseFloat(montoRecibido) || 0;
  const cambio = metodoPago === 'Efectivo' && recibidoNum >= total ? recibidoNum - total : 0;

  // Add to POS Cart
  const handleAddToCart = (producto: Producto) => {
    setPosCart((prev) => {
      const existing = prev.find((item) => item.producto.id === producto.id);
      if (existing) {
        return prev.map((item) =>
          item.producto.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [...prev, { producto, cantidad: 1 }];
    });
  };

  const handleUpdateQty = (prodId: string, delta: number) => {
    setPosCart((prev) =>
      prev
        .map((item) => {
          if (item.producto.id === prodId) {
            const newQty = item.cantidad + delta;
            return newQty > 0 ? { ...item, cantidad: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as { producto: Producto; cantidad: number }[]
    );
  };

  const handleRemoveItem = (prodId: string) => {
    setPosCart((prev) => prev.filter((item) => item.producto.id !== prodId));
  };

  const handleClearPos = () => {
    setPosCart([]);
    setMontoRecibido('');
    setNotasVenta('');
    setClienteNombre('Cliente Ocasional');
  };

  // Process POS Sale
  const handleFinalizarVenta = async () => {
    if (posCart.length === 0) return;
    setLoadingSale(true);

    try {
      const items: VentaItem[] = posCart.map((item) => ({
        productoId: item.producto.id || '',
        nombre: item.producto.nombre,
        categoria: item.producto.categoria,
        precio: item.producto.precio,
        cantidad: item.cantidad,
        subtotal: item.producto.precio * item.cantidad,
      }));

      const nuevaVenta = await ventasService.registrarVenta({
        cliente: clienteNombre.trim() || 'Cliente Ocasional',
        items,
        total,
        metodoPago,
        montoRecibido: metodoPago === 'Efectivo' ? recibidoNum : total,
        cambio: metodoPago === 'Efectivo' ? cambio : 0,
        notas: notasVenta.trim(),
        vendedor: user.displayName || user.email || 'Admin',
        fecha: new Date().toISOString(),
      });

      setSaleSuccessMessage(`¡Venta #${nuevaVenta.id?.slice(-5) || ''} registrada con éxito por ${formatCurrency(total)}!`);
      setSelectedVentaTicket(nuevaVenta);
      handleClearPos();
      onRefreshData?.();

      setTimeout(() => setSaleSuccessMessage(null), 5000);
    } catch (err: any) {
      alert('Error al registrar la venta: ' + err.message);
    } finally {
      setLoadingSale(false);
    }
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    return ventas.filter((v) => {
      const matchSearch =
        (v.cliente || '').toLowerCase().includes(historySearch.toLowerCase()) ||
        (v.id || '').toLowerCase().includes(historySearch.toLowerCase()) ||
        (v.metodoPago || '').toLowerCase().includes(historySearch.toLowerCase());
      return matchSearch;
    });
  }, [ventas, historySearch]);

  const handleAnularVenta = async (ventaId: string) => {
    if (!window.confirm('¿Estás seguro de anular esta venta? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      await ventasService.anularVenta(ventaId);
      onRefreshData?.();
    } catch (err: any) {
      alert('Error al anular venta: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2">
            <BadgeDollarSign className="w-7 h-7 text-amber-600" />
            <span>Ventas y Caja</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Punto de venta directo, control de ingresos en tiempo real y registro histórico de transacciones.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center p-1 bg-stone-200/80 rounded-xl">
          <button
            onClick={() => setActiveSubTab('pos')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'pos'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Punto de Venta (POS)
          </button>
          <button
            onClick={() => setActiveSubTab('historial')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'historial'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Historial de Ventas ({ventas.length})
          </button>
        </div>
      </div>

      {saleSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{saleSuccessMessage}</span>
          </div>
          <button
            onClick={() => setSaleSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* POS VIEW */}
      {activeSubTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Products Catalogue Section */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o categoría..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                />
              </div>

              {/* Categories */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {categorias.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategoria(cat)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      selectedCategoria === cat
                        ? 'bg-amber-900 text-white'
                        : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProductos.map((prod) => {
                const isOutOfStock = prod.stock !== undefined && prod.stock <= 0;
                return (
                  <button
                    key={prod.id}
                    onClick={() => handleAddToCart(prod)}
                    disabled={isOutOfStock}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all group cursor-pointer ${
                      isOutOfStock
                        ? 'bg-stone-50 border-stone-200 opacity-60 cursor-not-allowed'
                        : 'bg-white border-stone-200 hover:border-amber-400 hover:shadow-md'
                    }`}
                  >
                    <div>
                      <div className="aspect-square w-full rounded-xl overflow-hidden bg-stone-100 mb-2">
                        <img
                          src={prod.imagen || 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=300&q=80'}
                          alt={prod.nombre}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <h4 className="font-serif text-xs font-bold text-stone-900 line-clamp-1">
                        {prod.nombre}
                      </h4>
                      <span className="text-[10px] text-stone-400 block">{prod.categoria}</span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between">
                      <span className="font-serif text-xs font-bold text-amber-900">
                        {formatCurrency(prod.precio)}
                      </span>
                      <span className="text-[10px] text-stone-500 font-medium">
                        Stock: {prod.stock ?? 0}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ticket / Cart Checkout Section */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-amber-800" />
                  <h3 className="font-serif font-bold text-base text-stone-900">
                    Ticket de Cobro
                  </h3>
                </div>
                {posCart.length > 0 && (
                  <button
                    onClick={handleClearPos}
                    className="text-[11px] text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    Vaciar ticket
                  </button>
                )}
              </div>

              {/* Client Name Input */}
              <div className="pt-3 pb-2">
                <label className="text-[11px] font-bold text-stone-600 block mb-1">
                  Cliente
                </label>
                <input
                  type="text"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  placeholder="Nombre del cliente"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20"
                />
              </div>

              {/* Items in cart */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {posCart.length === 0 ? (
                  <div className="text-center py-8 text-stone-400 text-xs">
                    El ticket está vacío. Toca los productos a la izquierda para agregarlos.
                  </div>
                ) : (
                  posCart.map((item) => (
                    <div
                      key={item.producto.id}
                      className="p-2.5 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <h5 className="font-serif text-xs font-bold text-stone-900 truncate">
                          {item.producto.nombre}
                        </h5>
                        <span className="text-[10px] text-stone-500">
                          {formatCurrency(item.producto.precio)} c/u
                        </span>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleUpdateQty(item.producto.id!, -1)}
                          className="w-5 h-5 rounded bg-stone-200 text-stone-700 flex items-center justify-center text-xs hover:bg-stone-300 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-stone-800 w-4 text-center">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => handleUpdateQty(item.producto.id!, 1)}
                          className="w-5 h-5 rounded bg-stone-200 text-stone-700 flex items-center justify-center text-xs hover:bg-stone-300 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right pl-2">
                        <span className="font-serif text-xs font-bold text-stone-900 block">
                          {formatCurrency(item.producto.precio * item.cantidad)}
                        </span>
                        <button
                          onClick={() => handleRemoveItem(item.producto.id!)}
                          className="text-stone-400 hover:text-rose-600 text-[10px] cursor-pointer"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Payment Options and Totals */}
            <div className="pt-4 border-t border-stone-200 space-y-3">
              
              {/* Payment Methods */}
              <div>
                <label className="text-[11px] font-bold text-stone-600 block mb-1">
                  Método de Pago
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['Efectivo', 'Yappy', 'Tarjeta', 'Otro'] as MetodoPago[]).map((metodo) => (
                    <button
                      key={metodo}
                      type="button"
                      onClick={() => setMetodoPago(metodo)}
                      className={`py-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                        metodoPago === metodo
                          ? 'bg-amber-900 border-amber-900 text-white shadow-xs'
                          : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      {metodo}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash change calculator */}
              {metodoPago === 'Efectivo' && (
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-amber-50/60 border border-amber-200">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-amber-900 block mb-0.5">
                      Efectivo Recibido ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={montoRecibido}
                      onChange={(e) => setMontoRecibido(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs rounded-lg border border-amber-200 bg-white font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-900 block mb-0.5">
                      Cambio / Vuelto
                    </span>
                    <div className="text-xs font-bold text-amber-950 py-1">
                      {formatCurrency(cambio)}
                    </div>
                  </div>
                </div>
              )}

              {/* Totals Breakdown */}
              <div className="space-y-1 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-stone-900">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-stone-900 pt-2 border-t border-stone-100">
                  <span>Total a Cobrar:</span>
                  <span className="font-serif text-xl font-extrabold text-amber-950">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              {/* Submit Sale Button */}
              <button
                id="pos-submit-sale-btn"
                onClick={handleFinalizarVenta}
                disabled={posCart.length === 0 || loadingSale}
                className="w-full py-3.5 px-4 rounded-xl bg-amber-900 hover:bg-amber-800 active:bg-amber-950 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loadingSale ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Cobrar Venta ({formatCurrency(total)})</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </div>
      )}

      {/* SALES HISTORY VIEW */}
      {activeSubTab === 'historial' && (
        <div className="space-y-4">
          
          {/* Search bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por cliente, ID o método de pago..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">ID / Fecha</th>
                    <th className="p-3.5">Cliente</th>
                    <th className="p-3.5">Productos</th>
                    <th className="p-3.5">Método de Pago</th>
                    <th className="p-3.5">Total</th>
                    <th className="p-3.5">Estado</th>
                    <th className="p-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-stone-400">
                        No hay ventas registradas que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((venta) => {
                      const isAnulada = Boolean(venta.anulada);
                      return (
                        <tr key={venta.id} className={isAnulada ? 'bg-rose-50/30 line-through text-stone-400' : 'hover:bg-stone-50/50'}>
                          <td className="p-3.5 whitespace-nowrap">
                            <span className="font-mono text-[11px] font-bold text-stone-800 block">
                              #{venta.id?.slice(-6) || 'VENTA'}
                            </span>
                            <span className="text-[10px] text-stone-400">
                              {formatFechaCorta(venta.createdAt || venta.fecha)}
                            </span>
                          </td>
                          <td className="p-3.5 font-medium text-stone-900">
                            {venta.cliente || 'Cliente Ocasional'}
                          </td>
                          <td className="p-3.5">
                            {venta.items && venta.items.length > 0 ? (
                              <span className="text-xs">
                                {venta.items.map((it) => `${it.cantidad}x ${it.nombre}`).join(', ')}
                              </span>
                            ) : (
                              <span>{venta.cantidad || 1}x {venta.producto}</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700">
                              {venta.metodoPago || 'Efectivo'}
                            </span>
                          </td>
                          <td className="p-3.5 font-serif font-bold text-amber-950 text-sm">
                            {formatCurrency(venta.total)}
                          </td>
                          <td className="p-3.5">
                            {isAnulada ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                                Anulada
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                Completada
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right whitespace-nowrap space-x-2">
                            <button
                              onClick={() => setSelectedVentaTicket(venta)}
                              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 cursor-pointer"
                              title="Ver e imprimir ticket"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                            {!isAnulada && (
                              <button
                                onClick={() => venta.id && handleAnularVenta(venta.id)}
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                                title="Anular venta"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
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

      {/* Ticket Modal */}
      {selectedVentaTicket && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-800" />
                <h3 className="font-serif font-bold text-stone-900">Comprobante de Venta</h3>
              </div>
              <button
                onClick={() => setSelectedVentaTicket(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center py-2 border-b border-dashed border-stone-200">
              <h4 className="font-serif font-bold text-stone-900 text-base">Delicias Belgi</h4>
              <p className="text-[11px] text-stone-500">Heladería y Repostería Artesanal</p>
              <p className="text-[10px] text-stone-400">Calle 2 ave. Bolívar, PH Bahía Limón, Colón</p>
              <p className="text-[10px] text-stone-400 mt-1">Ticket #{selectedVentaTicket.id?.slice(-8)}</p>
              <p className="text-[10px] text-stone-400">
                {formatFechaCorta(selectedVentaTicket.createdAt || selectedVentaTicket.fecha)}
              </p>
            </div>

            {/* Ticket Items */}
            <div className="space-y-1.5 text-xs py-2 border-b border-dashed border-stone-200">
              {selectedVentaTicket.items && selectedVentaTicket.items.length > 0 ? (
                selectedVentaTicket.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.cantidad}x {it.nombre}</span>
                    <span className="font-semibold">{formatCurrency(it.subtotal)}</span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between">
                  <span>{selectedVentaTicket.cantidad || 1}x {selectedVentaTicket.producto}</span>
                  <span className="font-semibold">{formatCurrency(selectedVentaTicket.total)}</span>
                </div>
              )}
            </div>

            {/* Total and Payment */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between font-bold text-stone-900 text-sm">
                <span>Total:</span>
                <span className="font-serif">{formatCurrency(selectedVentaTicket.total)}</span>
              </div>
              <div className="flex justify-between text-stone-500 text-[11px]">
                <span>Método:</span>
                <span>{selectedVentaTicket.metodoPago || 'Efectivo'}</span>
              </div>
              {selectedVentaTicket.montoRecibido !== undefined && selectedVentaTicket.montoRecibido > 0 && (
                <div className="flex justify-between text-stone-500 text-[11px]">
                  <span>Recibido:</span>
                  <span>{formatCurrency(selectedVentaTicket.montoRecibido)}</span>
                </div>
              )}
              {selectedVentaTicket.cambio !== undefined && selectedVentaTicket.cambio > 0 && (
                <div className="flex justify-between text-stone-500 text-[11px]">
                  <span>Cambio:</span>
                  <span>{formatCurrency(selectedVentaTicket.cambio)}</span>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="pt-2 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Ticket</span>
              </button>
              <button
                onClick={() => setSelectedVentaTicket(null)}
                className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-50 cursor-pointer"
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
