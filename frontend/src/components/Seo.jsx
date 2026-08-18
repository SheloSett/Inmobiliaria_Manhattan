import { useEffect } from 'react';

// <Seo /> — setea título y meta tags de la página actual (17/08/2026, al conectar el dominio).
//
// Por qué a mano y no con react-helmet: haría falta sumar una dependencia (y su
// provider) para algo que son ~30 líneas de DOM. Este componente no renderiza nada,
// solo escribe en el <head> cuando cambian sus props.
//
// A QUIÉN le sirve esto: a Google, que ejecuta JavaScript y por lo tanto ve estos tags
// después de que React monta. NO le sirve a WhatsApp ni Facebook, cuyos bots leen el
// HTML crudo sin ejecutar JS — para ellos existe el prerender del backend
// (backend/src/routes/seo.routes.js), que el nginx del frontend enruta por User-Agent.
// Los dos mecanismos son complementarios, no redundantes.

const SITE_NAME = 'Manhattan Negocios Inmobiliarios';
const SITE_URL = 'https://manhattannegociosinmobiliarios.com.ar';

// Busca (o crea) un tag del <head> y le setea el valor. `selector` identifica el tag
// existente para no duplicarlo en cada navegación.
function setTag(selector, attrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement(attrs.tagName || 'meta');
    Object.entries(attrs).forEach(([k, v]) => {
      if (k !== 'tagName' && k !== 'content' && k !== 'href') el.setAttribute(k, v);
    });
    document.head.appendChild(el);
  }
  if (attrs.content !== undefined) el.setAttribute('content', attrs.content);
  if (attrs.href !== undefined) el.setAttribute('href', attrs.href);
}

export default function Seo({ title, description, image, path }) {
  // El título completo lleva el nombre de la marca al final, salvo que ya lo incluya
  // (las fichas de propiedad arman su propio título largo).
  const fullTitle = !title
    ? SITE_NAME
    : title.includes(SITE_NAME)
      ? title
      : `${title} | ${SITE_NAME}`;

  const url = `${SITE_URL}${path || (typeof window !== 'undefined' ? window.location.pathname : '')}`;

  useEffect(() => {
    document.title = fullTitle;

    if (description) {
      setTag('meta[name="description"]', { name: 'description', content: description });
      setTag('meta[property="og:description"]', { property: 'og:description', content: description });
    }

    setTag('link[rel="canonical"]', { tagName: 'link', rel: 'canonical', href: url });
    setTag('meta[property="og:title"]', { property: 'og:title', content: fullTitle });
    setTag('meta[property="og:url"]', { property: 'og:url', content: url });
    setTag('meta[property="og:site_name"]', { property: 'og:site_name', content: SITE_NAME });
    setTag('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    setTag('meta[property="og:locale"]', { property: 'og:locale', content: 'es_AR' });

    if (image) {
      setTag('meta[property="og:image"]', { property: 'og:image', content: image });
      setTag('meta[name="twitter:image"]', { name: 'twitter:image', content: image });
      setTag('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    }
  }, [fullTitle, description, image, url]);

  return null;
}
