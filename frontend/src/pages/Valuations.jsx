import { useState } from 'react';
import toast from 'react-hot-toast';
// import api from '../services/api'; // COMENTADO: ya no se envía a la API, ver nota abajo
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import Seo from '../components/Seo';
import { useSiteContent } from '../hooks/useSiteContent';
// Los textos e imagen del hero y de "Por qué elegirnos" son editables desde el admin
// (Ajustes → Contenido → Tasaciones). Defaults en config/siteContent.js.

// Página de Tasaciones — rediseño Manhattan Prestige basado en Stitch_Templates/valuations_Template.
// Design system unificado del DESIGN.md raíz + navbar/footer compartidos.
// Las solicitudes de tasación se envían por WhatsApp al número de Shaul
// (VITE_PHONE_SHAUL_WA en frontend/.env) con un mensaje formateado con los datos
// del formulario, a pedido del cliente (13/07/2026). Antes se guardaban vía
// POST /api/contacts; ese código quedó comentado dentro de handleSubmit.

const WHATSAPP_TASACIONES = import.meta.env.VITE_PHONE_SHAUL_WA || '5491160479977';

const HERO_BADGES = [
  { icon: 'verified', label: 'Tasación Certificada' },
  { icon: 'schedule', label: 'Respuesta en 24hs' },
  { icon: 'payments', label: 'Gratis' },
];

const PROCESS_STEPS = [
  { title: 'Solicitud', body: 'Completás el formulario con los datos básicos de tu propiedad.' },
  { title: 'Análisis Técnico', body: 'Nuestros tasadores analizan el mercado local y las características del inmueble.' },
  { title: 'Informe Final', body: 'Recibís una tasación precisa lista para el mercado inmobiliario.' },
];

const PROPERTY_TYPES = ['Departamento', 'Casa', 'Local Comercial', 'Oficina', 'Terreno'];

const INPUT_CLASS = 'w-full bg-surface border border-outline-variant rounded-lg p-3 font-body-md text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all';

const EMPTY_FORM = {
  location: '',
  propertyType: 'Departamento',
  rooms: '',
  area: '',
  observations: '',
  name: '',
  email: '',
  phone: '',
};

export default function Valuations() {
  const c = useSiteContent('valuations');
  // WhatsApp de las solicitudes de tasación, editable desde la propia sección Tasaciones.
  const waTarget = String(c.whatsapp || '').replace(/\D/g, '') || WHATSAPP_TASACIONES;
  const [form, setForm] = useState(EMPTY_FORM);
  // COMENTADO: estado "sending" ya no es necesario porque el envío dejó de ser una
  // request asíncrona a la API; ahora solo se abre WhatsApp con el mensaje armado.
  // const [sending, setSending] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // VERSIÓN ANTERIOR COMENTADA (no eliminada, según regla del proyecto).
  // Motivo: guardaba la solicitud en la BD vía POST /api/contacts; el cliente pidió
  // que todo vaya directo por WhatsApp al número de Shaul (13/07/2026).
  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   setSending(true);
  //   try {
  //     const message = [
  //       'SOLICITUD DE TASACIÓN',
  //       `Ubicación: ${form.location}`,
  //       `Tipo de propiedad: ${form.propertyType}`,
  //       form.rooms && `Ambientes: ${form.rooms}`,
  //       form.area && `Superficie total: ${form.area} m²`,
  //     ].filter(Boolean).join('\n');
  //     await api.post('/contacts', { name: form.name, email: form.email, phone: form.phone, message });
  //     toast.success('¡Solicitud enviada! Un asesor se contactará a la brevedad.');
  //     setForm(EMPTY_FORM);
  //   } catch {
  //     toast.error('No se pudo enviar la solicitud. Intentá de nuevo.');
  //   } finally {
  //     setSending(false);
  //   }
  // };

  const handleSubmit = (e) => {
    e.preventDefault();
    const message = [
      '¡Hola! Quiero solicitar una tasación de mi propiedad.',
      '',
      '*SOLICITUD DE TASACIÓN*',
      // Emojis 📍🏠🚪📐📝👤📧📞 comentados (27/07/2026): son caracteres "astral" (fuera del
      // plano básico de Unicode) que WhatsApp Desktop/Web decodifican mal al precargar el
      // texto vía link wa.me, mostrando "�" en su lugar. Se reemplazan por etiquetas de
      // texto plano (ver mismo fix en PropertyDetail.jsx y Contact.jsx).
      // `📍 Ubicación: ${form.location}`,
      // `🏠 Tipo de propiedad: ${form.propertyType}`,
      // form.rooms && `🚪 Ambientes: ${form.rooms}`,
      // form.area && `📐 Superficie total: ${form.area} m²`,
      // form.observations && `📝 Observaciones: ${form.observations}`,
      `Ubicación: ${form.location}`,
      `Tipo de propiedad: ${form.propertyType}`,
      form.rooms && `Ambientes: ${form.rooms}`,
      form.area && `Superficie total: ${form.area} m²`,
      form.observations && `Observaciones: ${form.observations}`,
      '',
      '*Mis datos de contacto*',
      // `👤 Nombre: ${form.name}`,
      // `📧 Email: ${form.email}`,
      // form.phone && `📞 Teléfono: ${form.phone}`,
      `Nombre: ${form.name}`,
      `Email: ${form.email}`,
      form.phone && `Teléfono: ${form.phone}`,
    ].filter(Boolean).join('\n');
    window.open(`https://wa.me/${waTarget}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    toast.success('Abriendo WhatsApp con tu solicitud...');
    setForm(EMPTY_FORM);
  };

  return (
    <div className="bg-background text-on-background font-body-md antialiased">
      <Seo
        title="Tasaciones sin cargo"
        description="Tasamos tu propiedad sin cargo y sin compromiso. Valuación profesional de casas, departamentos y locales en CABA."
        path="/tasaciones"
      />
      <PublicNavbar active="Tasaciones" />

      <main>
        {/* Hero */}
        <section className="relative h-[600px] flex items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            {/* src antes hardcodeado; ahora c.heroImage (default = misma imagen) */}
            <img
              alt="Edificio de lujo al atardecer"
              className="w-full h-full object-cover"
              src={c.heroImage}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/40"></div>
          </div>
          <div className="relative z-10 w-full px-margin-mobile md:px-margin-desktop max-w-[1280px] mx-auto">
            <div className="max-w-2xl text-on-primary">
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-xl md:text-headline-xl mb-stack-sm">{c.heroTitle}</h1>
              <p className="font-body-lg text-body-lg mb-stack-lg text-on-primary-container">
                {c.heroSubtitle}
              </p>
              <div className="flex flex-wrap gap-4">
                {HERO_BADGES.map(({ icon, label }) => (
                  <div key={label} className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl">
                    <span className="material-symbols-outlined text-secondary-container">{icon}</span>
                    <span className="font-label-md text-label-md">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Formulario + Por qué elegirnos */}
        <section className="max-w-[1280px] mx-auto px-margin-mobile md:px-margin-desktop -mt-24 relative z-20 pb-stack-lg">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            {/* Formulario de tasación */}
            <div className="lg:col-span-7 bg-surface-container-lowest p-stack-md md:p-stack-lg rounded-xl shadow-xl border border-outline-variant">
              <div className="mb-stack-md">
                <h2 className="font-headline-lg text-headline-lg text-primary">{c.formTitle}</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">{c.formSubtitle}</p>
              </div>
              <form className="space-y-stack-md" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-sm">
                  <div className="flex flex-col gap-2">
                    <label className="font-label-md text-label-md text-primary" htmlFor="location">Ubicación de la Propiedad</label>
                    <input className={INPUT_CLASS} id="location" name="location" placeholder="Calle, Número, Ciudad" required type="text" value={form.location} onChange={handleChange} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="font-label-md text-label-md text-primary" htmlFor="propertyType">Tipo de Propiedad</label>
                    <select className={`${INPUT_CLASS} appearance-none`} id="propertyType" name="propertyType" value={form.propertyType} onChange={handleChange}>
                      {PROPERTY_TYPES.map(type => <option key={type}>{type}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-sm">
                  <div className="flex flex-col gap-2">
                    <label className="font-label-md text-label-md text-primary" htmlFor="rooms">Cantidad de Ambientes</label>
                    <input className={INPUT_CLASS} id="rooms" name="rooms" placeholder="Ej: 3" type="number" min="0" value={form.rooms} onChange={handleChange} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="font-label-md text-label-md text-primary" htmlFor="area">Superficie Total (m²)</label>
                    <input className={INPUT_CLASS} id="area" name="area" placeholder="Ej: 85" type="number" min="0" value={form.area} onChange={handleChange} />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-label-md text-label-md text-primary" htmlFor="observations">Observaciones</label>
                  <textarea
                    className={`${INPUT_CLASS} resize-none`}
                    id="observations"
                    name="observations"
                    placeholder="Contanos más sobre tu propiedad: estado, antigüedad, cochera, balcón, reformas, etc."
                    rows="3"
                    value={form.observations}
                    onChange={handleChange}
                  />
                </div>
                <div className="border-t border-outline-variant pt-stack-md">
                  <h3 className="font-label-md text-label-md text-primary mb-stack-sm">Tus Datos de Contacto</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-sm">
                    <input className={INPUT_CLASS} name="name" placeholder="Nombre completo" required type="text" value={form.name} onChange={handleChange} />
                    <input className={INPUT_CLASS} name="email" placeholder="Correo electrónico" required type="email" value={form.email} onChange={handleChange} />
                  </div>
                  <div className="mt-stack-sm">
                    <input className={INPUT_CLASS} name="phone" placeholder="Teléfono / WhatsApp" type="tel" value={form.phone} onChange={handleChange} />
                  </div>
                </div>
                {/* El botón ya no usa "sending" ni disabled porque el envío es instantáneo
                    (abre WhatsApp); se agregó el ícono para dejar claro el canal de envío */}
                <button
                  className="w-full bg-secondary text-on-secondary font-label-md text-label-md py-4 rounded-lg hover:brightness-90 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                  type="submit"
                >
                  <span className="material-symbols-outlined text-[20px]">forum</span>
                  Solicitar Tasación por WhatsApp
                </button>
                <p className="text-center font-body-md text-[12px] text-on-surface-variant opacity-70">Al enviar, aceptás nuestros términos de privacidad y tratamiento de datos.</p>
              </form>
            </div>

            {/* Por qué elegirnos */}
            <div className="lg:col-span-5 flex flex-col gap-gutter">
              <div className="bg-primary text-on-primary p-stack-md rounded-xl shadow-lg flex flex-col justify-between h-full">
                <div>
                  <span className="inline-block bg-secondary px-3 py-1 rounded-full text-[12px] font-bold uppercase tracking-wider mb-stack-sm">{c.whyEyebrow}</span>
                  <h3 className="font-headline-md text-headline-md mb-stack-sm">{c.whyTitle}</h3>
                  <p className="font-body-md text-body-md opacity-80">{c.whyText}</p>
                </div>
                <div className="mt-stack-lg grid grid-cols-2 gap-4">
                  <div className="border-l-2 border-secondary-container pl-4">
                    <div className="font-headline-lg text-headline-lg">15+</div>
                    <div className="font-label-md text-label-md opacity-70">Años de experiencia</div>
                  </div>
                  <div className="border-l-2 border-secondary-container pl-4">
                    <div className="font-headline-lg text-headline-lg">5k+</div>
                    <div className="font-label-md text-label-md opacity-70">Tasaciones anuales</div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                <div className="bg-surface-container-high p-6 rounded-xl border border-outline-variant">
                  <div className="w-12 h-12 bg-primary-container rounded-lg flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined fill-1 text-on-primary-container">insights</span>
                  </div>
                  <h4 className="font-label-md text-label-md text-primary mb-2">Reporte Detallado</h4>
                  <p className="text-[14px] leading-relaxed text-on-surface-variant">Recibí un análisis técnico de comparables en la zona.</p>
                </div>
                <div className="bg-surface-container-high p-6 rounded-xl border border-outline-variant">
                  <div className="w-12 h-12 bg-primary-container rounded-lg flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined fill-1 text-on-primary-container">security</span>
                  </div>
                  <h4 className="font-label-md text-label-md text-primary mb-2">Confidencialidad</h4>
                  <p className="text-[14px] leading-relaxed text-on-surface-variant">Tus datos y el valor de tu propiedad están protegidos.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Proceso */}
        <section className="bg-surface-container-lowest py-stack-lg border-t border-outline-variant">
          <div className="max-w-[1280px] mx-auto px-margin-mobile md:px-margin-desktop">
            <div className="text-center mb-stack-lg">
              <h2 className="font-headline-lg text-headline-lg text-primary">Nuestro Proceso de Tasación</h2>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-xl mx-auto">Un camino claro y profesional para conocer el valor real de tu inversión.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter relative">
              {PROCESS_STEPS.map(({ title, body }, i) => (
                <div key={title} className="flex flex-col items-center text-center p-6 bg-background rounded-xl shadow-sm border border-outline-variant hover:border-primary transition-colors">
                  <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary flex items-center justify-center mb-stack-sm font-headline-md text-headline-md">{i + 1}</div>
                  <h3 className="font-label-md text-label-md text-primary mb-2">{title}</h3>
                  <p className="font-body-md text-[14px] text-on-surface-variant">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
