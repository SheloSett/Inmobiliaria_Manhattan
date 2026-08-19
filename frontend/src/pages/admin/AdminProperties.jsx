import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, X, Upload, Pause, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { propertyThumbnail } from '../../utils/media';

// --- Constantes del dominio ---
const PROPERTY_TYPES = [
  { value: 'HOUSE', label: 'Casa' },
  { value: 'APARTMENT', label: 'Departamento' },
  { value: 'OFFICE', label: 'Oficina' },
  { value: 'LOCAL', label: 'Local' },
  { value: 'LAND', label: 'Terreno' },
  { value: 'PH', label: 'PH' },
];

const OPERATIONS = [
  { value: 'SALE', label: 'Venta' },
  { value: 'RENT', label: 'Alquiler' },
];

const STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'Publicada' },
  { value: 'RESERVED', label: 'Reservada' },
  { value: 'SOLD', label: 'Vendida' },
  { value: 'RENTED', label: 'Alquilada' },
];

const STATUS_BADGE = {
  AVAILABLE: { label: 'Publicada', cls: 'bg-primary-fixed text-on-primary-fixed-variant' },
  RESERVED:  { label: 'Reservada', cls: 'bg-secondary-fixed text-on-secondary-fixed-variant' },
  SOLD:      { label: 'Vendida',   cls: 'bg-tertiary-fixed text-on-tertiary-fixed' },
  RENTED:    { label: 'Alquilada', cls: 'bg-surface-container-highest text-on-surface-variant' },
};

const EMPTY_FORM = {
  title: '', description: '', price: '', currency: 'USD',
  operation: 'SALE', type: 'APARTMENT', status: 'AVAILABLE',
  bedrooms: '', bathrooms: '', area: '', garage: false,
  address: '', city: '', neighborhood: '', featured: false,
};

const PAGE_SIZE = 8;

// Cuántas propiedades se le piden al backend para la tabla del panel (19/08/2026).
// Esta pantalla filtra y pagina del lado del CLIENTE (ver `filtered`/`paginated` más
// abajo), así que necesita el listado completo, no una página. Sin este parámetro el
// backend aplicaba su default de 12 (ver getAll en property.controller.js) y el panel
// nunca mostraba más de 12 propiedades, por más que su paginación local dijera otra cosa.
const ADMIN_FETCH_LIMIT = 500;

// --- StatusBadge ---
// Muestra el estado comercial (Publicada/Reservada/…) y, si la publicación está
// PAUSADA (published = false, 19/08/2026), lo tapa con ese aviso: es lo primero que
// hay que ver en la lista, porque una propiedad pausada no existe para el visitante.
function StatusBadge({ status, published }) {
  if (published === false) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full font-label-md text-xs whitespace-nowrap bg-surface-container-highest text-on-surface-variant border border-outline-variant">
        <Pause size={12} /> Pausada
      </span>
    );
  }
  const badge = STATUS_BADGE[status] ?? { label: status, cls: 'bg-surface-container-highest text-on-surface-variant' };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full font-label-md text-xs whitespace-nowrap ${badge.cls}`}>
      {badge.label}
    </span>
  );
}

// --- Modal de confirmación de eliminación ---
function DeleteModal({ property, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 w-full max-w-sm shadow-lg">
        <h3 className="font-headline-md text-headline-md text-primary mb-2">Eliminar Propiedad</h3>
        <p className="font-body-md text-body-md text-on-surface-variant mb-6">
          ¿Confirmas eliminar{' '}
          <span className="font-semibold text-on-surface">"{property?.title}"</span>?
          Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded font-label-md text-label-md border border-outline-variant text-on-surface hover:bg-surface-container transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded font-label-md text-label-md bg-secondary text-on-secondary hover:bg-secondary-container transition-colors disabled:opacity-50"
          >
            {loading ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Modal de creación / edición ---
// OBSOLETO (15/07/2026): este modal fue reemplazado por la página completa
// AdminPropertyForm.jsx (rutas /admin/properties/new y /admin/properties/:id/edit),
// rediseñada según el template Stitch_Templates/admin_create_Properties.
// El componente se conserva sin eliminar por la regla del proyecto de no borrar
// código; ya no se renderiza desde ningún lado (su uso quedó comentado abajo).
// eslint-disable-next-line no-unused-vars
function PropertyModal({ property, onClose, onSaved }) {
  const isEdit = !!property;

  const [form, setForm] = useState(
    isEdit
      ? {
          title:        property.title,
          description:  property.description,
          price:        String(property.price),
          currency:     property.currency || 'USD',
          operation:    property.operation,
          type:         property.type,
          status:       property.status,
          bedrooms:     property.bedrooms ?? '',
          bathrooms:    property.bathrooms ?? '',
          area:         property.area ?? '',
          garage:       property.garage || false,
          address:      property.address,
          city:         property.city,
          neighborhood: property.neighborhood || '',
          featured:     property.featured || false,
        }
      : { ...EMPTY_FORM }
  );

  const [newImages, setNewImages]   = useState([]);
  const [previews, setPreviews]     = useState([]);
  const [deletedIds, setDeletedIds] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const fileRef                     = useRef();

  const toggleDeleteImage = (id) =>
    setDeletedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files);
    setNewImages(files);
    setPreviews(files.map(f => URL.createObjectURL(f)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) fd.append(k, v);
      });
      newImages.forEach(img => fd.append('images', img));
      if (deletedIds.length) fd.append('deleteImages', JSON.stringify(deletedIds));

      const cfg = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (isEdit) {
        await api.put(`/properties/${property.id}`, fd, cfg);
      } else {
        await api.post('/properties', fd, cfg);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const input  = 'border border-outline-variant rounded px-3 py-2 font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none text-on-surface bg-surface-container-lowest w-full';
  const label  = 'font-label-md text-label-md text-on-surface mb-1 block';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant w-full max-w-2xl max-h-[92vh] flex flex-col shadow-lg">

        {/* Header del modal */}
        <div className="flex items-center justify-between p-6 border-b border-outline-variant flex-shrink-0">
          <h2 className="font-headline-md text-headline-md text-primary">
            {isEdit ? 'Editar Propiedad' : 'Nueva Propiedad'}
          </h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors p-1">
            <X size={22} />
          </button>
        </div>

        {/* Formulario scrollable */}
        <form id="prop-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-5">
          {error && (
            <p className="bg-error-container text-on-error-container font-label-md text-sm px-4 py-3 rounded border border-error/30">
              {error}
            </p>
          )}

          {/* Título */}
          <div>
            <label className={label}>Título *</label>
            <input name="title" type="text" required value={form.title} onChange={handleChange}
              className={input} placeholder="Ej: Penthouse Av. Libertador" />
          </div>

          {/* Descripción */}
          <div>
            <label className={label}>Descripción *</label>
            <textarea name="description" required value={form.description} onChange={handleChange}
              rows={3} className={input} placeholder="Descripción detallada de la propiedad..." />
          </div>

          {/* Precio + Moneda */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Precio *</label>
              <input name="price" type="number" required min="0" step="1" value={form.price}
                onChange={handleChange} className={input} placeholder="1250000" />
            </div>
            <div>
              <label className={label}>Moneda</label>
              <select name="currency" value={form.currency} onChange={handleChange} className={input}>
                <option value="USD">USD ($)</option>
                <option value="ARS">ARS ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          {/* Operación + Tipo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Operación *</label>
              <select name="operation" value={form.operation} onChange={handleChange} className={input}>
                {OPERATIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Tipo *</label>
              <select name="type" value={form.type} onChange={handleChange} className={input}>
                {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* Dormitorios + Baños + Superficie */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={label}>Dormitorios</label>
              <input name="bedrooms" type="number" min="0" value={form.bedrooms}
                onChange={handleChange} className={input} placeholder="3" />
            </div>
            <div>
              <label className={label}>Baños</label>
              <input name="bathrooms" type="number" min="0" value={form.bathrooms}
                onChange={handleChange} className={input} placeholder="2" />
            </div>
            <div>
              <label className={label}>Superficie (m²)</label>
              <input name="area" type="number" min="0" step="0.01" value={form.area}
                onChange={handleChange} className={input} placeholder="120" />
            </div>
          </div>

          {/* Dirección + Ciudad */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Dirección *</label>
              <input name="address" type="text" required value={form.address}
                onChange={handleChange} className={input} placeholder="Av. del Libertador 4500" />
            </div>
            <div>
              <label className={label}>Ciudad *</label>
              <input name="city" type="text" required value={form.city}
                onChange={handleChange} className={input} placeholder="Buenos Aires" />
            </div>
          </div>

          {/* Barrio */}
          <div>
            <label className={label}>Barrio</label>
            <input name="neighborhood" type="text" value={form.neighborhood}
              onChange={handleChange} className={input} placeholder="Palermo" />
          </div>

          {/* Estado */}
          <div>
            <label className={label}>Estado</label>
            <select name="status" value={form.status} onChange={handleChange} className={input}>
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Checkboxes */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="garage" checked={form.garage} onChange={handleChange}
                className="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4" />
              <span className="font-label-md text-label-md text-on-surface">Garage</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="featured" checked={form.featured} onChange={handleChange}
                className="rounded border-outline-variant text-primary focus:ring-primary h-4 w-4" />
              <span className="font-label-md text-label-md text-on-surface">Destacada</span>
            </label>
          </div>

          {/* Zona de imágenes */}
          <div>
            <label className={label}>
              Imágenes {isEdit ? '(agregar nuevas)' : ''} — máx. 20
            </label>
            <div
              onClick={() => fileRef.current.click()}
              className="border-2 border-dashed border-outline-variant rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary hover:bg-surface-container transition-colors"
            >
              <Upload size={24} className="text-on-surface-variant" />
              <p className="font-label-md text-label-md text-on-surface-variant">
                {newImages.length > 0
                  ? `${newImages.length} imagen(es) seleccionada(s)`
                  : 'Haz clic para seleccionar imágenes'}
              </p>
              <p className="text-xs text-outline">PNG, JPG</p>
            </div>
            <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFiles} />

            {/* Previews de nuevas imágenes */}
            {previews.length > 0 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {previews.map((src, i) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden border border-outline-variant">
                    <img src={src} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            {/* Imágenes actuales en modo edición — con botón de eliminación */}
            {isEdit && property.images?.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-outline mb-2 font-label-md">
                  Imágenes actuales
                  {deletedIds.length > 0 && (
                    <span className="ml-2 text-secondary">({deletedIds.length} marcada{deletedIds.length !== 1 ? 's' : ''} para eliminar)</span>
                  )}:
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {property.images.map(img => {
                    const markedForDelete = deletedIds.includes(img.id);
                    return (
                      <div
                        key={img.id}
                        className={`aspect-square rounded-lg overflow-hidden border relative group transition-all ${
                          markedForDelete
                            ? 'border-secondary opacity-40'
                            : 'border-outline-variant'
                        }`}
                      >
                        <img src={img.url} alt="Imagen actual" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => toggleDeleteImage(img.id)}
                          title={markedForDelete ? 'Deshacer' : 'Eliminar'}
                          className={`absolute top-1 right-1 rounded-full w-6 h-6 flex items-center justify-center text-white text-xs font-bold shadow transition-opacity ${
                            markedForDelete
                              ? 'bg-outline opacity-100'
                              : 'bg-secondary opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          {markedForDelete ? '↩' : '×'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer del modal */}
        <div className="border-t border-outline-variant p-6 flex justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded font-label-md text-label-md border border-outline-variant text-on-surface hover:bg-surface-container transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="prop-form"
            disabled={loading}
            className="px-6 py-2 rounded font-label-md text-label-md bg-primary text-on-primary hover:bg-primary-container transition-colors disabled:opacity-50"
          >
            {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Componente principal ---
export default function AdminProperties() {
  const navigate = useNavigate();
  const [properties, setProperties]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);

  // COMENTADO (15/07/2026): el estado del modal ya no se usa porque la creación
  // y edición pasaron a la página completa AdminPropertyForm (se navega con rutas).
  // null = cerrado | false = nuevo | objeto = editar
  // const [modalProp, setModalProp]     = useState(null);
  const [deleteProp, setDeleteProp]   = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  // id de la propiedad cuyo pausar/republicar está en curso (deshabilita ese botón).
  const [togglingId, setTogglingId] = useState(null);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      // includeUnpublished (19/08/2026): el panel también tiene que ver las PAUSADAS,
      // que el endpoint oculta por defecto. El backend igual exige token válido para
      // devolverlas, así que el parámetro solo no sirve desde afuera.
      // const res = await api.get('/properties', { params: { includeUnpublished: true } });
      // ↑ Comentada (19/08/2026, regla del proyecto de no borrar): faltaba `limit`, así
      //   que el backend caía en su default de 12 y la tabla del panel jamás mostraba
      //   más de 12 propiedades. Con "pausar" eso pasó de molesto a BLOQUEANTE: una
      //   propiedad pausada que no estuviera entre las 12 más recientes desaparecía de
      //   la web Y del panel, y no quedaba forma de volver a publicarla desde la UI.
      const res = await api.get('/properties', {
        params: { includeUnpublished: true, limit: ADMIN_FETCH_LIMIT },
      });
      setProperties(res.data.properties ?? []);
    } catch {
      // el interceptor de api.js maneja el 401; otros errores dejan la lista vacía
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProperties(); }, []);

  // Filtro por búsqueda de texto
  const filtered = properties.filter(p =>
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.address?.toLowerCase().includes(search.toLowerCase()) ||
    String(p.id).includes(search)
  );

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Pausar / republicar desde la lista (19/08/2026). Manda solo el campo `published`:
  // el update del backend toca únicamente los campos que recibe, así que no hace falta
  // reenviar el resto de la propiedad ni sus fotos. El estado local se actualiza en el
  // momento para no recargar toda la tabla por un toggle.
  const togglePublished = async (prop) => {
    const next = prop.published === false;
    setTogglingId(prop.id);
    try {
      const fd = new FormData();
      fd.append('published', String(next));
      await api.put(`/properties/${prop.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProperties(prev => prev.map(p => (p.id === prop.id ? { ...p, published: next } : p)));
      toast.success(next ? 'Propiedad publicada de nuevo' : 'Publicación pausada');
    } catch {
      toast.error('No se pudo cambiar el estado de la publicación');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/properties/${deleteProp.id}`);
      setDeleteProp(null);
      fetchProperties();
    } catch {
      // silencioso: el interceptor maneja 401
    } finally {
      setDeleteLoading(false);
    }
  };

  // COMENTADO (15/07/2026): callback del modal obsoleto; la página AdminPropertyForm
  // navega de vuelta a esta lista después de guardar, y la lista se recarga sola.
  // const handleSaved = () => { setModalProp(null); fetchProperties(); };

  const formatPrice  = (p) => `${p.currency || 'USD'} ${Number(p.price).toLocaleString('es-AR')}`;
  // Miniatura: foto principal → primera foto → primer frame del video (si solo hay videos).
  const thumbnailSrc = (p) => propertyThumbnail(p.images);

  return (
    <div className="bg-background min-h-screen p-6 md:p-10">

      {/* ---- Modales ---- */}
      {/* COMENTADO (15/07/2026): el modal de creación/edición fue reemplazado por la
          página completa AdminPropertyForm (rutas /admin/properties/new y
          /admin/properties/:id/edit), según el template de Stitch. */}
      {/* {modalProp !== null && (
        <PropertyModal
          property={modalProp === false ? null : modalProp}
          onClose={() => setModalProp(null)}
          onSaved={handleSaved}
        />
      )} */}
      {deleteProp && (
        <DeleteModal
          property={deleteProp}
          onConfirm={handleDelete}
          onCancel={() => setDeleteProp(null)}
          loading={deleteLoading}
        />
      )}

      {/* ---- Encabezado de página ---- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6 max-w-screen-xl mx-auto">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight">
            Gestión de Propiedades
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Administra el inventario, actualiza estados y precios.
          </p>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          {/* Buscador */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar dirección o ID..."
              className="pl-9 pr-4 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest font-body-md text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors w-60"
            />
          </div>
          {/* Botón nueva propiedad — ahora navega a la página de creación
              (antes abría el modal: onClick={() => setModalProp(false)}) */}
          <button
            onClick={() => navigate('/admin/properties/new')}
            className="bg-primary text-on-primary font-label-md text-label-md py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-primary-container transition-colors"
          >
            <Plus size={18} />
            Nueva Propiedad
          </button>
        </div>
      </div>

      {/* ---- Tabla de propiedades ---- */}
      {/* La tabla se oculta en mobile (hidden md:table): sus 5 columnas no entran y se
          cortaban Estado y Acciones (el botón Editar quedaba fuera de pantalla). En mobile
          se muestra la lista de tarjetas de más abajo (md:hidden). (28/07/2026) */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant max-w-screen-xl mx-auto overflow-hidden">
        <table className="hidden md:table w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low">
              <th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider w-20">Imagen</th>
              <th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Detalles</th>
              <th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Precio</th>
              <th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Estado</th>
              <th className="py-4 px-6 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="font-body-md text-body-md text-on-surface">

            {/* Estado: cargando */}
            {loading && (
              <tr>
                <td colSpan={5} className="py-16 text-center text-on-surface-variant">
                  <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-[36px] text-outline">
                      autorenew
                    </span>
                    <p className="font-label-md text-label-md">Cargando propiedades...</p>
                  </div>
                </td>
              </tr>
            )}

            {/* Estado: sin resultados */}
            {!loading && paginated.length === 0 && (
              <tr>
                <td colSpan={5} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[40px] text-outline">domain_disabled</span>
                    <p className="font-label-md text-label-md">
                      {search ? 'Sin resultados para esa búsqueda.' : 'No hay propiedades publicadas aún.'}
                    </p>
                    {!search && (
                      /* Antes abría el modal (setModalProp(false)); ahora navega a la página */
                      <button
                        onClick={() => navigate('/admin/properties/new')}
                        className="mt-2 text-primary font-label-md text-sm hover:underline flex items-center gap-1"
                      >
                        <Plus size={14} /> Publicar la primera
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {/* Filas de propiedades */}
            {!loading && paginated.map(prop => (
              <tr key={prop.id} className="border-b border-outline-variant hover:bg-surface-bright transition-colors duration-150">

                {/* Thumbnail */}
                <td className="py-4 px-6">
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-outline-variant bg-surface-container flex items-center justify-center flex-shrink-0">
                    {thumbnailSrc(prop) ? (
                      <img src={thumbnailSrc(prop)} alt={prop.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-outline-variant text-[28px]">image</span>
                    )}
                  </div>
                </td>

                {/* Detalles */}
                <td className="py-4 px-6">
                  <div className="font-label-md text-[16px] text-primary mb-1">{prop.title}</div>
                  <div className="text-sm text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">location_on</span>
                    {prop.address}{prop.neighborhood ? `, ${prop.neighborhood}` : ''}
                  </div>
                  <div className="text-xs text-outline mt-1 font-label-md">
                    {/* Antes: PROPERTY_TYPES.find(...) y operation==='SALE'?... hardcodeados;
                        ahora usa las labels enriquecidas del backend (catálogo gestionable). */}
                    {prop.typeLabel ?? prop.type}
                    {' · '}{prop.operationLabel ?? prop.operation}
                    {prop.bedrooms ? ` · ${prop.bedrooms} dorm.` : ''}
                    {prop.area ? ` · ${prop.area} m²` : ''}
                  </div>
                </td>

                {/* Precio */}
                <td className="py-4 px-6">
                  <div className="font-price-display text-[18px] text-primary">{formatPrice(prop)}</div>
                </td>

                {/* Estado */}
                <td className="py-4 px-6">
                  <StatusBadge status={prop.status} published={prop.published} />
                </td>

                {/* Acciones */}
                <td className="py-4 px-6 text-right">
                  <div className="flex justify-end gap-1">
                    {/* Pausar / republicar (19/08/2026): saca la propiedad de la web sin
                        borrarla. El mismo selector está dentro del form de edición. */}
                    <button
                      onClick={() => togglePublished(prop)}
                      disabled={togglingId === prop.id}
                      className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded transition-colors disabled:opacity-40"
                      title={prop.published === false ? 'Volver a publicar' : 'Pausar publicación'}
                    >
                      {prop.published === false ? <Play size={18} /> : <Pause size={18} />}
                    </button>
                    {/* Antes abría el modal (setModalProp(prop)); ahora navega a la página de edición */}
                    <button
                      onClick={() => navigate(`/admin/properties/${prop.id}/edit`)}
                      className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => setDeleteProp(prop)}
                      className="p-2 text-on-surface-variant hover:text-secondary hover:bg-secondary-fixed rounded transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ---- Lista de tarjetas (solo mobile) ---- */}
        <div className="md:hidden divide-y divide-outline-variant">
          {loading && (
            <div className="py-16 flex flex-col items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-[36px] text-outline">autorenew</span>
              <p className="font-label-md text-label-md">Cargando propiedades...</p>
            </div>
          )}

          {!loading && paginated.length === 0 && (
            <div className="py-16 flex flex-col items-center gap-2 text-on-surface-variant text-center px-4">
              <span className="material-symbols-outlined text-[40px] text-outline">domain_disabled</span>
              <p className="font-label-md text-label-md">
                {search ? 'Sin resultados para esa búsqueda.' : 'No hay propiedades publicadas aún.'}
              </p>
              {!search && (
                <button
                  onClick={() => navigate('/admin/properties/new')}
                  className="mt-2 text-primary font-label-md text-sm hover:underline flex items-center gap-1"
                >
                  <Plus size={14} /> Publicar la primera
                </button>
              )}
            </div>
          )}

          {!loading && paginated.map(prop => (
            <div key={prop.id} className="p-4 flex gap-3">
              {/* Thumbnail */}
              <div className="w-20 h-20 rounded-lg overflow-hidden border border-outline-variant bg-surface-container flex items-center justify-center flex-shrink-0">
                {thumbnailSrc(prop) ? (
                  <img src={thumbnailSrc(prop)} alt={prop.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-outline-variant text-[28px]">image</span>
                )}
              </div>

              {/* Info + acciones */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-label-md text-[15px] text-primary line-clamp-2 leading-snug">{prop.title}</div>
                  <div className="flex-shrink-0"><StatusBadge status={prop.status} published={prop.published} /></div>
                </div>
                <div className="text-xs text-on-surface-variant flex items-start gap-1 mt-1">
                  <span className="material-symbols-outlined text-[14px] mt-[1px]">location_on</span>
                  <span className="line-clamp-1">{prop.address}{prop.neighborhood ? `, ${prop.neighborhood}` : ''}</span>
                </div>
                <div className="text-xs text-outline mt-1 font-label-md">
                  {prop.typeLabel ?? prop.type}
                  {' · '}{prop.operationLabel ?? prop.operation}
                  {prop.bedrooms ? ` · ${prop.bedrooms} dorm.` : ''}
                  {prop.area ? ` · ${prop.area} m²` : ''}
                </div>
                <div className="font-price-display text-[16px] text-primary mt-1">{formatPrice(prop)}</div>

                {/* Acciones: Editar (prominente) + Eliminar */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => navigate(`/admin/properties/${prop.id}/edit`)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded bg-primary text-on-primary font-label-md text-sm hover:bg-primary-container transition-colors"
                  >
                    <Edit2 size={16} /> Editar
                  </button>
                  {/* Pausar / republicar (19/08/2026) */}
                  <button
                    onClick={() => togglePublished(prop)}
                    disabled={togglingId === prop.id}
                    className="p-2 rounded border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary transition-colors disabled:opacity-40"
                    title={prop.published === false ? 'Volver a publicar' : 'Pausar publicación'}
                  >
                    {prop.published === false ? <Play size={18} /> : <Pause size={18} />}
                  </button>
                  <button
                    onClick={() => setDeleteProp(prop)}
                    className="p-2 rounded border border-outline-variant text-on-surface-variant hover:text-secondary hover:border-secondary transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ---- Paginación ---- */}
        {!loading && filtered.length > 0 && (
          <div className="border-t border-outline-variant bg-surface-container-lowest px-6 py-4 flex items-center justify-between">
            <span className="font-body-md text-sm text-on-surface-variant">
              Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}{' '}
              propiedad{filtered.length !== 1 ? 'es' : ''}
            </span>
            <div className="flex gap-1 items-center">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 text-on-surface-variant disabled:text-outline-variant disabled:cursor-not-allowed hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-8 h-8 flex items-center justify-center rounded font-label-md text-sm transition-colors ${
                    n === page
                      ? 'bg-primary-container text-on-primary-container'
                      : 'hover:bg-surface-container-high text-on-surface'
                  }`}
                >
                  {n}
                </button>
              ))}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 text-on-surface-variant disabled:text-outline-variant disabled:cursor-not-allowed hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
