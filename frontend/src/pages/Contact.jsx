import { useState } from 'react';
import toast from 'react-hot-toast';
// import api from '../services/api'; // COMENTADO: la consulta ya no se guarda en la BD, va por WhatsApp (ver handleSubmit)
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import { useSiteContent } from '../hooks/useSiteContent';

// Página de Contacto — rediseño Manhattan Prestige basado en Stitch_Templates/contact_Template.
// El template original venía de otro set (Montserrat + otros tonos de navy/rojo); acá se
// aplica el design system unificado del DESIGN.md raíz (Manrope/Inter, primary #00172b,
// secondary #bb000f) y el navbar/footer compartidos, como pidió el cliente.
//
// Los textos (hero, título del form) y la info de contacto (dirección, WhatsApp,
// email, horarios) son editables desde el admin (Ajustes → Contenido → Contacto);
// sus defaults viven en config/siteContent.js. El mapa embebido se arma con la
// dirección editable. Los teléfonos del bloque "respuesta inmediata" siguen viniendo
// de las variables VITE_* del .env (ver más abajo).

// CONTACT_INFO COMENTADO (no eliminado, según regla del proyecto): pasó a armarse
// dentro del componente a partir del contenido editable; los valores por defecto se
// conservan en siteContent.js (infoAddress/infoWhatsapp/infoEmail/infoHours).
// const CONTACT_INFO = [
//   { icon: 'location_on', label: 'Dirección', lines: ['San Nicolás 387', 'CABA, Argentina'] },
//   { icon: 'forum', label: 'WhatsApp', lines: ['11-6047-9977'] },
//   { icon: 'mail', label: 'Email', lines: ['manhattan.inmo0@gmail.com'] },
//   { icon: 'schedule', label: 'Horarios de Atención', lines: ['Lun-Jue: 9:00 - 17:00', 'Vie: 9:00 - 15:30'] },
// ];

const INPUT_CLASS = 'w-full bg-surface border border-outline-variant rounded p-3 font-body-md text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors';

// Teléfonos para el bloque "¿Necesita una respuesta inmediata?".
// Se configuran en frontend/.env (ver .env.example); al ser variables de Vite se
// incrustan al build, con fallback al número general de la inmobiliaria.
// Valores hardcodeados anteriores comentados (no eliminados, según regla del proyecto):
// motivo: se movieron a .env a pedido del usuario para que queden configurables.
// const PHONE_SHAUL = { tel: '+54 9 11-6047-9977', wa: '5491160479977' };
// const PHONE_SALOMON = { wa: '5491160479977' };
const PHONE_SHAUL = {
  tel: import.meta.env.VITE_PHONE_SHAUL_TEL || '+5491160479977',
  wa: import.meta.env.VITE_PHONE_SHAUL_WA || '5491160479977',
};
const PHONE_SALOMON = {
  wa: import.meta.env.VITE_PHONE_SALOMON_WA || '5491160479977',
};

export default function ContactPage() {
  const c = useSiteContent('contact');
  // Info de contacto armada desde el contenido editable (reemplaza al CONTACT_INFO
  // hardcodeado, hoy comentado arriba). Los campos multilínea (dirección, horarios)
  // se parten por saltos de línea para respetar el formato de varias filas.
  const contactInfo = [
    { icon: 'location_on', label: 'Dirección', lines: String(c.infoAddress || '').split('\n') },
    { icon: 'forum', label: 'WhatsApp', lines: [c.infoWhatsapp] },
    { icon: 'mail', label: 'Email', lines: [c.infoEmail] },
    { icon: 'schedule', label: 'Horarios de Atención', lines: String(c.infoHours || '').split('\n') },
  ];
  // Query para el mapa embebido y el link "Cómo llegar": se arma con la dirección editable.
  const mapQuery = encodeURIComponent(String(c.infoAddress || '').split('\n').filter(Boolean).join(', '));
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  // COMENTADO: estado "sending" ya no es necesario porque el envío dejó de ser una
  // request asíncrona a la API; ahora solo se abre WhatsApp con el mensaje armado.
  // const [sending, setSending] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // VERSIÓN ANTERIOR COMENTADA (no eliminada, según regla del proyecto).
  // Motivo: guardaba la consulta en la BD vía POST /api/contacts, pero el panel de
  // Consultas del admin se eliminó (15/07/2026); ahora la consulta va directo por
  // WhatsApp al número de Shaul, igual que las solicitudes de tasación.
  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   setSending(true);
  //   try {
  //     await api.post('/contacts', form);
  //     toast.success('¡Consulta enviada! Te responderemos a la brevedad.');
  //     setForm({ name: '', email: '', phone: '', message: '' });
  //   } catch {
  //     toast.error('No se pudo enviar la consulta. Intentá de nuevo.');
  //   } finally {
  //     setSending(false);
  //   }
  // };

  const handleSubmit = (e) => {
    e.preventDefault();
    const message = [
      '¡Hola! Les escribo desde la web de Inmobiliaria Manhattan.',
      '',
      '*CONSULTA GENERAL*',
      // Emojis 📝👤📞 comentados (27/07/2026): son caracteres "astral" (fuera del plano
      // básico de Unicode) que WhatsApp Desktop/Web decodifican mal al precargar el texto
      // vía link wa.me, mostrando "�" en su lugar. Se reemplazan por etiquetas de texto
      // plano (ver mismo fix en PropertyDetail.jsx y Valuations.jsx).
      // `📝 ${form.message}`,
      `Mensaje: ${form.message}`,
      '',
      '*Mis datos de contacto*',
      // `👤 Nombre: ${form.name}`,
      `Nombre: ${form.name}`,
      // Email comentado: el input se quitó del formulario (26/07/2026), iría siempre vacío.
      // `📧 Email: ${form.email}`,
      // form.phone && `📞 Teléfono: ${form.phone}`,
      form.phone && `Teléfono: ${form.phone}`,
    ].filter(Boolean).join('\n');
    window.open(`https://wa.me/${PHONE_SHAUL.wa}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    toast.success('Abriendo WhatsApp con tu consulta...');
    setForm({ name: '', email: '', phone: '', message: '' });
  };

  return (
    <div className="bg-background text-on-background font-body-md antialiased min-h-screen flex flex-col">
      <PublicNavbar active="Contacto" />

      {/* Espaciado vertical reducido (20/07/2026) para que la página entre sin scroll:
          py-stack-md en vez de lg, hero más compacto, form con space-y-stack-sm. */}
      <main className="flex-grow w-full max-w-[1280px] mx-auto px-margin-mobile md:px-margin-desktop py-stack-md">
        {/* Hero */}
        <div className="text-center mb-stack-md">
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-primary mb-2">{c.heroTitle}</h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mx-auto">
            {c.heroSubtitle}
          </p>
        </div>

        {/* Bento grid: formulario + info.
            items-start evita que la columna del formulario se estire para igualar la
            altura de la columna derecha (info + mapa), lo que dejaba un espacio blanco
            debajo del formulario (20/07/2026). */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
          {/* Formulario */}
          <section className="lg:col-span-7 bg-surface-container-lowest p-stack-md rounded-xl border border-outline-variant shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary"></div>
            <h2 className="font-headline-md text-headline-md text-primary mb-stack-sm">{c.formTitle}</h2>
            <form className="space-y-stack-sm" onSubmit={handleSubmit}>
              {/* Antes: grid de 2 columnas con Nombre + Correo electrónico. El input de email
                  se comentó (no eliminado, según regla del proyecto) a pedido del cliente
                  (26/07/2026); Nombre pasa a ocupar todo el ancho. La consulta va por WhatsApp. */}
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-2" htmlFor="name">Nombre completo</label>
                <input className={INPUT_CLASS} id="name" name="name" placeholder="Ej. Juan Pérez" required type="text" value={form.name} onChange={handleChange} />
              </div>
              {/* <div>
                <label className="block font-label-md text-label-md text-on-surface mb-2" htmlFor="email">Correo electrónico</label>
                <input className={INPUT_CLASS} id="email" name="email" placeholder="tu@email.com" required type="email" value={form.email} onChange={handleChange} />
              </div> */}
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-2" htmlFor="phone">Teléfono / Celular</label>
                <input className={INPUT_CLASS} id="phone" name="phone" placeholder="Ej. 11-6047-9977" type="tel" value={form.phone} onChange={handleChange} />
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-2" htmlFor="message">Mensaje</label>
                <textarea className={`${INPUT_CLASS} resize-none`} id="message" name="message" placeholder="Escribí tu consulta aquí..." required rows={3} value={form.message} onChange={handleChange} />
              </div>
              {/* El botón ya no usa "sending" ni disabled porque el envío es instantáneo (abre WhatsApp) */}
              <button
                className="w-full md:w-auto bg-primary text-on-primary px-8 py-3 rounded font-label-md text-label-md hover:bg-primary-container transition-colors shadow-sm flex items-center justify-center gap-2"
                type="submit"
              >
                <span>Enviar por WhatsApp</span>
                <span className="material-symbols-outlined">send</span>
              </button>
            </form>

            {/* Respuesta inmediata: contacto directo por teléfono / WhatsApp (pedido del cliente 13/07/2026) */}
            <div className="mt-stack-md bg-[#eaf7ef] border border-[#c4e8d1] rounded-lg p-stack-sm">
              <h3 className="font-label-md text-label-md text-on-surface uppercase tracking-wider mb-1">¿Necesita una respuesta inmediata?</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-stack-sm">
                Para consultas urgentes, contáctenos directamente por teléfono o WhatsApp
              </p>
              {/* Botones dinámicos: se arman desde c.contactButtons (editables en
                  Ajustes → Contenido → Contacto). Cada uno define tipo (Llamar/WhatsApp),
                  texto y número. Los 3 botones fijos originales quedaron comentados abajo. */}
              <div className="flex flex-wrap gap-3">
                {(c.contactButtons || []).map((btn, i) => {
                  const isCall = btn.kind === 'call';
                  const href = isCall
                    ? `tel:${String(btn.number || '').replace(/[^+\d]/g, '')}`
                    : `https://wa.me/${String(btn.number || '').replace(/[^\d]/g, '')}`;
                  return (
                    <a
                      key={`${btn.label}-${i}`}
                      className={`${isCall ? 'bg-[#f5a623]' : 'bg-[#25b558]'} text-white px-5 py-2.5 rounded font-label-md text-label-md hover:brightness-95 transition-all shadow-sm flex items-center gap-2`}
                      href={href}
                      {...(isCall ? {} : { target: '_blank', rel: 'noreferrer' })}
                    >
                      <span className="material-symbols-outlined text-[18px]">{isCall ? 'call' : 'forum'}</span>
                      {btn.label}
                    </a>
                  );
                })}
              </div>
              {/* Botones fijos originales (no eliminados, según regla del proyecto):
                  reemplazados por el render dinámico de arriba. Los números venían de
                  las variables VITE_* del .env; ahora se gestionan desde el CMS.
              <div className="flex flex-wrap gap-3">
                <a
                  className="bg-[#f5a623] text-white px-5 py-2.5 rounded font-label-md text-label-md hover:brightness-95 transition-all shadow-sm flex items-center gap-2"
                  href={`tel:${PHONE_SHAUL.tel.replace(/[^+\d]/g, '')}`}
                >
                  <span className="material-symbols-outlined text-[18px]">call</span>
                  Llamar Shaul
                </a>
                <a
                  className="bg-[#25b558] text-white px-5 py-2.5 rounded font-label-md text-label-md hover:brightness-95 transition-all shadow-sm flex items-center gap-2"
                  href={`https://wa.me/${PHONE_SHAUL.wa}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="material-symbols-outlined text-[18px]">forum</span>
                  WhatsApp Shaul
                </a>
                <a
                  className="bg-[#25b558] text-white px-5 py-2.5 rounded font-label-md text-label-md hover:brightness-95 transition-all shadow-sm flex items-center gap-2"
                  href={`https://wa.me/${PHONE_SALOMON.wa}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="material-symbols-outlined text-[18px]">forum</span>
                  WhatsApp Salomon
                </a>
              </div>
              */}
            </div>
          </section>

          {/* Info + mapa */}
          <aside className="lg:col-span-5 flex flex-col gap-gutter">
            <div className="bg-primary text-on-primary p-stack-md rounded-xl shadow-md flex flex-col gap-stack-md">
              <h3 className="font-headline-md text-headline-md">Información de Contacto</h3>
              {contactInfo.map(({ icon, label, lines }) => (
                <div key={label} className="flex items-start gap-4">
                  <span className="material-symbols-outlined mt-1">{icon}</span>
                  <div>
                    <p className="font-label-md text-label-md opacity-80 mb-1">{label}</p>
                    <p className="font-body-md text-body-md">
                      {lines.map((line, i) => (
                        <span key={line}>{i > 0 && <br />}{line}</span>
                      ))}
                    </p>
                  </div>
                </div>
              ))}
              {/* Botones de redes sociales comentados (no eliminados, según regla del proyecto).
                  Motivo: apuntaban a "#" y no hacían nada; el cliente pidió quitarlos (13/07/2026).
                  Si más adelante se cargan las URLs reales de Instagram/TikTok, se pueden reactivar.
              <div className="border-t border-primary-container pt-stack-md mt-2 flex gap-4">
                <a aria-label="Instagram" className="p-2 bg-primary-container rounded-full hover:bg-inverse-primary hover:text-primary transition-colors" href="#">
                  <span className="material-symbols-outlined">photo_camera</span>
                </a>
                <a aria-label="TikTok" className="p-2 bg-primary-container rounded-full hover:bg-inverse-primary hover:text-primary transition-colors" href="#">
                  <span className="material-symbols-outlined">play_circle</span>
                </a>
              </div>
              */}
            </div>

            {/* Mapa */}
            <div className="bg-surface-container-highest rounded-xl overflow-hidden h-64 shadow-inner relative border border-outline-variant">
              {/* src antes fijo a "San Nicolás 387..."; ahora se arma con la dirección editable (mapQuery) */}
              <iframe
                title="Ubicación Inmobiliaria Manhattan"
                className="w-full h-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
              />
              <div className="absolute bottom-4 right-4">
                <a
                  className="bg-surface text-primary px-4 py-2 rounded-full shadow-md font-label-md text-label-md text-sm flex items-center gap-2 hover:bg-surface-variant transition-colors border border-outline-variant"
                  href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="material-symbols-outlined text-[18px]">directions</span>
                  Cómo llegar
                </a>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CÓDIGO ORIGINAL COMENTADO (no eliminado, según regla del proyecto).
// Motivo: era un placeholder sin diseño; se reemplazó por la página completa del
// rediseño Manhattan Prestige (Stitch_Templates/contact_Template).
//
// export default function ContactPage() {
//   return <div className="p-8 text-2xl font-serif">Contacto</div>;
// }
