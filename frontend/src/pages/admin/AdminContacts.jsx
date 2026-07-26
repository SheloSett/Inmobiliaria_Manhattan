import { useState, useEffect } from 'react';
import { Search, Mail, Phone, X } from 'lucide-react';
import api from '../../services/api';

// --- Constantes ---
const PAGE_SIZE = 9;

const FILTERS = [
  { label: 'Todas',   value: 'all' },
  { label: 'Nuevas',  value: 'unread' },
  { label: 'Leídas',  value: 'read' },
];

const AVATAR_PALETTE = [
  { bg: 'bg-primary-fixed',           text: 'text-on-primary-fixed-variant' },
  { bg: 'bg-tertiary-fixed',          text: 'text-on-tertiary-fixed' },
  { bg: 'bg-secondary-fixed',         text: 'text-on-secondary-fixed-variant' },
  { bg: 'bg-surface-container-highest', text: 'text-on-surface' },
];

// --- Helpers ---
function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '??';
}

function avatarColor(name = '') {
  return AVATAR_PALETTE[(name.charCodeAt(0) ?? 0) % AVATAR_PALETTE.length];
}

function timeAgo(dateStr) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1)    return 'Ahora';
  if (mins < 60)   return `Hace ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24)      return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1)     return 'Ayer';
  return `Hace ${d} días`;
}

// --- StatusBadge ---
function StatusBadge({ read }) {
  return read
    ? <span className="bg-tertiary-fixed text-on-tertiary-fixed px-3 py-1 rounded-full font-label-md text-xs whitespace-nowrap">Leída</span>
    : <span className="bg-secondary-fixed text-on-secondary-fixed-variant px-3 py-1 rounded-full font-label-md text-xs whitespace-nowrap">Nueva</span>;
}

// --- Modal de detalle ---
function DetailModal({ contact, onClose, onMarkRead }) {
  const av  = avatarColor(contact.name);
  const ini = getInitials(contact.name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant w-full max-w-lg shadow-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-outline-variant flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-label-md font-semibold flex-shrink-0 ${av.bg} ${av.text}`}>
              {ini}
            </div>
            <div>
              <h2 className="font-headline-md text-primary text-[18px] leading-tight">{contact.name}</h2>
              <p className="font-label-md text-label-md text-on-surface-variant">{timeAgo(contact.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge read={contact.read} />
            <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors p-1 ml-1">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">

          {/* Propiedad relacionada */}
          <div className="bg-surface-container-low p-3 rounded-lg flex items-center gap-3">
            <span className="material-symbols-outlined text-outline">real_estate_agent</span>
            <div>
              <p className="font-label-md text-label-md text-on-surface">
                {contact.property?.title ?? 'Consulta general'}
              </p>
              {contact.property && (
                <p className="text-xs text-outline font-label-md">ID #{contact.property.id}</p>
              )}
            </div>
          </div>

          {/* Datos de contacto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-2 p-3 bg-surface rounded border border-outline-variant hover:bg-surface-container transition-colors group"
            >
              <Mail size={16} className="text-on-surface-variant flex-shrink-0 group-hover:text-primary transition-colors" />
              <span className="font-body-md text-sm text-primary truncate">{contact.email}</span>
            </a>
            {contact.phone ? (
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center gap-2 p-3 bg-surface rounded border border-outline-variant hover:bg-surface-container transition-colors group"
              >
                <Phone size={16} className="text-on-surface-variant flex-shrink-0 group-hover:text-primary transition-colors" />
                <span className="font-body-md text-sm text-primary truncate">{contact.phone}</span>
              </a>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-surface rounded border border-outline-variant opacity-40">
                <Phone size={16} className="text-on-surface-variant flex-shrink-0" />
                <span className="font-body-md text-sm text-on-surface-variant">Sin teléfono</span>
              </div>
            )}
          </div>

          {/* Mensaje completo */}
          <div className="bg-surface rounded border border-outline-variant p-4">
            <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide text-xs mb-3">Mensaje</p>
            <p className="font-body-md text-body-md text-on-surface whitespace-pre-wrap leading-relaxed">
              {contact.message}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-outline-variant flex justify-end gap-3 flex-shrink-0">
          {!contact.read && (
            <button
              onClick={() => { onMarkRead(contact.id); onClose(); }}
              className="px-4 py-2 rounded font-label-md text-label-md bg-primary text-on-primary hover:bg-primary-container transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">mark_email_read</span>
              Marcar leída
            </button>
          )}
          <a
            href={`mailto:${contact.email}`}
            className="px-4 py-2 rounded font-label-md text-label-md border border-outline-variant text-on-surface hover:bg-surface-container transition-colors flex items-center gap-2"
          >
            <Mail size={16} />
            Responder
          </a>
        </div>
      </div>
    </div>
  );
}

// --- Tarjeta de consulta ---
function ContactCard({ contact, onOpen, onMarkRead }) {
  const av  = avatarColor(contact.name);
  const ini = getInitials(contact.name);

  return (
    <div
      className={`bg-surface-container-lowest rounded-xl p-6 border border-outline-variant flex flex-col hover:shadow-sm transition-all cursor-pointer ${
        contact.read ? 'opacity-80' : 'border-l-4 border-l-secondary'
      }`}
      onClick={() => onOpen(contact)}
    >
      {/* Header de la tarjeta */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-label-md font-semibold flex-shrink-0 ${av.bg} ${av.text}`}>
            {ini}
          </div>
          <div>
            <h3 className="font-label-md text-[16px] text-primary leading-tight">{contact.name}</h3>
            <p className="font-label-md text-label-md text-on-surface-variant">{timeAgo(contact.createdAt)}</p>
          </div>
        </div>
        <StatusBadge read={contact.read} />
      </div>

      {/* Propiedad relacionada */}
      <div className="mb-4 bg-surface-container-low p-3 rounded-lg flex items-center gap-3">
        <span className="material-symbols-outlined text-outline text-[20px]">real_estate_agent</span>
        <p className="font-label-md text-label-md text-on-surface truncate">
          {contact.property?.title ?? 'Consulta general'}
        </p>
      </div>

      {/* Preview del mensaje */}
      <p className="font-body-md text-body-md text-on-surface-variant mb-4 line-clamp-3 flex-grow">
        {contact.message}
      </p>

      {/* Acciones */}
      <div
        className="mt-auto flex justify-between items-center border-t border-outline-variant pt-4 gap-2"
        onClick={e => e.stopPropagation()}
      >
        {!contact.read ? (
          <button
            onClick={() => onMarkRead(contact.id)}
            className="p-2 text-outline hover:text-primary transition-colors rounded-full hover:bg-surface-container-low"
            title="Marcar como leída"
          >
            <span className="material-symbols-outlined text-[20px]">mark_email_read</span>
          </button>
        ) : (
          <span /> /* placeholder para mantener layout */
        )}
        <button
          onClick={() => onOpen(contact)}
          className="px-4 py-2 bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors rounded-lg font-label-md text-label-md flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">visibility</span>
          Ver detalles
        </button>
      </div>
    </div>
  );
}

// --- Componente principal ---
export default function AdminContacts() {
  const [contacts, setContacts] = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('all');
  const [page, setPage]         = useState(1);
  const [selected, setSelected] = useState(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchContacts = async (p = 1, f = 'all') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: PAGE_SIZE });
      if (f === 'unread') params.set('read', 'false');
      if (f === 'read')   params.set('read', 'true');
      const res = await api.get(`/contacts?${params}`);
      setContacts(res.data.contacts ?? []);
      setTotal(res.data.total ?? 0);
    } catch {
      // el interceptor de api.js maneja el 401
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContacts(); }, []);

  const handleFilterChange = (val) => {
    setFilter(val);
    setPage(1);
    fetchContacts(1, val);
  };

  const handlePageChange = (p) => {
    setPage(p);
    fetchContacts(p, filter);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/contacts/${id}/read`);
      setContacts(prev => prev.map(c => c.id === id ? { ...c, read: true } : c));
      if (selected?.id === id) setSelected(prev => ({ ...prev, read: true }));
      if (filter === 'unread') {
        setContacts(prev => prev.filter(c => c.id !== id));
        setTotal(prev => Math.max(0, prev - 1));
      }
    } catch {
      // silencioso
    }
  };

  // Filtro de búsqueda en cliente (sobre la página actual)
  const visible = contacts.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.property?.title?.toLowerCase().includes(search.toLowerCase())
  );

  const unreadCount = contacts.filter(c => !c.read).length;

  return (
    <div className="bg-background min-h-full p-6 md:p-10">

      {selected && (
        <DetailModal
          contact={selected}
          onClose={() => setSelected(null)}
          onMarkRead={handleMarkRead}
        />
      )}

      {/* ---- Encabezado ---- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 max-w-screen-xl mx-auto">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary">Consultas Entrantes</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Gestiona los mensajes de clientes potenciales interesados en propiedades.
          </p>
        </div>
        {/* Buscador */}
        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email o propiedad..."
            className="w-full pl-9 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors font-body-md text-body-md text-on-surface"
          />
        </div>
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
            {f.value === 'unread' && unreadCount > 0 && (
              <span className="bg-secondary text-on-secondary rounded-full px-1.5 py-0.5 text-[10px] leading-none">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
        {!loading && (
          <span className="ml-auto font-label-md text-label-md text-on-surface-variant self-center">
            {total} consulta{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ---- Grid de tarjetas ---- */}
      <div className="max-w-screen-xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <span className="material-symbols-outlined text-[40px] text-outline mb-2">autorenew</span>
            <p className="font-label-md text-label-md">Cargando consultas...</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
            <span className="material-symbols-outlined text-[48px] text-outline mb-3">mark_email_read</span>
            <p className="font-label-md text-label-md">
              {search ? 'Sin resultados para esa búsqueda.' : 'No hay consultas en esta categoría.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map(c => (
              <ContactCard
                key={c.id}
                contact={c}
                onOpen={setSelected}
                onMarkRead={handleMarkRead}
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
