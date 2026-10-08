import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { PAGES, defaultsFor } from '../../config/siteContent';
import { LinksPageView } from '../LinksPage';
import { validHex } from '../../utils/linksTheme';

// Editor de contenido del sitio (mini-CMS) — basado en el template Stitch
// admin_settings_content. Sub-nav de páginas a la izquierda y editor de los campos
// de la página seleccionada a la derecha. El esquema de campos y sus defaults viven
// en frontend/src/config/siteContent.js; acá solo se renderizan y se guardan por
// página vía PUT /api/content/:page. Las imágenes se suben con POST /api/content/upload.

// ── Campo de color (09/10/2026) ──────────────────────────────────────────────
// Agregado con los colores de la página de links. Selector nativo del navegador (en el
// celular abre la paleta del sistema) + el código hex escrito a mano + atajos con los
// colores de la marca, para que el cliente no tenga que saber ningún código.
const COLOR_PRESETS = [
  { value: '#00172b', label: 'Azul Manhattan' },
  { value: '#002c4b', label: 'Azul claro' },
  { value: '#bb000f', label: 'Rojo Manhattan' },
  { value: '#000000', label: 'Negro' },
  { value: '#ffffff', label: 'Blanco' },
  { value: '#42474e', label: 'Gris' },
  { value: '#c9a84c', label: 'Dorado' },
];

function ColorField({ value, onChange }) {
  const hex = validHex(value);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="relative w-12 h-12 rounded-lg border border-outline-variant overflow-hidden cursor-pointer shadow-sm flex-shrink-0">
        {/* El input nativo se estira para cubrir todo el cuadrado (sin su borde por defecto). */}
        <input
          type="color"
          value={hex || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] cursor-pointer border-0 p-0"
          aria-label="Elegir color"
        />
      </label>
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#000000"
        maxLength={7}
        spellCheck={false}
        className={`w-28 border rounded-lg p-2.5 font-mono text-sm text-on-surface bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors ${hex ? 'border-outline-variant' : 'border-error'}`}
      />
      <div className="flex items-center gap-1.5" role="group" aria-label="Colores de la marca">
        {COLOR_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            title={p.label}
            onClick={() => onChange(p.value)}
            className={`w-7 h-7 rounded-full border transition-transform hover:scale-110 ${hex === p.value ? 'ring-2 ring-primary ring-offset-1 border-transparent' : 'border-outline-variant'}`}
            style={{ backgroundColor: p.value }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Vista previa de la página de links (09/10/2026) ──────────────────────────
// Pinta la misma vista que /links (LinksPageView) con los valores que el admin está
// editando, todavía sin guardar, adentro de un marco con forma de celular. Pensada
// sobre todo para los colores: ver la combinación antes de guardar evita el ciclo
// guardar → abrir la página → volver. Los links no son clickeables (pointer-events-none),
// solo se puede scrollear. El logo del Footer es el fallback del avatar, igual que en
// la página real.
function LinksPreview({ content, allValues }) {
  return (
    <aside className="order-first xl:order-last xl:w-[340px] xl:flex-shrink-0 xl:sticky xl:top-6">
      <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-2 text-center xl:text-left">
        Vista previa
      </p>
      <div className="mx-auto w-full max-w-[340px] h-[440px] xl:h-[560px] rounded-[2rem] border-[6px] border-primary bg-primary shadow-2xl overflow-hidden">
        <div className="h-full overflow-y-auto overscroll-contain flex flex-col rounded-[1.6rem]">
          <div className="flex-1 flex flex-col pointer-events-none select-none">
            <LinksPageView content={content} logoFallback={allValues.footer?.logo} preview />
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-on-surface-variant text-center xl:text-left">
        Se actualiza al instante. Los visitantes ven los cambios recién cuando guardás.
      </p>
    </aside>
  );
}

// Páginas que tienen vista previa en vivo, por su `key` en siteContent.js.
const PREVIEWS = { links: LinksPreview };

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

  // Mover un ítem una posición arriba (delta -1) o abajo (+1). Agregado el 08/10/2026 con
  // la página de links, donde el orden de los botones es lo que ve el visitante; antes la
  // única forma de reordenar una lista era borrar y volver a cargar.
  const moveListItem = (fieldKey, index, delta) => {
    setValues((prev) => {
      const list = [...(prev[activePage][fieldKey] || [])];
      const target = index + delta;
      if (target < 0 || target >= list.length) return prev;
      [list[index], list[target]] = [list[target], list[index]];
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
          {/* Acceso directo a la página pública (08/10/2026). Solo para las páginas que
              declaran `publicPath` en siteContent.js (por ahora, la de links). Muestra lo
              GUARDADO: los cambios sin guardar no se ven ahí. */}
          {page?.publicPath && (
            <a
              href={page.publicPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-sm font-semibold text-secondary hover:underline"
            >
              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
              Ver página ({page.publicPath})
            </a>
          )}
        </div>

        {/* Editor + vista previa (09/10/2026). La vista previa solo existe para las páginas
            listadas en PREVIEWS; en pantallas grandes va a la derecha (fija al scrollear),
            en el resto arriba de los campos. */}
        <div className="flex flex-col xl:flex-row xl:items-start gap-6">
        {!loading && PREVIEWS[page.key] && (() => {
          const Preview = PREVIEWS[page.key];
          return <Preview content={pageValues} allValues={values} />;
        })()}
        <div className="flex-1 min-w-0 w-full bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
          <div className="p-6 md:p-8 space-y-6">
            {loading ? (
              <p className="font-label-md text-label-md text-on-surface-variant py-8 text-center">
                Cargando contenido...
              </p>
            ) : (
              page.fields.map((field) => {
                // Campos condicionales (09/10/2026): p. ej. el segundo color del degradé
                // solo se muestra cuando el estilo elegido es "degradé".
                if (field.showIf && !field.showIf(pageValues)) return null;

                // Separador con título (no guarda nada).
                if (field.type === 'section') {
                  return (
                    <div key={field.key} className="pt-4 border-t border-outline-variant">
                      <h3 className="font-headline-sm text-headline-sm text-primary">{field.label}</h3>
                      {field.help && <p className="mt-1 text-sm text-on-surface-variant">{field.help}</p>}
                    </div>
                  );
                }

                return (
                <div key={field.key} className="space-y-2">
                  <label className="block font-label-md text-label-md text-primary">{field.label}</label>

                  {field.type === 'select' && (
                    <select
                      value={pageValues[field.key] ?? field.default ?? ''}
                      onChange={(e) => setField(field.key, e.target.value)}
                      className="w-full sm:max-w-md border border-outline-variant rounded-lg p-3 font-body-md text-body-md text-on-surface bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    >
                      {field.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}

                  {field.type === 'color' && (
                    <ColorField value={pageValues[field.key]} onChange={(v) => setField(field.key, v)} />
                  )}

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
                                      // <span className="material-symbols-outlined text-outline text-[28px]">person</span>
                                      // ↑ Comentado (08/10/2026): el ícono "person" estaba fijo porque la
                                      //   única lista con imagen era el equipo. Ahora cada subcampo puede
                                      //   definir su `placeholderIcon` (los botones de links usan uno de
                                      //   foto); si no lo define, sigue siendo "person".
                                      <span className="material-symbols-outlined text-outline text-[28px]">{itemImgField.placeholderIcon || 'person'}</span>
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
                                  {/* <p className="text-[11px] text-on-surface-variant text-center mt-1">Cambiar foto</p> */}
                                  {/* ↑ Comentado (08/10/2026): mismo motivo que el ícono de arriba —el
                                      texto era fijo del equipo—. Ahora sale de `caption` del subcampo. */}
                                  <p className="text-[11px] text-on-surface-variant text-center mt-1">{itemImgField.caption || 'Cambiar foto'}</p>
                                  {/* Quitar la imagen (08/10/2026). Antes, una vez subida, no había
                                      forma de volver a "sin imagen"; en los botones de links eso
                                      significa volver a mostrar el ícono de la red. */}
                                  {item[itemImgField.key] && (
                                    <button
                                      type="button"
                                      onClick={() => setListItem(field.key, index, itemImgField.key, '')}
                                      className="block mx-auto mt-1 text-[11px] font-semibold text-secondary hover:underline"
                                    >
                                      Quitar
                                    </button>
                                  )}
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
                                    ) : sub.type === 'textarea' ? (
                                      <textarea
                                        rows={3}
                                        value={item[sub.key] ?? ''}
                                        onChange={(e) => setListItem(field.key, index, sub.key, e.target.value)}
                                        className="w-full border border-outline-variant rounded-lg p-2.5 font-body-md text-body-md text-on-surface bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none"
                                      />
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
                              {/* Eliminar ítem. El título sale de itemLabel (mismo criterio
                                  que el botón "Agregar" de abajo): antes estaba fijo en
                                  "Eliminar integrante" y se veía igual en todas las listas
                                  — testimonios, beneficios, redes, preguntas (10/08/2026). */}
                              {/* Subir / bajar / eliminar (subir y bajar agregados el 08/10/2026,
                                  ver moveListItem). Se deshabilitan en los extremos de la lista. */}
                              <div className="self-start flex sm:flex-col gap-1">
                                <button
                                  type="button"
                                  onClick={() => moveListItem(field.key, index, -1)}
                                  disabled={index === 0}
                                  title="Subir"
                                  className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveListItem(field.key, index, 1)}
                                  disabled={index === (pageValues[field.key] || []).length - 1}
                                  title="Bajar"
                                  className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <span className="material-symbols-outlined text-[20px]">arrow_downward</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeListItem(field.key, index)}
                                  title={`Eliminar ${field.itemLabel?.toLowerCase() || 'ítem'}`}
                                  className="p-2 text-on-surface-variant hover:text-secondary hover:bg-secondary-fixed rounded transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[20px]">delete</span>
                                </button>
                              </div>
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
                );
              })
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
        </div>
      </section>
    </div>
  );
}
