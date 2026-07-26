import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { PAGES, defaultsFor } from '../../config/siteContent';

// Editor de contenido del sitio (mini-CMS) — basado en el template Stitch
// admin_settings_content. Sub-nav de páginas a la izquierda y editor de los campos
// de la página seleccionada a la derecha. El esquema de campos y sus defaults viven
// en frontend/src/config/siteContent.js; acá solo se renderizan y se guardan por
// página vía PUT /api/content/:page. Las imágenes se suben con POST /api/content/upload.

// Construye el objeto de valores inicial de todas las páginas: defaults mergeados
// con lo que venga guardado en la BD.
function buildValues(savedMap) {
  const out = {};
  PAGES.forEach((p) => {
    out[p.key] = { ...defaultsFor(p.key), ...(savedMap?.[p.key] || {}) };
  });
  return out;
}

export default function AdminContent() {
  const [activePage, setActivePage] = useState(PAGES[0].key);
  const [values, setValues] = useState(() => buildValues({}));
  const [baseline, setBaseline] = useState(() => buildValues({}));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState(null);
  const fileInputs = useRef({});

  const page = PAGES.find((p) => p.key === activePage);
  const pageValues = values[activePage] || {};
  const dirty = JSON.stringify(values[activePage]) !== JSON.stringify(baseline[activePage]);

  // Carga inicial de todo el contenido guardado.
  useEffect(() => {
    api.get('/content')
      .then((res) => {
        const built = buildValues(res.data || {});
        setValues(built);
        setBaseline(built);
      })
      .catch(() => { /* se quedan los defaults */ })
      .finally(() => setLoading(false));
  }, []);

  const setField = (fieldKey, value) => {
    setValues((prev) => ({
      ...prev,
      [activePage]: { ...prev[activePage], [fieldKey]: value },
    }));
  };

  // --- Helpers para campos de tipo 'list' (listas repetibles, ej: equipo) ---
  const setListItem = (fieldKey, index, subKey, value) => {
    setValues((prev) => {
      const list = [...(prev[activePage][fieldKey] || [])];
      list[index] = { ...list[index], [subKey]: value };
      return { ...prev, [activePage]: { ...prev[activePage], [fieldKey]: list } };
    });
  };

  const addListItem = (fieldKey, itemFields) => {
    const empty = itemFields.reduce((acc, f) => { acc[f.key] = f.default ?? ''; return acc; }, {});
    setValues((prev) => ({
      ...prev,
      [activePage]: { ...prev[activePage], [fieldKey]: [...(prev[activePage][fieldKey] || []), empty] },
    }));
  };

  const removeListItem = (fieldKey, index) => {
    setValues((prev) => {
      const list = (prev[activePage][fieldKey] || []).filter((_, i) => i !== index);
      return { ...prev, [activePage]: { ...prev[activePage], [fieldKey]: list } };
    });
  };

  // Sube un archivo y aplica la URL resultante con applyUrl(url). `uploadKey` es un
  // identificador único del destino (para mostrar "Subiendo..." solo en ese lugar).
  const handleUpload = async (uploadKey, file, applyUrl) => {
    if (!file) return;
    setUploadingField(uploadKey);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await api.post('/content/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      applyUrl(res.data.url);
      toast.success('Imagen subida');
    } catch {
      toast.error('No se pudo subir la imagen');
    } finally {
      setUploadingField(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/content/${activePage}`, { content: values[activePage] });
      setBaseline((prev) => ({ ...prev, [activePage]: values[activePage] }));
      toast.success('Cambios guardados');
    } catch {
      toast.error('No se pudieron guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setValues((prev) => ({ ...prev, [activePage]: baseline[activePage] }));
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">

      {/* Sub-navegación de páginas */}
      <nav className="md:w-56 flex-shrink-0 bg-surface-container-low border border-outline-variant rounded-xl p-4 flex flex-col gap-1 h-max">
        <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-3 px-2">
          Páginas del sitio
        </h3>
        {PAGES.map((p) => {
          const isActive = p.key === activePage;
          return (
            <button
              key={p.key}
              onClick={() => setActivePage(p.key)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                isActive
                  ? 'bg-primary-container text-on-primary-container'
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{p.icon}</span>
              <span className="font-label-md text-label-md">{p.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Editor de la página seleccionada */}
      <section className="flex-1 min-w-0">
        <div className="mb-6">
          <nav className="flex text-xs text-on-surface-variant/70 gap-2 mb-1 uppercase tracking-widest font-semibold">
            <span>Ajustes</span><span>/</span><span className="text-primary">Editor de Contenido</span>
          </nav>
          <h2 className="font-headline-md text-headline-md text-primary">
            Editar contenido del sitio: <span className="text-secondary">{page?.label}</span>
          </h2>
        </div>

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
          <div className="p-6 md:p-8 space-y-6">
            {loading ? (
              <p className="font-label-md text-label-md text-on-surface-variant py-8 text-center">
                Cargando contenido...
              </p>
            ) : (
              page.fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <label className="block font-label-md text-label-md text-primary">{field.label}</label>

                  {field.type === 'text' && (
                    <input
                      type="text"
                      value={pageValues[field.key] ?? ''}
                      onChange={(e) => setField(field.key, e.target.value)}
                      className="w-full border border-outline-variant rounded-lg p-3 font-body-md text-body-md text-on-surface bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    />
                  )}

                  {field.type === 'textarea' && (
                    <textarea
                      rows={3}
                      value={pageValues[field.key] ?? ''}
                      onChange={(e) => setField(field.key, e.target.value)}
                      className="w-full border border-outline-variant rounded-lg p-3 font-body-md text-body-md text-on-surface bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none"
                    />
                  )}

                  {field.type === 'image' && (
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      <div className="w-56 h-36 rounded-lg overflow-hidden border border-outline-variant bg-surface-container flex items-center justify-center flex-shrink-0">
                        {pageValues[field.key] ? (
                          <img src={pageValues[field.key]} alt={field.label} className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-outline text-[32px]">image</span>
                        )}
                      </div>
                      <div className="flex-1 w-full">
                        <div
                          onClick={() => fileInputs.current[field.key]?.click()}
                          className="border-2 border-dashed border-outline-variant rounded-lg p-6 flex flex-col items-center justify-center text-on-surface-variant hover:border-primary hover:bg-surface-container transition-all cursor-pointer text-center"
                        >
                          <span className="material-symbols-outlined text-3xl mb-2">cloud_upload</span>
                          <p className="text-sm font-semibold">
                            {uploadingField === field.key ? 'Subiendo...' : 'Click para subir nueva imagen'}
                          </p>
                          <p className="text-xs">Recomendado: 1920x1080px (JPG/PNG)</p>
                        </div>
                        <input
                          ref={(el) => { fileInputs.current[field.key] = el; }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => { handleUpload(field.key, e.target.files[0], (url) => setField(field.key, url)); e.target.value = ''; }}
                        />
                      </div>
                    </div>
                  )}

                  {field.type === 'list' && (
                    <div className="space-y-4">
                      {(pageValues[field.key] || []).map((item, index) => {
                        const itemImgField = field.itemFields.find((f) => f.type === 'image');
                        const textFields = field.itemFields.filter((f) => f.type !== 'image');
                        const inputKey = `${field.key}.${index}.${itemImgField?.key}`;
                        return (
                          <div key={index} className="border border-outline-variant rounded-lg p-4 bg-surface-container-low relative">
                            <div className="flex flex-col sm:flex-row gap-4">
                              {/* Foto del integrante */}
                              {itemImgField && (
                                <div className="flex-shrink-0">
                                  <div
                                    onClick={() => fileInputs.current[inputKey]?.click()}
                                    className="w-24 h-28 rounded-lg overflow-hidden border border-outline-variant bg-surface-container flex items-center justify-center cursor-pointer group relative"
                                  >
                                    {item[itemImgField.key] ? (
                                      <img src={item[itemImgField.key]} alt={item.name || 'Integrante'} className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="material-symbols-outlined text-outline text-[28px]">person</span>
                                    )}
                                    <div className="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                      <span className="material-symbols-outlined text-white text-[20px]">
                                        {uploadingField === inputKey ? 'hourglass_top' : 'photo_camera'}
                                      </span>
                                    </div>
                                  </div>
                                  <input
                                    ref={(el) => { fileInputs.current[inputKey] = el; }}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => { handleUpload(inputKey, e.target.files[0], (url) => setListItem(field.key, index, itemImgField.key, url)); e.target.value = ''; }}
                                  />
                                  <p className="text-[11px] text-on-surface-variant text-center mt-1">Cambiar foto</p>
                                </div>
                              )}
                              {/* Campos del ítem (texto o select según su tipo) */}
                              <div className="flex-1 space-y-3">
                                {textFields.map((sub) => (
                                  <div key={sub.key}>
                                    <label className="block text-xs font-label-md text-on-surface-variant mb-1">{sub.label}</label>
                                    {sub.type === 'select' ? (
                                      <select
                                        value={item[sub.key] ?? sub.default ?? ''}
                                        onChange={(e) => setListItem(field.key, index, sub.key, e.target.value)}
                                        className="w-full border border-outline-variant rounded-lg p-2.5 font-body-md text-body-md text-on-surface bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                                      >
                                        {sub.options.map((opt) => (
                                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                      </select>
                                    ) : (
                                      <input
                                        type="text"
                                        value={item[sub.key] ?? ''}
                                        onChange={(e) => setListItem(field.key, index, sub.key, e.target.value)}
                                        className="w-full border border-outline-variant rounded-lg p-2.5 font-body-md text-body-md text-on-surface bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                              {/* Eliminar integrante */}
                              <button
                                type="button"
                                onClick={() => removeListItem(field.key, index)}
                                title="Eliminar integrante"
                                className="self-start p-2 text-on-surface-variant hover:text-secondary hover:bg-secondary-fixed rounded transition-colors"
                              >
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => addListItem(field.key, field.itemFields)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-outline-variant text-primary font-label-md text-label-md hover:bg-surface-container transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        Agregar {field.itemLabel?.toLowerCase() || 'ítem'}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Acciones */}
          <div className="bg-surface-container-low px-6 md:px-8 py-5 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-outline-variant">
            <span className="text-xs text-on-surface-variant italic">
              {dirty ? 'Tenés cambios sin guardar' : 'Todo guardado'}
            </span>
            <div className="flex gap-3">
              <button
                onClick={handleDiscard}
                disabled={!dirty || saving}
                className="px-6 py-2.5 rounded-lg border border-primary text-primary font-label-md text-label-md hover:bg-primary/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Descartar cambios
              </button>
              <button
                onClick={handleSave}
                disabled={!dirty || saving}
                className="px-8 py-2.5 rounded-lg bg-secondary text-on-secondary font-label-md text-label-md hover:opacity-90 shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
