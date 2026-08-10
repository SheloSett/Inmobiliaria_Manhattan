import { Link } from 'react-router-dom';
import { useSiteContent } from '../hooks/useSiteContent';
import SitePageShell from '../components/SitePageShell';

// Mapa del Sitio. El título y el subtítulo son editables desde Ajustes → Contenido.
// La lista de enlaces apunta a las páginas reales del sitio (se mantiene en código,
// no en el CMS, para que siempre refleje las rutas existentes).
const SITE_LINKS = [
  { label: 'Inicio', to: '/', icon: 'home' },
  { label: 'Propiedades', to: '/propiedades', icon: 'list_alt' },
  { label: 'Tasaciones', to: '/tasaciones', icon: 'request_quote' },
  { label: 'Nosotros', to: '/nosotros', icon: 'groups' },
  { label: 'Contacto', to: '/contacto', icon: 'mail' },
  { label: 'Postulaciones', to: '/postulaciones', icon: 'badge' },
  { label: 'Política de Privacidad', to: '/privacidad', icon: 'privacy_tip' },
  { label: 'Términos y Condiciones', to: '/terminos', icon: 'gavel' },
  { label: 'Centro de Ayuda', to: '/ayuda', icon: 'help' },
];

export default function Sitemap() {
  const c = useSiteContent('sitemap');

  return (
    <SitePageShell>
      <header className="mb-stack-lg">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-xl md:text-headline-xl text-primary mb-2">{c.title}</h1>
        {c.subtitle && <p className="font-body-lg text-body-lg text-on-surface-variant">{c.subtitle}</p>}
      </header>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SITE_LINKS.map(({ label, to, icon }) => (
          <li key={to}>
            <Link
              to={to}
              className="flex items-center gap-3 p-4 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary hover:text-primary transition-colors font-body-md text-body-md"
            >
              <span className="material-symbols-outlined text-[22px] text-secondary">{icon}</span>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </SitePageShell>
  );
}
