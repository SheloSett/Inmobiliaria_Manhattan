import { useState, useEffect } from 'react';
import { Search, Mail, Phone, X, FileText, Download, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
// Avisa al sidebar del admin que cambió la cantidad de pendientes, para que su
// contador se actualice al instante (17/08/2026).
import { notifyApplicationsUpdated } from '../../hooks/useUnreadApplications';

// Panel de Postulaciones (10/08/2026). Dos solapas sobre la misma pantalla:
//   "Postulaciones" → JobApplication (con CV adjunto)
//   "Sucursales"    → BranchInquiry  (solicitudes de apertura, sin archivo)
//
// Se reutiliza el look de tarjetas + modal de AdminContacts (avatar con iniciales,
// badge Nueva/Leída, filtros por estado), que es el patrón ya establecido para bandejas
// de entrada en este admin.

const PAGE_SIZE = 9;

// Config de cada solapa en un solo lugar: endpoint, cómo se llama la lista dentro de la
// respuesta y los textos. Así el resto del componente no necesita ramificar por tipo.
const TABS = {
  jobs: {
    label: 'Postulaciones',
    icon: 'badge',
    endpoint: '/applications/jobs',
    listKey: 'applications',
    title: 'Postulaciones de Trabajo',
    subtitle: 'CVs recibidos desde la página pública de postulaciones.',
    emptyIcon: 'badge',
    emptyText: 'No hay postulaciones en esta categoría.',
    countLabel: (n) => `${n} postulación${n !== 1 ? 'es' : ''}`,
    // Cómo se nombra el ítem en el confirm de borrado y en el toast (11/08/2026). Va acá
    // y no hardcodeado en handleDelete porque las dos solapas comparten ese código.
    deleteLabel: 'la postulación',
    deletedToast: 'Postulación eliminada',
  },
  branches: {
    label: 'Sucursales',
    icon: 'storefront',
    endpoint: '/applications/branches',
    listKey: 'inquiries',
    title: 'Solicitudes de Sucursal',
    subtitle: 'Personas interesadas en abrir una sucursal con la marca.',
    emptyIcon: 'storefront',
    emptyText: 'No hay solicitudes en esta categoría.',
    countLabel: (n) => `${n} solicitud${n !== 1 ? 'es' : ''}`,
    deleteLabel: 'la solicitud',
    deletedToast: 'Solicitud eliminada',
  },
};

const FILTERS = [
  { label: 'Todas', value: 'all' },
  { label: 'Nuevas', value: 'unread' },
  { label: 'Leídas', value: 'read' },
];

const AVATAR_PALETTE = [
  { bg: 'bg-primary-fixed', text: 'text-on-primary-fixed-variant' },
  { bg: 'bg-tertiary-fixed', text: 'text-on-tertiary-fixed' },
  { bg: 'bg-secondary-fixed', text: 'text-on-secondary-fixed-variant' },
  { bg: 'bg-surface-container-highest', text: 'text-on-surface' },
];

// --- Helpers (mismos que AdminContacts) ---
function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '??';
}

function avatarColor(name = '') {
  return AVATAR_PALETTE[(name.charCodeAt(0) ?? 0) % AVATAR_PALETTE.length];
}

function timeAgo(dateStr) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Ayer';
  return `Hace ${d} días`;
}

// Número en formato wa.me: solo dígitos. Se antepone 54 (Argentina) si el teléfono
// cargado por el postulante no trae código de país.
function waLink(phone = '') {
  const digits = String(phone).replace(/[^\d]/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits.startsWith('54') ? digits : `54${digits}`}`;
}

function StatusBadge({ read }) {
  return read
    ? <span className="bg-tertiary-fixed text-on-tertiary-fixed px-3 py-1 rounded-full font-label-md text-xs whitespace-nowrap">Leída</span>
    : <span className="bg-secondary-fixed text-on-secondary-fixed-variant px-3 py-1 rounded-full font-label-md text-xs whitespace-nowrap">Nueva</span>;
}

// Fila de dato del modal (etiqueta + valor), para no repetir markup por cada campo.
function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="bg-surface rounded border border-outline-variant p-3">
      <p className="font-label-md text-on-surface-variant uppercase tracking-wide text-xs mb-1">{label}</p>
      <p className="font-body-md text-body-md text-on-surface whitespace-pre-wrap leading-relaxed">{value}</p>
    </div>
  );
}

// --- Modal de detalle ---
function DetailModal({ item, tab, onClose, onMarkRead, onDelete }) {
  const av = avatarColor(item.name);
  const wa = waLink(item.phone);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant w-full max-w-lg shadow-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-outline-variant flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-label-md font-semibold flex-shrink-0 ${av.bg} ${av.text}`}>
              {getInitials(item.name)}
            </div>
            <div>
              <h2 className="font-headline-md text-primary text-[18px] leading-tight">{item.name}</h2>
              <p className="font-label-md text-label-md text-on-surface-variant">{timeAgo(item.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge read={item.read} />
            <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors p-1 ml-1">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Contacto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href={`mailto:${item.email}`}
              className="flex items-center gap-2 p-3 bg-surface rounded border border-outline-variant hover:bg-surface-container transition-colors group"
            >
              <Mail size={16} className="text-on-surface-variant flex-shrink-0 group-hover:text-primary transition-colors" />
              <span className="font-body-md text-sm text-primary truncate">{item.email}</span>
            </a>
            <a
              href={`tel:${item.phone}`}
              className="flex items-center gap-2 p-3 bg-surface rounded border border-outline-variant hover:bg-surface-container transition-colors group"
            >
              <Phone size={16} className="text-on-surface-variant flex-shrink-0 group-hover:text-primary transition-colors" />
              <span className="font-body-md text-sm text-primary truncate">{item.phone}</span>
            </a>
          </div>

          {/* CV: solo en la solapa de postulaciones */}
          {tab === 'jobs' && (
            <a
              href={item.cvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-primary-container/20 rounded-lg border border-primary/30 hover:bg-primary-container/40 transition-colors group"
            >
              <FileText size={20} className="text-primary flex-shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block font-label-md text-label-md text-primary truncate">
                  {item.cvName || 'Curriculum Vitae'}
                </span>
                <span className="block text-xs text-on-surface-variant">Abrir / descargar CV</span>
              </span>
              <Download size={18} className="text-on-surface-variant group-hover:text-primary transition-colors flex-shrink-0" />
            </a>
          )}

          {tab === 'jobs' ? (
            <>
              <DetailRow label="Puesto de interés" value={item.position} />
              <DetailRow label="Ciudad / Zona" value={item.city} />
              <DetailRow label="Mensaje" value={item.message} />
            </>
          ) : (
            <>
              <DetailRow label="Zona donde abriría" value={item.city} />
              <DetailRow label="Experiencia" value={item.experience} />
              <DetailRow label="Proyecto" value={item.message} />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-outline-variant flex flex-wrap items-center gap-3 flex-shrink-0">
          {/* Eliminar a la izquierda (acción destructiva, separada del resto) */}
          <button
            onClick={() => onDelete(item)}
            className="px-4 py-2 rounded font-label-md text-label-md border border-outline-variant text-on-surface-variant hover:text-secondary hover:border-secondary transition-colors flex items-center gap-2 mr-auto"
          >
            <Trash2 size={16} />
            Eliminar
          </button>
          {!item.read && (
            <button
              onClick={() => { onMarkRead(item.id); onClose(); }}
              className="px-4 py-2 rounded font-label-md text-label-md bg-primary text-on-primary hover:bg-primary-container transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">mark_email_read</span>
              Marcar leída
            </button>
          )}
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded font-label-md text-label-md border border-outline-variant text-on-surface hover:bg-surface-container transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">forum</span>
              WhatsApp
            </a>
          )}
          {/* Botón "Responder" (mailto) comentado, no eliminado, según regla del proyecto.
              Motivo: el cliente pidió dejar solo el contacto por WhatsApp (10/08/2026),
              en línea con el resto del sitio, donde todas las solicitudes van por ese
              canal. El email del postulante sigue visible y clickeable más arriba. */}
          {/* <a
            href={`mailto:${item.email}`}
            className="px-4 py-2 rounded font-label-md text-label-md border border-outline-variant text-on-surface hover:bg-surface-container transition-colors flex items-center gap-2"
          >
            <Mail size={16} />
            Responder
          </a> */}
        </div>
      </div>
    </div>
  );
}

// --- Tarjeta ---
function ApplicationCard({ item, tab, onOpen, onMarkRead, onDelete }) {
  const av = avatarColor(item.name);

  return (
    <div
      className={`bg-surface-container-lowest rounded-xl p-6 border border-outline-variant flex flex-col hover:shadow-sm transition-all cursor-pointer ${
        item.read ? 'opacity-80' : 'border-l-4 border-l-secondary'
      }`}
      onClick={() => onOpen(item)}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-label-md font-semibold flex-shrink-0 ${av.bg} ${av.text}`}>
            {getInitials(item.name)}
          </div>
          <div className="min-w-0">
            <h3 className="font-label-md text-[16px] text-primary leading-tight truncate">{item.name}</h3>
            <p className="font-label-md text-label-md text-on-surface-variant">{timeAgo(item.createdAt)}</p>
          </div>
        </div>
        <StatusBadge read={item.read} />
      </div>

      {/* Dato principal según la solapa */}
      <div className="mb-4 bg-surface-container-low p-3 rounded-lg flex items-center gap-3">
        <span className="material-symbols-outlined text-outline text-[20px]">
          {tab === 'jobs' ? 'work' : 'location_on'}
        </span>
        <p className="font-label-md text-label-md text-on-surface truncate">
          {tab === 'jobs'
            ? (item.position || 'Postulación general')
            : (item.city || 'Zona no especificada')}
        </p>
      </div>

      <p className="font-body-md text-body-md text-on-surface-variant mb-4 line-clamp-3 flex-grow">
        {item.message || (tab === 'jobs' ? 'Sin mensaje adicional.' : 'Sin detalles del proyecto.')}
      </p>

      <div
        className="mt-auto flex justify-between items-center border-t border-outline-variant pt-4 gap-2"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-1">
          {!item.read && (
            <button
              onClick={() => onMarkRead(item.id)}
              className="p-2 text-outline hover:text-primary transition-colors rounded-full hover:bg-surface-container-low"
              title="Marcar como leída"
            >
              <span className="material-symbols-outlined text-[20px]">mark_email_read</span>
            </button>
          )}
          <button
            onClick={() => onDelete(item)}
            className="p-2 text-outline hover:text-secondary transition-colors rounded-full hover:bg-secondary-fixed"
            title="Eliminar"
          >
            <Trash2 size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {tab === 'jobs' && (
            <a
              href={item.cvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-primary text-on-primary hover:bg-primary-container transition-colors rounded-lg font-label-md text-label-md flex items-center gap-2"
              title={item.cvName || 'Descargar CV'}
            >
              <FileText size={16} />
              CV
            </a>
          )}
          <button
            onClick={() => onOpen(item)}
            className="px-4 py-2 bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors rounded-lg font-label-md text-label-md flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">visibility</span>
            Ver
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Componente principal ---
export default function AdminApplications() {
  const [tab, setTab] = useState('jobs');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  // Contador de no leídas de la OTRA solapa, para mostrar el badge sin haberla abierto.
  const [otherUnread, setOtherUnread] = useState({ jobs: 0, branches: 0 });

  const cfg = TABS[tab];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchItems = async (t = tab, p = 1, f = 'all') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: PAGE_SIZE });
      if (f === 'unread') params.set('read', 'false');
      if (f === 'read') params.set('read', 'true');
      const res = await api.get(`${TABS[t].endpoint}?${params}`);
      setItems(res.data[TABS[t].listKey] ?? []);
      setTotal(res.data.total ?? 0);
      setUnread(res.data.unread ?? 0);
      setOtherUnread(prev => ({ ...prev, [t]: res.data.unread ?? 0 }));
    } catch {
      // el interceptor de api.js maneja el 401
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems('jobs', 1, 'all'); }, []);

  // Al montar se piden también los no leídos de la otra solapa (limit=1 para traer solo
  // el contador, no la lista entera) y así poder mostrar su badge de entrada.
  useEffect(() => {
    api.get(`${TABS.branches.endpoint}?limit=1`)
      .then(res => setOtherUnread(prev => ({ ...prev, branches: res.data.unread ?? 0 })))
      .catch(() => { /* el interceptor maneja el 401 */ });
  }, []);

  const handleTabChange = (t) => {
    if (t === tab) return;
    setTab(t);
    setFilter('all');
    setPage(1);
    setSearch('');
    setItems([]);
    fetchItems(t, 1, 'all');
  };

  const handleFilterChange = (val) => {
    setFilter(val);
    setPage(1);
    fetchItems(tab, 1, val);
  };

  const handlePageChange = (p) => {
    setPage(p);
    fetchItems(tab, p, filter);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMarkRead = async (id) => {
    try {
      await api.patch(`${cfg.endpoint}/${id}/read`);
      setItems(prev => prev.map(i => i.id === id ? { ...i, read: true } : i));
      // Guard (10/08/2026): el botón del modal llama a onMarkRead() y enseguida onClose()
      // (que pone selected=null). Como onMarkRead es async, cuando resolvía la request el
      // modal ya estaba cerrado y `prev` era null → `{...null, read:true}` daba un objeto
      // SIN name, se re-abría el modal con datos incompletos y crasheaba en avatarColor
      // (item.name undefined → "reading 'bg'"). Solo actualizamos si el modal sigue abierto
      // en ese mismo ítem; si ya se cerró, no lo re-abrimos.
      setSelected(prev => (prev && prev.id === id ? { ...prev, read: true } : prev));
      setUnread(prev => Math.max(0, prev - 1));
      setOtherUnread(prev => ({ ...prev, [tab]: Math.max(0, prev[tab] - 1) }));
      if (filter === 'unread') {
        setItems(prev => prev.filter(i => i.id !== id));
        setTotal(prev => Math.max(0, prev - 1));
      }
      notifyApplicationsUpdated();
    } catch {
      // silencioso
    }
  };

  // Elimina una postulación/solicitud (con confirmación). En jobs, el backend también
  // borra el CV del disco. Agregado 11/08/2026.
  const handleDelete = async (item) => {
    // if (!window.confirm(`¿Eliminar la postulación de "${item.name}"? Esta acción no se puede deshacer.`)) return;
    // ↑ Comentada (11/08/2026): decía "la postulación" fijo, pero handleDelete lo comparten
    //   las dos solapas. En Sucursales preguntaba "¿Eliminar la postulación de X?" para algo
    //   que es una solicitud de sucursal: confuso justo en el diálogo de una acción
    //   irreversible. Ahora el sustantivo sale de la config de la solapa activa.
    if (!window.confirm(`¿Eliminar ${cfg.deleteLabel} de "${item.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`${cfg.endpoint}/${item.id}`);
      setItems(prev => prev.filter(i => i.id !== item.id));
      setTotal(prev => Math.max(0, prev - 1));
      if (!item.read) {
        setUnread(prev => Math.max(0, prev - 1));
        setOtherUnread(prev => ({ ...prev, [tab]: Math.max(0, prev[tab] - 1) }));
        notifyApplicationsUpdated();
      }
      if (selected?.id === item.id) setSelected(null);
      // toast.success('Eliminada');
      // ↑ Comentado: mismo caso que el confirm, "Eliminada" a secas no decía qué.
      toast.success(cfg.deletedToast);
    } catch {
      toast.error('No se pudo eliminar');
    }
  };

  // Filtro de búsqueda en cliente (sobre la página actual), igual que en Consultas.
  const q = search.toLowerCase();
  const visible = items.filter(i =>
    i.name?.toLowerCase().includes(q) ||
    i.email?.toLowerCase().includes(q) ||
    i.city?.toLowerCase().includes(q) ||
    i.position?.toLowerCase().includes(q)
  );

  return (
    <div className="bg-background min-h-full p-6 md:p-10">

      {selected && (
        <DetailModal
          item={selected}
          tab={tab}
          onClose={() => setSelected(null)}
          onMarkRead={handleMarkRead}
          onDelete={handleDelete}
        />
      )}

      {/* ---- Encabezado ---- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 max-w-screen-xl mx-auto">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary">{cfg.title}</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">{cfg.subtitle}</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email o zona..."
            className="w-full pl-9 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors font-body-md text-body-md text-on-surface"
          />
        </div>
      </div>

      {/* ---- Solapas ---- */}
      <div className="flex gap-1 mb-6 border-b border-outline-variant max-w-screen-xl mx-auto">
        {Object.entries(TABS).map(([key, t]) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`px-5 py-3 font-label-md text-label-md transition-colors flex items-center gap-2 border-b-2 -mb-px ${
              tab === key
                ? 'border-secondary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{t.icon}</span>
            {t.label}
            {otherUnread[key] > 0 && (
              <span className="bg-secondary text-on-secondary rounded-full px-1.5 py-0.5 text-[10px] leading-none">
                {otherUnread[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ---- Filtros ---- */}
      <div className="flex flex-wrap gap-2 mb-8 max-w-screen-xl mx-auto">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => handleFilterChange(f.value)}
            className={`px-4 py-2 rounded-full font-label-md text-label-md transition-colors flex items-center gap-2 ${
              filter === f.value
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-lowest text-on-surface border border-outline-variant hover:bg-surface-container-low'
            }`}
          >
            {f.label}
            {f.value === 'unread' && unread > 0 && (
              <span className="bg-secondary text-on-secondary rounded-full px-1.5 py-0.5 text-[10px] leading-none">
                {unread}
              </span>
            )}
          </button>
        ))}
        {!loading && (
          <span className="ml-auto font-label-md text-label-md text-on-surface-variant self-center">
            {cfg.countLabel(total)}
          </span>
        )}
      </div>

      {/* ---- Grid ---- */}
      <div className="max-w-screen-xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <span className="material-symbols-outlined text-[40px] text-outline mb-2">autorenew</span>
            <p className="font-label-md text-label-md">Cargando...</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <span className="material-symbols-outlined text-[48px] text-outline mb-3">{cfg.emptyIcon}</span>
            <p className="font-label-md text-label-md">
              {search ? 'Sin resultados para esa búsqueda.' : cfg.emptyText}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map(item => (
              <ApplicationCard
                key={item.id}
                item={item}
                tab={tab}
                onOpen={setSelected}
                onMarkRead={handleMarkRead}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* ---- Paginación ---- */}
      {!loading && total > PAGE_SIZE && (
        <div className="mt-10 flex justify-center items-center gap-4 max-w-screen-xl mx-auto">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="p-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <span className="font-label-md text-label-md text-on-surface">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
            className="p-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      )}
    </div>
  );
}
