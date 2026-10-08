import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useSiteContent } from '../hooks/useSiteContent';
import { NETWORKS } from '../components/PublicFooter';
import Seo from '../components/Seo';
import { resolveLinksTheme } from '../utils/linksTheme';

// Página de links estilo Linktree (08/10/2026) — ruta pública /links.
// Pensada para el link de la bio de Instagram/TikTok: reemplaza al Linktree externo del
// cliente (linktr.ee/inmobiliariaManhattan) con el mismo formato —logo, nombre, fila de
// íconos, botones y una tarjeta destacada con imagen grande— pero con la identidad de
// Manhattan (navy + rojo, Manrope/Inter) y editable desde el panel:
// Ajustes → Contenido del sitio → "Links (Linktree)" (esquema en config/siteContent.js).
//
// A propósito NO usa PublicNavbar/PublicFooter: es una página "link in bio", que se abre
// desde el celular adentro del navegador de Instagram, y el formato es justamente una
// sola columna con los botones y nada más. El botón de la casita lleva al sitio.
//
// Colores (09/10/2026): el fondo y los botones ya no están fijos en clases de Tailwind;
// salen de resolveLinksTheme (utils/linksTheme.js) según lo que el cliente eligió en el
// panel. El color del texto se calcula solo para contrastar con el fondo elegido. Los
// colores del texto van en variables CSS (--lk-*) en el contenedor raíz, así las clases
// de Tailwind (incluidas las de hover) pueden usarlos con `var(...)`.
//
// El componente se divide en dos: LinksPageView (solo pinta, recibe el contenido por
// props) y LinksPage (la ruta: lee el contenido guardado). La vista previa del editor
// usa LinksPageView con los valores aún sin guardar, así el cliente ve el resultado
// antes de guardar.

const SITE_URL = 'https://manhattannegociosinmobiliarios.com.ar';

// Íconos para los tipos que no son marcas (Material Symbols, como el resto del sitio).
const MATERIAL_ICONS = {
  website: 'language',
  email: 'mail',
  phone: 'call',
  link: 'link',
};

function NetworkIcon({ network, className = 'w-6 h-6' }) {
  const brand = NETWORKS[network];
  if (brand) {
    return (
      <svg className={`${className} fill-current`} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d={brand.path} />
      </svg>
    );
  }
  return (
    <span className="material-symbols-outlined leading-none" style={{ fontSize: '1.6em' }} aria-hidden="true">
      {MATERIAL_ICONS[network] || 'link'}
    </span>
  );
}

// Completa un enlace escrito "a medias" desde el panel, para que el admin no tenga que
// saber armar URLs: "@usuario" en Instagram/TikTok, solo el número en WhatsApp o
// Teléfono, el mail pelado en Email, o un dominio sin "https://".
function normalizeUrl(raw, network) {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
  if (value.startsWith('/')) return value; // ruta interna del sitio (ej: /propiedades)

  const digits = value.replace(/\D/g, '');
  const looksLikeNumber = /^\+?[\d\s().-]+$/.test(value);
  if (network === 'whatsapp' && looksLikeNumber) return `https://wa.me/${digits}`;
  if (network === 'phone' && looksLikeNumber) return `tel:+${digits}`;
  if (network === 'email') return `mailto:${value}`;
  if (value.startsWith('@')) {
    const handle = value.slice(1);
    if (network === 'instagram') return `https://www.instagram.com/${handle}`;
    if (network === 'tiktok') return `https://www.tiktok.com/@${handle}`;
  }
  return `https://${value}`;
}

// Los links al propio sitio abren en la misma pestaña; los externos, en una nueva.
function linkProps(href) {
  const internal = href.startsWith('/') || href.startsWith(SITE_URL);
  const external = /^https?:/i.test(href) && !internal;
  return external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
}

// Clases comunes a todos los botones. El color de fondo/borde va por `style` (lo decide
// el tema); el hover es un leve brillo + escala, que funciona con cualquier color.
const BUTTON_BASE = 'border shadow-lg hover:brightness-110 hover:scale-[1.015] transition-all text-[var(--lk-btn-text)]';

// Vista de la página. `content` son los campos de la página "links" del CMS;
// `logoFallback` es el logo del Footer (se usa si no cargaron foto de perfil);
// `preview` la adapta para mostrarla adentro del editor (sin <Seo>, sin alto de pantalla).
export function LinksPageView({ content, logoFallback, preview = false }) {
  const avatar = content.avatar || logoFallback || '/favicon.png';
  const name = content.name || 'Inmobiliaria Manhattan';
  const theme = resolveLinksTheme(content);

  const icons = (content.icons || [])
    .map((i) => ({ ...i, href: normalizeUrl(i.url, i.network) }))
    .filter((i) => i.href);
  const buttons = (content.buttons || [])
    .map((b) => ({ ...b, href: normalizeUrl(b.url, b.network) }))
    .filter((b) => b.href && b.title);

  // Compartir la página: menú nativo del celular (el sitio ya es HTTPS, así que está
  // disponible en Android/iOS) y, si no existe (la mayoría de las PCs), copia el link.
  const handleShare = async () => {
    const url = `${window.location.origin}/links`;
    if (navigator.share) {
      try {
        await navigator.share({ title: name, url });
      } catch { /* el usuario cerró el menú: no es un error */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado');
    } catch {
      toast(url);
    }
  };

  // A pantalla completa ocupa al menos el alto de la ventana; en la vista previa del
  // editor crece para llenar el marco (flex-1 dentro de una columna flex).
  const height = preview ? 'flex-1' : 'min-h-screen';

  return (
    <div
      className={`relative ${height} flex flex-col overflow-hidden font-body-md text-[var(--lk-text)]`}
      style={{ ...theme.page.style, ...theme.page.vars }}
    >
      {!preview && (
        <Seo
          title={`${name} — Links`}
          description={content.seoDescription}
          image={/^https?:/i.test(avatar) ? avatar : undefined}
          path="/links"
        />
      )}

      {/* Fondo "Manhattan": degradé navy con un brillo rojo de la marca, en lugar del fondo
          borroso de Linktree. Solo con el estilo de fondo original; con un color liso o un
          degradé elegidos por el cliente no se dibuja. */}
      {theme.page.brandGlow && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full bg-primary-container blur-3xl opacity-90" />
          <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full bg-secondary/25 blur-3xl" />
        </div>
      )}

      <main className="relative mx-auto w-full max-w-[580px] flex-1 px-4 pt-5 pb-8 flex flex-col">
        {/* Barra superior: al sitio (izquierda) y compartir (derecha) */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            aria-label="Ir al sitio web"
            className="w-10 h-10 rounded-full bg-[var(--lk-text-10)] border border-[var(--lk-text-10)] flex items-center justify-center hover:bg-[var(--lk-text-20)] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">home</span>
          </Link>
          <button
            type="button"
            onClick={handleShare}
            aria-label="Compartir esta página"
            className="w-10 h-10 rounded-full bg-[var(--lk-text-10)] border border-[var(--lk-text-10)] flex items-center justify-center hover:bg-[var(--lk-text-20)] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">ios_share</span>
          </button>
        </div>

        {/* Perfil */}
        <header className="mt-6 flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-white overflow-hidden shadow-xl ring-4 ring-[var(--lk-text-10)] flex items-center justify-center">
            <img src={avatar} alt={name} className="w-full h-full object-contain p-2" />
          </div>
          <h1 className="mt-4 font-headline-sm text-[22px] leading-7 font-bold">{name}</h1>
          {content.bio && (
            <p className="mt-1.5 max-w-sm text-sm text-[var(--lk-text-70)] whitespace-pre-line">{content.bio}</p>
          )}
          {icons.length > 0 && (
            <nav aria-label="Redes sociales" className="mt-4 flex flex-wrap items-center justify-center gap-5">
              {icons.map((icon, i) => (
                <a
                  key={`${icon.network}-${i}`}
                  href={icon.href}
                  {...linkProps(icon.href)}
                  aria-label={NETWORKS[icon.network]?.label || icon.network}
                  className="hover:opacity-70 transition-opacity text-[17px]"
                >
                  <NetworkIcon network={icon.network} className="w-7 h-7" />
                </a>
              ))}
            </nav>
          )}
        </header>

        {/* Botones */}
        <section className="mt-8 flex flex-col gap-4">
          {buttons.map((btn, i) =>
            btn.style === 'featured' ? (
              <a
                key={i}
                href={btn.href}
                {...linkProps(btn.href)}
                className={`block rounded-2xl p-3 ${BUTTON_BASE}`}
                style={theme.button.style}
              >
                <div className="aspect-[16/9] w-full rounded-xl overflow-hidden bg-white">
                  {btn.image ? (
                    <img src={btn.image} alt={btn.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <img src={avatar} alt={btn.title} className="w-full h-full object-contain p-8" loading="lazy" />
                  )}
                </div>
                <p className="pt-3 pb-1 text-center font-label-md text-[15px] font-bold">{btn.title}</p>
              </a>
            ) : (
              <a
                key={i}
                href={btn.href}
                {...linkProps(btn.href)}
                className={`relative flex items-center min-h-[60px] rounded-2xl px-16 py-2 ${BUTTON_BASE}`}
                style={theme.button.style}
              >
                <span
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-lg overflow-hidden flex items-center justify-center text-[15px]"
                  style={theme.button.tile}
                >
                  {btn.image ? (
                    <img src={btn.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <NetworkIcon network={btn.network} className="w-6 h-6" />
                  )}
                </span>
                <span className="w-full text-center font-label-md text-[15px] font-bold leading-5">{btn.title}</span>
              </a>
            )
          )}
        </section>

        <footer className="mt-auto pt-12 text-center">
          <Link to="/" className="text-xs text-[var(--lk-text-50)] hover:text-[var(--lk-text)] transition-colors">
            Manhattan Negocios Inmobiliarios
          </Link>
        </footer>
      </main>
    </div>
  );
}

// La ruta /links: lee el contenido guardado y lo pinta.
export default function LinksPage() {
  const content = useSiteContent('links');
  // El logo del navbar/footer es el fallback del avatar y de las tarjetas destacadas.
  const footer = useSiteContent('footer');
  return <LinksPageView content={content} logoFallback={footer.logo} />;
}
