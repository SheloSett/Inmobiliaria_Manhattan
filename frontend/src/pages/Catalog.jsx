import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import Seo from '../components/Seo';
import { useSiteContent } from '../hooks/useSiteContent';
import { useCatalogs } from '../hooks/useCatalogs';
// La card local se reemplazó por el componente compartido (28/07/2026), para que sea
// idéntica a la de Home (destacadas). Se importa con alias y la función local PropertyCard
// pasa a delegar en él; el markup local original quedó comentado abajo.
import SharedPropertyCard from '../components/PropertyCard';
// propertyThumbnail ya no se usa acá (lo usa el componente compartido); import comentado.
// import { propertyThumbnail } from '../utils/media';
// El título y subtítulo del encabezado son editables desde el admin
// (Ajustes → Contenido → Propiedades). Defaults en config/siteContent.js.
// Los desplegables de operación/tipo salen del catálogo gestionable (useCatalogs).

const OPERATION_LABELS = { SALE: 'Venta', RENT: 'Alquiler' };
const TYPE_LABELS = {
  HOUSE: 'Casa',
  APARTMENT: 'Departamento',
  OFFICE: 'Oficina',
  LOCAL: 'Local',
  LAND: 'Terreno',
  PH: 'PH',
};
const STATUS_LABELS = {
  AVAILABLE: 'Disponible',
  RESERVED: 'Reservado',
  SOLD: 'Vendido',
  RENTED: 'Alquilado',
};

// formatPrice COMENTADO: solo lo usaba la card local (ahora comentada); vive en el
// componente compartido <PropertyCard/>.
// function formatPrice(currency, price, operation) {
//   const formatted = `${currency} $${Number(price).toLocaleString('es-AR')}`;
//   return operation === 'RENT' ? `${formatted}/mes` : formatted;
// }

// ── Navbar ──────────────────────────────────────────────────────────────────
// El markup inline original quedó comentado debajo (no eliminado, según regla del
// proyecto). Motivo: se reemplazó por el componente compartido <PublicNavbar/> para
// que el navbar sea idéntico en todas las páginas públicas y los links de
// Tasaciones/Nosotros apunten a las páginas nuevas.
function TopNavBar() {
  return <PublicNavbar active="Propiedades" />;
}
// Navbar original:
// function TopNavBar() {
//   return (
//     <header className="bg-surface-container-lowest border-b border-outline-variant shadow-sm w-full sticky top-0 z-50">
//       <div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 max-w-[1280px] mx-auto">
//         <Link className="font-headline-xl text-primary font-bold tracking-tight" to="/">Manhattan</Link>
//         <nav className="hidden md:flex items-center space-x-gutter">
//           <Link className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors duration-200 px-2 py-1 rounded" to="/">Inicio</Link>
//           <Link className="font-label-md text-label-md text-secondary border-b-2 border-secondary pb-1" to="/propiedades">Propiedades</Link>
//           <a className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors duration-200 px-2 py-1 rounded" href="#">Tasaciones</a>
//           <a className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors duration-200 px-2 py-1 rounded" href="#">Nosotros</a>
//           <a className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors duration-200 px-2 py-1 rounded" href="#">Blog</a>
//           <Link className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors duration-200 px-2 py-1 rounded" to="/contacto">Contacto</Link>
//         </nav>
//       </div>
//     </header>
//   );
// }

// ── Footer ───────────────────────────────────────────────────────────────────
// El markup inline original quedó comentado debajo (no eliminado, según regla del
// proyecto). Motivo: se movió tal cual al componente compartido <PublicFooter/> para
// que el footer sea idéntico en todas las páginas públicas.
function Footer() {
  return <PublicFooter />;
}
// Footer original:
// function Footer() {
//   return (
//     <footer className="bg-primary w-full mt-stack-lg">
//       <div className="px-margin-mobile md:px-margin-desktop py-stack-lg flex flex-col md:flex-row justify-between items-center max-w-[1280px] mx-auto">
//         <div className="flex flex-col items-center md:items-start gap-2 mb-stack-sm md:mb-0">
//           <span className="font-headline-xl font-bold text-on-primary">Manhattan</span>
//           <p className="font-body-md text-body-md text-on-primary-container opacity-80 text-center md:text-left max-w-xs">
//             Negocios Inmobiliarios. Liderazgo y confianza en el mercado de alta gama.
//           </p>
//         </div>
//         <div className="flex flex-col items-center md:items-end gap-6 mt-8 md:mt-0">
//           <nav className="flex flex-wrap justify-center gap-6">
//             {['Privacidad', 'Términos', 'Mapa del Sitio', 'Ayuda'].map(label => (
//               <a key={label} className="font-label-md text-label-md text-on-primary-container opacity-80 hover:opacity-100 hover:text-secondary-fixed transition-opacity" href="#">{label}</a>
//             ))}
//           </nav>
//           <span className="font-body-md text-body-md text-on-primary-container opacity-60 text-center">
//             © 2024 Manhattan Negocios Inmobiliarios. Todos los derechos reservados.
//           </span>
//         </div>
//       </div>
//     </footer>
//   );
// }

// ── Property Card ─────────────────────────────────────────────────────────────
// Ahora delega en el componente compartido para que la card sea idéntica en todo el
// sitio. El markup local original quedó comentado debajo (no eliminado, según regla).
function PropertyCard({ property }) {
  return <SharedPropertyCard property={property} />;
}
// Card local original (comentada):
// function PropertyCard({ property }) {
//   // COMENTADO: estado del botón de favoritos. Se deshabilitó porque no existen
//   // usuarios en la base de datos, por lo que no hay dónde persistir los favoritos.
//   // const [favored, setFavored] = useState(false);
//   // Thumbnail: foto principal → primera foto → poster del video (si solo hay videos).
//   const primaryImg = propertyThumbnail(property.images);
//   // Prefiere el label enriquecido del backend (catálogo gestionable); fallback al mapa.
//   const opLabel = property.operationLabel ?? OPERATION_LABELS[property.operation] ?? property.operation;
//   const opStyle = property.operation === 'SALE'
//     ? 'bg-secondary text-on-secondary'
//     : 'bg-primary text-on-primary';
//
//   return (
//     <article className="bg-surface-container-lowest border border-outline-variant hover:shadow-lg transition-shadow duration-300 group overflow-hidden rounded-lg flex flex-col">
//       {/* Image */}
//       <div className="relative h-56 overflow-hidden flex-shrink-0">
//         {primaryImg ? (
//           <img
//             alt={property.title}
//             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
//             src={primaryImg}
//           />
//         ) : (
//           <div className="w-full h-full bg-surface-container flex items-center justify-center">
//             <span className="material-symbols-outlined text-[48px] text-outline">image_not_supported</span>
//           </div>
//         )}
//         {/* Operation badge */}
//         <div className={`absolute top-4 left-4 px-3 py-1 font-label-md text-[12px] uppercase tracking-wider rounded ${opStyle}`}>
//           {opLabel}
//         </div>
//         {/* Status badge (only if not AVAILABLE) */}
//         {property.status !== 'AVAILABLE' && (
//           <div className="absolute top-4 left-[calc(100%-8rem)] bg-surface/90 backdrop-blur-sm text-on-surface px-2 py-1 font-label-md text-[11px] uppercase tracking-wider rounded">
//             {STATUS_LABELS[property.status]}
//           </div>
//         )}
//       </div>
//
//       {/* Body */}
//       <Link to={`/propiedades/${property.id}`} className="p-6 flex flex-col flex-grow">
//         <div className="font-price-display text-price-display text-primary mb-1">
//           {formatPrice(property.currency, property.price, property.operation)}
//         </div>
//         <h3 className="font-headline-md text-headline-md text-on-surface mb-2 line-clamp-2 leading-tight">
//           {property.title}
//         </h3>
//         <p className="font-body-md text-on-surface-variant mb-4 flex items-start gap-1 text-sm line-clamp-1">
//           <span className="material-symbols-outlined text-[16px] mt-[3px] flex-shrink-0">location_on</span>
//           {[property.address, property.neighborhood, property.city].filter(Boolean).join(', ')}
//         </p>
//         <div className="mt-auto pt-4 border-t border-outline-variant flex gap-4">
//           {property.bedrooms != null && (<div className="flex items-center gap-1 text-on-surface-variant"><span className="material-symbols-outlined text-[20px]">bed</span><span className="font-label-md text-label-md">{property.bedrooms}</span></div>)}
//           {property.bathrooms != null && (<div className="flex items-center gap-1 text-on-surface-variant"><span className="material-symbols-outlined text-[20px]">shower</span><span className="font-label-md text-label-md">{property.bathrooms}</span></div>)}
//           {property.area != null && (<div className="flex items-center gap-1 text-on-surface-variant"><span className="material-symbols-outlined text-[20px]">straighten</span><span className="font-label-md text-label-md">{property.area} m²</span></div>)}
//           {property.garage && (<div className="flex items-center gap-1 text-on-surface-variant"><span className="material-symbols-outlined text-[20px]">directions_car</span></div>)}
//           {property.hasKey && (<div className="flex items-center gap-1 text-secondary" title="Con llave"><span className="material-symbols-outlined text-[20px]">key</span></div>)}
//         </div>
//       </Link>
//     </article>
//   );
// }

// ── Skeleton Card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden animate-pulse">
      <div className="h-56 bg-surface-container" />
      <div className="p-6 flex flex-col gap-3">
        <div className="h-6 w-1/3 bg-surface-container rounded" />
        <div className="h-5 w-3/4 bg-surface-container rounded" />
        <div className="h-4 w-2/3 bg-surface-container rounded" />
        <div className="h-px bg-surface-container-high mt-2" />
        <div className="flex gap-4 mt-1">
          <div className="h-4 w-12 bg-surface-container rounded" />
          <div className="h-4 w-12 bg-surface-container rounded" />
          <div className="h-4 w-16 bg-surface-container rounded" />
        </div>
      </div>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;

  const btnBase = 'w-10 h-10 flex items-center justify-center rounded-lg font-label-md text-label-md transition-colors';
  const btnIdle = `${btnBase} border border-outline-variant text-on-surface-variant hover:bg-surface-container-high`;
  const btnActive = `${btnBase} bg-primary text-on-primary`;
  const btnDisabled = `${btnBase} border border-outline-variant text-outline cursor-not-allowed opacity-50`;

  // Build visible page list: always show first, last, current ±1
  const range = new Set([1, pages, page, page - 1, page + 1].filter(p => p >= 1 && p <= pages));
  const sorted = [...range].sort((a, b) => a - b);

  const withEllipsis = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) withEllipsis.push('...');
    withEllipsis.push(sorted[i]);
  }

  return (
    <div className="mt-stack-lg flex justify-center items-center gap-2 flex-wrap">
      <button className={page === 1 ? btnDisabled : btnIdle} onClick={() => onChange(page - 1)} disabled={page === 1}>
        <span className="material-symbols-outlined">chevron_left</span>
      </button>
      {withEllipsis.map((item, i) =>
        item === '...'
          ? <span key={`ellipsis-${i}`} className="px-2 text-on-surface-variant">...</span>
          : <button key={item} className={item === page ? btnActive : btnIdle} onClick={() => onChange(item)}>{item}</button>
      )}
      <button className={page === pages ? btnDisabled : btnIdle} onClick={() => onChange(page + 1)} disabled={page === pages}>
        <span className="material-symbols-outlined">chevron_right</span>
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const LIMIT = 12;

export default function Catalog() {
  const c = useSiteContent('properties');
  const { operations, propertyTypes } = useCatalogs();
  const [properties, setProperties] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters (pending = lo que el usuario edita, applied = lo que se manda a la API)
  const [pending, setPending] = useState({ operation: '', type: '', search: '' });
  const [applied, setApplied] = useState({ operation: '', type: '', search: '' });
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: LIMIT };
    if (applied.operation) params.operation = applied.operation;
    if (applied.type) params.type = applied.type;
    if (applied.search) params.search = applied.search;

    api.get('/properties', { params })
      .then(res => {
        setProperties(res.data.properties);
        setTotal(res.data.total);
        setPages(res.data.pages);
      })
      .catch(() => {
        setProperties([]);
        setTotal(0);
        setPages(1);
      })
      .finally(() => setLoading(false));
  }, [applied, page]);

  function handleFilter(e) {
    e.preventDefault();
    setApplied({ ...pending });
    setPage(1);
  }

  function handleClear() {
    const empty = { operation: '', type: '', search: '' };
    setPending(empty);
    setApplied(empty);
    setPage(1);
  }

  function handlePageChange(p) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const hasActiveFilters = applied.operation || applied.type || applied.search;

  return (
    <div className="bg-background text-on-background font-body-md antialiased min-h-screen flex flex-col">
      <Seo
        title="Propiedades en venta y alquiler"
        description="Mirá todas las propiedades disponibles: casas, departamentos, locales, oficinas y terrenos en venta y alquiler en CABA."
        path="/propiedades"
      />
      <TopNavBar />

      <main className="flex-grow max-w-[1280px] mx-auto w-full px-margin-mobile md:px-margin-desktop">

        {/* Hero */}
        <section className="py-stack-lg border-b border-outline-variant">
          <h1 className="font-headline-xl text-headline-xl text-primary mb-4">
            {c.title}
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
            {c.subtitle}
          </p>
        </section>

        {/* Filter Bar: ANTES quedaba fijo (sticky top-[97px]) debajo del navbar al hacer
            scroll (fix 28/07/2026 de un bug de superposición con el navbar). El cliente
            pidió sacar el sticky (04/08/2026): ahora scrollea normal con el resto de la
            página, sin quedarse pegado en pantalla. */}
        <section className="py-stack-sm bg-background">
          <form
            className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-4 flex flex-wrap gap-4 items-end"
            onSubmit={handleFilter}
          >
            {/* Operación */}
            <div className="flex-1 min-w-[130px]">
              <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Operación</label>
              <select
                className="w-full bg-surface-container rounded-lg border-none text-body-md focus:ring-2 focus:ring-primary h-12 px-3"
                value={pending.operation}
                onChange={e => setPending(p => ({ ...p, operation: e.target.value }))}
              >
                <option value="">Todas</option>
                {operations.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Tipo */}
            <div className="flex-1 min-w-[150px]">
              <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Tipo de Propiedad</label>
              <select
                className="w-full bg-surface-container rounded-lg border-none text-body-md focus:ring-2 focus:ring-primary h-12 px-3"
                value={pending.type}
                onChange={e => setPending(p => ({ ...p, type: e.target.value }))}
              >
                <option value="">Cualquiera</option>
                {propertyTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Buscar */}
            <div className="flex-[2] min-w-[180px]">
              <label className="block font-label-md text-label-md text-on-surface-variant mb-2">Buscar</label>
              <input
                className="w-full bg-surface-container rounded-lg border-none text-body-md focus:ring-2 focus:ring-primary h-12 px-3 placeholder:text-outline"
                placeholder="Barrio, ciudad, título..."
                type="text"
                value={pending.search}
                onChange={e => setPending(p => ({ ...p, search: e.target.value }))}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                className="bg-primary text-on-primary h-12 px-6 rounded-lg font-label-md hover:opacity-90 flex items-center gap-2 transition-opacity"
                type="submit"
              >
                <span className="material-symbols-outlined text-[20px]">filter_list</span>
                Filtrar
              </button>
              {hasActiveFilters && (
                <button
                  className="h-12 px-4 rounded-lg font-label-md text-label-md border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-colors flex items-center gap-1"
                  type="button"
                  onClick={handleClear}
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                  Limpiar
                </button>
              )}
            </div>
          </form>

          {/* Result count */}
          {!loading && (
            <p className="mt-3 font-label-md text-label-md text-on-surface-variant">
              {total === 0
                ? 'Sin resultados'
                : `${total} propiedad${total !== 1 ? 'es' : ''} encontrada${total !== 1 ? 's' : ''}`
              }
              {hasActiveFilters && (
                <button className="ml-2 text-secondary underline" onClick={handleClear}>Borrar filtros</button>
              )}
            </p>
          )}
        </section>

        {/* Grid */}
        <section className="py-stack-lg">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
              {Array.from({ length: LIMIT }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : properties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <span className="material-symbols-outlined text-[64px] text-outline">search_off</span>
              <h2 className="font-headline-md text-headline-md text-primary">No hay propiedades disponibles</h2>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">
                {hasActiveFilters
                  ? 'No encontramos propiedades con esos filtros. Intentá con otros criterios.'
                  : 'Todavía no hay propiedades publicadas. Volvé pronto.'}
              </p>
              {hasActiveFilters && (
                <button
                  className="bg-primary text-on-primary px-6 py-3 rounded font-label-md text-label-md hover:bg-primary-container transition-colors"
                  onClick={handleClear}
                >
                  Ver todas las propiedades
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
                {properties.map(p => <PropertyCard key={p.id} property={p} />)}
              </div>
              <Pagination page={page} pages={pages} onChange={handlePageChange} />
            </>
          )}
        </section>

      </main>

      <Footer />
    </div>
  );
}
