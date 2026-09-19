import React, { useState } from 'react';
import {
  Settings,
  Save,
  Clock,
  Phone,
  MessageCircle,
  MapPin,
  Instagram,
  Check,
  Building,
  Sparkles,
  Truck,
  ShoppingBag,
} from 'lucide-react';
import { ConfiguracionNegocio, HorariosSemana } from '../../types';
import { configuracionService } from '../../services/configuracionService';

interface ConfiguracionViewProps {
  config: ConfiguracionNegocio;
  onRefreshData?: () => void;
}

const DIAS_KEYS: (keyof HorariosSemana)[] = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
];

const DIAS_LABELS: Record<keyof HorariosSemana, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

export const ConfiguracionView: React.FC<ConfiguracionViewProps> = ({
  config,
  onRefreshData,
}) => {
  const [formData, setFormData] = useState<ConfiguracionNegocio>({ ...config });
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleHorarioChange = (
    dia: keyof HorariosSemana,
    field: 'activo' | 'apertura' | 'cierre',
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      horarios: {
        ...prev.horarios,
        [dia]: {
          ...(prev.horarios?.[dia] || { activo: true, apertura: '09:00', cierre: '19:30' }),
          [field]: value,
        },
      },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      await configuracionService.guardarConfiguracion(formData);
      setSavedSuccess(true);
      onRefreshData?.();
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      alert('Error al guardar configuración: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2">
            <Settings className="w-7 h-7 text-amber-600" />
            <span>Configuración del Negocio</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Personaliza la información pública de Delicias Belgi, horarios, números de WhatsApp y modalidades de pedido.
          </p>
        </div>

        {savedSuccess && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-bold animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>¡Configuración actualizada con éxito!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* General Business Info */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <h2 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2 pb-2 border-b border-stone-100">
            <Building className="w-5 h-5 text-amber-800" />
            <span>Información General y Marca</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Nombre Comercial</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Descripción Breve</label>
              <input
                type="text"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Título de la Portada (Hero)</label>
              <input
                type="text"
                value={formData.heroTitulo || ''}
                onChange={(e) => setFormData({ ...formData, heroTitulo: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Subtítulo de la Portada</label>
              <input
                type="text"
                value={formData.heroSubtitulo || ''}
                onChange={(e) => setFormData({ ...formData, heroSubtitulo: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-stone-700 mb-1">Historia y Presentación (Sobre Nosotros)</label>
              <textarea
                rows={3}
                value={formData.presentacionTexto || ''}
                onChange={(e) => setFormData({ ...formData, presentacionTexto: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Contact & WhatsApp */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <h2 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2 pb-2 border-b border-stone-100">
            <MessageCircle className="w-5 h-5 text-emerald-600" />
            <span>Contacto, WhatsApp & Ubicación</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Número de WhatsApp (Sin signos, ej. 50767979141)</label>
              <input
                type="text"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Teléfono Fijo / Atención</label>
              <input
                type="text"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-stone-700 mb-1">Dirección Física Completa</label>
              <input
                type="text"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Enlace de Google Maps</label>
              <input
                type="url"
                value={formData.googleMaps || ''}
                onChange={(e) => setFormData({ ...formData, googleMaps: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Perfil de Instagram</label>
              <input
                type="url"
                value={formData.instagram || ''}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Schedules */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <h2 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2 pb-2 border-b border-stone-100">
            <Clock className="w-5 h-5 text-amber-800" />
            <span>Horarios de Atención Semanales</span>
          </h2>

          <div className="space-y-3">
            {DIAS_KEYS.map((diaKey) => {
              const dia = formData.horarios?.[diaKey] || { activo: true, apertura: '09:00', cierre: '19:30' };
              return (
                <div
                  key={diaKey}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200/80 gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 w-32">
                    <input
                      type="checkbox"
                      id={`chk-${diaKey}`}
                      checked={dia.activo}
                      onChange={(e) => handleHorarioChange(diaKey, 'activo', e.target.checked)}
                      className="w-4 h-4 rounded text-amber-900 focus:ring-amber-900"
                    />
                    <label htmlFor={`chk-${diaKey}`} className="font-bold text-stone-800 cursor-pointer">
                      {DIAS_LABELS[diaKey]}
                    </label>
                  </div>

                  <div className="flex items-center gap-4">
                    {dia.activo ? (
                      <div className="flex items-center gap-2">
                        <span className="text-stone-500">De</span>
                        <input
                          type="time"
                          value={dia.apertura}
                          onChange={(e) => handleHorarioChange(diaKey, 'apertura', e.target.value)}
                          className="px-2.5 py-1 rounded-lg border border-stone-200 bg-white text-xs font-semibold"
                        />
                        <span className="text-stone-500">a</span>
                        <input
                          type="time"
                          value={dia.cierre}
                          onChange={(e) => handleHorarioChange(diaKey, 'cierre', e.target.value)}
                          className="px-2.5 py-1 rounded-lg border border-stone-200 bg-white text-xs font-semibold"
                        />
                      </div>
                    ) : (
                      <span className="text-stone-400 italic text-xs">Cerrado este día</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Todas las Configuraciones</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
