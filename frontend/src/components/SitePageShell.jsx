import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';

// Layout base para páginas informativas simples (Privacidad, Términos, Mapa del Sitio,
// Ayuda): navbar + footer compartidos y un contenedor centrado. Mantiene la coherencia
// del design system Manhattan Prestige en todo el sitio, como pidió el cliente.
export default function SitePageShell({ children, narrow = true }) {
  return (
    <div className="bg-background text-on-background font-body-md antialiased min-h-screen flex flex-col">
      <PublicNavbar />
      <main className={`flex-grow w-full ${narrow ? 'max-w-[880px]' : 'max-w-[1280px]'} mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg`}>
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
