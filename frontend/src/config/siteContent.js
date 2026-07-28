// ─────────────────────────────────────────────────────────────────────────────
// Esquema central del contenido editable del sitio (mini-CMS del panel de Ajustes).
//
// Este archivo es la ÚNICA fuente de verdad de:
//   1. Qué campos son editables en cada página (lo consume el editor AdminContent).
//   2. El valor por defecto de cada campo = el contenido original hardcodeado.
//
// Las páginas públicas leen su contenido con el hook useSiteContent(pageKey), que
// mergea lo guardado en la BD (PageContent.content) SOBRE estos defaults. Por eso:
//   - Si el admin nunca editó una página, se ve el texto/imagen por defecto de acá.
//   - Agregar o quitar un campo NO requiere migrar la BD: se cambia solo este esquema.
//
// Tipos de campo soportados por el editor: 'text', 'textarea', 'image'.
// ─────────────────────────────────────────────────────────────────────────────

// URLs de imágenes por defecto (las mismas que estaban hardcodeadas en cada página).
const HOME_HERO_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCR9JNx3pctIFIv3SGP9YvkxZNpN16EH8EML-ph48-vXpb_KlnIhchJXhJqFaztJ5ITGTpP2xkCUnD41sjkYBv-eBRQK0DB35X886FT7vbi2qw3kDnEPSZvVmbFG2hLJHjxn1XyIgbtzfp9CnK6YrK8S6UE5MlyLvwrMcXMUZo0D8b5L2CYrOoRExYHT3qjkhBoCUVgywKb3UGUv17cPIZptD5rBrszt2aMloJ1UXp5GQsbpiQB-WWk_n4JdFe4-VnxRd94X-OEcn0';
const HOME_SELL_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDG01UrebO-3lPJHM2-2eYZn5arUBc-gVoezAF3E8lZNYoiCXb1x9aaR-fFJChJzSZ4pFCKIRfBcn14B6TNJGVRAiSiNefoAC5YRz-zkrBjFtnRX6OAgLVEeqNF8x82HYtaY_jTGWoYHjzpknQy5yTa9sC2rbGzHwOMS5dOklFHu1Nljb6CDnP4ktdpewZlC0SGflbyEro-CkFe8hOZ86IrXXphdTRn3RJJAgo2zzL7yA5EkLEwYPNUggQEpcERSR2_AjKXR_scwSs';
const ABOUT_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDX0ffEOJ2PnRW7HdWLZyev-skWPt16m0KxF0EFt5ZRk3mK_YO5_rxA8yflYhA4hBVc9YDV7_wehSByZZmxq2lzEiZ5dgbFrkInHuh1BY4rtQKYENqvNEDo4OzZidu95JM5fxKN5OmtSZmItitxvJhRu8XA3Q2yoaUgA-c_Evqd21BllVfUWJydvX6rhTqh8nuseGAjR82moL93bRYeXpkR70UQisTsm7izi3_WOyQS7z8ioLEy25mW';
const VALUATIONS_HERO_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBIEQneuTcuwcD74rz4WN6YDbkifhcBm_rIexdaLrRe42WaFUm0KA6P3O2UcdMCxMBwt6sOxykeQioryKvzYe3q-QjL_SpgrAdyYZ4n5ep2T0b7QyFQkfsTz7-CSP6qavItb4NIadXaQ-_70gO1es1-_L9ZFJkKWkcHP-HikNpKI74E5Vkr6L766HgB-iEqi849Oum8O9CooZKGFHeC7DqNpmRyuVgy8eQTtYraIlKWW35oDswsJl9Fx11jxq3WdNam_IrZq-HPCn8';

export const PAGES = [
  {
    key: 'home',
    label: 'Inicio',
    icon: 'home',
    fields: [
      { key: 'heroImage', label: 'Imagen del Hero', type: 'image', default: HOME_HERO_IMG },
      { key: 'heroTitle', label: 'Título del Hero', type: 'text', default: 'Inmobiliaria Manhattan' },
      { key: 'heroSubtitle', label: 'Subtítulo del Hero', type: 'textarea', default: 'Hacemos que cada operación inmobiliaria sea simple, clara y segura.' },
      { key: 'featuredEyebrow', label: 'Etiqueta sección destacadas', type: 'text', default: 'Inmuebles en venta y alquiler' },
      { key: 'featuredTitle', label: 'Título "Propiedades destacadas"', type: 'text', default: 'Propiedades destacadas' },
      { key: 'featuredSubtitle', label: 'Descripción de destacadas', type: 'textarea', default: 'Explorá nuestras mejores opciones en venta y alquiler, seleccionadas especialmente para vos.' },
      { key: 'sellEyebrow', label: 'Etiqueta sección "Vendemos"', type: 'text', default: 'Inmobiliaria Manhattan' },
      { key: 'sellTitle', label: 'Título sección "Vendemos"', type: 'text', default: 'Vendemos tu propiedad de manera rápida y segura' },
      { key: 'sellText1', label: 'Texto "Vendemos" (párrafo 1)', type: 'textarea', default: 'En Inmobiliaria Manhattan acompañamos a cada propietario en todo el proceso de venta.' },
      { key: 'sellText2', label: 'Texto "Vendemos" (párrafo 2)', type: 'textarea', default: 'Desde la tasación profesional hasta la firma en escribanía, trabajamos con transparencia y estrategias de marketing inmobiliario para lograr la mejor operación en el menor tiempo posible.' },
      { key: 'sellBullet1', label: 'Beneficio 1', type: 'text', default: 'Tasación real y confiable.' },
      { key: 'sellBullet2', label: 'Beneficio 2', type: 'text', default: 'Publicidad en portales líderes y redes sociales.' },
      { key: 'sellBullet3', label: 'Beneficio 3', type: 'text', default: 'Gestión integral hasta la escritura.' },
      { key: 'sellImage', label: 'Imagen sección "Vendemos"', type: 'image', default: HOME_SELL_IMG },
      { key: 'testimonialsTitle', label: 'Título de testimonios', type: 'text', default: 'Lo que dicen nuestros clientes' },
      // Lista repetible de testimonios (editables/agregables desde el CMS). Cada uno
      // tiene nombre, una referencia/fecha corta y el texto del testimonio.
      {
        key: 'testimonials',
        label: 'Testimonios',
        type: 'list',
        itemLabel: 'Testimonio',
        itemFields: [
          { key: 'name', label: 'Nombre del cliente', type: 'text', default: '' },
          { key: 'date', label: 'Referencia (ej: "Compró en Palermo")', type: 'text', default: '' },
          { key: 'text', label: 'Testimonio', type: 'textarea', default: '' },
        ],
        default: [
          {
            name: 'María González',
            date: 'Compró en Palermo',
            text: 'Excelente atención de principio a fin. Me acompañaron en cada paso de la compra, siempre con total transparencia. Súper recomendables.',
          },
          {
            name: 'Juan Pérez',
            date: 'Vendió su departamento',
            text: 'Vendieron mi propiedad más rápido de lo que esperaba y al precio que buscaba. Un equipo muy profesional y confiable.',
          },
          {
            name: 'Laura Fernández',
            date: 'Alquiló en Caballito',
            text: 'Encontré el departamento ideal gracias a su asesoramiento. Trato cálido y humano, se nota que se preocupan por el cliente.',
          },
        ],
      },
    ],
  },
  {
    key: 'properties',
    label: 'Propiedades',
    icon: 'list_alt',
    fields: [
      { key: 'title', label: 'Título de la página', type: 'text', default: 'Propiedades en Venta y Alquiler' },
      { key: 'subtitle', label: 'Subtítulo', type: 'textarea', default: 'Explorá nuestra selección de propiedades disponibles. Encontrá tu próximo hogar o inversión con Manhattan.' },
    ],
  },
  {
    key: 'valuations',
    label: 'Tasaciones',
    icon: 'request_quote',
    fields: [
      { key: 'heroImage', label: 'Imagen del Hero', type: 'image', default: VALUATIONS_HERO_IMG },
      { key: 'heroTitle', label: 'Título del Hero', type: 'text', default: 'Tasá tu Propiedad con Expertos' },
      { key: 'heroSubtitle', label: 'Subtítulo del Hero', type: 'textarea', default: 'Obtené un valor real, confiable y profesional para tu inmueble. Nuestra metodología combina datos de mercado en tiempo real con décadas de experiencia en el sector.' },
      { key: 'formTitle', label: 'Título del formulario', type: 'text', default: 'Solicitar Tasación' },
      { key: 'formSubtitle', label: 'Subtítulo del formulario', type: 'text', default: 'Completá los datos y un asesor se contactará a la brevedad.' },
      { key: 'whyEyebrow', label: 'Etiqueta "Por qué elegirnos"', type: 'text', default: 'Trayectoria' },
      { key: 'whyTitle', label: 'Título "Por qué elegirnos"', type: 'text', default: 'Conocimiento del mercado real' },
      { key: 'whyText', label: 'Texto "Por qué elegirnos"', type: 'textarea', default: 'No usamos algoritmos genéricos. Analizamos cada propiedad considerando su entorno, potencial y demanda actual de la zona.' },
    ],
  },
  {
    key: 'about',
    label: 'Nosotros',
    icon: 'groups',
    fields: [
      { key: 'heroTitle', label: 'Título del Hero', type: 'text', default: 'Construyendo Confianza.' },
      { key: 'heroSubtitle', label: 'Subtítulo del Hero', type: 'textarea', default: 'Liderando el mercado inmobiliario corporativo y de lujo en Buenos Aires con una visión institucional, solidez y un compromiso inquebrantable con la excelencia.' },
      { key: 'historyTitle', label: 'Título "Nuestra Historia"', type: 'text', default: 'Nuestra Historia' },
      { key: 'historyText1', label: 'Historia (párrafo 1)', type: 'textarea', default: 'Fundada con la premisa de elevar los estándares de las transacciones inmobiliarias, Manhattan Negocios Inmobiliarios se ha consolidado como un referente de autoridad y seguridad en el sector. Nuestra trayectoria está marcada por la gestión exitosa de activos estratégicos y residencias de alto valor.' },
      { key: 'historyText2', label: 'Historia (párrafo 2)', type: 'textarea', default: 'Entendemos que cada propiedad cuenta una historia y representa una inversión crucial. Por ello, nuestro equipo multidisciplinario aplica metodologías rigurosas, combinando el análisis de mercado con una asesoría personalizada, garantizando resultados que superan las expectativas de nuestros clientes.' },
      { key: 'institutionalImage', label: 'Imagen institucional', type: 'image', default: ABOUT_IMG },
      { key: 'missionTitle', label: 'Título Misión', type: 'text', default: 'Nuestra Misión' },
      { key: 'missionText', label: 'Texto Misión', type: 'textarea', default: 'Brindar asesoramiento integral y estratégico en el mercado inmobiliario, garantizando transacciones seguras, transparentes y altamente rentables para nuestros clientes institucionales y particulares.' },
      { key: 'visionTitle', label: 'Título Visión', type: 'text', default: 'Nuestra Visión' },
      { key: 'visionText', label: 'Texto Visión', type: 'textarea', default: 'Ser reconocidos como la firma líder y de mayor prestigio en negocios inmobiliarios de Buenos Aires, estableciendo el estándar de excelencia, ética y profesionalismo en cada operación.' },
      { key: 'teamTitle', label: 'Título del Equipo', type: 'text', default: 'Nuestro Equipo Directivo' },
      { key: 'teamSubtitle', label: 'Subtítulo del Equipo', type: 'textarea', default: 'Profesionales altamente calificados con profunda experiencia en el dinámico mercado de bienes raíces.' },
      // Lista repetible: cada integrante tiene nombre, cargo y foto. El editor
      // permite agregar/eliminar integrantes y subir la foto de cada uno.
      {
        key: 'team',
        label: 'Integrantes del Equipo',
        type: 'list',
        itemLabel: 'Integrante',
        itemFields: [
          { key: 'name', label: 'Nombre', type: 'text', default: '' },
          { key: 'role', label: 'Cargo', type: 'text', default: '' },
          { key: 'img', label: 'Foto', type: 'image', default: '' },
          // Campo agregado (27/07/2026): WhatsApp por integrante, para que al tocar su
          // tarjeta en la web se abra un chat directo con esa persona. Opcional: si queda
          // vacío, la tarjeta no es clickeable (se mantiene el comportamiento anterior).
          { key: 'whatsapp', label: 'WhatsApp (con código de país, ej. 5491160479977)', type: 'text', default: '' },
        ],
        default: [
          { name: 'Carlos V.', role: 'Director General', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBcvmyAp9ZFyKa9uDqPIyzwtGvbEkUTn8W6S_ch5oJnBIY98PhNVXqegzUfz-KAmv6aTTwBs_WucFzPHI3p9FiPcIrmm7uTl4XdNxSyrLMt7WsGDRbff3LiwrKsabPQuCifUHxs8w2ifPKUPXQKwlL_J-UWjC3OKyZN1PQOt04YdfW-9sKxVW6U_3qFxGRyzVHuSQV1EeU-x1cvjLSbU3ddhyXpKYbBxyASVLcCRCX6b6CBlmWRk83a', whatsapp: '' },
          { name: 'Mariana L.', role: 'Directora Comercial', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBRMFE-Ad3zUNoBomnybBbUvhHG5BqpwhgL203y5cW_nhQRD25hEEXxxoUWkCplJTLd1nzOamG-OW6h63lgy-X2ZxGGg9dDpt_Qj9NinaWGntxWP3-laR_EVHgNpXxev-GwfRFBYcPf6WRW6swSa6DHA9Ne5c-OZ32RQbgFi2HwHjFOUib9HVTgus5kfjxGLzweBsIQNXOTZl-7d3xF0KGRzPJ1vB_oPHa1JihYYdSsNnN6u1WZ9DzU', whatsapp: '' },
          { name: 'Javier M.', role: 'Asesor Senior', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTN5Lzg57FSq-mNZ1Iq-OJZ121Ub5-mayQY3CoN42v-QJxGF3W4nk9qDrVjRQURWIkojhUXU43bnwWqUYDUY0S5ufqBYeXb5lo3pQew7WxNNKqy7vE3KblCzb7vNDM6Kzi3VnN2kTV0_6v-HMhnVBY4IknLBJr2c4FJwQ2pV4WrbKa5ioXmoAGjklIfM9Onv9nhX6oer-VD02VfyssQMbUVJOlKanow7lJbhQ_lrMzQstoqdRjCc51', whatsapp: '' },
          { name: 'Dra. Elena S.', role: 'Asesoría Legal', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBZq94pfg7HnZhTea_Ypk2Mrpaad_mEGkVbvvVTQOEU1Hy64m4lBILNWNl-CTwzmFu1UCuEs65AWx-5vKTd_RL2aY1zzzjkgvrzZRbBTRph5VUa1j0t1GXAEfKX-IcWJqwHfDhljTkqXVQpET7A23RKDy_y-oEfT7cbiUTgf5tVY3l6Kc1eKIVEuSZFliHWNt5gvchhdgcBxyysqIApbne_P4eR5dccHytgWCqW3s_X1bOwF9pHCeuM', whatsapp: '' },
        ],
      },
    ],
  },
  {
    key: 'contact',
    label: 'Contacto',
    icon: 'contact_support',
    fields: [
      { key: 'heroTitle', label: 'Título del Hero', type: 'text', default: 'Estamos para ayudarte' },
      { key: 'heroSubtitle', label: 'Subtítulo del Hero', type: 'textarea', default: 'Comunicate con nuestro equipo de asesores inmobiliarios. Completá el formulario o visitanos en nuestras oficinas para una atención personalizada.' },
      { key: 'formTitle', label: 'Título del formulario', type: 'text', default: 'Envianos tu consulta' },
      { key: 'infoAddress', label: 'Dirección', type: 'textarea', default: 'San Nicolás 387\nCABA, Argentina' },
      { key: 'infoWhatsapp', label: 'WhatsApp', type: 'text', default: '11-6047-9977' },
      { key: 'infoEmail', label: 'Email', type: 'text', default: 'manhattan.inmo0@gmail.com' },
      { key: 'infoHours', label: 'Horarios de Atención', type: 'textarea', default: 'Lun-Jue: 9:00 - 17:00\nVie: 9:00 - 15:30' },
      // Botones del bloque "¿Necesita una respuesta inmediata?". Lista repetible:
      // cada botón tiene tipo (Llamar / WhatsApp), texto y número. Se pueden agregar
      // o eliminar. El tipo define el ícono, el color y el link (tel: o wa.me).
      // Antes estos botones eran fijos y usaban los números de las variables VITE_*
      // del .env; ahora se gestionan desde acá (los defaults replican lo que había).
      {
        key: 'contactButtons',
        label: 'Botones de respuesta inmediata',
        type: 'list',
        itemLabel: 'Botón',
        itemFields: [
          {
            key: 'kind',
            label: 'Tipo',
            type: 'select',
            options: [
              { value: 'whatsapp', label: 'WhatsApp' },
              { value: 'call', label: 'Llamar' },
            ],
            default: 'whatsapp',
          },
          { key: 'label', label: 'Texto del botón', type: 'text', default: '' },
          { key: 'number', label: 'Número (con código de país)', type: 'text', default: '' },
        ],
        default: [
          { kind: 'call', label: 'Llamar Shaul', number: '+5491160479977' },
          { kind: 'whatsapp', label: 'WhatsApp Shaul', number: '5491160479977' },
          { kind: 'whatsapp', label: 'WhatsApp Salomon', number: '5491160479977' },
        ],
      },
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    icon: 'border_bottom',
    fields: [
      // Logo de la inmobiliaria (28/07/2026). Se usa en el navbar y el footer, JUNTO al
      // texto de marca (no lo reemplaza). Si queda vacío, se muestra solo el texto.
      { key: 'logo', label: 'Logo (barra superior y footer)', type: 'image', default: '' },
      { key: 'brand', label: 'Nombre / Marca', type: 'text', default: 'Manhattan' },
      { key: 'description', label: 'Descripción', type: 'textarea', default: 'Negocios Inmobiliarios. Liderazgo y confianza en el mercado de alta gama.' },
      // Email de contacto del footer (nueva columna "Contacto"). Por defecto usa el
      // mismo mail que la página de Contacto.
      { key: 'email', label: 'Email de contacto', type: 'text', default: 'manhattan.inmo0@gmail.com' },
      // Redes sociales (nueva columna "Seguinos"). Lista repetible: cada red tiene una
      // plataforma (define ícono y color) y el enlace completo. Se pueden agregar/quitar.
      {
        key: 'social',
        label: 'Redes sociales',
        type: 'list',
        itemLabel: 'Red',
        itemFields: [
          {
            key: 'network',
            label: 'Plataforma',
            type: 'select',
            options: [
              { value: 'instagram', label: 'Instagram' },
              { value: 'facebook', label: 'Facebook' },
              { value: 'whatsapp', label: 'WhatsApp' },
              { value: 'tiktok', label: 'TikTok' },
              { value: 'linkedin', label: 'LinkedIn' },
              { value: 'youtube', label: 'YouTube' },
            ],
            default: 'instagram',
          },
          { key: 'url', label: 'Enlace (URL completa)', type: 'text', default: '' },
        ],
        default: [
          { network: 'instagram', url: 'https://instagram.com/' },
          { network: 'facebook', url: 'https://facebook.com/' },
          { network: 'whatsapp', url: 'https://wa.me/5491160479977' },
        ],
      },
      { key: 'copyright', label: 'Texto de copyright', type: 'text', default: '© 2024 Manhattan Negocios Inmobiliarios. Todos los derechos reservados.' },
    ],
  },
  // ── Páginas legales / informativas del footer (26/07/2026) ──────────────────
  // Privacidad, Términos, Mapa del Sitio y Ayuda: son páginas reales (antes los links
  // del footer iban a "#"). Todo su contenido es editable desde Ajustes → Contenido.
  {
    key: 'privacy',
    label: 'Privacidad',
    icon: 'privacy_tip',
    fields: [
      { key: 'title', label: 'Título', type: 'text', default: 'Política de Privacidad' },
      { key: 'updatedAt', label: 'Fecha de actualización', type: 'text', default: 'Última actualización: julio de 2026' },
      { key: 'intro', label: 'Introducción', type: 'textarea', default: 'En Manhattan Negocios Inmobiliarios valoramos tu privacidad. Esta política explica qué datos recopilamos, cómo los usamos y cuáles son tus derechos.' },
      {
        key: 'sections',
        label: 'Secciones',
        type: 'list',
        itemLabel: 'Sección',
        itemFields: [
          { key: 'heading', label: 'Título de la sección', type: 'text', default: '' },
          { key: 'body', label: 'Contenido', type: 'textarea', default: '' },
        ],
        default: [
          { heading: 'Datos que recopilamos', body: 'Recopilamos los datos que nos proporcionás voluntariamente al completar formularios de contacto o tasación (nombre, teléfono, email) y datos de navegación básicos para mejorar el sitio.' },
          { heading: 'Uso de la información', body: 'Usamos tus datos únicamente para responder tus consultas, brindarte información sobre propiedades y mejorar nuestros servicios. No vendemos ni cedemos tu información a terceros.' },
          { heading: 'Tus derechos', body: 'Podés solicitar el acceso, la rectificación o la eliminación de tus datos personales en cualquier momento escribiéndonos a nuestro email de contacto.' },
        ],
      },
    ],
  },
  {
    key: 'terms',
    label: 'Términos',
    icon: 'gavel',
    fields: [
      { key: 'title', label: 'Título', type: 'text', default: 'Términos y Condiciones' },
      { key: 'updatedAt', label: 'Fecha de actualización', type: 'text', default: 'Última actualización: julio de 2026' },
      { key: 'intro', label: 'Introducción', type: 'textarea', default: 'El uso de este sitio implica la aceptación de los presentes Términos y Condiciones. Te pedimos que los leas atentamente.' },
      {
        key: 'sections',
        label: 'Secciones',
        type: 'list',
        itemLabel: 'Sección',
        itemFields: [
          { key: 'heading', label: 'Título de la sección', type: 'text', default: '' },
          { key: 'body', label: 'Contenido', type: 'textarea', default: '' },
        ],
        default: [
          { heading: 'Uso del sitio', body: 'El contenido de este sitio tiene fines informativos. Las publicaciones de propiedades no constituyen una oferta contractual y pueden modificarse o retirarse sin previo aviso.' },
          { heading: 'Información de las propiedades', body: 'Nos esforzamos por mantener la información actualizada y precisa, pero no garantizamos que esté libre de errores. Los precios y la disponibilidad deben confirmarse con nuestros asesores.' },
          { heading: 'Propiedad intelectual', body: 'Todos los contenidos, marcas y logos del sitio pertenecen a Manhattan Negocios Inmobiliarios y no pueden reproducirse sin autorización.' },
        ],
      },
    ],
  },
  {
    key: 'sitemap',
    label: 'Mapa del Sitio',
    icon: 'account_tree',
    fields: [
      { key: 'title', label: 'Título', type: 'text', default: 'Mapa del Sitio' },
      { key: 'subtitle', label: 'Subtítulo', type: 'textarea', default: 'Encontrá rápidamente todas las secciones de nuestro sitio.' },
    ],
  },
  {
    key: 'help',
    label: 'Ayuda',
    icon: 'help',
    fields: [
      { key: 'title', label: 'Título', type: 'text', default: 'Centro de Ayuda' },
      { key: 'subtitle', label: 'Subtítulo', type: 'textarea', default: 'Resolvé las dudas más frecuentes. Si necesitás más ayuda, contactanos.' },
      {
        key: 'faqs',
        label: 'Preguntas frecuentes',
        type: 'list',
        itemLabel: 'Pregunta',
        itemFields: [
          { key: 'question', label: 'Pregunta', type: 'text', default: '' },
          { key: 'answer', label: 'Respuesta', type: 'textarea', default: '' },
        ],
        default: [
          { question: '¿Cómo publico o vendo mi propiedad?', answer: 'Podés solicitar una tasación gratuita desde la sección Tasaciones o escribirnos por WhatsApp. Un asesor te contactará para coordinar los siguientes pasos.' },
          { question: '¿Cómo agendo una visita a una propiedad?', answer: 'Entrá al detalle de la propiedad que te interese y usá el botón "Consultar por WhatsApp". Coordinamos la visita en el horario que mejor te quede.' },
          { question: '¿La tasación tiene costo?', answer: 'No, la tasación es totalmente gratuita y sin compromiso.' },
        ],
      },
    ],
  },
];

// Objeto { fieldKey: default } de una página. Base para el merge con lo guardado.
export function defaultsFor(pageKey) {
  const page = PAGES.find((p) => p.key === pageKey);
  if (!page) return {};
  return page.fields.reduce((acc, f) => {
    acc[f.key] = f.default;
    return acc;
  }, {});
}

// Devuelve la definición completa de una página (con sus fields) para el editor.
export function pageSchema(pageKey) {
  return PAGES.find((p) => p.key === pageKey) || null;
}
