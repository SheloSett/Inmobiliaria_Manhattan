import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CloudUpload } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useCatalogs } from '../../hooks/useCatalogs';
import LocationPicker from '../../components/LocationPicker';

// Página de creación / edición de propiedad — rediseño basado en el template
// Stitch_Templates/admin_create_Properties (15/07/2026). Reemplaza al modal
// "Nueva Propiedad" que abría AdminProperties (ese código quedó comentado allí,
// según regla del proyecto de no eliminar líneas).
//
// Notas sobre diferencias con el template:
// - El template incluye campos "m² Cubiertos", "Antigüedad" y una grilla de
//   amenities (Ascensor, Terraza, SUM, etc.) que NO existen en el modelo
//   Property del backend (ver backend/prisma/schema.prisma). Se implementaron
//   solo los campos reales; agregar los otros requiere migración de la BD.
// - "Guardar como borrador" tampoco existe como estado en el backend
//   (PropertyStatus: AVAILABLE/RESERVED/SOLD/RENTED), por eso el botón
//   secundario es "Cancelar".
// - La barra de formato (negrita/cursiva) de la descripción del template se
//   omitió porque la descripción se guarda como texto plano.

// PROPERTY_TYPES y OPERATIONS COMENTADOS (no eliminados, según regla del proyecto):
// dejaron de ser listas fijas; ahora se traen del catálogo gestionable con useCatalogs()
// (Ajustes → Catálogos). Se conservan como referencia de los valores por defecto.
// const PROPERTY_TYPES = [
//   { value: 'APARTMENT', label: 'Departamento' },
//   { value: 'HOUSE', label: 'Casa' },
//   { value: 'OFFICE', label: 'Oficina' },
//   { value: 'LOCAL', label: 'Local' },
//   { value: 'LAND', label: 'Terreno' },
//   { value: 'PH', label: 'PH' },
// ];
//
// const OPERATIONS = [
//   { value: 'SALE', label: 'Venta' },
//   { value: 'RENT', label: 'Alquiler' },
// ];

const STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'Publicada' },
  { value: 'RESERVED', label: 'Reservada' },
  { value: 'SOLD', label: 'Vendida' },
  { value: 'RENTED', label: 'Alquilada' },
];

const EMPTY_FORM = {
  title: '', description: '', price: '', currency: 'USD',
  operation: 'SALE', type: 'APARTMENT', status: 'AVAILABLE',
  bedrooms: '', bathrooms: '', area: '', garage: false, hasKey: false,
  address: '', city: '', neighborhood: '', featured: false,
  // lat/lng se marcan en el mapa (LocationPicker); vacíos = sin ubicación exacta.
  lat: '', lng: '',
};

const MAX_IMAGES = 20;

// h-12 (48px) fija la MISMA altura para inputs y selects: los <select> nativos
// renderizaban 2px más bajos que los <input>, y eso desalineaba las filas del form.
// El textarea usa esta clase + min-h-[150px], que gana sobre h-12, así que no se rompe.
const INPUT_CLASS = 'border border-outline-variant rounded px-3 h-12 font-body-md text-body-md text-on-surface bg-surface-container-lowest focus:border-primary focus:ring-0 outline-none transition-colors w-full';
const LABEL_CLASS = 'font-label-sm text-label-sm text-on-surface-variant';

// Card de sección del formulario, con el título subrayado del template
function FormSection({ title, children }) {
  return (
    <section className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(26,43,76,0.08)] p-6">
      <h3 className="font-headline-sm text-headline-sm text-primary mb-6 border-b border-surface-variant pb-2">{title}</h3>
      {children}
    </section>
  );
}

export default function AdminPropertyForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  // Catálogos gestionables (operaciones, tipos, amenities) desde Ajustes → Catálogos.
  const { operations, propertyTypes, amenities: allAmenities } = useCatalogs();
  const [selectedAmenities, setSelectedAmenities] = useState([]); // ids de amenities marcados

  const [form, setForm] = useState(EMPTY_FORM);
  const [property, setProperty] = useState(null); // solo en edición: para imágenes actuales
  // Media existente en su orden actual (reordenable arrastrando). El primero = portada.
  const [existingMedia, setExistingMedia] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [deletedIds, setDeletedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();
  // Índices para el drag & drop de reordenamiento de la media existente.
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  // En modo edición se carga la propiedad y se precarga el formulario
  useEffect(() => {
    if (!isEdit) return;
    api.get(`/properties/${id}`)
      .then(res => {
        const p = res.data;
        setProperty(p);
        setForm({
          title: p.title,
          description: p.description,
          price: String(p.price),
          currency: p.currency || 'USD',
          operation: p.operation,
          type: p.type,
          status: p.status,
          bedrooms: p.bedrooms ?? '',
          bathrooms: p.bathrooms ?? '',
          area: p.area ?? '',
          garage: p.garage || false,
          hasKey: p.hasKey || false,
          address: p.address,
          city: p.city,
          neighborhood: p.neighborhood || '',
          featured: p.featured || false,
          lat: p.lat ?? '',
          lng: p.lng ?? '',
        });
        // Precarga los amenities ya marcados en la propiedad.
        setSelectedAmenities((p.amenities || []).map((a) => a.id));
        // Media existente en el orden guardado (ya viene ordenada por `order` del backend).
        setExistingMedia(p.images || []);
      })
      .catch(() => {
        toast.error('No se pudo cargar la propiedad');
        navigate('/admin/properties');
      })
      .finally(() => setFetching(false));
  }, [id, isEdit, navigate]);

  // Al crear (no editar): si el valor por defecto de operación/tipo no existe en el
  // catálogo (porque el admin lo renombró/eliminó), se ajusta al primero disponible.
  useEffect(() => {
    if (isEdit) return;
    setForm((prev) => {
      const next = { ...prev };
      if (operations.length && !operations.some((o) => o.value === prev.operation)) next.operation = operations[0].value;
      if (propertyTypes.length && !propertyTypes.some((t) => t.value === prev.type)) next.type = propertyTypes[0].value;
      return next;
    });
  }, [operations, propertyTypes, isEdit]);

  const toggleAmenity = (amenityId) =>
    setSelectedAmenities((prev) =>
      prev.includes(amenityId) ? prev.filter((x) => x !== amenityId) : [...prev, amenityId]
    );

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // Suma archivos nuevos (fotos o videos) desde el picker o drag & drop, respetando
  // el máximo. Acepta tanto imágenes como videos (antes filtraba solo image/).
  const addFiles = (files) => {
    const media = Array.from(files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (!media.length) return;
    setNewImages(prev => {
      const merged = [...prev, ...media].slice(0, MAX_IMAGES);
      setPreviews(merged.map(f => URL.createObjectURL(f)));
      return merged;
    });
  };

  const removeNewImage = (index) => {
    setNewImages(prev => {
      const next = prev.filter((_, i) => i !== index);
      setPreviews(next.map(f => URL.createObjectURL(f)));
      return next;
    });
  };

  const toggleDeleteImage = (imgId) =>
    setDeletedIds(prev => prev.includes(imgId) ? prev.filter(x => x !== imgId) : [...prev, imgId]);

  // Reordena la media existente al soltar (drag & drop). Mueve el ítem arrastrado a la
  // posición sobre la que se soltó; el que quede primero será la portada al guardar.
  const handleReorderDrop = () => {
    const from = dragItem.current;
    const to = dragOverItem.current;
    dragItem.current = null;
    dragOverItem.current = null;
    if (from === null || to === null || from === to) return;
    setExistingMedia(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        // lat/lng se mandan aparte (abajo), incluso vacíos, para poder borrar la ubicación.
        if (k === 'lat' || k === 'lng') return;
        if (v !== '' && v !== null && v !== undefined) fd.append(k, v);
      });
      // Ubicación: se envían siempre (aunque estén vacías). En el backend, vacío → null,
      // así que en edición se puede quitar la ubicación marcada.
      fd.append('lat', form.lat === '' || form.lat == null ? '' : form.lat);
      fd.append('lng', form.lng === '' || form.lng == null ? '' : form.lng);
      newImages.forEach(img => fd.append('images', img));
      if (deletedIds.length) fd.append('deleteImages', JSON.stringify(deletedIds));
      // Siempre se manda amenityIds (aunque sea []), para que al editar se pueda
      // desmarcar todo y el backend haga el `set` correspondiente.
      fd.append('amenityIds', JSON.stringify(selectedAmenities));
      // Orden actual de la media existente NO eliminada (para el reordenamiento por drag).
      // El backend usa este orden y toma la primera foto como portada.
      if (isEdit) {
        const orderIds = existingMedia.filter(m => !deletedIds.includes(m.id)).map(m => m.id);
        fd.append('imageOrder', JSON.stringify(orderIds));
      }

      const cfg = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (isEdit) {
        await api.put(`/properties/${id}`, fd, cfg);
        toast.success('Propiedad actualizada');
      } else {
        await api.post('/properties', fd, cfg);
        toast.success('Propiedad publicada');
      }
      navigate('/admin/properties');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar. Intente nuevamente.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="bg-surface min-h-screen p-gutter flex items-center justify-center">
        <p className="font-label-md text-label-md text-on-surface-variant">Cargando propiedad...</p>
      </div>
    );
  }

  return (
    <div className="bg-surface min-h-screen">
      <main className="p-gutter max-w-container-max mx-auto w-full">

        {/* Encabezado con flecha de volver */}
        <div className="mb-stack-md flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/admin/properties')}
            className="p-2 rounded-full hover:bg-surface-container transition-colors text-primary"
            title="Volver a Propiedades"
          >
            <ArrowLeft size={22} />
          </button>
          <h2 className="font-headline-lg text-headline-lg text-primary">
            {isEdit ? 'Editar propiedad' : 'Publicar nueva propiedad'}
          </h2>
        </div>

        <form className="space-y-stack-md" onSubmit={handleSubmit}>
          {error && (
            <p className="bg-error-container text-on-error-container font-label-md text-sm px-4 py-3 rounded border border-error/30">
              {error}
            </p>
          )}

          {/* ── Información General ── */}
          <FormSection title="Información General">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1">
                <label className={LABEL_CLASS} htmlFor="title">Título de la publicación *</label>
                <input id="title" name="title" type="text" required value={form.title} onChange={handleChange}
                  className={INPUT_CLASS} placeholder="Ej: Espectacular piso en Recoleta" />
              </div>
              <div className="flex flex-col gap-1">
                <label className={LABEL_CLASS} htmlFor="operation">Tipo de Operación *</label>
                <select id="operation" name="operation" value={form.operation} onChange={handleChange} className={INPUT_CLASS}>
                  {operations.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className={LABEL_CLASS} htmlFor="type">Tipo de Propiedad *</label>
                <select id="type" name="type" value={form.type} onChange={handleChange} className={INPUT_CLASS}>
                  {propertyTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className={LABEL_CLASS} htmlFor="price">Precio *</label>
                  <input id="price" name="price" type="number" required min="0" step="1" value={form.price}
                    onChange={handleChange} className={INPUT_CLASS} placeholder="Ej: 250000" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={LABEL_CLASS} htmlFor="currency">Moneda</label>
                  <select id="currency" name="currency" value={form.currency} onChange={handleChange} className={INPUT_CLASS}>
                    <option value="USD">USD ($)</option>
                    <option value="ARS">ARS ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1 md:col-span-2 relative">
                <label className={LABEL_CLASS} htmlFor="address">Dirección *</label>
                <span aria-hidden="true" className="material-symbols-outlined absolute left-3 top-[30px] text-outline pointer-events-none">location_on</span>
                <input id="address" name="address" type="text" required value={form.address} onChange={handleChange}
                  className={`${INPUT_CLASS} pl-10`} placeholder="Av. del Libertador 4500" />
              </div>
              <div className="flex flex-col gap-1">
                <label className={LABEL_CLASS} htmlFor="city">Ciudad *</label>
                <input id="city" name="city" type="text" required value={form.city} onChange={handleChange}
                  className={INPUT_CLASS} placeholder="Buenos Aires" />
              </div>
              <div className="flex flex-col gap-1">
                <label className={LABEL_CLASS} htmlFor="neighborhood">Barrio</label>
                <input id="neighborhood" name="neighborhood" type="text" value={form.neighborhood} onChange={handleChange}
                  className={INPUT_CLASS} placeholder="Palermo" />
              </div>
              {/* "Con llave": campo propio de la propiedad (hasKey). Indica que la
                  inmobiliaria tiene la llave para mostrarla. Movido acá desde Amenities
                  a pedido del cliente (28/07/2026): es un dato operativo de la propiedad,
                  no una característica/amenity. */}
              <label className="flex items-center gap-2 cursor-pointer md:col-span-2">
                <input type="checkbox" name="hasKey" checked={form.hasKey} onChange={handleChange}
                  className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4" />
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-on-surface-variant">key</span>
                <span className="font-body-md text-body-md text-on-surface">Con llave</span>
              </label>
            </div>
          </FormSection>

          {/* ── Ubicación en el mapa ── (guarda lat/lng reales para el mapa de búsqueda) */}
          <FormSection title="Ubicación en el mapa">
            <LocationPicker
              lat={form.lat}
              lng={form.lng}
              address={form.address}
              city={form.city}
              neighborhood={form.neighborhood}
              onChange={(lat, lng) => setForm(prev => ({ ...prev, lat, lng }))}
            />
          </FormSection>

          {/* ── Detalles Técnicos ── */}
          <FormSection title="Detalles Técnicos">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="flex flex-col gap-1">
                <label className={LABEL_CLASS} htmlFor="area">m² Totales</label>
                <input id="area" name="area" type="number" min="0" step="0.01" value={form.area}
                  onChange={handleChange} className={INPUT_CLASS} placeholder="Ej: 120" />
              </div>
              <div className="flex flex-col gap-1">
                <label className={LABEL_CLASS} htmlFor="bedrooms">Dormitorios</label>
                <input id="bedrooms" name="bedrooms" type="number" min="0" value={form.bedrooms}
                  onChange={handleChange} className={INPUT_CLASS} placeholder="Ej: 3" />
              </div>
              <div className="flex flex-col gap-1">
                <label className={LABEL_CLASS} htmlFor="bathrooms">Baños</label>
                <input id="bathrooms" name="bathrooms" type="number" min="0" value={form.bathrooms}
                  onChange={handleChange} className={INPUT_CLASS} placeholder="Ej: 2" />
              </div>
              <div className="flex flex-col gap-1">
                <label className={LABEL_CLASS} htmlFor="status">Estado</label>
                <select id="status" name="status" value={form.status} onChange={handleChange} className={INPUT_CLASS}>
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
          </FormSection>

          {/* ── Descripción ── */}
          <FormSection title="Descripción">
            {/* py-3 le devuelve al textarea el padding vertical que INPUT_CLASS ya no trae
                (ahora usa px-3); min-h-[150px] gana sobre el h-12 de la clase, así que crece normal. */}
            <textarea
              name="description"
              required
              value={form.description}
              onChange={handleChange}
              className={`${INPUT_CLASS} min-h-[150px] py-3`}
              placeholder="Escribe la descripción completa de la propiedad..."
            />
          </FormSection>

          {/* ── Multimedia ── */}
          <FormSection title="Multimedia">
            <div
              onClick={() => fileRef.current.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center transition-colors cursor-pointer group ${
                dragOver
                  ? 'border-primary bg-surface-container'
                  : 'border-outline-variant bg-surface-container-low hover:bg-surface-container'
              }`}
            >
              <CloudUpload size={40} className="text-outline mb-4 group-hover:text-primary transition-colors" />
              <p className="font-label-md text-label-md text-primary text-center">Arrastra y suelta tus fotos o videos aquí</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant text-center mt-2">
                o haz clic para explorar tus archivos (Máx {MAX_IMAGES} archivos · fotos JPG/PNG/WebP · videos MP4/MOV/WebM hasta 100 MB)
              </p>
              {newImages.length > 0 && (
                <p className="font-label-md text-label-md text-secondary mt-3">
                  {newImages.length} archivo{newImages.length !== 1 ? 's' : ''} seleccionado{newImages.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden"
              onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />

            {/* Previews de media nueva (fotos o videos), con botón para quitarlas antes de subir */}
            {previews.length > 0 && (
              <div className="mt-4 grid grid-cols-3 md:grid-cols-6 gap-3">
                {previews.map((src, i) => {
                  const isVideo = newImages[i]?.type?.startsWith('video/');
                  return (
                    <div key={i} className="aspect-square rounded-lg overflow-hidden border border-outline-variant relative group bg-surface-container">
                      {isVideo ? (
                        <video src={src} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={src} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                      )}
                      {isVideo && (
                        <span className="material-symbols-outlined absolute inset-0 m-auto w-8 h-8 flex items-center justify-center text-white drop-shadow pointer-events-none">play_circle</span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeNewImage(i)}
                        title="Quitar"
                        className="absolute top-1 right-1 rounded-full w-6 h-6 flex items-center justify-center text-white text-xs font-bold shadow bg-secondary opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Media actual en modo edición (fotos y videos). Se pueden reordenar
                ARRASTRANDO (drag & drop) y marcar para eliminar. La primera foto según
                el orden es la portada (miniatura en los listados). */}
            {isEdit && existingMedia.length > 0 && (() => {
              // Portada = primera foto (no video) que no esté marcada para eliminar.
              const coverId = existingMedia.find(m => m.type !== 'video' && !deletedIds.includes(m.id))?.id;
              return (
                <div className="mt-4">
                  <p className="font-label-sm text-label-sm text-on-surface-variant mb-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">drag_indicator</span>
                    Fotos y videos actuales — arrastrá para reordenar (la primera foto es la portada)
                    {deletedIds.length > 0 && (
                      <span className="ml-1 text-secondary">· {deletedIds.length} marcada{deletedIds.length !== 1 ? 's' : ''} para eliminar</span>
                    )}
                  </p>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {existingMedia.map((img, i) => {
                      const markedForDelete = deletedIds.includes(img.id);
                      const isVideo = img.type === 'video';
                      const isCover = img.id === coverId;
                      return (
                        <div
                          key={img.id}
                          draggable={!markedForDelete}
                          onDragStart={() => { dragItem.current = i; }}
                          onDragEnter={() => { dragOverItem.current = i; }}
                          onDragEnd={handleReorderDrop}
                          onDragOver={(e) => e.preventDefault()}
                          className={`aspect-square rounded-lg overflow-hidden border relative group transition-all bg-surface-container ${
                            markedForDelete ? 'border-secondary opacity-40' : 'border-outline-variant cursor-move'
                          } ${isCover ? 'ring-2 ring-primary' : ''}`}
                        >
                          {isVideo ? (
                            <>
                              <video src={img.url} className="w-full h-full object-cover pointer-events-none" muted />
                              <span className="material-symbols-outlined absolute inset-0 m-auto w-8 h-8 flex items-center justify-center text-white drop-shadow pointer-events-none">play_circle</span>
                            </>
                          ) : (
                            <img src={img.url} alt="Media actual" className="w-full h-full object-cover pointer-events-none" />
                          )}
                          {/* Badge de portada en la primera foto */}
                          {isCover && !markedForDelete && (
                            <span className="absolute bottom-1 left-1 bg-primary text-on-primary text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide pointer-events-none">
                              Portada
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleDeleteImage(img.id)}
                            title={markedForDelete ? 'Deshacer' : 'Eliminar'}
                            className={`absolute top-1 right-1 rounded-full w-6 h-6 flex items-center justify-center text-white text-xs font-bold shadow transition-opacity ${
                              markedForDelete ? 'bg-outline opacity-100' : 'bg-secondary opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            {markedForDelete ? '↩' : '×'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </FormSection>

          {/* ── Amenities ── (antes "Características"; ahora lista los amenities del
              catálogo gestionable + Cochera. "Destacada" se movió a su propia sección) */}
          <FormSection title="Amenities">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Cochera es un campo propio de la propiedad (se usa en los filtros),
                  por eso va acá como checkbox aparte y no como amenity del catálogo. */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="garage" checked={form.garage} onChange={handleChange}
                  className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4" />
                <span className="font-body-md text-body-md text-on-surface">Cochera</span>
              </label>
              {/* "Con llave" (hasKey) movido a la sección "Información General" a pedido
                  del cliente (28/07/2026): no eliminado, solo comentado según regla del
                  proyecto. Checkbox original que estaba acá:
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="hasKey" checked={form.hasKey} onChange={handleChange}
                  className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4" />
                <span className="font-body-md text-body-md text-on-surface">Con llave</span>
              </label>
              */}
              {allAmenities.map((a) => (
                <label key={a.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedAmenities.includes(a.id)}
                    onChange={() => toggleAmenity(a.id)}
                    className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4"
                  />
                  {a.icon && <span className="material-symbols-outlined text-[18px] text-on-surface-variant">{a.icon}</span>}
                  <span className="font-body-md text-body-md text-on-surface">{a.label}</span>
                </label>
              ))}
            </div>
            {allAmenities.length === 0 && (
              <p className="font-body-md text-sm text-on-surface-variant">
                No hay amenities cargados. Podés agregarlos en Ajustes → Catálogos.
              </p>
            )}
          </FormSection>

          {/* ── Destacar ── (separada de amenities a pedido: es una decisión de
              publicación, no una característica de la propiedad) */}
          <FormSection title="Destacar propiedad">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="featured" checked={form.featured} onChange={handleChange}
                className="rounded border-outline-variant text-primary focus:ring-primary w-5 h-5" />
              <span>
                <span className="block font-body-md text-body-md text-on-surface">Destacada en la Home</span>
                <span className="block font-body-md text-sm text-on-surface-variant">Aparece en la sección "Propiedades destacadas" de la página de inicio.</span>
              </span>
            </label>
          </FormSection>

          {/* ── Acciones ── */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-surface-variant pb-stack-lg">
            <button
              type="button"
              onClick={() => navigate('/admin/properties')}
              className="px-6 py-3 rounded-lg border border-primary text-primary font-label-md text-label-md hover:bg-primary/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-lg bg-secondary text-on-secondary font-label-md text-label-md hover:bg-secondary-container transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Publicar'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
