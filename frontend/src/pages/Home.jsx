import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import { useSiteContent } from '../hooks/useSiteContent';
import { useCatalogs } from '../hooks/useCatalogs';
import { propertyThumbnail } from '../utils/media';
import api from '../services/api';
// Los textos e imágenes de esta página ahora son editables desde el admin
// (Ajustes → Contenido → Inicio). Los valores por defecto —el contenido original
// hardcodeado— viven en frontend/src/config/siteContent.js; nada se perdió.

const OPERATION_LABELS = { SALE: 'Venta', RENT: 'Alquiler' };

// COMENTADO: "properties" era un array vacío hardcodeado desde el scaffold inicial,
// por eso las propiedades marcadas como "Destacada en la Home" en el admin nunca
// aparecían acá. Motivo del fix (20/07/2026): ahora se cargan de verdad desde la API
// (GET /properties?featured=true) en el componente Home, ver useEffect más abajo.
// const properties = [];

// COMENTADO: los testimonios ya no son un array fijo vacío; ahora se editan/agregan
// desde el CMS (Ajustes → Contenido → Inicio → Testimonios) y se leen con
// c.testimonials en el componente. Los valores por defecto viven en siteContent.js.
// const testimonials = [];

// Estilos de avatar que rotan por índice, para que las iniciales no sean todas iguales.
const TESTIMONIAL_AVATARS = [
  { bg: 'bg-primary-container', text: 'text-on-primary-container' },
  { bg: 'bg-secondary', text: 'text-on-secondary' },
  { bg: 'bg-tertiary-container', text: 'text-on-tertiary-container' },
];

// Mapea una propiedad de la API a las props que espera <PropertyCard/>.
function mapPropertyToCard(property) {
  // Foto principal → primera foto → poster del video (si solo hay videos).
  const primaryImg = propertyThumbnail(property.images);
  const isRent = property.operation === 'RENT';
  return {
    id: property.id,
    status: property.operationLabel ?? OPERATION_LABELS[property.operation] ?? property.operation,
    statusStyle: isRent ? 'bg-primary text-on-primary' : 'bg-secondary text-on-secondary',
    price: `${property.currency} $${Number(property.price).toLocaleString('es-AR')}`,
    priceSuffix: isRent ? '/mes' : '',
    title: property.title,
    address: [property.address, property.neighborhood || property.city].filter(Boolean).join(', '),
    beds: property.bedrooms ?? '-',
    baths: property.bathrooms ?? '-',
    area: property.area ? `${property.area} m²` : '-',
    img: primaryImg ?? 'https://placehold.co/600x400?text=Manhattan',
    alt: property.title,
  };
}

function PropertyCard({ id, status, statusStyle, price, priceSuffix, title, address, beds, baths, area, img, alt }) {
  return (
    <Link
      to={`/propiedades/${id}`}
      className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden hover:shadow-[0_8px_30px_rgba(0,23,43,0.06)] transition-all duration-300 group flex flex-col"
    >
      <div className="relative h-64 overflow-hidden">
        <img alt={alt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={img} />
        <div className={`absolute top-4 left-4 px-3 py-1 rounded font-label-md text-xs shadow-sm ${statusStyle}`}>{status}</div>
      </div>
      <div className="p-stack-md flex flex-col flex-grow">
        <div className="font-price-display text-price-display text-primary mb-2">
          {price}
          {priceSuffix && <span className="font-body-md text-on-surface-variant font-normal">{priceSuffix}</span>}
        </div>
        <h4 className="font-body-lg text-on-surface font-semibold mb-1 truncate">{title}</h4>
        <p className="font-body-md text-on-surface-variant flex items-center gap-1 mb-stack-sm truncate">
          <span className="material-symbols-outlined text-[18px]">location_on</span>
          {address}
        </p>
        <div className="mt-auto pt-4 border-t border-surface-variant flex justify-between text-on-surface-variant">
          <div className="flex items-center gap-1" title="Dormitorios">
            <span className="material-symbols-outlined text-[20px]">bed</span>
            <span className="font-label-md">{beds}</span>
          </div>
          <div className="flex items-center gap-1" title="Baños">
            <span className="material-symbols-outlined text-[20px]">shower</span>
            <span className="font-label-md">{baths}</span>
          </div>
          <div className="flex items-center gap-1" title="Metros Cuadrados">
            <span className="material-symbols-outlined text-[20px]">straighten</span>
            <span className="font-label-md">{area}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function TestimonialCard({ name, initial, avatarBg, avatarText, date, text }) {
  return (
    <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-sm border border-outline-variant flex flex-col">
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${avatarBg} ${avatarText}`}>{initial}</div>
        <div>
          <h4 className="font-label-md text-on-surface">{name}</h4>
          <span className="text-xs text-on-surface-variant">{date}</span>
        </div>
      </div>
      <div className="flex text-[#FBBC05] mb-4 text-[20px]">
        {[...Array(5)].map((_, i) => (
          <span key={i} className="material-symbols-outlined fill-1">star</span>
        ))}
      </div>
      <p className="font-body-md text-on-surface-variant">{text}</p>
    </div>
  );
}

export default function Home() {
  const c = useSiteContent('home');
  const { operations, propertyTypes } = useCatalogs();
  const navigate = useNavigate();

  // Estado del buscador del hero. Antes los selects/el input no hacían nada; ahora
  // arman los filtros y al buscar navegan a la vista de mapa /buscar (fix 21/07/2026).
  const [searchForm, setSearchForm] = useState({ operation: '', type: '', location: '' });
  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchForm.operation) params.set('operation', searchForm.operation);
    if (searchForm.type) params.set('type', searchForm.type);
    if (searchForm.location) params.set('search', searchForm.location);
    navigate(`/buscar?${params.toString()}`);
  };

  // Propiedades destacadas: se traen de GET /properties?featured=true. Antes esta
  // sección siempre mostraba "No hay propiedades disponibles aún" sin importar lo que
  // se marcara en el admin, porque nunca se conectó a la API (fix 20/07/2026).
  const [properties, setProperties] = useState([]);
  useEffect(() => {
    api.get('/properties', { params: { featured: true, limit: 6 } })
      .then(res => setProperties(res.data.properties.map(mapPropertyToCard)))
      .catch(() => setProperties([]));
  }, []);

  return (
    <div className="bg-background text-on-background font-body-md antialiased">

      {/* TopNavBar: reemplazado por el componente compartido PublicNavbar para que el navbar
          sea idéntico en todas las páginas públicas. El markup inline original quedó comentado
          al final de este archivo. */}
      <PublicNavbar active="Inicio" />

      {/* Hero Section */}
      <section className="relative w-full h-[600px] flex items-center justify-center bg-primary">
        {/* src antes hardcodeado; ahora c.heroImage (default = misma imagen) */}
        <img
          alt="Cityscape background"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
          src={c.heroImage}
        />
        <div className="relative z-10 w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop text-center flex flex-col items-center">
          <h2 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-xl md:text-headline-xl text-on-primary font-bold mb-2 tracking-tight">
            {c.heroTitle}
          </h2>
          <p className="font-body-lg text-body-lg text-on-primary-container mb-stack-lg max-w-2xl">
            {c.heroSubtitle}
          </p>
          {/* Search Bar — antes los campos no hacían nada; ahora es un form controlado
              que navega a la vista de mapa /buscar con los filtros elegidos. */}
          <form onSubmit={handleSearch} className="bg-surface-container-lowest p-stack-sm rounded-xl shadow-[0_4px_24px_rgba(0,23,43,0.08)] w-full max-w-4xl mx-auto flex flex-col md:flex-row gap-unit">
            <div className="flex-1 relative border border-outline-variant rounded bg-surface">
              <select
                className="w-full h-12 pl-4 pr-10 bg-transparent border-none appearance-none font-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent rounded"
                value={searchForm.operation}
                onChange={(e) => setSearchForm((f) => ({ ...f, operation: e.target.value }))}
              >
                <option value="">Venta y Alquiler</option>
                {operations.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-3 text-outline pointer-events-none">keyboard_arrow_down</span>
            </div>
            <div className="flex-1 relative border border-outline-variant rounded bg-surface">
              <select
                className="w-full h-12 pl-4 pr-10 bg-transparent border-none appearance-none font-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-transparent rounded"
                value={searchForm.type}
                onChange={(e) => setSearchForm((f) => ({ ...f, type: e.target.value }))}
              >
                <option value="">Todos los tipos</option>
                {propertyTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-3 text-outline pointer-events-none">keyboard_arrow_down</span>
            </div>
            <div className="flex-1 relative border border-outline-variant rounded bg-surface">
              <input
                className="w-full h-12 pl-4 pr-10 bg-transparent border-none font-body-md text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary focus:border-transparent rounded"
                placeholder="Ubicación"
                type="text"
                value={searchForm.location}
                onChange={(e) => setSearchForm((f) => ({ ...f, location: e.target.value }))}
              />
              <span className="material-symbols-outlined absolute right-3 top-3 text-outline pointer-events-none">location_on</span>
            </div>
            <button type="submit" className="bg-primary text-on-primary px-8 h-12 rounded font-label-md text-label-md hover:opacity-90 transition-all shrink-0 flex items-center justify-center gap-2">
              Buscar
            </button>
          </form>
        </div>
      </section>

      {/* Featured Properties Section */}
      <section className="w-full py-stack-lg bg-surface">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="text-center mb-stack-lg">
            <span className="font-label-md text-label-md text-secondary tracking-widest uppercase mb-unit block">{c.featuredEyebrow}</span>
            <h3 className="font-headline-lg text-headline-lg text-primary font-bold mb-unit">{c.featuredTitle}</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">{c.featuredSubtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
            {properties.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <span className="material-symbols-outlined text-[48px] text-outline mb-3">domain_disabled</span>
                <p className="font-label-md text-label-md text-on-surface-variant">No hay propiedades disponibles aún.</p>
              </div>
            ) : (
              properties.map((prop) => (
                <PropertyCard key={prop.id} {...prop} />
              ))
            )}
          </div>
          <div className="mt-stack-lg text-center">
            <Link
              to="/propiedades"
              className="bg-surface border border-outline-variant text-primary px-8 py-3 rounded font-label-md text-label-md hover:bg-surface-container-low hover:border-primary transition-all inline-flex items-center gap-2"
            >
              Ver todas las propiedades
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Sell Property Section */}
      <section className="w-full py-stack-lg bg-surface-container-lowest border-t border-outline-variant">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="flex flex-col lg:flex-row gap-gutter items-center">
            <div className="flex-1">
              <span className="font-label-md text-label-md text-secondary tracking-widest uppercase mb-unit block">{c.sellEyebrow}</span>
              <h3 className="font-headline-lg text-headline-lg text-primary font-bold mb-4">{c.sellTitle}</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-4">{c.sellText1}</p>
              <p className="font-body-md text-body-md text-on-surface-variant mb-6">{c.sellText2}</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 font-body-md text-on-surface"><span className="material-symbols-outlined text-secondary">check_circle</span> {c.sellBullet1}</li>
                <li className="flex items-center gap-2 font-body-md text-on-surface"><span className="material-symbols-outlined text-secondary">check_circle</span> {c.sellBullet2}</li>
                <li className="flex items-center gap-2 font-body-md text-on-surface"><span className="material-symbols-outlined text-secondary">check_circle</span> {c.sellBullet3}</li>
              </ul>
              {/* "Más información" ahora lleva a la página de Tasaciones (antes iba a "#"). */}
              <Link className="bg-secondary text-on-secondary px-6 py-3 rounded font-label-md text-label-md hover:opacity-90 transition-all inline-block shadow-sm" to="/tasaciones">Más información</Link>
            </div>
            <div className="flex-1 w-full">
              {/* src antes hardcodeado; ahora c.sellImage (default = misma imagen) */}
              <img
                alt="Real Estate Transaction"
                className="w-full h-auto rounded-xl shadow-md object-cover"
                src={c.sellImage}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="w-full py-stack-lg bg-surface border-t border-outline-variant">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="text-center mb-stack-lg">
            <h3 className="font-headline-lg text-headline-lg text-primary font-bold mb-unit">{c.testimonialsTitle}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {/* Testimonios desde el CMS (c.testimonials). La inicial del avatar se saca
                del nombre y el color rota por índice (TESTIMONIAL_AVATARS). */}
            {(c.testimonials || []).length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <span className="material-symbols-outlined text-[48px] text-outline mb-3">rate_review</span>
                <p className="font-label-md text-label-md text-on-surface-variant">Aún no hay testimonios publicados.</p>
              </div>
            ) : (
              c.testimonials.map((t, i) => {
                const avatar = TESTIMONIAL_AVATARS[i % TESTIMONIAL_AVATARS.length];
                return (
                  <TestimonialCard
                    key={`${t.name}-${i}`}
                    name={t.name}
                    date={t.date}
                    text={t.text}
                    initial={(t.name || '?').trim().charAt(0).toUpperCase()}
                    avatarBg={avatar.bg}
                    avatarText={avatar.text}
                  />
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Footer: reemplazado por el componente compartido PublicFooter para que el footer
          sea idéntico en todas las páginas públicas. El markup inline original quedó comentado
          al final de este archivo. */}
      <PublicFooter />

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CÓDIGO ORIGINAL COMENTADO (no eliminado, según regla del proyecto).
// Motivo: el navbar y el footer inline de esta página fueron reemplazados por los
// componentes compartidos <PublicNavbar/> y <PublicFooter/> para garantizar que
// sean idénticos en todas las páginas públicas (requisito del rediseño).
// ─────────────────────────────────────────────────────────────────────────────
//
// Navbar original:
//
//      <header className="bg-surface-container-lowest border-b border-outline-variant shadow-sm w-full top-0 z-50">
//        <div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 max-w-container-max mx-auto">
//          <Link className="font-headline-xl text-primary font-bold tracking-tight" to="/">Manhattan</Link>
//          <nav className="hidden md:flex items-center space-x-gutter">
//            <Link className="font-label-md text-label-md text-secondary border-b-2 border-secondary pb-1 opacity-80 transition-all" to="/">Inicio</Link>
//            <Link className="font-label-md text-label-md text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors duration-200 px-2 py-1 rounded" to="/propiedades">Propiedades</Link>
//            <a className="font-label-md text-label-md text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors duration-200 px-2 py-1 rounded" href="#">Tasaciones</a>
//            <a className="font-label-md text-label-md text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors duration-200 px-2 py-1 rounded" href="#">Nosotros</a>
//            <a className="font-label-md text-label-md text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors duration-200 px-2 py-1 rounded" href="#">Blog</a>
//            <Link className="font-label-md text-label-md text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors duration-200 px-2 py-1 rounded" to="/contacto">Contacto</Link>
//          </nav>
//          {/* Botones Login y Publicar eliminados a pedido del usuario */}
//        </div>
//      </header>
//
// Nota: el link "Blog" no se trasladó al navbar compartido porque no existe página
// ni template de Blog; los templates nuevos del cliente tampoco lo incluyen.
//
// Footer original:
//
//      <footer className="bg-primary text-on-primary">
//        <div className="w-full px-margin-mobile md:px-margin-desktop py-stack-lg flex flex-col md:flex-row justify-between items-center max-w-container-max mx-auto gap-stack-md">
//          <div className="font-headline-md text-headline-md font-bold text-on-primary tracking-tight">Manhattan</div>
//          <nav className="flex flex-wrap justify-center gap-x-gutter gap-y-unit">
//            <a className="font-label-md text-label-md text-on-primary-container opacity-80 hover:opacity-100 hover:text-secondary-fixed transition-opacity" href="#">Privacidad</a>
//            <a className="font-label-md text-label-md text-on-primary-container opacity-80 hover:opacity-100 hover:text-secondary-fixed transition-opacity" href="#">Términos</a>
//            <a className="font-label-md text-label-md text-on-primary-container opacity-80 hover:opacity-100 hover:text-secondary-fixed transition-opacity" href="#">Mapa del Sitio</a>
//            <a className="font-label-md text-label-md text-on-primary-container opacity-80 hover:opacity-100 hover:text-secondary-fixed transition-opacity" href="#">Ayuda</a>
//          </nav>
//          <div className="font-body-md text-body-md text-on-primary-container text-center md:text-right">
//            © 2024 Manhattan Negocios Inmobiliarios. Todos los derechos reservados.
//          </div>
//        </div>
//      </footer>
