import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import { useSiteContent } from '../hooks/useSiteContent';

// Página Nosotros — rediseño Manhattan Prestige basado en Stitch_Templates/aboutUs_Template.
// El template original venía de otro set (Montserrat + otros tonos); acá se aplica el
// design system unificado del DESIGN.md raíz (Manrope/Inter, primary #00172b,
// secondary #bb000f) y el navbar/footer compartidos, como pidió el cliente.
//
// Los textos (hero, historia, misión, visión, equipo) y la imagen institucional son
// editables desde el admin (Ajustes → Contenido → Nosotros); sus defaults viven en
// config/siteContent.js. Los VALUES y el equipo (TEAM) siguen fijos por ahora: son
// listas repetibles (con fotos) que requieren un editor de ítems aparte.

// PILLARS COMENTADO (no eliminado, según regla del proyecto): Misión y Visión pasaron
// a ser editables; ahora el array se arma dentro del componente a partir del contenido
// (ver `pillars` en AboutUs()). Los textos por defecto se conservan en siteContent.js.
// const PILLARS = [
//   {
//     icon: 'flag',
//     title: 'Nuestra Misión',
//     body: 'Brindar asesoramiento integral y estratégico en el mercado inmobiliario, garantizando transacciones seguras, transparentes y altamente rentables para nuestros clientes institucionales y particulares.',
//   },
//   {
//     icon: 'visibility',
//     title: 'Nuestra Visión',
//     body: 'Ser reconocidos como la firma líder y de mayor prestigio en negocios inmobiliarios de Buenos Aires, estableciendo el estándar de excelencia, ética y profesionalismo en cada operación.',
//   },
// ];

const VALUES = ['Integridad absoluta', 'Excelencia corporativa', 'Innovación constante', 'Confidencialidad'];

// TEAM COMENTADO (no eliminado, según regla del proyecto): el equipo pasó a ser
// editable desde el admin (Ajustes → Contenido → Nosotros → Integrantes del Equipo),
// con carga de foto por integrante. Ahora se lee de c.team; los valores por defecto
// —estos mismos— se conservan en config/siteContent.js (campo 'team' de 'about').
// const TEAM = [
//   {
//     name: 'Carlos V.',
//     role: 'Director General',
//     img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBcvmyAp9ZFyKa9uDqPIyzwtGvbEkUTn8W6S_ch5oJnBIY98PhNVXqegzUfz-KAmv6aTTwBs_WucFzPHI3p9FiPcIrmm7uTl4XdNxSyrLMt7WsGDRbff3LiwrKsabPQuCifUHxs8w2ifPKUPXQKwlL_J-UWjC3OKyZN1PQOt04YdfW-9sKxVW6U_3qFxGRyzVHuSQV1EeU-x1cvjLSbU3ddhyXpKYbBxyASVLcCRCX6b6CBlmWRk83a',
//   },
//   {
//     name: 'Mariana L.',
//     role: 'Directora Comercial',
//     img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBRMFE-Ad3zUNoBomnybBbUvhHG5BqpwhgL203y5cW_nhQRD25hEEXxxoUWkCplJTLd1nzOamG-OW6h63lgy-X2ZxGGg9dDpt_Qj9NinaWGntxWP3-laR_EVHgNpXxev-GwfRFBYcPf6WRW6swSa6DHA9Ne5c-OZ32RQbgFi2HwHjFOUib9HVTgus5kfjxGLzweBsIQNXOTZl-7d3xF0KGRzPJ1vB_oPHa1JihYYdSsNnN6u1WZ9DzU',
//   },
//   {
//     name: 'Javier M.',
//     role: 'Asesor Senior',
//     img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTN5Lzg57FSq-mNZ1Iq-OJZ121Ub5-mayQY3CoN42v-QJxGF3W4nk9qDrVjRQURWIkojhUXU43bnwWqUYDUY0S5ufqBYeXb5lo3pQew7WxNNKqy7vE3KblCzb7vNDM6Kzi3VnN2kTV0_6v-HMhnVBY4IknLBJr2c4FJwQ2pV4WrbKa5ioXmoAGjklIfM9Onv9nhX6oer-VD02VfyssQMbUVJOlKanow7lJbhQ_lrMzQstoqdRjCc51',
//   },
//   {
//     name: 'Dra. Elena S.',
//     role: 'Asesoría Legal',
//     img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBZq94pfg7HnZhTea_Ypk2Mrpaad_mEGkVbvvVTQOEU1Hy64m4lBILNWNl-CTwzmFu1UCuEs65AWx-5vKTd_RL2aY1zzzjkgvrzZRbBTRph5VUa1j0t1GXAEfKX-IcWJqwHfDhljTkqXVQpET7A23RKDy_y-oEfT7cbiUTgf5tVY3l6Kc1eKIVEuSZFliHWNt5gvchhdgcBxyysqIApbne_P4eR5dccHytgWCqW3s_X1bOwF9pHCeuM',
//   },
// ];

export default function AboutUs() {
  const c = useSiteContent('about');
  // Misión y Visión, ahora editables, se arman desde el contenido (reemplaza al
  // array PILLARS que estaba hardcodeado arriba, hoy comentado).
  const pillars = [
    { icon: 'flag', title: c.missionTitle, body: c.missionText },
    { icon: 'visibility', title: c.visionTitle, body: c.visionText },
  ];
  return (
    <div className="bg-background text-on-background font-body-md antialiased min-h-screen flex flex-col">
      <PublicNavbar active="Nosotros" />

      <main className="flex-grow">
        {/* Hero */}
        <section className="max-w-[1280px] mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg md:py-24">
          <div className="max-w-3xl">
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-xl md:text-headline-xl text-primary mb-stack-sm">{c.heroTitle}</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              {c.heroSubtitle}
            </p>
          </div>
        </section>

        {/* Historia + Stats */}
        <section className="max-w-[1280px] mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant rounded-lg p-stack-md md:p-8 flex flex-col justify-center">
              <h2 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-primary mb-stack-md">{c.historyTitle}</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mb-stack-md">
                {c.historyText1}
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {c.historyText2}
              </p>
            </div>
            <div className="lg:col-span-5 grid grid-cols-2 gap-stack-sm md:gap-stack-md">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-stack-md flex flex-col items-center justify-center text-center shadow-sm hover:shadow-[0_4px_20px_rgba(0,23,43,0.08)] transition-shadow">
                <span className="font-headline-xl text-headline-xl text-secondary mb-2">+15</span>
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Años en el Mercado</span>
              </div>
              <div className="bg-primary text-on-primary rounded-lg p-stack-md flex flex-col items-center justify-center text-center shadow-sm">
                <span className="font-headline-xl text-headline-xl mb-2">2.5k</span>
                <span className="font-label-md text-label-md uppercase tracking-wider">Propiedades Vendidas</span>
              </div>
              <div className="col-span-2 bg-surface-container-lowest border border-outline-variant rounded-lg p-stack-md flex flex-col sm:flex-row items-center justify-between shadow-sm hover:shadow-[0_4px_20px_rgba(0,23,43,0.08)] transition-shadow">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined fill-1 text-4xl text-secondary">handshake</span>
                  <div className="text-left">
                    <span className="block font-headline-md text-headline-md text-primary">Clientes Satisfechos</span>
                    <span className="block font-body-md text-body-md text-on-surface-variant">Relaciones a largo plazo basadas en la confianza.</span>
                  </div>
                </div>
                <span className="font-headline-xl text-headline-xl text-primary mt-4 sm:mt-0">99%</span>
              </div>
            </div>
          </div>
        </section>

        {/* Imagen institucional. backgroundImage antes hardcodeado; ahora usa
            c.institutionalImage (el default es la misma imagen de siempre). */}
        <section className="max-w-[1280px] mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg">
          <div className="w-full h-64 md:h-96 rounded-lg overflow-hidden border border-outline-variant">
            <div
              className="bg-cover bg-center w-full h-full"
              role="img"
              aria-label="Oficinas de Manhattan Negocios Inmobiliarios"
              style={{ backgroundImage: `url('${c.institutionalImage}')` }}
            ></div>
          </div>
        </section>

        {/* Misión, Visión, Valores */}
        <section className="bg-surface-container-low py-stack-lg md:py-24 mt-stack-lg">
          <div className="max-w-[1280px] mx-auto px-margin-mobile md:px-margin-desktop">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
              {pillars.map(({ icon, title, body }) => (
                <div key={title} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-stack-lg shadow-sm hover:-translate-y-1 transition-transform duration-300">
                  <span className="material-symbols-outlined text-3xl text-secondary mb-stack-md">{icon}</span>
                  <h3 className="font-headline-md text-headline-md text-primary mb-stack-sm">{title}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">{body}</p>
                </div>
              ))}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-stack-lg shadow-sm hover:-translate-y-1 transition-transform duration-300">
                <span className="material-symbols-outlined text-3xl text-secondary mb-stack-md">diamond</span>
                <h3 className="font-headline-md text-headline-md text-primary mb-stack-sm">Nuestros Valores</h3>
                <ul className="font-body-md text-body-md text-on-surface-variant space-y-2">
                  {VALUES.map(value => (
                    <li key={value} className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-primary">check_circle</span> {value}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Equipo */}
        <section className="max-w-[1280px] mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg md:py-24">
          <div className="text-center mb-stack-lg">
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-primary mb-stack-sm">{c.teamTitle}</h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mx-auto">
              {c.teamSubtitle}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-gutter">
            {/* Antes: TEAM (array fijo); ahora c.team, editable desde el admin */}
            {(c.team || []).map(({ name, role, img, whatsapp }, i) => {
              // Tarjeta clickeable al WhatsApp del integrante (27/07/2026): si el admin
              // cargó un número, tocar la tarjeta abre un chat directo con esa persona.
              // Sin número, la tarjeta se muestra igual pero no es clickeable (como antes).
              const phone = String(whatsapp || '').replace(/[^\d]/g, '');
              const Wrapper = phone ? 'a' : 'div';
              const wrapperProps = phone
                ? {
                    href: `https://wa.me/${phone}?text=${encodeURIComponent(`¡Hola ${name}! Vi la web de Inmobiliaria Manhattan y quiero hacer una consulta.`)}`,
                    target: '_blank',
                    rel: 'noopener,noreferrer',
                  }
                : {};
              return (
                <Wrapper key={`${name}-${i}`} {...wrapperProps} className={`group block ${phone ? 'cursor-pointer' : ''}`}>
                  <div className="aspect-[3/4] rounded-lg overflow-hidden border border-outline-variant mb-4 bg-surface-container-high relative">
                    <img
                      alt={`${name} — ${role}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      src={img}
                    />
                    {phone && (
                      <span className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-[18px]">chat</span>
                      </span>
                    )}
                  </div>
                  <h4 className="font-headline-md text-headline-md text-primary">{name}</h4>
                  <span className="font-label-md text-label-md text-secondary">{role}</span>
                </Wrapper>
              );
            })}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
