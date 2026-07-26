import { useState } from 'react';
import { Link } from 'react-router-dom';

// Navbar único para todas las páginas públicas (Manhattan Prestige Design System).
// Centralizado acá para garantizar que el navbar sea idéntico en todo el sitio.
const NAV_LINKS = [
  { label: 'Inicio', to: '/' },
  { label: 'Propiedades', to: '/propiedades' },
  { label: 'Tasaciones', to: '/tasaciones' },
  { label: 'Nosotros', to: '/nosotros' },
  { label: 'Contacto', to: '/contacto' },
];

const ACTIVE_CLASS = 'font-label-md text-label-md text-secondary border-b-2 border-secondary pb-1';
const INACTIVE_CLASS = 'font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors duration-200 px-2 py-1 rounded';

export default function PublicNavbar({ active }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="bg-surface-container-lowest border-b border-outline-variant shadow-sm w-full sticky top-0 z-50">
      <div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 max-w-[1280px] mx-auto">
        <Link className="font-headline-xl text-primary font-bold tracking-tight" to="/">Manhattan</Link>
        <nav className="hidden md:flex items-center space-x-gutter">
          {NAV_LINKS.map(({ label, to }) => (
            <Link key={to} className={active === label ? ACTIVE_CLASS : INACTIVE_CLASS} to={to}>
              {label}
            </Link>
          ))}
        </nav>
        {/* Menú mobile */}
        <button
          type="button"
          aria-label="Abrir menú"
          className="md:hidden text-primary p-2"
          onClick={() => setMobileOpen(o => !o)}
        >
          <span className="material-symbols-outlined">{mobileOpen ? 'close' : 'menu'}</span>
        </button>
      </div>
      {mobileOpen && (
        <nav className="md:hidden border-t border-outline-variant bg-surface-container-lowest px-margin-mobile py-stack-sm flex flex-col gap-2">
          {NAV_LINKS.map(({ label, to }) => (
            <Link
              key={to}
              className={active === label
                ? 'font-label-md text-label-md text-secondary py-2'
                : 'font-label-md text-label-md text-on-surface-variant hover:text-primary py-2'}
              to={to}
              onClick={() => setMobileOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
