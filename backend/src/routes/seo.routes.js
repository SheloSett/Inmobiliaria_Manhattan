// Rutas de SEO (17/08/2026, al conectar el dominio propio).
//
// Resuelven dos problemas distintos que la SPA sola no puede cubrir:
//
//   1. sitemap.xml — Google Search Console pide un sitemap para descubrir todas las
//      propiedades sin tener que adivinarlas navegando. Se genera dinámicamente desde
//      la base, así que cada propiedad nueva que carga el admin aparece sola, sin
//      regenerar ni redesplegar nada.
//
//   2. prerender — WhatsApp, Facebook, Instagram y Telegram NO ejecutan JavaScript:
//      su bot pide el HTML, lee los meta tags y se va. Como esta web es una SPA que
//      arma todo en el cliente, esos bots solo veían el index.html vacío y por eso el
//      link compartido llegaba sin tarjeta de previsualización. Acá se les devuelve un
//      HTML chico con los Open Graph correctos de cada propiedad.
//
//      IMPORTANTE: esto se sirve SOLO a los bots sociales (el nginx del frontend decide
//      por User-Agent). A Googlebot se le sigue sirviendo la SPA normal, que sabe
//      ejecutar JS y la indexa bien. Servirle a Google un HTML distinto al del visitante
//      sería "cloaking" y es penalizable; a los bots sociales no aplica porque no
//      indexan, solo arman la tarjeta del link.
//
// Estas rutas NO están expuestas públicamente: el nginx del frontend solo hace
// proxy_pass a /seo/ internamente. No hay location público que las alcance.

const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// URL pública del sitio. Configurable por si el dominio cambia o se levanta un staging.
const SITE_URL = (process.env.SITE_URL || 'https://manhattannegociosinmobiliarios.com.ar')
  .replace(/\/+$/, '');

// Nombre público de la marca. OJO: NO se lee de siteSettings.siteName —esa tabla todavía
// tiene los valores del seed ("Inmobiliaria Manhattan", teléfono 0000-0000) y solo la
// consume el panel admin (AdminLayout.jsx); los datos reales del sitio viven en el
// mini-CMS (tabla PageContent, página "footer"). Se usa este default, que coincide con
// el copyright cargado en el CMS y con el dominio.
const SITE_NAME = process.env.SITE_NAME || 'Manhattan Negocios Inmobiliarios';

// Lee la identidad pública del sitio desde el mini-CMS, con fallback a constantes.
// Devuelve siempre un objeto válido: si el CMS está vacío o falla, el prerender tiene
// que seguir devolviendo una tarjeta usable igual.
async function getSiteIdentity() {
  try {
    const row = await prisma.pageContent.findUnique({ where: { page: 'footer' } });
    const footer = row?.content || {};
    return {
      siteName: SITE_NAME,
      description:
        footer.description ||
        'Negocios inmobiliarios. Liderazgo y confianza en el mercado de alta gama.',
      logo: footer.logo || null,
    };
  } catch (err) {
    console.error('No se pudo leer la identidad del sitio desde el CMS:', err);
    return {
      siteName: SITE_NAME,
      description: 'Negocios inmobiliarios. Liderazgo y confianza en el mercado de alta gama.',
      logo: null,
    };
  }
}

// Páginas públicas fijas de la SPA (las de App.jsx, sin /admin ni /buscar).
// /buscar queda afuera a propósito: son resultados de búsqueda, contenido duplicado
// del catálogo, y Google penaliza indexar ese tipo de páginas.
const STATIC_PAGES = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/propiedades', priority: '0.9', changefreq: 'daily' },
  { path: '/contacto', priority: '0.7', changefreq: 'monthly' },
  { path: '/nosotros', priority: '0.6', changefreq: 'monthly' },
  { path: '/tasaciones', priority: '0.6', changefreq: 'monthly' },
  { path: '/postulaciones', priority: '0.5', changefreq: 'monthly' },
  { path: '/mapa-del-sitio', priority: '0.3', changefreq: 'monthly' },
  { path: '/ayuda', priority: '0.3', changefreq: 'monthly' },
  { path: '/privacidad', priority: '0.2', changefreq: 'yearly' },
  { path: '/terminos', priority: '0.2', changefreq: 'yearly' },
];

// Escapado de HTML/XML. NO es opcional: title, description, city y neighborhood los
// escribe el admin desde el panel, así que son texto no confiable que termina dentro
// de atributos HTML (content="..."). Sin escapar, un título con comillas rompe el
// markup, y uno malicioso podría inyectar tags. Mismo criterio que ya se aplicó en la
// subida de CVs (ver cvUpload.middleware.js).
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Recorta un texto largo a algo que entre en un snippet de Google (~155 caracteres)
// o en la bajada de una tarjeta de WhatsApp, cortando en la última palabra entera.
function truncate(str, max = 155) {
  const clean = String(str ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')) + '…';
}

// Las imágenes viejas se guardaron como rutas relativas (/uploads/...) y las nuevas van
// a Cloudinary con URL absoluta. Los bots sociales exigen URL absoluta en og:image:
// con una relativa no muestran ninguna foto.
function absoluteUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function formatPrice(price, currency) {
  if (price == null) return '';
  return `${currency || 'USD'} ${new Intl.NumberFormat('es-AR').format(price)}`;
}

// ---------------------------------------------------------------------------
// sitemap.xml
// ---------------------------------------------------------------------------
router.get('/sitemap.xml', async (req, res) => {
  try {
    // Solo se listan las propiedades que un visitante puede ver y que siguen
    // disponibles. Mandarle a Google fichas ya vendidas o alquiladas hace que indexe
    // páginas que después va a marcar como contenido de baja calidad.
    // published: true (19/08/2026) — una publicación pausada no se le manda a Google:
    // su ficha devuelve 404 y quedaría indexada una URL muerta.
    const properties = await prisma.property.findMany({
      where: { published: true, status: { in: ['AVAILABLE', 'RESERVED'] } },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });

    const today = new Date().toISOString().slice(0, 10);

    const urls = [
      ...STATIC_PAGES.map(
        (p) => `  <url>
    <loc>${SITE_URL}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
      ),
      ...properties.map(
        (p) => `  <url>
    <loc>${SITE_URL}/propiedades/${p.id}</loc>
    <lastmod>${p.updatedAt.toISOString().slice(0, 10)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
      ),
    ];

    res.header('Content-Type', 'application/xml; charset=utf-8');
    // Cache corto: el sitemap cambia cuando el admin carga una propiedad, no hace falta
    // recalcularlo en cada request de Googlebot, pero tampoco conviene cachearlo horas.
    res.header('Cache-Control', 'public, max-age=3600');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`);
  } catch (err) {
    console.error('Error generando sitemap.xml:', err);
    res.status(500).send('Error generando el sitemap');
  }
});

// ---------------------------------------------------------------------------
// Prerender para bots sociales
// ---------------------------------------------------------------------------

// Arma el HTML mínimo que espera un bot social: solo <head> con los meta tags, más un
// <body> con el contenido en texto. El body casi no importa para la tarjeta, pero se
// incluye para que el HTML sea válido y para que una persona que abra el "ver código
// fuente" del link entienda qué es.
function renderMetaHtml({ title, description, image, url, siteName }) {
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeUrl = escapeHtml(url);
  const safeSite = escapeHtml(siteName);
  const imageTags = image
    ? `
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:image:alt" content="${safeTitle}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    <meta name="twitter:card" content="summary_large_image" />`
    : `
    <meta name="twitter:card" content="summary" />`;

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDesc}" />
    <link rel="canonical" href="${safeUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${safeSite}" />
    <meta property="og:locale" content="es_AR" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDesc}" />
    <meta property="og:url" content="${safeUrl}" />${imageTags}
  </head>
  <body>
    <h1>${safeTitle}</h1>
    <p>${safeDesc}</p>
    <p><a href="${safeUrl}">${safeUrl}</a></p>
  </body>
</html>`;
}

router.get('/prerender/*', async (req, res) => {
  // req.params[0] es el path original sin la barra inicial (ej: "propiedades/12").
  const path = '/' + (req.params[0] || '');
  const url = `${SITE_URL}${path === '/index.html' ? '/' : path}`;

  try {
    const identity = await getSiteIdentity();
    const siteName = identity.siteName;

    // Ficha de propiedad: /propiedades/:id
    const propertyMatch = path.match(/^\/propiedades\/(\d+)\/?$/);
    if (propertyMatch) {
      const property = await prisma.property.findUnique({
        where: { id: Number(propertyMatch[1]) },
        include: { images: { orderBy: { order: 'asc' } } },
      });

      // property.published (19/08/2026): si la publicación está pausada se ignora y cae
      // al meta genérico del sitio, para que un link compartido en WhatsApp/Facebook no
      // siga mostrando el preview con la foto y el precio de una propiedad que ya no
      // está publicada (la ficha, además, redirige al catálogo).
      if (property && property.published) {
        // Las etiquetas legibles de operación y tipo viven en los catálogos editables
        // (Ajustes → Catálogos), no en la propiedad. Si el catálogo no tiene el valor
        // (por ejemplo si lo borraron), se cae al valor crudo en vez de romper.
        const [operation, type] = await Promise.all([
          prisma.operationType.findUnique({ where: { value: property.operation } }),
          prisma.propertyTypeOption.findUnique({ where: { value: property.type } }),
        ]);

        const typeLabel = type?.label || property.type;
        const operationLabel = operation?.label || property.operation;
        const zone = property.neighborhood
          ? `${property.neighborhood}, ${property.city}`
          : property.city;

        // Título pensado para el resultado de Google: tipo + operación + zona + precio.
        // Es lo que la gente busca ("departamento en venta en X"), a diferencia del
        // título interno que le pone el admin, que puede ser cualquier cosa.
        const title = `${typeLabel} en ${operationLabel} en ${zone} — ${formatPrice(
          property.price,
          property.currency
        )} | ${siteName}`;

        const primaryImage =
          property.images.find((i) => i.isPrimary && i.type === 'image') ||
          property.images.find((i) => i.type === 'image');

        return res
          .status(200)
          .header('Content-Type', 'text/html; charset=utf-8')
          .send(
            renderMetaHtml({
              title,
              description: truncate(property.description) || `${property.title} en ${zone}.`,
              image: absoluteUrl(primaryImage?.url),
              url,
              siteName,
            })
          );
      }
      // Si la propiedad no existe se sigue de largo y se devuelve la tarjeta genérica
      // del sitio, que es mejor que un 404 sin previsualización.
    }

    // Resto de las páginas: tarjeta genérica del sitio.
    return res
      .status(200)
      .header('Content-Type', 'text/html; charset=utf-8')
      .send(
        renderMetaHtml({
          title: `${siteName} — Propiedades en venta y alquiler`,
          description: truncate(identity.description),
          image: absoluteUrl(identity.logo) || `${SITE_URL}/favicon.png`,
          url,
          siteName,
        })
      );
  } catch (err) {
    console.error('Error en prerender SEO:', err);
    // Ante un error se devuelve igual una tarjeta mínima: que el bot reciba algo
    // válido es mejor que un 500, que en WhatsApp se ve como link roto.
    return res
      .status(200)
      .header('Content-Type', 'text/html; charset=utf-8')
      .send(
        renderMetaHtml({
          title: SITE_NAME,
          description: 'Propiedades en venta y alquiler.',
          image: `${SITE_URL}/favicon.png`,
          url,
          siteName: SITE_NAME,
        })
      );
  }
});

module.exports = router;
