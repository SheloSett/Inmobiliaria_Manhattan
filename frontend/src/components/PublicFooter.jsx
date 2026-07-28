import { Link } from 'react-router-dom';
import { useSiteContent } from '../hooks/useSiteContent';

// Links legales del footer → ahora apuntan a páginas reales (antes iban a "#").
// El contenido de cada una es editable desde Ajustes → Contenido.
const LEGAL_LINKS = [
  { label: 'Privacidad', to: '/privacidad' },
  { label: 'Términos', to: '/terminos' },
  { label: 'Mapa del Sitio', to: '/mapa-del-sitio' },
  { label: 'Ayuda', to: '/ayuda' },
];

// Footer único para todas las páginas públicas (Manhattan Prestige Design System).
// Centralizado acá para garantizar que el footer sea idéntico en todo el sitio.
// Los textos (marca, descripción, email, copyright) y las redes sociales son editables
// desde el admin (Ajustes → Contenido → Footer). Sus valores por defecto —que son
// exactamente el contenido hardcodeado original— viven en config/siteContent.js, así
// que no se perdió nada: si el admin no edita, se ve el mismo texto de siempre.

// Íconos de marca (SVG inline, viewBox 24). Material Symbols no tiene logos de marcas,
// por eso se usan paths de simple-icons. Cada red define su ícono y su color de hover.
const NETWORKS = {
  instagram: {
    label: 'Instagram',
    path: 'M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z',
  },
  facebook: {
    label: 'Facebook',
    path: 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z',
  },
  whatsapp: {
    label: 'WhatsApp',
    path: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z',
  },
  tiktok: {
    label: 'TikTok',
    path: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  },
  linkedin: {
    label: 'LinkedIn',
    path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
  youtube: {
    label: 'YouTube',
    path: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  },
};

// Crédito del desarrollador. HARDCODEADO A PROPÓSITO: son datos del programador, NO
// deben ser editables desde el panel del admin, por eso no pasan por el CMS/siteContent.
// Para cambiarlos se edita este objeto y se rebuildea el frontend.
const DEV_CREDIT = {
  name: 'SheloSettDev',
  instagram: 'https://instagram.com/shelosettdev',
  email: 'shelosettdev@gmail.com',
  // Número de WhatsApp del dev (solo dígitos, con código de país). Si queda vacío,
  // el botón de WhatsApp del crédito no se muestra.
  // 1136557290 (local) → 54 (Argentina) + 9 (celular) + 1136557290.
  whatsapp: '5491136557290',
};

export default function PublicFooter() {
  const c = useSiteContent('footer');
  // Filtra redes con enlace válido y que tengan ícono conocido.
  const social = (c.social || []).filter((s) => s && s.url && NETWORKS[s.network]);

  return (
    <footer className="bg-primary w-full mt-stack-lg">
      <div className="max-w-[1280px] mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg">
        {/* Columnas: Marca (flexible) · Contacto (se adapta al largo del email) · Seguinos.
            Se usa flex en vez de grid fijo para que la columna del email tome el ancho que
            necesita y no corte el texto (21/07/2026). */}
        <div className="flex flex-col md:flex-row md:flex-wrap md:justify-between gap-stack-lg">
          {/* Marca + descripción */}
          <div className="flex-1 min-w-[240px] flex flex-col items-center md:items-start gap-2 text-center md:text-left">
            {/* Logo (si está cargado) + texto de marca, juntos. Antes: solo el texto. */}
            <div className="flex items-center gap-3">
              {c.logo && (
                <img src={c.logo} alt={c.brand || 'Manhattan'} className="h-20 w-auto object-contain bg-on-primary/95 rounded-lg p-2" />
              )}
              <span className="font-headline-xl font-bold text-on-primary">{c.brand}</span>
            </div>
            <p className="font-body-md text-body-md text-on-primary-container opacity-80 max-w-xs">
              {c.description}
            </p>
          </div>

          {/* Contacto (email). La columna se adapta al largo del email (whitespace-nowrap). */}
          <div className="flex flex-col items-center md:items-start gap-3">
            <h4 className="font-label-md text-label-md text-on-primary uppercase tracking-wider opacity-60">Contacto</h4>
            {c.email && (
              <a
                href={`mailto:${c.email}`}
                className="flex items-center gap-2 font-body-md text-body-md text-on-primary-container opacity-80 hover:opacity-100 hover:text-secondary transition-all whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[20px]">mail</span>
                {c.email}
              </a>
            )}
          </div>

          {/* Redes */}
          <div className="flex flex-col items-center md:items-start gap-3 min-w-[140px]">
            <h4 className="font-label-md text-label-md text-on-primary uppercase tracking-wider opacity-60">Seguinos</h4>
            {social.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {social.map(({ network, url }) => (
                  <a
                    key={network + url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={NETWORKS[network].label}
                    title={NETWORKS[network].label}
                    className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center hover:bg-secondary hover:text-on-secondary transition-colors"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d={NETWORKS[network].path} />
                    </svg>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Barra inferior: links legales + copyright */}
        <div className="border-t border-on-primary/10 mt-stack-md pt-stack-md flex flex-col md:flex-row-reverse justify-between items-center gap-4">
          {/* Links legales → páginas reales (Privacidad, Términos, Mapa del Sitio, Ayuda),
              con contenido editable desde el CMS. Antes iban a "#". */}
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {LEGAL_LINKS.map(({ label, to }) => (
              <Link key={to} to={to} className="font-label-md text-label-md text-on-primary-container opacity-80 hover:opacity-100 hover:text-secondary transition-opacity">{label}</Link>
            ))}
          </nav>
          {/* Antes: copyright "© 2024 Manhattan..." fijo; ahora c.copyright */}
          <span className="font-body-md text-body-md text-on-primary-container opacity-60 text-center md:text-left">
            {c.copyright}
          </span>
        </div>

        {/* Crédito del desarrollador (hardcodeado, NO editable desde el admin). */}
        <div className="mt-stack-sm flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-on-primary-container opacity-60">
          <span className="font-body-md text-body-md">Desarrollado por</span>
          <a
            href={DEV_CREDIT.instagram}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 font-label-md text-label-md hover:opacity-100 hover:text-secondary transition-all"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d={NETWORKS.instagram.path} />
            </svg>
            {DEV_CREDIT.name}
          </a>
          <span aria-hidden="true">·</span>
          <a
            href={`mailto:${DEV_CREDIT.email}`}
            className="font-body-md text-body-md hover:opacity-100 hover:text-secondary transition-all"
          >
            {DEV_CREDIT.email}
          </a>
          {DEV_CREDIT.whatsapp && (
            <>
              <span aria-hidden="true">·</span>
              <a
                href={`https://wa.me/${DEV_CREDIT.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 font-body-md text-body-md hover:opacity-100 hover:text-secondary transition-all"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d={NETWORKS.whatsapp.path} />
                </svg>
                WhatsApp
              </a>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}
