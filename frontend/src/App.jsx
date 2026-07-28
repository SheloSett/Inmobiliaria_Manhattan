import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Páginas públicas
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import PropertyDetail from './pages/PropertyDetail';
import ContactPage from './pages/Contact';
import AboutUs from './pages/AboutUs';
import Valuations from './pages/Valuations';
import SearchResults from './pages/SearchResults';
// Páginas informativas del footer (contenido editable desde Ajustes → Contenido).
import LegalPage from './pages/LegalPage';
import Sitemap from './pages/Sitemap';
import Help from './pages/Help';

// Páginas admin
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProperties from './pages/admin/AdminProperties';
import AdminPropertyForm from './pages/admin/AdminPropertyForm';
// Catálogos: pasó de ser pestaña de Ajustes a sub-ítem de Propiedades (ruta propia).
import AdminCatalogs from './pages/admin/AdminCatalogs';
// Imports de Consultas y Reportes comentados (no eliminados, según regla del proyecto).
// Motivo: el cliente pidió quitar esos paneles del admin (15/07/2026) porque no cumplen
// ninguna función; sus rutas también quedaron comentadas más abajo.
// import AdminContacts from './pages/admin/AdminContacts';
// import AdminReports from './pages/admin/AdminReports';
import AdminSettings from './pages/admin/AdminSettings';

function PrivateRoute({ children }) {
  const { admin, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  return admin ? children : <Navigate to="/admin/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          {/* Públicas */}
          <Route path="/" element={<Home />} />
          {/* Búsqueda con mapa (template search_results): el buscador del hero navega acá */}
          <Route path="/buscar" element={<SearchResults />} />
          <Route path="/propiedades" element={<Catalog />} />
          <Route path="/propiedades/:id" element={<PropertyDetail />} />
          <Route path="/contacto" element={<ContactPage />} />
          <Route path="/nosotros" element={<AboutUs />} />
          <Route path="/tasaciones" element={<Valuations />} />
          {/* Páginas del footer (contenido editable desde el CMS). LegalPage es genérica
              y se reutiliza para Privacidad y Términos vía la prop pageKey. */}
          <Route path="/privacidad" element={<LegalPage pageKey="privacy" />} />
          <Route path="/terminos" element={<LegalPage pageKey="terms" />} />
          <Route path="/mapa-del-sitio" element={<Sitemap />} />
          <Route path="/ayuda" element={<Help />} />

          {/* Admin */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="properties" element={<AdminProperties />} />
            {/* Creación/edición de propiedad como página completa (template
                admin_create_Properties de Stitch); reemplaza al modal anterior */}
            <Route path="properties/new" element={<AdminPropertyForm />} />
            <Route path="properties/:id/edit" element={<AdminPropertyForm />} />
            {/* Catálogos (tipos de operación, tipos de propiedad, amenities) como
                sub-ítem de Propiedades en el sidebar */}
            <Route path="catalogs" element={<AdminCatalogs />} />
            {/* Rutas de Consultas y Reportes comentadas (no eliminadas, según regla del
                proyecto). Motivo: el cliente pidió quitar esos paneles (15/07/2026). */}
            {/* <Route path="contacts" element={<AdminContacts />} /> */}
            {/* <Route path="reports" element={<AdminReports />} /> */}
            <Route path="settings" element={<AdminSettings />} />
            {/* Cualquier ruta admin desconocida (ej: las viejas /admin/contacts y
                /admin/reports) redirige al dashboard en vez de mostrar contenido vacío */}
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
