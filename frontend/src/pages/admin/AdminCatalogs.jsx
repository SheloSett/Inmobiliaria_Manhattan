import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useCatalogs } from '../../hooks/useCatalogs';
import IconPicker from '../../components/IconPicker';

// Gestión de catálogos (Ajustes → Catálogos): tipos de operación, tipos de propiedad
// y amenities. Cada lista se puede editar, agregar o eliminar ítems. Es la fuente de
// los desplegables del formulario de alta y de los filtros del sitio.
//
// El `value` (identificador interno) se autogenera desde el nombre al crear y no se
// edita desde acá, para no romper propiedades ya cargadas que lo referencian.

const INPUT = 'border border-outline-variant rounded p-2.5 font-body-md text-body-md text-on-surface bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors';

// Una fila editable de un catálogo.
function CatalogRow({ item, kind, hasIcon, onChanged }) {
  const [label, setLabel] = useState(item.label);
  const [icon, setIcon] = useState(item.icon || '');
  const [saving, setSaving] = useState(false);
  const dirty = label !== item.label || (hasIcon && icon !== (item.icon || ''));

  const save = async () => {
    if (!label.trim()) { toast.error('El nombre no puede quedar vacío'); return; }
    setSaving(true);
    try {
      await api.put(`/catalogs/${kind}/${item.id}`, { label, ...(hasIcon ? { icon } : {}) });
      toast.success('Guardado');
      onChanged();
    } catch (e) {
      toast.error(e.response?.data?.error || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`¿Eliminar "${item.label}"?`)) return;
    try {
      await api.delete(`/catalogs/${kind}/${item.id}`);
      toast.success('Eliminado');
      onChanged();
    } catch (e) {
      toast.error(e.response?.data?.error || 'No se pudo eliminar');
    }
  };

  return (
    <div className="flex items-center gap-2 py-2">
      {hasIcon && (
        <div className="w-10 h-10 rounded bg-surface-container flex items-center justify-center flex-shrink-0" title={icon}>
          <span className="material-symbols-outlined text-[22px] text-primary">{icon || 'category'}</span>
        </div>
      )}
      <input className={`${INPUT} flex-1`} value={label} onChange={(e) => setLabel(e.target.value)} />
      {hasIcon && (
        <IconPicker value={icon} onChange={setIcon} className="w-52 flex-shrink-0" />
      )}
      <button
        type="button"
        onClick={save}
        disabled={!dirty || saving}
        className="px-3 py-2 rounded bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Guardar
      </button>
      <button
        type="button"
        onClick={remove}
        title="Eliminar"
        className="p-2 text-on-surface-variant hover:text-secondary hover:bg-secondary-fixed rounded transition-colors"
      >
        <span className="material-symbols-outlined text-[20px]">delete</span>
      </button>
    </div>
  );
}

// Una sección/lista completa (operaciones, tipos o amenities).
function CatalogSection({ title, subtitle, kind, items, hasIcon, onChanged }) {
  const [newLabel, setNewLabel] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const [adding, setAdding] = useState(false);

  const add = async (e) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setAdding(true);
    try {
      await api.post(`/catalogs/${kind}`, {
        label: newLabel,
        order: items.length,
        ...(hasIcon ? { icon: newIcon } : {}),
      });
      toast.success('Agregado');
      setNewLabel(''); setNewIcon('');
      onChanged();
    } catch (e) {
      toast.error(e.response?.data?.error || 'No se pudo agregar');
    } finally {
      setAdding(false);
    }
  };

  return (
    <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6">
      <div className="mb-4">
        <h3 className="font-headline-sm text-headline-sm text-primary">{title}</h3>
        {subtitle && <p className="font-body-md text-sm text-on-surface-variant mt-1">{subtitle}</p>}
      </div>

      <div className="divide-y divide-outline-variant">
        {items.length === 0 ? (
          <p className="font-body-md text-sm text-on-surface-variant py-4">Todavía no hay ítems.</p>
        ) : (
          items.map((item) => (
            <CatalogRow key={item.id} item={item} kind={kind} hasIcon={hasIcon} onChanged={onChanged} />
          ))
        )}
      </div>

      {/* Alta */}
      <form onSubmit={add} className="flex items-center gap-2 mt-4 pt-4 border-t border-outline-variant">
        {hasIcon && (
          <IconPicker value={newIcon} onChange={setNewIcon} className="w-52 flex-shrink-0" />
        )}
        <input className={`${INPUT} flex-1`} value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder={`Agregar ${title.toLowerCase()}...`} />
        <button
          type="submit"
          disabled={!newLabel.trim() || adding}
          className="flex items-center gap-1 px-4 py-2.5 rounded bg-secondary text-on-secondary font-label-md text-label-md hover:opacity-90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Agregar
        </button>
      </form>
    </section>
  );
}

// Página independiente (Propiedades → Catálogos, ruta /admin/catalogs). Antes vivía
// como pestaña dentro de Ajustes; se movió a un sub-ítem de Propiedades (21/07/2026).
export default function AdminCatalogs() {
  const { operations, propertyTypes, amenities, loading, reload } = useCatalogs();

  return (
    <div className="bg-background min-h-full p-6 md:p-10">
      {/* Encabezado de página (mismo estilo que Gestión de Propiedades) */}
      <div className="mb-6 max-w-screen-xl mx-auto">
        <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight">Catálogos</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Administrá los tipos de operación, tipos de propiedad y amenities que se usan al cargar propiedades y en los filtros del sitio.
        </p>
      </div>

      <div className="max-w-screen-xl mx-auto">
        {loading ? (
          <p className="font-label-md text-label-md text-on-surface-variant py-8 text-center">Cargando catálogos...</p>
        ) : (
          <div className="space-y-6">
            <CatalogSection
              title="Tipos de Operación"
              subtitle="Venta, Alquiler, etc. Aparecen en el desplegable de operación al cargar una propiedad y en los filtros del sitio."
              kind="operations"
              items={operations}
              onChanged={reload}
            />
            <CatalogSection
              title="Tipos de Propiedad"
              subtitle="Departamento, Casa, Local, etc."
              kind="propertyTypes"
              items={propertyTypes}
              onChanged={reload}
            />
            <CatalogSection
              title="Amenities"
              subtitle="Ascensor, Piscina, Parrilla, etc. Se marcan en cada propiedad y se muestran en su ficha."
              kind="amenities"
              items={amenities}
              hasIcon
              onChanged={reload}
            />
          </div>
        )}
      </div>
    </div>
  );
}
