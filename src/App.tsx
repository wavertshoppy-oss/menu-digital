import React, { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { PublicPage } from './components/public/PublicPage';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminLogin } from './components/admin/AdminLogin';
import { DashboardView } from './components/admin/DashboardView';
import { VentasView } from './components/admin/VentasView';
import { ProductosView } from './components/admin/ProductosView';
import { InventarioView } from './components/admin/InventarioView';
import { ProduccionView } from './components/admin/ProduccionView';
import { CategoriasView } from './components/admin/CategoriasView';
import { UsuariosView } from './components/admin/UsuariosView';
import { ConfiguracionView } from './components/admin/ConfiguracionView';

import { productosService } from './services/productosService';
import { categoriasService } from './services/categoriasService';
import { configuracionService } from './services/configuracionService';
import { ventasService } from './services/ventasService';
import { inventarioService } from './services/inventarioService';
import { produccionService } from './services/produccionService';
import { usuariosService, normalizeRole } from './services/usuariosService';
import { authService } from './services/authService';

import {
  Producto,
  Categoria,
  ConfiguracionNegocio,
  Venta,
  MovimientoInventario,
  ProduccionRegistro,
  Usuario,
  UserAuth,
  CartItem,
  AdminTab,
} from './types';
import { DEFAULT_CONFIGURACION } from './services/initialData';

export default function App() {
  // Navigation & View Mode
  const [currentView, setCurrentView] = useState<'public' | 'admin_login' | 'admin'>('public');
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');

  // Auth User
  const [user, setUser] = useState<UserAuth | null>(null);

  // Business Data State
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [config, setConfig] = useState<ConfiguracionNegocio>(DEFAULT_CONFIGURACION);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [producciones, setProducciones] = useState<ProduccionRegistro[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(true);

  // Cart State (Persisted in localStorage)
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('delicias_belgi_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save Cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('delicias_belgi_cart', JSON.stringify(cart));
    } catch (e) {
      console.warn('Error saving cart to local storage', e);
    }
  }, [cart]);

  // URL parameter sync
  useEffect(() => {
    const handleUrlChange = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const view = params.get('view');
        const tab = params.get('tab') as AdminTab | null;
        if (view === 'admin' || view === 'admin_login' || view === 'public') {
          setCurrentView(view);
        }
        if (
          tab &&
          [
            'dashboard',
            'ventas',
            'productos',
            'inventario',
            'produccion',
            'categorias',
            'usuarios',
            'configuracion',
          ].includes(tab)
        ) {
          setAdminTab(tab);
        }
      } catch (e) {
        console.warn('URL parse warning:', e);
      }
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  // Sync state back to URL query
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (currentView === 'admin') {
        url.searchParams.set('view', 'admin');
        url.searchParams.set('tab', adminTab);
      } else if (currentView === 'admin_login') {
        url.searchParams.set('view', 'admin_login');
        url.searchParams.delete('tab');
      } else {
        url.searchParams.delete('view');
        url.searchParams.delete('tab');
      }
      window.history.replaceState({}, '', url.toString());
    } catch (_) {}
  }, [currentView, adminTab]);

  // Real-time subscriptions to all services
  useEffect(() => {
    // 1. Auth subscription
    const unsubAuth = authService.suscribirUsuario((currentUser: UserAuth | null) => {
      setUser(currentUser);
      if (currentUser && currentView === 'admin_login') {
        setCurrentView('admin');
      }
    });

    // 2. Productos
    const unsubProd = productosService.suscribirProductos((data: Producto[]) => {
      setProductos(data);
      setLoadingProductos(false);
    });

    // 3. Categorias
    const unsubCat = categoriasService.suscribirCategorias((data: Categoria[]) => {
      setCategorias(data);
    });

    // 4. Configuracion
    const unsubConfig = configuracionService.suscribirConfiguracion((data: ConfiguracionNegocio) => {
      if (data) setConfig(data);
    });

    // 5. Ventas
    const unsubVentas = ventasService.suscribirVentas((data: Venta[]) => {
      setVentas(data);
    });

    // 6. Inventario
    const unsubInv = inventarioService.suscribirMovimientos((data: MovimientoInventario[]) => {
      setMovimientos(data);
    });

    // 7. Produccion
    const unsubProdReg = produccionService.suscribirProducciones((data: ProduccionRegistro[]) => {
      setProducciones(data);
    });

    // 8. Usuarios
    const unsubUsers = usuariosService.suscribirUsuarios((data: Usuario[]) => {
      setUsuarios(data);
    });

    return () => {
      unsubAuth();
      unsubProd();
      unsubCat();
      unsubConfig();
      unsubVentas();
      unsubInv();
      unsubProdReg();
      unsubUsers();
    };
  }, [currentView]);

  // Cart Actions
  const handleAddToCart = (producto: Producto) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.producto.id === producto.id);
      if (existing) {
        return prevCart.map((item) =>
          item.producto.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [...prevCart, { producto, cantidad: 1 }];
    });
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.producto.id === productId ? { ...item, cantidad: quantity } : item
      )
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.producto.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Auth / Navigation Handlers
  const handleGoToAdmin = () => {
    if (user) {
      setCurrentView('admin');
    } else {
      setCurrentView('admin_login');
    }
  };

  const handleBackToPublic = () => {
    setCurrentView('public');
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setCurrentView('public');
  };

  const handleLoginSuccess = (authenticatedUser: UserAuth) => {
    setUser(authenticatedUser);
    setCurrentView('admin');
  };

  // 1. Public Storefront View
  if (currentView === 'public') {
    return (
      <PublicPage
        productos={productos}
        loadingProductos={loadingProductos}
        config={config}
        cart={cart}
        onAddToCart={handleAddToCart}
        onUpdateCartQuantity={handleUpdateCartQuantity}
        onRemoveFromCart={handleRemoveFromCart}
        onClearCart={handleClearCart}
        onGoToAdmin={handleGoToAdmin}
      />
    );
  }

  // 2. Admin Login View (if user explicitly went to login OR is unauthenticated trying to access admin)
  if (currentView === 'admin_login' || !user) {
    return (
      <AdminLogin
        onLoginSuccess={handleLoginSuccess}
        onBackToPublic={handleBackToPublic}
      />
    );
  }

  // 3. User authenticated: Check roles and route protection
  const userRole = normalizeRole(user.role);
  const isCajero = userRole === 'cajero';

  /**
   * CAJERO Permissions:
   * - Permitted: Dashboard, Ventas, Inventario
   * - Restricted: Producción, Usuarios, Configuración, Categorías, Productos
   */
  const restrictedTabsForCajero: AdminTab[] = [
    'productos',
    'produccion',
    'categorias',
    'usuarios',
    'configuracion',
  ];

  const isRestrictedForCajero = isCajero && restrictedTabsForCajero.includes(adminTab);

  return (
    <AdminLayout
      currentTab={adminTab}
      onSelectTab={(tab) => setAdminTab(tab)}
      user={user}
      onLogout={handleLogout}
      onBackToPublic={handleBackToPublic}
    >
      {/* If cajero attempts to enter a restricted section, enforce access denied message */}
      {isRestrictedForCajero ? (
        <div className="max-w-md mx-auto my-12 p-8 rounded-2xl bg-white border border-stone-200 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-stone-900">
              Acceso Restringido
            </h2>
            <p className="text-sm font-bold text-rose-700 mt-2">
              No tienes permisos para acceder a esta sección.
            </p>
            <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
              Tu rol de <strong>Cajero</strong> solo tiene acceso autorizado a <strong>Dashboard</strong>, <strong>Ventas</strong> e <strong>Inventario</strong>.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => setAdminTab('ventas')}
              className="px-5 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
            >
              Ir a Terminal de Ventas
            </button>
          </div>
        </div>
      ) : (
        <>
          {adminTab === 'dashboard' && (
            <DashboardView
              ventas={ventas}
              productos={productos}
              producciones={producciones}
              onNavigateTab={setAdminTab}
            />
          )}

          {adminTab === 'ventas' && (
            <VentasView
              ventas={ventas}
              productos={productos}
              user={user}
              onRefreshData={() => {}}
            />
          )}

          {adminTab === 'inventario' && (
            <InventarioView
              productos={productos}
              movimientos={movimientos}
              user={user}
              onRefreshData={() => {}}
            />
          )}

          {/* Admin-Only Tabs */}
          {adminTab === 'productos' && (
            <ProductosView
              productos={productos}
              categorias={categorias}
              onRefreshData={() => {}}
            />
          )}

          {adminTab === 'produccion' && (
            <ProduccionView
              producciones={producciones}
              productos={productos}
              user={user}
              onRefreshData={() => {}}
            />
          )}

          {adminTab === 'categorias' && (
            <CategoriasView
              categorias={categorias}
              productos={productos}
              onRefreshData={() => {}}
            />
          )}

          {adminTab === 'usuarios' && (
            <UsuariosView
              usuarios={usuarios}
              onRefreshData={() => {}}
            />
          )}

          {adminTab === 'configuracion' && (
            <ConfiguracionView
              config={config}
              onRefreshData={() => {}}
            />
          )}
        </>
      )}
    </AdminLayout>
  );
}
