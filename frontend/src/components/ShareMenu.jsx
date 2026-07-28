import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

// Menú desplegable de "compartir" propio (no el nativo del sistema).
// Motivo (27/07/2026): el menú nativo (navigator.share) SOLO funciona sobre HTTPS; en el
// VPS el sitio se sirve por HTTP, así que ahí no aparece. Este dropdown propio funciona
// en cualquier contexto (HTTP incluido): cada app se abre por su URL de compartir y el
// "Copiar enlace" usa execCommand como fallback cuando el portapapeles moderno no está.

// Íconos de marca (SVG inline, paths de simple-icons; Material Symbols no tiene logos).
const WA_PATH = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z';
const FB_PATH = 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z';
const TG_PATH = 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z';
const X_PATH = 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z';

function BrandIcon({ path }) {
  return (
    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d={path} />
    </svg>
  );
}

// Copia con fallback: portapapeles moderno si hay contexto seguro; si no, execCommand.
function copyToClipboard(url) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(url).then(() => true).catch(() => legacyCopy(url));
  }
  return Promise.resolve(legacyCopy(url));
}
function legacyCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  ta.setAttribute('readonly', '');
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  document.body.removeChild(ta);
  return ok;
}

export default function ShareMenu({ url, title, text }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Cerrar al hacer clic afuera o con Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const shareText = text || title || '';
  const targets = [
    { key: 'whatsapp', label: 'WhatsApp', color: '#25D366', path: WA_PATH, href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}` },
    { key: 'facebook', label: 'Facebook', color: '#1877F2', path: FB_PATH, href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { key: 'telegram', label: 'Telegram', color: '#26A5E4', path: TG_PATH, href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}` },
    { key: 'x', label: 'X', color: '#000000', path: X_PATH, href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}` },
    { key: 'email', label: 'Email', material: 'mail', href: `mailto:?subject=${encodeURIComponent(title || '')}&body=${encodeURIComponent(`${shareText}\n${url}`)}` },
  ];

  const handleCopy = async () => {
    const ok = await copyToClipboard(url);
    if (ok) toast.success('Enlace copiado al portapapeles');
    else toast.error('No se pudo copiar el enlace');
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title="Compartir"
        aria-haspopup="true"
        aria-expanded={open}
        className="p-2 border border-outline-variant rounded text-on-surface-variant hover:bg-surface-container-low transition-colors"
      >
        <span className="material-symbols-outlined">share</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-[0_8px_30px_rgba(0,23,43,0.12)] py-2 z-50">
          <p className="px-4 py-1 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-[11px]">Compartir en</p>
          {targets.map(t => (
            <a
              key={t.key}
              href={t.href}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-on-surface hover:bg-surface-container-low transition-colors font-body-md text-body-md"
            >
              <span className="flex items-center justify-center w-6 h-6" style={t.color ? { color: t.color } : undefined}>
                {t.path ? <BrandIcon path={t.path} /> : <span className="material-symbols-outlined text-[22px] text-on-surface-variant">{t.material}</span>}
              </span>
              {t.label}
            </a>
          ))}
          <div className="my-1 border-t border-outline-variant" />
          <button
            type="button"
            onClick={handleCopy}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-on-surface hover:bg-surface-container-low transition-colors font-body-md text-body-md text-left"
          >
            <span className="flex items-center justify-center w-6 h-6">
              <span className="material-symbols-outlined text-[22px] text-on-surface-variant">content_copy</span>
            </span>
            Copiar enlace
          </button>
        </div>
      )}
    </div>
  );
}
