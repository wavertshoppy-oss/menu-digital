import React, { useState, useEffect } from 'react';
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
import { usuariosService } from './services/usuariosService';
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
    const unsubProdReg = produccionService.suscribirProduccion((data: ProduccionRegistro[]) => {
      setProducciones(data);
    });

    // 8. Usuarios
    const unsubUser = usuariosService.suscribirUsuarios((data: any[]) => {
      setUsuarios(data as any);
    });

    return () => {
      unsubAuth();
      unsubProd();
      unsubCat();
      unsubConfig();
      unsubVentas();
      unsubInv();
      unsubProdReg();
      unsubUser();
    };
  }, []);

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

  // Render Public Storefront
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

  // Render Admin Login
  if (currentView === 'admin_login') {
    return (
      <AdminLogin
        onLoginSuccess={handleLoginSuccess}
        onBackToPublic={handleBackToPublic}
      />
    );
  }

  // Render Admin Dashboard and Management
  const currentAuthUser = user || {
    uid: 'local-admin',
    email: 'admin@deliciasbelgi.com',
    displayName: 'Administrador Belgi',
    role: 'admin',
  };

  return (
    <AdminLayout
      currentTab={adminTab}
      onSelectTab={setAdminTab}
      user={currentAuthUser}
      onLogout={handleLogout}
      onBackToPublic={handleBackToPublic}
    >
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
          user={currentAuthUser}
          onRefreshData={() => {}}
        />
      )}

      {adminTab === 'productos' && (
        <ProductosView
          productos={productos}
          categorias={categorias}
          onRefreshData={() => {}}
        />
      )}

      {adminTab === 'inventario' && (
        <InventarioView
          productos={productos}
          movimientos={movimientos}
          user={currentAuthUser}
          onRefreshData={() => {}}
        />
      )}

      {adminTab === 'produccion' && (
        <ProduccionView
          producciones={producciones}
          productos={productos}
          user={currentAuthUser}
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
    </AdminLayout>
  );
}
