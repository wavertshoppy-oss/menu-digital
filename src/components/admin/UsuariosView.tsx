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
  Edit2,
  Key,
  Info,
  Copy,
  CheckCheck,
} from 'lucide-react';
import { Usuario, UserRole } from '../../types';
import { usuariosService, normalizeRole, getRoleDisplayName } from '../../services/usuariosService';
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
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);

  // Form State
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [customUid, setCustomUid] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<UserRole>('cajero');
  const [activo, setActivo] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setEmail('');
    setNombre('');
    setCustomUid('');
    setPassword('');
    setRol('cajero');
    setActivo(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (u: Usuario) => {
    setEditingUser(u);
    setEmail(u.email);
    setNombre(u.nombre);
    setCustomUid(u.uid || u.id);
    setPassword('');
    setRol(normalizeRole(u.rol || u.role));
    setActivo(u.activo !== false);
    setErrorMsg(null);
    setSuccessMsg(null);
    setModalOpen(true);
  };

  const handleCopyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
    setCopiedUid(uid);
    setTimeout(() => setCopiedUid(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim()) {
      setErrorMsg('Nombre y correo electrónico son obligatorios.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      if (editingUser && editingUser.id) {
        await usuariosService.actualizarUsuario(editingUser.id, {
          nombre: nombre.trim(),
          email: email.trim().toLowerCase(),
          rol,
          role: rol,
          activo,
        });
        setSuccessMsg(`Usuario "${nombre.trim()}" actualizado correctamente.`);
      } else {
        const uidToUse = customUid.trim() || undefined;
        await usuariosService.crearUsuario({
          uid: uidToUse,
          id: uidToUse,
          email: email.trim().toLowerCase(),
          nombre: nombre.trim(),
          rol,
          role: rol,
          activo,
        });
        setSuccessMsg(`Usuario "${nombre.trim()}" registrado en Firestore con rol ${getRoleDisplayName(rol)}.`);
      }

      setTimeout(() => {
        setModalOpen(false);
        setSuccessMsg(null);
        onRefreshData?.();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar el usuario.');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChangeDirect = async (u: Usuario, newRole: UserRole) => {
    const targetUid = u.uid || u.id;
    if (!targetUid) return;
    const currentNorm = normalizeRole(u.rol || u.role);
    if (currentNorm === 'admin' && newRole === 'cajero') {
      const adminCount = usuarios.filter((x) => normalizeRole(x.rol || x.role) === 'admin').length;
      if (adminCount <= 1) {
        alert('No puedes cambiar el rol del único Administrador activo del sistema.');
        return;
      }
    }

    try {
      await usuariosService.updateUserRole(targetUid, newRole);
      onRefreshData?.();
    } catch (err: any) {
      alert('Error al actualizar rol: ' + err.message);
    }
  };

  const handleDelete = async (u: Usuario) => {
    const targetUid = u.uid || u.id;
    if (!targetUid) return;
    const currentNorm = normalizeRole(u.rol || u.role);
    if (currentNorm === 'admin' && usuarios.filter((x) => normalizeRole(x.rol || x.role) === 'admin').length <= 1) {
      alert('No puedes eliminar el único Administrador del sistema.');
      return;
    }

    if (!window.confirm(`¿Estás seguro de eliminar el perfil de ${u.nombre} de Firestore? Esta acción no eliminará el usuario de Firebase Authentication, solo su rol y perfil de la aplicación.`)) return;

    try {
      await usuariosService.eliminarUsuario(targetUid);
      onRefreshData?.();
    } catch (err: any) {
      alert('Error al eliminar usuario: ' + err.message);
    }
  };

  const handleToggleActivo = async (u: Usuario) => {
    const targetUid = u.uid || u.id;
    if (!targetUid) return;
    try {
      await usuariosService.actualizarUsuario(targetUid, {
        activo: !u.activo,
      });
      onRefreshData?.();
    } catch (err: any) {
      alert('Error al actualizar estado: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-amber-700" />
            <span>Gestión de Usuarios y Roles</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Colección <code>usuarios</code> en Firestore vinculada al UID de Firebase Authentication con <strong>únicamente dos roles</strong>: <strong>Administrador</strong> y <strong>Cajero</strong>.
          </p>
        </div>

        <button
          id="btn-nuevo-usuario"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold shadow-md transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Vincular / Nuevo Usuario</span>
        </button>
      </div>

      {/* Role Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-950 block">
              Rol: Administrador
            </span>
            <p className="text-xs text-stone-600 mt-0.5">
              Acceso total a: <strong>Dashboard, Ventas, Productos, Inventario, Producción, Categorías, Usuarios y Configuración</strong>.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center shrink-0 font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-950 block">
              Rol: Cajero
            </span>
            <p className="text-xs text-stone-600 mt-0.5">
              Acceso restringido exclusivamente a: <strong>Dashboard, Ventas e Inventario</strong>. Bloqueado de Producción, Usuarios, Configuración y Menú de Productos.
            </p>
          </div>
        </div>
      </div>

      {/* Table of Users */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-600">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4">Usuario</th>
                <th className="p-4">Correo Electrónico</th>
                <th className="p-4">UID de Firebase Auth</th>
                <th className="p-4">Rol Asignado</th>
                <th className="p-4">Reasignar Rol</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Fecha Creación</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {usuarios.map((u) => {
                const normalized = normalizeRole(u.rol || u.role);
                const isAdm = normalized === 'admin';
                const currentUid = u.uid || u.id || '';
                return (
                  <tr key={currentUid || u.email} className="hover:bg-stone-50/60 transition-colors">
                    <td className="p-4 font-bold text-stone-900 flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          isAdm ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
                        }`}
                      >
                        {u.nombre ? u.nombre.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <span className="block font-semibold text-stone-900">{u.nombre || 'Usuario'}</span>
                      </div>
                    </td>

                    <td className="p-4 text-stone-600 font-medium">
                      {u.email}
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-stone-500">
                        <span className="truncate max-w-[120px]" title={currentUid}>
                          {currentUid}
                        </span>
                        <button
                          onClick={() => handleCopyUid(currentUid)}
                          className="p-1 hover:bg-stone-100 rounded text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                          title="Copiar UID"
                        >
                          {copiedUid === currentUid ? (
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          isAdm
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-blue-100 text-blue-900 border border-blue-300'
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        {getRoleDisplayName(normalized)}
                      </span>
                    </td>

                    <td className="p-4">
                      <select
                        aria-label={`Reasignar rol para ${u.nombre}`}
                        value={normalized}
                        onChange={(e) => handleRoleChangeDirect(u, e.target.value as UserRole)}
                        className="px-2.5 py-1 text-xs rounded-lg border border-stone-200 bg-stone-50 text-stone-800 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-900 cursor-pointer"
                      >
                        <option value="admin">Administrador</option>
                        <option value="cajero">Cajero</option>
                      </select>
                    </td>

                    <td className="p-4">
                      <button
                        onClick={() => handleToggleActivo(u)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                          u.activo !== false
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                        }`}
                      >
                        {u.activo !== false ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>

                    <td className="p-4 text-stone-400">
                      {formatFechaCorta(u.fechaCreacion || u.createdAt)}
                    </td>

                    <td className="p-4 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-amber-900 hover:bg-amber-50 cursor-pointer transition-colors"
                        title="Editar datos del usuario"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                        title="Eliminar perfil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create or Edit User */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-700" />
                <span>{editingUser ? 'Editar Usuario' : 'Vincular o Crear Usuario'}</span>
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Nombre Completo *</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan Pérez"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20 focus:border-amber-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Correo Electrónico *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="usuario@deliciasbelgi.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20 focus:border-amber-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  UID de Firebase Auth {editingUser ? '(No modificable)' : '(Opcional si ya existe en Firebase)'}
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    disabled={!!editingUser}
                    placeholder="Ej. 7KzO8w8B91b... (copiar de Authentication)"
                    value={customUid}
                    onChange={(e) => setCustomUid(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2.5 text-xs font-mono rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-900/20 focus:border-amber-900 ${
                      editingUser ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
                <p className="text-[10px] text-stone-400 mt-1">
                  Si ya creaste el usuario en Firebase Authentication Console, pega su UID para vincular el documento <code>usuarios/&#123;uid&#125;</code> directamente.
                </p>
              </div>

              {/* Strict Role Selection: ONLY Administrador and Cajero */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">Rol en el Sistema *</label>
                <select
                  required
                  value={rol}
                  onChange={(e) => setRol(e.target.value as UserRole)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none font-bold text-stone-800 focus:ring-2 focus:ring-amber-900/20 focus:border-amber-900"
                >
                  <option value="admin">Administrador (Acceso Total a todos los módulos)</option>
                  <option value="cajero">Cajero (Solo Dashboard, Ventas e Inventario)</option>
                </select>
                <p className="text-[11px] text-stone-500 mt-1.5 flex items-start gap-1">
                  <Info className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                  <span>
                    El sistema opera exclusivamente bajo los roles de <strong>Administrador</strong> y <strong>Cajero</strong>.
                  </span>
                </p>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
                <div>
                  <span className="font-bold text-stone-800 block text-xs">Estado de la cuenta</span>
                  <span className="text-[10px] text-stone-500">
                    {activo ? 'El usuario puede iniciar sesión en el sistema' : 'El usuario está desactivado y no puede acceder'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActivo(!activo)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activo ? 'bg-emerald-600 text-white' : 'bg-stone-300 text-stone-700'
                  }`}
                >
                  {activo ? 'Activo' : 'Inactivo'}
                </button>
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
                  className="px-5 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white font-bold cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {saving ? 'Guardando...' : editingUser ? 'Actualizar Usuario' : 'Guardar en Firestore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
