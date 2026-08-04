import { useState } from 'react';
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// MessageSquare y BarChart3 comentados: eran los íconos de Consultas y Reportes (ver abajo)
import { LayoutDashboard, Building2, Tags, ChevronDown, /* MessageSquare, BarChart3, */ Settings, LogOut, Menu, X } from 'lucide-react';

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  // Propiedades ahora tiene un sub-ítem "Catálogos" (tipos de operación/propiedad y
  // amenities), que antes era una pestaña de Ajustes (21/07/2026).
  {
    to: '/admin/properties',
    icon: Building2,
    label: 'Propiedades',
    children: [
      { to: '/admin/catalogs', icon: Tags, label: 'Catálogos' },
    ],
  },
  // Paneles de Consultas y Reportes comentados (no eliminados, según regla del proyecto).
  // Motivo: el cliente pidió quitarlos (15/07/2026) porque no cumplen ninguna función:
  // las solicitudes van directo por WhatsApp y los reportes nunca se conectaron a datos.
  // { to: '/admin/contacts', icon: MessageSquare, label: 'Consultas' },
  // { to: '/admin/reports', icon: BarChart3, label: 'Reportes' },
  { to: '/admin/settings', icon: Settings, label: 'Ajustes' },
];

// Clases compartidas de los links del nav (padre e ítems sin hijos).
const linkClass = ({ isActive }) =>
  `flex items-center gap-3 px-4 py-3 rounded font-label-md text-label-md transition ${
    isActive ? 'bg-secondary text-on-secondary' : 'text-on-primary-container hover:bg-primary-container hover:text-on-primary'
  }`;

// Ítem del menú. Si tiene `children`, muestra un chevron para plegar/desplegar la
// sub-lista (arranca abierta). El label sigue navegando; el chevron solo colapsa.
function NavItem({ item }) {
  const { to, icon: Icon, label, children } = item;
  const [open, setOpen] = useState(true);
  const location = useLocation();

  if (!children) {
    return (
      <NavLink to={to} className={linkClass}>
        <Icon size={18} />
        {label}
      </NavLink>
    );
  }

  // Antes la fila entera (label + flecha) era un único <NavLink>: en mobile, tocar la
  // flecha para desplegar el submenú también navegaba a Propiedades Y cerraba el
  // drawer (el <nav> padre lo cierra al detectar cualquier click adentro) — había que
  // reabrir el menú para recién ahí ver "Catálogos" ya desplegado. Ahora son dos zonas
  // independientes: el link navega, el botón de la flecha solo pliega/despliega
  // (stopPropagation para no navegar ni cerrar el drawer). Fix 04/08/2026.
  const isActive = location.pathname.startsWith(to);
  const rowClass = isActive
    ? 'bg-secondary text-on-secondary'
    : 'text-on-primary-container hover:bg-primary-container hover:text-on-primary';

  return (
    <div>
      <div className={`flex items-stretch rounded transition ${rowClass}`}>
        <Link to={to} className="flex-1 flex items-center gap-3 px-4 py-3 font-label-md text-label-md min-w-0">
          <Icon size={18} />
          {label}
        </Link>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
          aria-expanded={open}
          aria-label={open ? `Contraer ${label}` : `Desplegar ${label}`}
          className="px-4 flex items-center flex-shrink-0"
        >
          <ChevronDown size={16} className={`transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
        </button>
      </div>

      {open && (
        <div className="mt-1 ml-5 pl-4 border-l border-primary-container space-y-1">
          {children.map(({ to: childTo, icon: ChildIcon, label: childLabel }) => (
            <NavLink
              key={childTo}
              to={childTo}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded font-label-md text-sm transition ${
                  isActive ? 'bg-secondary text-on-secondary' : 'text-on-primary-container hover:bg-primary-container hover:text-on-primary'
                }`
              }
            >
              <ChildIcon size={15} />
              {childLabel}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  // Drawer del sidebar en mobile (28/07/2026): en pantallas chicas el sidebar fijo de
  // 256px se comía casi toda la pantalla y aplastaba el contenido. Ahora en mobile es un
  // panel deslizable (hamburguesa) y el contenido ocupa todo el ancho; en desktop (lg+)
  // el sidebar queda estático como siempre.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = () => setSidebarOpen(false);

  const handleLogout = () => { logout(); navigate('/admin/login'); };

  // bg-gray-100 reemplazado por token del design system Manhattan Prestige
  //
  // Fix scroll en mobile (04/08/2026): antes el shell era h-screen con <main
  // overflow-y-auto> adentro — dos áreas de scroll superpuestas (la página y el panel).
  // En mobile Safari eso hace que el swipe no sepa a cuál agarrar y cueste varios
  // intentos llegar al principio/final. Ahora la página scrollea normal (min-h-screen,
  // sin overflow-y-auto en <main>) y el sidebar queda fijo por su cuenta: "fixed" en
  // mobile (ya lo era, para el drawer) y "sticky" en desktop.
  return (
    <div className="flex min-h-screen bg-surface-container-low">
      {/* Fondo oscuro detrás del drawer (solo mobile, al tocar cierra) */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={closeSidebar} aria-hidden="true" />
      )}

      {/* Sidebar: drawer deslizable en mobile (fixed), estático en desktop (lg:static). */}
      <aside
        className={`w-64 bg-primary text-white flex flex-col fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:z-auto lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-6 border-b border-primary-container flex items-start justify-between">
          <div>
            {/* font-serif y text-gold reemplazados por Manhattan Prestige Design System */}
            <h1 className="font-headline-md text-headline-md text-on-primary">Manhattan</h1>
            <p className="text-xs text-on-primary-container mt-1">Inmobiliaria</p>
          </div>
          {/* Cerrar el drawer (solo mobile) */}
          <button className="lg:hidden text-on-primary-container hover:text-on-primary -mr-1" onClick={closeSidebar} aria-label="Cerrar menú">
            <X size={22} />
          </button>
        </div>
        {/* onClick cierra el drawer al tocar cualquier link (mobile); en desktop no hace nada. */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto" onClick={closeSidebar}>
          {navItems.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </nav>
        <div className="p-4 border-t border-primary-container">
          <p className="font-label-md text-label-md text-on-primary-container mb-3">{admin?.name}</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-on-primary-container hover:text-on-primary font-label-md text-label-md transition"
          >
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Columna de contenido */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra superior con hamburguesa (solo mobile) */}
        <header className="lg:hidden sticky top-0 z-30 bg-primary text-on-primary flex items-center gap-3 px-4 h-14 shrink-0">
          <button onClick={() => setSidebarOpen(true)} aria-label="Abrir menú">
            <Menu size={24} />
          </button>
          <span className="font-headline-md text-headline-md text-on-primary">Manhattan</span>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
