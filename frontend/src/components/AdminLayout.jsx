import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// MessageSquare y BarChart3 comentados: eran los íconos de Consultas y Reportes (ver abajo)
import { LayoutDashboard, Building2, Tags, ChevronDown, /* MessageSquare, BarChart3, */ Settings, LogOut } from 'lucide-react';

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

  if (!children) {
    return (
      <NavLink to={to} className={linkClass}>
        <Icon size={18} />
        {label}
      </NavLink>
    );
  }

  return (
    <div>
      {/* Un solo rectángulo clickeable: navega Y abre/cierra la sub-lista. La flecha
          va dentro del mismo botón, solo como indicador (no hace falta tocarla). */}
      <NavLink
        to={to}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={linkClass}
      >
        <Icon size={18} />
        {label}
        <ChevronDown size={16} className={`ml-auto transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
      </NavLink>

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

  const handleLogout = () => { logout(); navigate('/admin/login'); };

  // bg-gray-100 reemplazado por token del design system Manhattan Prestige
  return (
    <div className="flex h-screen bg-surface-container-low">
      <aside className="w-64 bg-primary text-white flex flex-col">
        <div className="p-6 border-b border-primary-container">
          {/* font-serif y text-gold reemplazados por Manhattan Prestige Design System */}
          <h1 className="font-headline-md text-headline-md text-on-primary">Manhattan</h1>
          <p className="text-xs text-on-primary-container mt-1">Inmobiliaria</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
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
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
