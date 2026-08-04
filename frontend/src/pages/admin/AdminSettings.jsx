import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
// Editor de contenido del sitio (mini-CMS), agregado como segunda pestaña de Ajustes
// (20/07/2026, template admin_settings_content). Permite editar textos e imágenes de
// las páginas públicas.
import AdminContent from './AdminContent';
// Gestión de catálogos: se movió a su propia página (sub-ítem de Propiedades,
// /admin/catalogs) en vez de ser pestaña de Ajustes (21/07/2026). Import e uso
// comentados acá (no eliminados, según regla del proyecto).
// import AdminCatalogs from './AdminCatalogs';

// --- Sección: Perfil de Cuenta ---
// Reescrita el 26/07/2026: antes era solo maqueta (datos hardcodeados "Juan Pérez
// Admin", botón sin acción). Ahora carga el admin real y persiste nombre + email vía
// PUT /api/auth/profile. Se quitó el campo "Cargo / Título" (no lo usa el sitio y el
// modelo Admin no lo tiene) y el botón "Cambiar Foto" (no persistía; el avatar muestra
// las iniciales derivadas del nombre real).
function ProfileSection() {
  const { admin, updateAdmin } = useAuth();
  const [form, setForm] = useState({ name: '', email: '' });
  const [saving, setSaving] = useState(false);

  // Precarga los datos reales del admin logueado cuando el contexto los tiene.
  useEffect(() => {
    if (admin) setForm({ name: admin.name || '', email: admin.email || '' });
  }, [admin]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Iniciales para el avatar (primeras letras de hasta dos palabras del nombre).
  const initials = (form.name || 'A')
    .trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || 'A';

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Completá nombre y email');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put('/auth/profile', { name: form.name.trim(), email: form.email.trim() });
      updateAdmin(data); // refresca el nombre mostrado en el sidebar sin re-loguear
      toast.success('Perfil actualizado');
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 md:p-8">
      <div className="border-b border-outline-variant pb-4 mb-6">
        <h2 className="font-headline-md text-headline-md text-primary">Perfil de Cuenta</h2>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Actualice su información personal.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Columna avatar (iniciales derivadas del nombre) */}
        <div className="flex flex-col items-center gap-4 w-full md:w-1/4">
          <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-outline-variant">
            <div className="w-full h-full bg-primary-container flex items-center justify-center">
              <span className="font-headline-md text-on-primary-container text-3xl">{initials}</span>
            </div>
          </div>
        </div>

        {/* Columna formulario */}
        <div className="w-full md:w-3/4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="font-label-md text-label-md text-on-surface">Nombre Completo</label>
              <input
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                className="border border-outline-variant rounded px-4 py-2 font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none text-on-surface bg-surface-container-lowest"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-label-md text-label-md text-on-surface">Correo Electrónico</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="border border-outline-variant rounded px-4 py-2 font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none text-on-surface bg-surface-container-lowest"
              />
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary text-on-primary px-6 py-2 rounded font-label-md text-label-md hover:bg-primary-container transition-colors disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar Perfil'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// --- Sección: Preferencias de la Aplicación ---
// COMENTADA (15/07/2026): el cliente pidió eliminarla del panel de Ajustes porque
// es obsoleta, no cumple ninguna función real. El toggle de notificaciones y el
// selector de moneda solo tocaban estado local de React (no persistían en ningún
// lado, no había endpoint ni tabla en la BD para guardar preferencias), y el botón
// "Guardar Preferencias" no hacía ninguna request. Se comenta en vez de eliminar,
// según regla del proyecto de no borrar código. Comentada línea por línea (en vez
// de con /* */) porque el JSX interno ya usa comentarios {/* ... */} que romperían
// un bloque /* */ envolvente.
// function PreferencesSection() {
//   const [emailNotifications, setEmailNotifications] = useState(true);
//   const [currency, setCurrency] = useState('USD');
//
//   return (
//     <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 md:p-8">
//       <div className="border-b border-outline-variant pb-4 mb-6">
//         <h2 className="font-headline-md text-headline-md text-primary">Preferencias de la Aplicación</h2>
//         <p className="font-body-md text-body-md text-on-surface-variant mt-1">
//           Configure notificaciones y formatos regionales.
//         </p>
//       </div>
//
//       <div className="space-y-4">
//         {/* Toggle notificaciones */}
//         <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-surface rounded border border-outline-variant gap-4">
//           <div>
//             <h3 className="font-label-md text-label-md text-on-surface">Notificaciones por Email</h3>
//             <p className="font-body-md text-body-md text-on-surface-variant text-sm mt-1">
//               Recibir alertas sobre nuevas consultas y tasaciones.
//             </p>
//           </div>
//           {/* Toggle switch accesible */}
//           <button
//             role="switch"
//             aria-checked={emailNotifications}
//             onClick={() => setEmailNotifications(!emailNotifications)}
//             className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
//               emailNotifications ? 'bg-primary' : 'bg-surface-container-highest'
//             }`}
//           >
//             <span
//               className={`inline-block h-5 w-5 transform rounded-full bg-white border border-outline-variant transition-transform ${
//                 emailNotifications ? 'translate-x-5' : 'translate-x-0.5'
//               }`}
//             />
//           </button>
//         </div>
//
//         {/* Selector de moneda */}
//         <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-surface rounded border border-outline-variant gap-4">
//           <div>
//             <h3 className="font-label-md text-label-md text-on-surface">Moneda Principal</h3>
//             <p className="font-body-md text-body-md text-on-surface-variant text-sm mt-1">
//               Moneda por defecto para mostrar valores de propiedades.
//             </p>
//           </div>
//           <select
//             value={currency}
//             onChange={(e) => setCurrency(e.target.value)}
//             className="border border-outline-variant rounded px-4 py-2 font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none text-on-surface bg-surface-container-lowest w-full md:w-48"
//           >
//             <option value="USD">USD ($)</option>
//             <option value="ARS">ARS ($)</option>
//             <option value="EUR">EUR (€)</option>
//           </select>
//         </div>
//
//         <div className="flex justify-end pt-4">
//           <button className="bg-primary text-on-primary px-6 py-2 rounded font-label-md text-label-md hover:bg-primary-container transition-colors">
//             Guardar Preferencias
//           </button>
//         </div>
//       </div>
//     </section>
//   );
// }

// --- Sección: Seguridad ---
function SecuritySection() {
  const [fields, setFields] = useState({ actual: '', nueva: '', confirmar: '' });
  const [visible, setVisible] = useState({ actual: false, nueva: false, confirmar: false });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => setFields({ ...fields, [e.target.name]: e.target.value });
  const toggleVisible = (key) => setVisible({ ...visible, [key]: !visible[key] });

  // Cambia la contraseña vía PUT /api/auth/password (valida la actual en el backend).
  const handleUpdatePassword = async () => {
    if (!fields.actual || !fields.nueva || !fields.confirmar) {
      toast.error('Completá los tres campos');
      return;
    }
    if (fields.nueva.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (fields.nueva !== fields.confirmar) {
      toast.error('La nueva contraseña y su confirmación no coinciden');
      return;
    }
    setSaving(true);
    try {
      await api.put('/auth/password', { currentPassword: fields.actual, newPassword: fields.nueva });
      toast.success('Contraseña actualizada');
      setFields({ actual: '', nueva: '', confirmar: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo cambiar la contraseña');
    } finally {
      setSaving(false);
    }
  };

  const passwordField = (label, name) => (
    <div className="flex flex-col gap-2">
      <label className="font-label-md text-label-md text-on-surface">{label}</label>
      <div className="relative">
        <input
          name={name}
          type={visible[name] ? 'text' : 'password'}
          value={fields[name]}
          onChange={handleChange}
          placeholder="••••••••"
          className="border border-outline-variant rounded px-4 py-2 pr-10 w-full font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none text-on-surface bg-surface-container-lowest"
        />
        <button
          type="button"
          onClick={() => toggleVisible(name)}
          className="absolute right-3 top-2.5 text-on-surface-variant"
        >
          {visible[name] ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      </div>
    </div>
  );

  return (
    <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 md:p-8">
      <div className="border-b border-outline-variant pb-4 mb-6">
        <h2 className="font-headline-md text-headline-md text-primary">Seguridad</h2>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Actualice su contraseña y gestione la seguridad de la cuenta.
        </p>
      </div>

      <div className="w-full md:w-1/2 space-y-6">
        {passwordField('Contraseña Actual', 'actual')}
        {passwordField('Nueva Contraseña', 'nueva')}
        {passwordField('Confirmar Nueva Contraseña', 'confirmar')}
        <div className="flex justify-start pt-4">
          {/* Botón rojo (secondary) para acción de riesgo moderado: cambio de contraseña */}
          <button
            onClick={handleUpdatePassword}
            disabled={saving}
            className="bg-secondary text-on-secondary px-6 py-2 rounded font-label-md text-label-md hover:bg-secondary-container transition-colors disabled:opacity-60"
          >
            {saving ? 'Actualizando...' : 'Actualizar Contraseña'}
          </button>
        </div>
      </div>
    </section>
  );
}

// Pestañas del panel de Ajustes: Perfil (perfil + seguridad) y Contenido del sitio.
const TABS = [
  { key: 'perfil', label: 'Perfil', icon: 'person' },
  { key: 'contenido', label: 'Contenido del sitio', icon: 'edit_document' },
  // La pestaña "Catálogos" se movió a su propia página (Propiedades → Catálogos):
  // { key: 'catalogos', label: 'Catálogos', icon: 'category' },
];

// --- Página principal de Ajustes ---
export default function AdminSettings() {
  // Pestaña activa. Se agregó (20/07/2026) para que desde Ajustes se pueda acceder
  // tanto a las modificaciones del perfil como al editor de contenido de las páginas.
  const [activeTab, setActiveTab] = useState('perfil');

  return (
    <div className="bg-background min-h-screen">
      {/* Encabezado de página */}
      <div className="px-6 md:px-16 pt-8 md:pt-12 pb-4 max-w-screen-xl mx-auto">
        <h1 className="font-headline-xl text-headline-xl text-primary mb-2">Ajustes del Sistema</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Gestioná tu perfil, la seguridad de la cuenta y el contenido de las páginas del sitio.
        </p>
      </div>

      {/* Barra de pestañas */}
      <div className="px-6 md:px-16 max-w-screen-xl mx-auto">
        <div className="flex gap-1 border-b border-outline-variant">
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 font-label-md text-label-md border-b-2 -mb-px transition-colors ${
                  isActive
                    ? 'border-secondary text-secondary'
                    : 'border-transparent text-on-surface-variant hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido principal según pestaña */}
      <div className="px-6 md:px-16 py-8 pb-16 max-w-screen-xl mx-auto">
        {activeTab === 'perfil' && (
          <div className="space-y-8">
            <ProfileSection />
            {/* PreferencesSection comentada arriba (15/07/2026): sección obsoleta que el
                cliente pidió sacar del panel de Ajustes, no cumplía ninguna función. */}
            {/* <PreferencesSection /> */}
            <SecuritySection />
          </div>
        )}
        {activeTab === 'contenido' && <AdminContent />}
        {/* Catálogos movido a Propiedades → Catálogos (/admin/catalogs):
        {activeTab === 'catalogos' && <AdminCatalogs />} */}
      </div>
    </div>
  );
}