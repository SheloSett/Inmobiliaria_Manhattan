import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import { useSiteContent } from '../hooks/useSiteContent';

// Página de Postulaciones (10/08/2026) — partida en dos mitades horizontales:
//   ARRIBA  → postulación laboral: datos + CV adjunto.
//   ABAJO   → "Abrí una sucursal con nosotros": solo datos, sin archivo.
//
// Ambos formularios hacen lo mismo en dos pasos: primero guardan en la BD (para que
// queden en el panel admin) y después abren WhatsApp con el mensaje formateado, igual
// que Tasaciones y Contacto.
//
// IMPORTANTE (por qué el CV viaja como link y no como adjunto): los links wa.me solo
// permiten PRECARGAR TEXTO en el chat; no existe forma de adjuntarles un archivo. Por eso
// el CV se sube primero al backend (Cloudinary, resource_type raw) y lo que viaja en el
// mensaje es la URL de descarga que devuelve la API. Adjuntar el archivo de verdad
// requeriría la WhatsApp Cloud API de Meta (cuenta business + costo por conversación).

// Mismo criterio que Tasaciones/Contacto: número configurable por .env con el de Shaul
// como default. Se usa una variable propia para poder derivar las postulaciones a otro
// número (RRHH) sin tocar el resto del sitio.
const WHATSAPP_POSTULACIONES = import.meta.env.VITE_PHONE_RRHH_WA
  || import.meta.env.VITE_PHONE_SHAUL_WA
  || '5491160479977';

const INPUT_CLASS = 'w-full bg-surface border border-outline-variant rounded-lg p-3 font-body-md text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all';

// INPUT_CLASS_DARK comentado, no eliminado, según regla del proyecto.
// Motivo: era la variante de input para el bloque inferior sobre fondo oscuro, cuando la
// página estaba partida en dos mitades apiladas. Al pasar a un único bloque con solapas
// (10/08/2026) los dos formularios comparten el mismo card claro y usan INPUT_CLASS.
// const INPUT_CLASS_DARK = 'w-full bg-white/10 border border-white/25 rounded-lg p-3 font-body-md text-body-md text-on-primary placeholder:text-on-primary/50 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all';

// Solapas del selector: cada una define su ícono y de qué claves del CMS saca los textos.
const FORM_TABS = [
  { key: 'job', label: 'Postulación', icon: 'badge' },
  { key: 'branch', label: 'Abrir una sucursal', icon: 'storefront' },
];

const POSITIONS = [
  'Asesor comercial',
  'Captador de propiedades',
  'Administrativo / Recepción',
  'Marketing y redes',
  'Tasador',
  'Otro',
];

// Extensiones que acepta el input (espejo del fileFilter de cvUpload.middleware.js).
const CV_ACCEPT = '.pdf,.doc,.docx,.odt,.rtf';
const CV_MAX_BYTES = 10 * 1024 * 1024;

const EMPTY_JOB = {
  name: '',
  email: '',
  phone: '',
  city: '',
  position: POSITIONS[0],
  message: '',
};

const EMPTY_BRANCH = {
  name: '',
  email: '',
  phone: '',
  city: '',
  experience: '',
  message: '',
};

// Sin emojis a propósito: son caracteres "astral" (fuera del plano básico de Unicode)
// que WhatsApp Desktop/Web decodifican mal al precargar el texto vía link wa.me y se ven
// como "?". Mismo criterio ya aplicado en Valuations.jsx, Contact.jsx y PropertyDetail.jsx.
function buildJobMessage(form, cvUrl) {
  return [
    '¡Hola! Quiero postularme para trabajar con ustedes.',
    '',
    '*NUEVA POSTULACIÓN*',
    `Nombre: ${form.name}`,
    `Email: ${form.email}`,
    `Teléfono: ${form.phone}`,
    form.city && `Ciudad / Zona: ${form.city}`,
    `Puesto de interés: ${form.position}`,
    form.message && `Mensaje: ${form.message}`,
    '',
    '*CV adjunto*',
    cvUrl,
  ].filter(Boolean).join('\n');
}

function buildBranchMessage(form) {
  return [
    '¡Hola! Me interesa abrir una sucursal con ustedes.',
    '',
    '*SOLICITUD DE APERTURA DE SUCURSAL*',
    `Nombre: ${form.name}`,
    `Email: ${form.email}`,
    `Teléfono: ${form.phone}`,
    `Zona de interés: ${form.city}`,
    form.experience && `Experiencia: ${form.experience}`,
    form.message && `Mensaje: ${form.message}`,
  ].filter(Boolean).join('\n');
}

function openWhatsApp(message) {
  window.open(
    `https://wa.me/${WHATSAPP_POSTULACIONES}?text=${encodeURIComponent(message)}`,
    '_blank',
    'noopener,noreferrer'
  );
}

// Traduce el error de axios al mensaje que mandó el backend, que siempre viene en
// `error` (ver application.routes.js). Si no hay respuesta, es un problema de red.
function apiErrorMessage(err, fallback) {
  return err?.response?.data?.error || fallback;
}

// Beneficios de la sucursal. Desde el 10/08/2026 son una lista repetible del CMS
// (`branchBullets`, agregables/eliminables desde Ajustes → Contenido). El fallback a
// branchBullet1/2/3 cubre el caso de que esos tres campos fijos ya se hubieran editado y
// guardado antes del cambio: sin él, esos textos quedarían huérfanos en la BD y la página
// mostraría los defaults en su lugar.
function branchBenefits(c) {
  const list = Array.isArray(c.branchBullets)
    ? c.branchBullets.map((b) => b?.text).filter(Boolean)
    : [];
  if (list.length) return list;
  return [c.branchBullet1, c.branchBullet2, c.branchBullet3].filter(Boolean);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Applications() {
  const c = useSiteContent('applications');

  // Solapa activa del selector. Antes la página estaba partida en dos mitades apiladas
  // (postulación arriba, sucursal abajo); ahora es un único bloque donde se alterna entre
  // los dos formularios, al estilo de las solapas del panel admin (10/08/2026).
  const [formTab, setFormTab] = useState('job');

  // --- Estado del formulario de postulación (con CV) ---
  const [job, setJob] = useState(EMPTY_JOB);
  const [cv, setCv] = useState(null);
  const [sendingJob, setSendingJob] = useState(false);
  // Ref al <input type="file"> para poder limpiarlo después de enviar: el value de un
  // input file no se controla por estado, hay que resetearlo a mano.
  const cvInputRef = useRef(null);

  // --- Estado del bloque inferior (sucursal) ---
  const [branch, setBranch] = useState(EMPTY_BRANCH);
  const [sendingBranch, setSendingBranch] = useState(false);

  const handleJobChange = (e) => setJob({ ...job, [e.target.name]: e.target.value });
  const handleBranchChange = (e) => setBranch({ ...branch, [e.target.name]: e.target.value });

  const handleCvChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    // Se valida el tamaño acá además del backend para no hacerle subir 10 MB al
    // postulante y recién ahí avisarle que no entra.
    if (file && file.size > CV_MAX_BYTES) {
      toast.error('El archivo supera los 10 MB. Subí una versión más liviana de tu CV.');
      e.target.value = '';
      setCv(null);
      return;
    }
    setCv(file);
  };

  const handleJobSubmit = async (e) => {
    e.preventDefault();
    if (!cv) {
      toast.error('Adjuntá tu CV para completar la postulación.');
      return;
    }

    setSendingJob(true);
    try {
      // FormData porque va el archivo: axios arma el multipart y el boundary solo.
      const data = new FormData();
      Object.entries(job).forEach(([k, v]) => data.append(k, v));
      data.append('cv', cv);

      const res = await api.post('/applications/jobs', data);

      // Recién con la URL del CV devuelta por la API se puede armar el mensaje.
      openWhatsApp(buildJobMessage(job, res.data.cvUrl));
      toast.success('¡Postulación enviada! Abriendo WhatsApp...');
      setJob(EMPTY_JOB);
      setCv(null);
      if (cvInputRef.current) cvInputRef.current.value = '';
    } catch (err) {
      // No se abre WhatsApp si falló: el mensaje quedaría sin el link del CV, que es
      // justamente lo que la inmobiliaria necesita recibir.
      toast.error(apiErrorMessage(err, 'No se pudo enviar la postulación. Intentá de nuevo.'));
    } finally {
      setSendingJob(false);
    }
  };

  const handleBranchSubmit = async (e) => {
    e.preventDefault();
    setSendingBranch(true);
    const message = buildBranchMessage(branch);

    try {
      await api.post('/applications/branches', branch);
      openWhatsApp(message);
      toast.success('¡Solicitud enviada! Abriendo WhatsApp...');
      setBranch(EMPTY_BRANCH);
    } catch (err) {
      // A diferencia de la postulación, acá el mensaje NO depende del backend: si falla
      // el guardado igual se abre WhatsApp, porque el canal principal es el chat y sería
      // peor perder el contacto por un error de la BD. Solo se avisa que no quedó registrado.
      openWhatsApp(message);
      toast.error(apiErrorMessage(err, 'Abrimos WhatsApp, pero no pudimos registrar la solicitud.'));
      setBranch(EMPTY_BRANCH);
    } finally {
      setSendingBranch(false);
    }
  };

  return (
    <div className="bg-background text-on-background font-body-md antialiased">
      <PublicNavbar active="Postulaciones" />

      <main>
        {/* ══════════ Bloque único: hero + selector de formulario ══════════ */}
        <section className="relative">
          {/* Hero compacto: encabeza la página sin robarle espacio al formulario */}
          <div className="relative h-[320px] md:h-[380px] flex items-center overflow-hidden">
            <div className="absolute inset-0 z-0">
              <img alt="Equipo de Inmobiliaria Manhattan" className="w-full h-full object-cover" src={c.heroImage} />
              <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/40"></div>
            </div>
            <div className="relative z-10 w-full px-margin-mobile md:px-margin-desktop max-w-[1280px] mx-auto">
              <div className="max-w-2xl text-on-primary">
                <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-xl md:text-headline-xl mb-stack-sm">
                  {c.heroTitle}
                </h1>
                <p className="font-body-lg text-body-lg text-on-primary-container">{c.heroSubtitle}</p>
              </div>
            </div>
          </div>

          {/* Formularios (postulación / sucursal) con el selector de solapas */}
          <div className="max-w-[1280px] mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
              <div className="lg:col-span-7 bg-surface-container-lowest p-stack-md md:p-stack-lg rounded-xl shadow-xl border border-outline-variant">

                {/* Selector: alterna qué formulario se muestra. Mismo patrón visual que
                    las solapas del panel admin (subrayado en la activa). */}
                <div className="flex flex-wrap gap-1 border-b border-outline-variant mb-stack-md" role="tablist">
                  {FORM_TABS.map(({ key, label, icon }) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={formTab === key}
                      onClick={() => setFormTab(key)}
                      className={`px-4 md:px-5 py-3 font-label-md text-label-md transition-colors flex items-center gap-2 border-b-2 -mb-px ${
                        formTab === key
                          ? 'border-secondary text-primary'
                          : 'border-transparent text-on-surface-variant hover:text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Encabezado del formulario activo (textos editables desde el CMS) */}
                <div className="mb-stack-md">
                  <span className="inline-block bg-primary-container text-on-primary-container px-3 py-1 rounded-full text-[12px] font-bold uppercase tracking-wider mb-stack-sm">
                    {formTab === 'job' ? c.jobEyebrow : c.branchEyebrow}
                  </span>
                  <h2 className="font-headline-lg text-headline-lg text-primary">
                    {formTab === 'job' ? c.jobTitle : c.branchTitle}
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {formTab === 'job' ? c.jobSubtitle : c.branchSubtitle}
                  </p>
                </div>

                {formTab === 'job' && (
                <form className="space-y-stack-md" onSubmit={handleJobSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-sm">
                    <div className="flex flex-col gap-2">
                      <label className="font-label-md text-label-md text-primary" htmlFor="job-name">Nombre completo</label>
                      <input className={INPUT_CLASS} id="job-name" name="name" placeholder="Ej: Ana López" required type="text" value={job.name} onChange={handleJobChange} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="font-label-md text-label-md text-primary" htmlFor="job-email">Correo electrónico</label>
                      <input className={INPUT_CLASS} id="job-email" name="email" placeholder="tunombre@mail.com" required type="email" value={job.email} onChange={handleJobChange} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-sm">
                    <div className="flex flex-col gap-2">
                      <label className="font-label-md text-label-md text-primary" htmlFor="job-phone">Teléfono / WhatsApp</label>
                      <input className={INPUT_CLASS} id="job-phone" name="phone" placeholder="Ej: 11 5566 7788" required type="tel" value={job.phone} onChange={handleJobChange} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="font-label-md text-label-md text-primary" htmlFor="job-city">Ciudad / Zona</label>
                      <input className={INPUT_CLASS} id="job-city" name="city" placeholder="Ej: CABA, Zona Norte" type="text" value={job.city} onChange={handleJobChange} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="font-label-md text-label-md text-primary" htmlFor="job-position">Puesto de interés</label>
                    <select className={`${INPUT_CLASS} appearance-none`} id="job-position" name="position" value={job.position} onChange={handleJobChange}>
                      {POSITIONS.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="font-label-md text-label-md text-primary" htmlFor="job-message">Contanos sobre vos</label>
                    <textarea
                      className={`${INPUT_CLASS} resize-none`}
                      id="job-message"
                      name="message"
                      placeholder="Experiencia, formación, disponibilidad horaria, por qué te interesa el rubro..."
                      rows="3"
                      value={job.message}
                      onChange={handleJobChange}
                    />
                  </div>

                  {/* Adjuntar CV */}
                  <div className="flex flex-col gap-2">
                    <label className="font-label-md text-label-md text-primary" htmlFor="job-cv">Tu CV</label>
                    <label
                      htmlFor="job-cv"
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                        cv ? 'border-primary bg-primary-container/20' : 'border-outline-variant bg-surface hover:border-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-primary text-[28px]">
                        {cv ? 'description' : 'upload_file'}
                      </span>
                      <span className="min-w-0 flex-1">
                        {cv ? (
                          <>
                            <span className="block font-label-md text-label-md text-primary truncate">{cv.name}</span>
                            <span className="block text-[12px] text-on-surface-variant">{formatBytes(cv.size)} — tocá para cambiarlo</span>
                          </>
                        ) : (
                          <>
                            <span className="block font-label-md text-label-md text-on-surface">Adjuntar CV</span>
                            <span className="block text-[12px] text-on-surface-variant">PDF, DOC, DOCX, ODT o RTF — hasta 10 MB</span>
                          </>
                        )}
                      </span>
                    </label>
                    <input
                      ref={cvInputRef}
                      className="sr-only"
                      id="job-cv"
                      name="cv"
                      type="file"
                      accept={CV_ACCEPT}
                      onChange={handleCvChange}
                    />
                  </div>

                  <button
                    className="w-full bg-secondary text-on-secondary font-label-md text-label-md py-4 rounded-lg hover:brightness-90 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
                    type="submit"
                    disabled={sendingJob}
                  >
                    <span className="material-symbols-outlined text-[20px]">{sendingJob ? 'autorenew' : 'forum'}</span>
                    {sendingJob ? 'Subiendo tu CV...' : 'Enviar Postulación por WhatsApp'}
                  </button>
                  <p className="text-center font-body-md text-[12px] text-on-surface-variant opacity-70">
                    Al enviar, aceptás nuestros términos de privacidad y tratamiento de datos.
                  </p>
                </form>
                )}

                {formTab === 'branch' && (
                <form className="space-y-stack-md" onSubmit={handleBranchSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-sm">
                    <div className="flex flex-col gap-2">
                      <label className="font-label-md text-label-md text-primary" htmlFor="branch-name">Nombre completo</label>
                      <input className={INPUT_CLASS} id="branch-name" name="name" placeholder="Ej: Juan Pérez" required type="text" value={branch.name} onChange={handleBranchChange} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="font-label-md text-label-md text-primary" htmlFor="branch-email">Correo electrónico</label>
                      <input className={INPUT_CLASS} id="branch-email" name="email" placeholder="tunombre@mail.com" required type="email" value={branch.email} onChange={handleBranchChange} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-sm">
                    <div className="flex flex-col gap-2">
                      <label className="font-label-md text-label-md text-primary" htmlFor="branch-phone">Teléfono / WhatsApp</label>
                      <input className={INPUT_CLASS} id="branch-phone" name="phone" placeholder="Ej: 11 5566 7788" required type="tel" value={branch.phone} onChange={handleBranchChange} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="font-label-md text-label-md text-primary" htmlFor="branch-city">Ciudad / Zona donde abrirías</label>
                      <input className={INPUT_CLASS} id="branch-city" name="city" placeholder="Ej: Rosario, Santa Fe" required type="text" value={branch.city} onChange={handleBranchChange} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="font-label-md text-label-md text-primary" htmlFor="branch-experience">Experiencia en el rubro</label>
                    <input className={INPUT_CLASS} id="branch-experience" name="experience" placeholder="Ej: 5 años como asesor inmobiliario / Sin experiencia previa" type="text" value={branch.experience} onChange={handleBranchChange} />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="font-label-md text-label-md text-primary" htmlFor="branch-message">Contanos tu proyecto</label>
                    <textarea
                      className={`${INPUT_CLASS} resize-none`}
                      id="branch-message"
                      name="message"
                      placeholder="Zona que conocés, si ya tenés local o equipo, capital disponible, plazos..."
                      rows="3"
                      value={branch.message}
                      onChange={handleBranchChange}
                    />
                  </div>

                  <button
                    className="w-full bg-secondary text-on-secondary font-label-md text-label-md py-4 rounded-lg hover:brightness-90 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
                    type="submit"
                    disabled={sendingBranch}
                  >
                    <span className="material-symbols-outlined text-[20px]">{sendingBranch ? 'autorenew' : 'storefront'}</span>
                    {sendingBranch ? 'Enviando...' : 'Quiero abrir una sucursal'}
                  </button>
                  <p className="text-center font-body-md text-[12px] text-on-surface-variant opacity-70">
                    Te contactamos para contarte los requisitos y el modelo de negocio.
                  </p>
                </form>
                )}
              </div>

              {/* Columna lateral informativa: acompaña a la solapa activa */}
              <div className="lg:col-span-5 flex flex-col gap-gutter">
                {formTab === 'branch' && (
                  <div className="bg-primary text-on-primary p-stack-md rounded-xl shadow-lg">
                    <h3 className="font-headline-md text-headline-md mb-stack-sm">¿Qué incluye?</h3>
                    <ul className="space-y-stack-sm">
                      {/* key por índice: la lista es editable desde el CMS y podría tener
                          dos beneficios con el mismo texto, así que el texto no sirve como key. */}
                      {branchBenefits(c).map((bullet, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="material-symbols-outlined text-secondary-container flex-shrink-0">check_circle</span>
                          <span className="font-body-md text-body-md opacity-90">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {formTab === 'job' && (
                  <>
                    <div className="bg-primary text-on-primary p-stack-md rounded-xl shadow-lg">
                      <h3 className="font-headline-md text-headline-md mb-stack-sm">¿Cómo sigue?</h3>
                      <ol className="space-y-stack-sm">
                        {[
                          'Recibimos tu CV al instante junto con tus datos.',
                          'Si tu perfil encaja con una búsqueda abierta, te escribimos por WhatsApp.',
                          'Coordinamos una entrevista en nuestras oficinas.',
                        ].map((step, i) => (
                          <li key={step} className="flex gap-3">
                            <span className="w-7 h-7 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-label-md text-sm flex-shrink-0">
                              {i + 1}
                            </span>
                            <span className="font-body-md text-body-md opacity-90">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="bg-surface-container-high p-6 rounded-xl border border-outline-variant">
                      <div className="w-12 h-12 bg-primary-container rounded-lg flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined fill-1 text-on-primary-container">lock</span>
                      </div>
                      <h4 className="font-label-md text-label-md text-primary mb-2">Tus datos, protegidos</h4>
                      <p className="text-[14px] leading-relaxed text-on-surface-variant">
                        Tu CV se usa únicamente para procesos de selección de Inmobiliaria Manhattan y no se comparte con terceros.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* La "MITAD INFERIOR" con el bloque oscuro de "Abrí una sucursal con nosotros"
            se quitó de acá (10/08/2026): a pedido del cliente, la página dejó de estar
            partida en dos mitades apiladas y ahora ambos formularios viven en el mismo
            bloque de arriba, alternables con el selector de solapas (FORM_TABS). Los
            beneficios de la sucursal pasaron a la columna lateral de esa solapa. */}
      </main>

      <PublicFooter />
    </div>
  );
}
