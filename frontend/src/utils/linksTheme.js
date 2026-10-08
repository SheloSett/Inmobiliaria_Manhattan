// Apariencia de la página de links (/links): color del fondo y de los botones,
// elegidos por el cliente desde el panel (Ajustes → Contenido del sitio → Links).
// Agregado el 09/10/2026, al día siguiente de estrenar la página, a pedido del cliente.
//
// Este módulo es lógica pura (sin React) y lo comparten LinksPage.jsx (la página real)
// y la vista previa del editor (AdminContent.jsx): las dos pintan exactamente lo mismo
// con los mismos valores. Los campos que lee (bgStyle, bgColor, bgColor2, buttonStyle,
// buttonColor, buttonColor2, buttonText) están definidos en config/siteContent.js.
//
// Cómo funciona: resolveLinksTheme(content) devuelve los estilos inline del fondo y de
// los botones y, además, los colores del texto. El texto NO lo elige el cliente: se
// calcula solo según el color de abajo (blanco sobre fondos oscuros, azul marino sobre
// fondos claros), así nunca queda un texto blanco invisible sobre un botón blanco.
// Para los botones puede forzarlo con `buttonText` ('light' / 'dark') si el automático
// no le gusta.

const NAVY = '#00172b';        // primary del design system (texto "oscuro")
const NAVY_LIGHT = '#002c4b';  // primary-container (segundo color del degradé por defecto)
const WHITE = '#ffffff';

// Valores por defecto. Reproducen el diseño original de la página (navy con brillo rojo
// y botones negros translúcidos): si el cliente nunca tocó los colores, se ve igual.
export const LINKS_THEME_DEFAULTS = {
  bgStyle: 'brand',          // 'brand' | 'solid' | 'gradient'
  bgColor: NAVY,
  bgColor2: NAVY_LIGHT,
  buttonStyle: 'glass',      // 'glass' | 'solid' | 'gradient' | 'outline'
  buttonColor: '#000000',
  buttonColor2: '#bb000f',   // secondary (rojo Manhattan)
  buttonText: 'auto',        // 'auto' | 'light' | 'dark'
};

// ── Helpers de color ─────────────────────────────────────────────────────────

// '#rgb' o '#rrggbb' → { r, g, b }; null si no es un hex válido.
export function parseHex(hex) {
  if (typeof hex !== 'string') return null;
  const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

// Devuelve el hex normalizado ('#rrggbb' en minúsculas) o null si no es válido.
export function validHex(hex) {
  const c = parseHex(hex);
  if (!c) return null;
  return toHex(c);
}

function toHex({ r, g, b }) {
  const p = (n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${p(r)}${p(g)}${p(b)}`;
}

// 'rgba(r, g, b, alpha)' a partir de un hex. Si el hex no es válido usa `fallback`.
export function rgba(hex, alpha, fallback = WHITE) {
  const c = parseHex(hex) || parseHex(fallback);
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
}

// Mezcla dos colores: t=0 → a, t=1 → b. Sirve para estimar el color "efectivo" de un
// degradé (su punto medio) o de un botón translúcido sobre el fondo.
export function mix(hexA, hexB, t) {
  const a = parseHex(hexA);
  const b = parseHex(hexB);
  if (!a) return validHex(hexB) || NAVY;
  if (!b) return toHex(a);
  return toHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  });
}

// Luminancia relativa (WCAG), de 0 (negro) a 1 (blanco).
function luminance({ r, g, b }) {
  const lin = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(hexA, hexB) {
  const la = luminance(parseHex(hexA));
  const lb = luminance(parseHex(hexB));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// Color de texto que mejor contrasta con `bgHex`: blanco o azul marino (los dos colores
// de texto del sitio). No se usa negro puro para que el texto oscuro siga siendo "marca".
export function textOn(bgHex) {
  const bg = validHex(bgHex) || NAVY;
  return contrast(WHITE, bg) >= contrast(NAVY, bg) ? WHITE : NAVY;
}

export function isLightColor(hex) {
  const c = parseHex(hex);
  return c ? luminance(c) > 0.5 : false;
}

// ── Resolución del tema ──────────────────────────────────────────────────────

// Devuelve todo lo que la página necesita para pintarse:
//   page.style      → estilo inline del contenedor raíz (fondo liso o degradé)
//   page.brandGlow  → true si hay que dibujar el brillo rojo del diseño original
//   page.text       → color del texto de la página (nombre, bio, íconos, chips)
//   page.vars       → variables CSS con ese texto en distintas opacidades, para que
//                     las clases de Tailwind (hover incluido) las puedan usar
//   button.style    → estilo inline de cada botón (color de fondo/borde/vidrio)
//   button.text     → color del texto del botón
//   button.tile     → colores del cuadradito del ícono (botón clásico sin imagen)
export function resolveLinksTheme(content = {}) {
  const t = { ...LINKS_THEME_DEFAULTS, ...content };
  const bgColor = validHex(t.bgColor) || LINKS_THEME_DEFAULTS.bgColor;
  const bgColor2 = validHex(t.bgColor2) || LINKS_THEME_DEFAULTS.bgColor2;
  const buttonColor = validHex(t.buttonColor) || LINKS_THEME_DEFAULTS.buttonColor;
  const buttonColor2 = validHex(t.buttonColor2) || LINKS_THEME_DEFAULTS.buttonColor2;

  // Fondo. `pageBg` es el color "efectivo" con el que se decide el texto.
  let pageStyle;
  let pageBg;
  let brandGlow = false;
  if (t.bgStyle === 'solid') {
    pageStyle = { backgroundColor: bgColor };
    pageBg = bgColor;
  } else if (t.bgStyle === 'gradient') {
    pageStyle = { backgroundImage: `linear-gradient(180deg, ${bgColor} 0%, ${bgColor2} 100%)` };
    pageBg = mix(bgColor, bgColor2, 0.5);
  } else {
    // 'brand': el diseño original — navy liso con dos manchas difuminadas encima.
    pageStyle = { backgroundColor: NAVY };
    pageBg = NAVY;
    brandGlow = true;
  }
  const pageText = textOn(pageBg);

  // Botones. `btnBg` es el color efectivo del botón (para elegir el texto automático).
  let buttonStyle;
  let btnBg;
  let forcedText = null;
  switch (t.buttonStyle) {
    case 'solid':
      buttonStyle = { backgroundColor: buttonColor, borderColor: rgba(pageText, 0.08) };
      btnBg = buttonColor;
      break;
    case 'gradient':
      buttonStyle = {
        backgroundImage: `linear-gradient(135deg, ${buttonColor} 0%, ${buttonColor2} 100%)`,
        borderColor: 'transparent',
      };
      btnBg = mix(buttonColor, buttonColor2, 0.5);
      break;
    case 'outline':
      // Solo borde: el texto toma el color del borde (salvo que lo fuercen).
      buttonStyle = { backgroundColor: 'transparent', borderColor: buttonColor, borderWidth: '2px' };
      btnBg = pageBg;
      forcedText = buttonColor;
      break;
    default:
      // 'glass' (vidrio): el color al 35% con el fondo desenfocado detrás. Con negro
      // sobre navy es exactamente el look original (bg-black/35 + borde blanco/10).
      buttonStyle = {
        backgroundColor: rgba(buttonColor, 0.35),
        borderColor: rgba(pageText, 0.12),
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      };
      btnBg = mix(pageBg, buttonColor, 0.35);
  }

  let buttonText;
  if (t.buttonText === 'light') buttonText = WHITE;
  else if (t.buttonText === 'dark') buttonText = NAVY;
  else buttonText = forcedText || textOn(btnBg);

  // Cuadradito del ícono: blanco con ícono navy cuando el texto del botón es claro (el
  // look original); invertido (navy con ícono blanco) cuando el texto es oscuro, para
  // que no desaparezca sobre un botón blanco.
  const tile = isLightColor(buttonText)
    ? { backgroundColor: WHITE, color: NAVY }
    : { backgroundColor: NAVY, color: WHITE };

  return {
    page: {
      style: pageStyle,
      brandGlow,
      text: pageText,
      vars: {
        '--lk-text': pageText,
        '--lk-text-10': rgba(pageText, 0.1),
        '--lk-text-20': rgba(pageText, 0.2),
        '--lk-text-50': rgba(pageText, 0.5),
        '--lk-text-70': rgba(pageText, 0.7),
        '--lk-btn-text': buttonText,
      },
    },
    button: {
      style: buttonStyle,
      text: buttonText,
      tile,
    },
  };
}
