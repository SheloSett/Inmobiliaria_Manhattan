import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import ImageCarousel from '../components/ImageCarousel';
import ShareMenu from '../components/ShareMenu';

const OPERATION_LABELS = { SALE: 'VENTA', RENT: 'ALQUILER' };
const TYPE_LABELS = {
  HOUSE: 'CASA',
  APARTMENT: 'DEPARTAMENTO',
  OFFICE: 'OFICINA',
  LOCAL: 'LOCAL',
  LAND: 'TERRENO',
  PH: 'PH',
};
const STATUS_LABELS = {
  AVAILABLE: 'DISPONIBLE',
  RESERVED: 'RESERVADO',
  SOLD: 'VENDIDO',
  RENTED: 'ALQUILADO',
};
const STATUS_STYLES = {
  AVAILABLE: 'bg-surface-container-high text-on-surface',
  RESERVED: 'bg-[#FFF3CD] text-[#856404]',
  SOLD: 'bg-secondary-container text-on-secondary',
  RENTED: 'bg-primary-container text-on-primary',
};

function formatPrice(currency, price) {
  return `${currency} $${Number(price).toLocaleString('es-AR')}`;
}

// Teléfonos para consultas de propiedades: se configuran en frontend/.env.
// Las consultas van directo por WhatsApp (el panel de Consultas del admin se eliminó
// a pedido del cliente el 15/07/2026).
const WHATSAPP_CONSULTAS = import.meta.env.VITE_PHONE_SHAUL_WA || '5491160479977';
const TEL_CONSULTAS = import.meta.env.VITE_PHONE_SHAUL_TEL || '+5491160479977';

// Mensaje precargado en el textarea de consulta (a pedido del cliente 26/07/2026):
// el interesado ya lo encuentra escrito y solo tiene que poner su nombre.
const DEFAULT_MESSAGE = 'Hola, me interesa esta propiedad.';

// El markup inline original quedó comentado debajo (no eliminado, según regla del
// proyecto). Motivo: se reemplazó por el componente compartido <PublicNavbar/> para
// que el navbar sea idéntico en todas las páginas públicas y los links de
// Tasaciones/Nosotros apunten a las páginas nuevas.
function TopNavBar() {
  return <PublicNavbar active="Propiedades" />;
}
// Navbar original:
// function TopNavBar() {
//   return (
//     <header className="bg-surface-container-lowest border-b border-outline-variant shadow-sm w-full sticky top-0 z-50">
//       <div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 max-w-[1280px] mx-auto">
//         <Link className="font-headline-xl text-primary font-bold tracking-tight" to="/">Manhattan</Link>
//         <nav className="hidden md:flex items-center space-x-gutter">
//           <Link className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors duration-200 px-2 py-1 rounded" to="/">Inicio</Link>
//           <Link className="font-label-md text-label-md text-secondary border-b-2 border-secondary pb-1" to="/propiedades">Propiedades</Link>
//           <a className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors duration-200 px-2 py-1 rounded" href="#">Tasaciones</a>
//           <a className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors duration-200 px-2 py-1 rounded" href="#">Nosotros</a>
//           <a className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors duration-200 px-2 py-1 rounded" href="#">Blog</a>
//           <Link className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors duration-200 px-2 py-1 rounded" to="/contacto">Contacto</Link>
//         </nav>
//         <div className="flex items-center space-x-4">
//         </div>
//       </div>
//     </header>
//   );
// }

// El markup inline original quedó comentado debajo (no eliminado, según regla del
// proyecto). Motivo: se reemplazó por el componente compartido <PublicFooter/> para
// que el footer sea idéntico en todas las páginas públicas.
function Footer() {
  return <PublicFooter />;
}
// Footer original:
// function Footer() {
//   return (
//     <footer className="bg-primary w-full mt-stack-lg">
//       <div className="px-margin-mobile md:px-margin-desktop py-stack-lg flex flex-col md:flex-row justify-between items-center max-w-[1280px] mx-auto">
//         <div className="flex flex-col items-center md:items-start gap-2 mb-stack-sm md:mb-0">
//           <span className="font-headline-xl font-bold text-on-primary">Manhattan</span>
//           <span className="font-body-md text-body-md text-on-primary-container opacity-80">
//             © 2024 Manhattan Negocios Inmobiliarios. Todos los derechos reservados.
//           </span>
//         </div>
//         <div className="flex space-x-6">
//           {['Privacidad', 'Términos', 'Mapa del Sitio', 'Ayuda'].map(label => (
//             <a key={label} className="font-label-md text-label-md text-on-primary-container opacity-80 hover:opacity-100 hover:text-secondary-fixed transition-opacity" href="#">
//               {label}
//             </a>
//           ))}
//         </div>
//       </div>
//     </footer>
//   );
// }

function LoadingSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-stack-lg">
      <div className="h-6 w-2/3 bg-surface-container rounded" />
      <div className="h-10 w-full bg-surface-container rounded" />
      <div className="h-[520px] bg-surface-container rounded-xl" />
      <div className="h-24 bg-surface-container rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-48 bg-surface-container rounded-lg" />
          <div className="h-48 bg-surface-container rounded-lg" />
        </div>
        <div className="h-96 bg-surface-container rounded-lg" />
      </div>
    </div>
  );
}

export default function PropertyDetail() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  // COMENTADO: estado del botón de favoritos. Se deshabilitó porque no existen
  // usuarios en la base de datos, por lo que no hay dónde persistir los favoritos.
  // const [favorited, setFavorited] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: DEFAULT_MESSAGE });
  // COMENTADO: estado "sending" ya no es necesario porque el envío dejó de ser una
  // request asíncrona a la API; ahora solo se abre WhatsApp con el mensaje armado.
  // const [sending, setSending] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    api.get(`/properties/${id}`)
      .then(res => setProperty(res.data))
      .catch(err => {
        if (err.response?.status === 404) setNotFound(true);
        else toast.error('Error al cargar la propiedad');
      })
      .finally(() => setLoading(false));
  }, [id]);

  // VERSIÓN ANTERIOR COMENTADA (no eliminada, según regla del proyecto).
  // Motivo: guardaba la consulta en la BD vía POST /api/contacts, pero el panel de
  // Consultas del admin se eliminó (15/07/2026); ahora la consulta va directo por
  // WhatsApp con los datos de la propiedad incluidos en el mensaje.
  // async function handleSubmit(e) {
  //   e.preventDefault();
  //   if (!formData.name || !formData.email || !formData.message) {
  //     toast.error('Completá nombre, email y mensaje');
  //     return;
  //   }
  //   setSending(true);
  //   try {
  //     await api.post('/contacts', { ...formData, propertyId: property.id });
  //     toast.success('¡Consulta enviada! Te contactaremos a la brevedad.');
  //     setFormData({ name: '', email: '', phone: '', message: DEFAULT_MESSAGE });
  //   } catch {
  //     toast.error('Error al enviar la consulta. Intentá de nuevo.');
  //   } finally {
  //     setSending(false);
  //   }
  // }

  function buildWhatsAppMessage(customText) {
    return [
      '¡Hola! Vi esta propiedad en la web de Inmobiliaria Manhattan y quiero hacer una consulta.',
      '',
      '*CONSULTA POR PROPIEDAD*',
      // Emojis 🏠📍💰🔗📝 comentados (27/07/2026): son caracteres "astral" (fuera del plano
      // básico de Unicode, 4 bytes en UTF-8/par subrogado en UTF-16). WhatsApp Desktop y Web
      // los decodifican mal al precargar el texto vía link wa.me: se ven como "�" y además
      // rompen la detección automática del link de la propiedad (queda como texto plano, no
      // clickeable, porque el caracter corrupto pega contra la URL). Se reemplazan por
      // etiquetas de texto plano, que no tienen este problema en ningún cliente de WhatsApp.
      // `🏠 ${property.title}`,
      // `📍 ${property.address}${property.neighborhood ? `, ${property.neighborhood}` : ''}, ${property.city}`,
      // `💰 ${formatPrice(property.currency, property.price)}`,
      // `🔗 ${window.location.href}`,
      // customText && '',
      // customText && `📝 ${customText}`,
      `Propiedad: ${property.title}`,
      `Dirección: ${property.address}${property.neighborhood ? `, ${property.neighborhood}` : ''}, ${property.city}`,
      `Precio: ${formatPrice(property.currency, property.price)}`,
      `Link: ${window.location.href}`,
      customText && '',
      customText && `Mensaje: ${customText}`,
    ].filter(Boolean).join('\n');
  }

  function handleSubmit(e) {
    e.preventDefault();
    // El nombre dejó de ser obligatorio (26/07/2026): solo se pide el mensaje. Si el
    // interesado escribió su nombre, se agrega al mensaje; si no, se omite esa línea.
    if (!formData.message) {
      toast.error('Escribí tu consulta');
      return;
    }
    const message = [
      buildWhatsAppMessage(formData.message),
      formData.name && '',
      formData.name && '*Mis datos de contacto*',
      // Emoji 👤 comentado (27/07/2026): mismo problema de decodificación de emojis astral
      // en WhatsApp Desktop/Web (ver comentario en buildWhatsAppMessage más arriba).
      // formData.name && `👤 Nombre: ${formData.name}`,
      formData.name && `Nombre: ${formData.name}`,
      // Email y Teléfono comentados: los inputs se quitaron del formulario (26/07/2026),
      // así que estos campos irían siempre vacíos. formData los conserva por compatibilidad.
      // formData.email && `📧 Email: ${formData.email}`,
      // formData.phone && `📞 Teléfono: ${formData.phone}`,
    ].filter(Boolean).join('\n');
    window.open(`https://wa.me/${WHATSAPP_CONSULTAS}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    toast.success('Abriendo WhatsApp con tu consulta...');
    setFormData({ name: '', email: '', phone: '', message: DEFAULT_MESSAGE });
  }

  function handleChange(e) {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  // Compartir la propiedad: usa el menú nativo del sistema (Web Share API, disponible
  // sobre todo en mobile); si el navegador no lo soporta, copia el enlace al portapapeles.
  //
  // IMPORTANTE (fix 27/07/2026): tanto navigator.share como navigator.clipboard SOLO
  // funcionan en "contexto seguro" (HTTPS o localhost). En el VPS el sitio se sirve por
  // HTTP (http://177.7.59.16:8080), así que ambos fallan y salía "No se pudo compartir".
  // Por eso se agrega un fallback con execCommand('copy'), que sí funciona sobre HTTP.
  // handleShare COMENTADO (no eliminado, según regla del proyecto): usaba el menú nativo
  // navigator.share con fallback a copiar. Se reemplazó por el componente <ShareMenu/>,
  // un desplegable propio con las apps + copiar, que además funciona sobre HTTP (el menú
  // nativo del sistema requiere HTTPS y en el VPS no aparecía).
  // async function handleShare() {
  //   const url = window.location.href;
  //   const shareData = {
  //     title: property?.title || 'Propiedad — Manhattan',
  //     text: property
  //       ? `${property.title} — ${formatPrice(property.currency, property.price)}`
  //       : 'Mirá esta propiedad en Inmobiliaria Manhattan',
  //     url,
  //   };
  //   const legacyCopy = (text) => {
  //     const ta = document.createElement('textarea');
  //     ta.value = text;
  //     ta.style.position = 'fixed';
  //     ta.style.left = '-9999px';
  //     ta.setAttribute('readonly', '');
  //     document.body.appendChild(ta);
  //     ta.select();
  //     let ok = false;
  //     try { ok = document.execCommand('copy'); } catch { ok = false; }
  //     document.body.removeChild(ta);
  //     return ok;
  //   };
  //   const copyLink = async () => {
  //     if (navigator.clipboard && window.isSecureContext) {
  //       try {
  //         await navigator.clipboard.writeText(url);
  //         toast.success('Enlace copiado al portapapeles');
  //         return;
  //       } catch { /* cae al fallback legacy */ }
  //     }
  //     if (legacyCopy(url)) toast.success('Enlace copiado al portapapeles');
  //     else toast.error('No se pudo copiar el enlace');
  //   };
  //   try {
  //     if (navigator.share && window.isSecureContext) {
  //       await navigator.share(shareData);
  //     } else {
  //       await copyLink();
  //     }
  //   } catch (err) {
  //     if (err?.name !== 'AbortError') await copyLink();
  //   }
  // }

  // Render ----------------------------------------------------------------

  if (!loading && notFound) {
    return (
      <div className="bg-background min-h-screen flex flex-col">
        <TopNavBar />
        <div className="flex-grow flex flex-col items-center justify-center gap-4 text-center px-4">
          <span className="material-symbols-outlined text-[64px] text-outline">search_off</span>
          <h2 className="font-headline-lg text-headline-lg text-primary">Propiedad no encontrada</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            La propiedad que buscás no existe o fue eliminada.
          </p>
          <Link className="bg-primary text-on-primary px-6 py-3 rounded font-label-md text-label-md hover:bg-primary-container transition-colors" to="/propiedades">
            Ver propiedades
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const images = property?.images ?? [];
  const mainImg = images[0]?.url ?? null;
  const img2 = images[1]?.url ?? null;
  const img3 = images[2]?.url ?? null;
  const extraCount = images.length > 3 ? images.length - 3 : 0;

  // operationLabel/typeLabel ahora vienen enriquecidos del backend (según el catálogo
  // gestionable). Se usa el mapa hardcodeado solo como fallback por compatibilidad.
  const operationLabel = property ? (property.operationLabel ?? OPERATION_LABELS[property.operation] ?? property.operation) : '';
  const typeLabel = property ? (property.typeLabel ?? TYPE_LABELS[property.type] ?? property.type) : '';
  const statusLabel = property ? (STATUS_LABELS[property.status] ?? property.status) : '';
  const statusStyle = property ? (STATUS_STYLES[property.status] ?? STATUS_STYLES.AVAILABLE) : '';

  const characteristics = property ? [
    property.area != null && ['Superficie Total', `${property.area} m²`],
    property.bedrooms != null && ['Dormitorios', property.bedrooms],
    property.bathrooms != null && ['Baños', property.bathrooms],
    ['Cochera', property.garage ? 'Sí' : 'No'],
    property.neighborhood && ['Barrio', property.neighborhood],
    ['Ciudad', property.city],
  ].filter(Boolean) : [];

  return (
    <div className="bg-background text-on-background font-body-md antialiased min-h-screen flex flex-col">
      <TopNavBar />

      <main className="flex-grow w-full max-w-[1280px] mx-auto px-margin-mobile md:px-margin-desktop py-stack-md flex flex-col gap-stack-lg">

        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* Breadcrumbs & Header */}
            <div className="flex flex-col gap-stack-sm">
              <div className="flex items-center text-on-surface-variant text-body-md font-body-md space-x-2 flex-wrap">
                <Link className="hover:text-primary transition-colors flex items-center" to="/">
                  <span className="material-symbols-outlined text-[18px] mr-1">home</span>Inicio
                </Link>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                <Link className="hover:text-primary transition-colors" to="/propiedades">{typeLabel}</Link>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                <span className="text-on-surface font-label-md truncate max-w-xs md:max-w-none">{property.title}</span>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-stack-md">
                <div className="flex flex-col gap-unit">
                  <h1 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg text-primary">
                    {property.title}
                  </h1>
                  <div className="flex items-center text-on-surface-variant font-body-md text-body-md">
                    <span className="material-symbols-outlined mr-2">location_on</span>
                    {[property.address, property.neighborhood, property.city].filter(Boolean).join(', ')}
                  </div>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    <span className={`px-3 py-1 rounded font-label-md text-label-md inline-block ${statusStyle}`}>
                      {operationLabel}
                    </span>
                    {property.status !== 'AVAILABLE' && (
                      <span className="bg-surface-container text-on-surface-variant px-3 py-1 rounded font-label-md text-label-md inline-block">
                        {statusLabel}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end gap-unit">
                  <div className="flex space-x-2 mb-2">
                    {/* Botón de compartir reemplazado por <ShareMenu/>: un desplegable propio
                        con WhatsApp/Facebook/Telegram/X/Email/Copiar, que funciona también
                        sobre HTTP (el menú nativo navigator.share requiere HTTPS). */}
                    <ShareMenu
                      url={typeof window !== 'undefined' ? window.location.href : ''}
                      title={property?.title || 'Propiedad — Manhattan'}
                      text={property ? `${property.title} — ${formatPrice(property.currency, property.price)}` : 'Mirá esta propiedad en Inmobiliaria Manhattan'}
                    />
                    {/* <button className="p-2 border border-outline-variant rounded text-on-surface-variant hover:bg-surface-container-low transition-colors"> */}
                      {/* <span className="material-symbols-outlined">print</span> */}
                    {/* </button> */}
                    {/* COMENTADO: botón de favoritos. Se deshabilitó porque no existen
                        usuarios en la base de datos, por lo que el favorito no se guardaría
                        en ningún lado (solo era un estado local que se perdía al recargar). */}
                    {/* <button
                      className={`p-2 border border-outline-variant rounded transition-colors ${favorited ? 'text-secondary bg-surface-container' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
                      onClick={() => setFavorited(f => !f)}
                    >
                      <span className={`material-symbols-outlined${favorited ? ' fill-1' : ''}`}>favorite</span>
                    </button> */}
                  </div>
                  <span className="font-price-display text-price-display text-primary">
                    {formatPrice(property.currency, property.price)}
                  </span>
                </div>
              </div>
            </div>

            {/* Galería de imágenes. Antes era un grid "bento" (main + 2 fotos) que se
                amontonaba y se rompía con muchas imágenes; se reemplazó por un carrusel
                con flechas + autoplay cada 5s (26/07/2026). El markup viejo quedó
                comentado abajo (no eliminado, según regla del proyecto). */}
            {images.length > 0 ? (
              <ImageCarousel images={images} alt={property.title} />
            ) : (
              <div className="h-[300px] rounded-xl bg-surface-container flex items-center justify-center border border-outline-variant">
                <div className="flex flex-col items-center gap-3 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[48px]">image_not_supported</span>
                  <span className="font-body-md text-body-md">Sin imágenes disponibles</span>
                </div>
              </div>
            )}
            {/* MARKUP VIEJO DE LA GALERÍA (grid "bento"), comentado y no eliminado según
                la regla del proyecto. Reemplazado por <ImageCarousel/> arriba:
            {images.length > 0 ? (
              <div className={`grid gap-unit h-[400px] md:h-[520px] rounded-xl overflow-hidden ${images.length >= 2 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'}`}>
                <div className={`h-full relative group cursor-pointer ${images.length >= 2 ? 'md:col-span-2' : ''}`}>
                  <img alt={property.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src={mainImg} />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                </div>
                {images.length >= 2 && (
                  <div className="hidden md:flex flex-col gap-unit h-full">
                    {img2 && (
                      <div className="h-1/2 relative group cursor-pointer overflow-hidden">
                        <img alt={`${property.title} - foto 2`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src={img2} />
                      </div>
                    )}
                    {img3 && (
                      <div className="h-1/2 relative group cursor-pointer overflow-hidden">
                        <img alt={`${property.title} - foto 3`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src={img3} />
                        {extraCount > 0 && (
                          <div className="absolute bottom-4 right-4 bg-surface/90 backdrop-blur-sm px-4 py-2 rounded flex items-center gap-2 font-label-md text-label-md text-primary shadow-sm">
                            <span className="material-symbols-outlined text-[18px]">photo_library</span>
                            +{extraCount} fotos
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
            */}

            {/* Quick Specs */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm">
              <div className="flex flex-wrap justify-center md:grid md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-outline-variant">

                <div className="flex flex-col items-center justify-center gap-2 px-6 py-6 w-full md:w-auto">
                  <span className="text-on-surface-variant font-label-md text-label-md uppercase tracking-wide text-xs">
                    Tipo de propiedad
                  </span>
                  <span className="text-primary font-headline-md text-headline-md font-bold">
                    {typeLabel}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center gap-2 px-6 py-6 w-full md:w-auto">
                  <span className="material-symbols-outlined text-primary text-[32px]">bed</span>
                  <span className="text-on-surface-variant font-body-md text-body-md">
                    {property.bedrooms != null
                      ? <><strong className="text-primary">{property.bedrooms}</strong> Dormitorio{property.bedrooms !== 1 ? 's' : ''}</>
                      : <span className="text-outline">—</span>
                    }
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center gap-2 px-6 py-6 w-full md:w-auto">
                  <span className="material-symbols-outlined text-primary text-[32px]">shower</span>
                  <span className="text-on-surface-variant font-body-md text-body-md">
                    {property.bathrooms != null
                      ? <><strong className="text-primary">{property.bathrooms}</strong> Baño{property.bathrooms !== 1 ? 's' : ''}</>
                      : <span className="text-outline">—</span>
                    }
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center gap-2 px-6 py-6 w-full md:w-auto">
                  <span className="material-symbols-outlined text-primary text-[32px]">directions_car</span>
                  <span className="text-on-surface-variant font-body-md text-body-md">
                    Cochera{' '}
                    <strong className="text-primary">{property.garage ? 'Sí' : 'No'}</strong>
                  </span>
                </div>

              </div>
            </div>

            {/* Content + Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">

              {/* Main column */}
              <div className="lg:col-span-2 flex flex-col gap-stack-lg">

                {/* Descripción */}
                <section className="bg-surface-container-lowest p-stack-md border border-outline-variant rounded-lg">
                  <h2 className="text-headline-md font-headline-md text-primary mb-stack-sm pb-2 border-b border-outline-variant">
                    Descripción
                  </h2>
                  <div className="text-on-surface-variant font-body-lg text-body-lg whitespace-pre-line">
                    {property.description}
                  </div>
                </section>

                {/* Características */}
                {characteristics.length > 0 && (
                  <section className="bg-surface-container-lowest p-stack-md border border-outline-variant rounded-lg">
                    <h2 className="text-headline-md font-headline-md text-primary mb-stack-sm pb-2 border-b border-outline-variant">
                      Características
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-gutter gap-y-1">
                      {characteristics.map(([label, value]) => (
                        <div key={label} className="flex justify-between py-3 border-b border-surface-variant last:border-0">
                          <span className="text-on-surface-variant font-body-md">{label}</span>
                          <span className="text-primary font-label-md font-semibold">{value}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Amenities de la propiedad (marcadas en el admin; catálogo gestionable) */}
                {property?.amenities?.length > 0 && (
                  <section className="bg-surface-container-lowest p-stack-md border border-outline-variant rounded-lg">
                    <h2 className="text-headline-md font-headline-md text-primary mb-stack-sm pb-2 border-b border-outline-variant">
                      Amenities
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {property.amenities.map((a) => (
                        <div key={a.id} className="flex items-center gap-2 py-2">
                          <span className="material-symbols-outlined text-[22px] text-secondary">{a.icon || 'check_circle'}</span>
                          <span className="font-body-md text-body-md text-on-surface">{a.label}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

              </div>

              {/* Sidebar – Formulario de contacto */}
              <div className="lg:col-span-1">
                <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-stack-md sticky top-24 shadow-sm">

                  <div className="flex items-center gap-4 mb-stack-md">
                    <div className="w-16 h-16 bg-surface-variant rounded-full flex items-center justify-center overflow-hidden border border-outline-variant flex-shrink-0">
                      <span className="material-symbols-outlined text-[32px] text-on-surface-variant">person</span>
                    </div>
                    <div>
                      <h3 className="font-headline-md text-primary text-[20px] font-semibold">Manhattan Agentes</h3>
                      <p className="text-on-surface-variant font-body-md text-body-md">Agencia Inmobiliaria</p>
                    </div>
                  </div>

                  <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                    <input
                      className="w-full border border-outline-variant rounded px-4 py-3 bg-surface text-on-surface font-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors placeholder:text-outline"
                      name="name"
                      placeholder="Nombre"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                    />
                    {/* Inputs Email y Teléfono comentados (no eliminados, según regla del
                        proyecto). Motivo: el cliente pidió quitarlos del formulario de la
                        propiedad (26/07/2026); la consulta va por WhatsApp, donde el número
                        del interesado ya queda registrado por el propio chat.
                    <input
                      className="w-full border border-outline-variant rounded px-4 py-3 bg-surface text-on-surface font-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors placeholder:text-outline"
                      name="email"
                      placeholder="Email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                    />
                    <input
                      className="w-full border border-outline-variant rounded px-4 py-3 bg-surface text-on-surface font-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors placeholder:text-outline"
                      name="phone"
                      placeholder="Teléfono"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                    */}
                    <textarea
                      className="w-full border border-outline-variant rounded px-4 py-3 bg-surface text-on-surface font-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors placeholder:text-outline resize-none"
                      name="message"
                      placeholder="Hola, me interesa esta propiedad..."
                      rows={4}
                      value={formData.message}
                      onChange={handleChange}
                    />
                    {/* El botón ya no usa "sending" ni disabled porque el envío es instantáneo (abre WhatsApp) */}
                    <button
                      className="w-full bg-secondary text-on-secondary hover:bg-secondary-container hover:text-on-secondary-container font-label-md text-label-md py-4 rounded transition-colors duration-200 mt-2"
                      type="submit"
                    >
                      Consultar por WhatsApp
                    </button>
                  </form>

                  {/* Botones de contacto directo: antes eran <button> sin acción; ahora son
                      links reales a WhatsApp (con mensaje de la propiedad) y a llamada */}
                  <div className="mt-stack-md pt-stack-sm border-t border-outline-variant flex justify-center gap-4">
                    <a
                      aria-label="Consultar por WhatsApp"
                      href={`https://wa.me/${WHATSAPP_CONSULTAS}?text=${encodeURIComponent(buildWhatsAppMessage(''))}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center w-12 h-12 rounded-full bg-[#25D366] text-white hover:opacity-90 transition-opacity">
                      <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                      </svg>
                    </a>
                    <a
                      aria-label="Llamar por teléfono"
                      href={`tel:${TEL_CONSULTAS.replace(/[^+\d]/g, '')}`}
                      className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors"
                    >
                      <span className="material-symbols-outlined">call</span>
                    </a>
                  </div>

                </div>
              </div>

            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
