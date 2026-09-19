import React, { useState } from 'react';
import {
  Shield,
  Plus,
  UserCheck,
  Trash2,
  Check,
  X,
  AlertCircle,
  Mail,
  Lock,
  User as UserIcon,
} from 'lucide-react';
import { Usuario, UserRole } from '../../types';
import { usuariosService } from '../../services/usuariosService';
import { formatFechaCorta } from '../../utils/formatters';

interface UsuariosViewProps {
  usuarios: Usuario[];
  onRefreshData?: () => void;
}

export const UsuariosView: React.FC<UsuariosViewProps> = ({
  usuarios,
  onRefreshData,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState<UserRole>('caja');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setEmail('');
    setNombre('');
    setRol('caja');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !nombre.trim()) {
      setErrorMsg('Nombre y correo electrónico son requeridos.');
      return;
    }
    setSaving(true);
    setErrorMsg(null);

    try {
      await usuariosService.crearUsuario({
        email: email.trim().toLowerCase(),
        nombre: nombre.trim(),
        rol,
        activo: true,
      });

      setModalOpen(false);
      onRefreshData?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al registrar usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: Usuario) => {
    if (!u.id) return;
    if (u.rol === 'admin' && usuarios.filter((x) => x.rol === 'admin').length <= 1) {
      alert('No puedes eliminar el único administrador del sistema.');
      return;
    }

    if (!window.confirm(`¿Seguro que deseas eliminar al usuario ${u.nombre}?`)) return;

    try {
      await usuariosService.eliminarUsuario(u.id);
      onRefreshData?.();
    } catch (err: any) {
      alert('Error al eliminar usuario: ' + err.message);
    }
  };

  const handleToggleActivo = async (u: Usuario) => {
    if (!u.id) return;
    try {
      await usuariosService.actualizarUsuario(u.id, {
        activo: !u.activo,
      });
      onRefreshData?.();
    } catch (err: any) {
      alert('Error al actualizar estado: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-amber-600" />
            <span>Usuarios y Roles</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Control de acceso basado en roles: <strong>Administrador</strong> (acceso total) y <strong>Caja</strong> (ventas y pedidos).
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold shadow-md transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-600">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">Usuario</th>
                <th className="p-3.5">Correo Electrónico</th>
                <th className="p-3.5">Rol Asignado</th>
                <th className="p-3.5">Estado</th>
                <th className="p-3.5">Creado</th>
                <th className="p-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {usuarios.map((u) => (
                <tr key={u.id || u.email} className="hover:bg-stone-50/50">
                  <td className="p-3.5 font-bold text-stone-900 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                      {u.nombre.charAt(0).toUpperCase()}
                    </div>
                    <span>{u.nombre}</span>
                  </td>
                  <td className="p-3.5 text-stone-600">
                    {u.email}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        u.rol === 'admin'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-blue-100 text-blue-900 border border-blue-300'
                      }`}
                    >
                      <UserCheck className="w-3 h-3" />
                      {u.rol === 'admin' ? 'Administrador' : 'Cajero / Operador'}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <button
                      onClick={() => handleToggleActivo(u)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${
                        u.activo !== false
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {u.activo !== false ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="p-3.5 text-stone-400">
                    {formatFechaCorta(u.createdAt)}
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => handleDelete(u)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Eliminar usuario"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Create User */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif font-bold text-base text-stone-900">
                Registrar Nuevo Usuario
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
                <label className="block font-bold text-stone-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. María Pérez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  placeholder="usuario@deliciasbelgi.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Rol de Acceso</label>
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none font-semibold"
                >
                  <option value="caja">Caja / Terminal de Ventas</option>
                  <option value="admin">Administrador (Acceso Total)</option>
                </select>
                <p className="text-[11px] text-stone-500 mt-1">
                  Los usuarios con rol "Caja" solo pueden acceder al punto de venta y catálogo.
                </p>
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
                  {saving ? 'Guardando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
