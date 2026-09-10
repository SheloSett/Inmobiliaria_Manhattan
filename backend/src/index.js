require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const propertyRoutes = require('./routes/property.routes');
const contactRoutes = require('./routes/contact.routes');
const reportRoutes = require('./routes/report.routes');
const settingsRoutes = require('./routes/settings.routes');
const contentRoutes = require('./routes/content.routes');
const catalogRoutes = require('./routes/catalog.routes');
// Postulaciones laborales (con CV) y solicitudes para abrir una sucursal (10/08/2026).
const applicationRoutes = require('./routes/application.routes');
// SEO (17/08/2026, al conectar el dominio): sitemap.xml dinámico y prerender de meta
// tags para los bots sociales (WhatsApp/Facebook), que no ejecutan JavaScript.
const seoRoutes = require('./routes/seo.routes');

const app = express();
const PORT = process.env.PORT || 4000;

// trust proxy = 1 (10/08/2026): en el VPS el backend corre detrás del nginx del frontend
// (que hace proxy de /api). Sin esto, express-rate-limit vería la IP del proxy para TODAS
// las requests y limitaría a todos los visitantes juntos. Con '1' confía en un solo hop
// (el nginx) y toma la IP real del X-Forwarded-For. En local (sin proxy) no molesta.
app.set('trust proxy', 1);

// app.use(cors({ origin: '*' }));
// ↑ Comentado (17/08/2026, al configurar el dominio propio): `origin: '*'` dejaba que
//   CUALQUIER página de internet le hiciera pedidos a esta API desde el navegador de un
//   visitante. Estaba abierto a propósito mientras la web se servía por IP cruda y no
//   sabíamos qué dominio la iba a servir (ver DEPLOY.md paso 6). Ahora que hay dominio,
//   se restringe a la lista blanca de CORS_ORIGIN.
//   Nota: la web en sí NO necesita CORS —el nginx del frontend hace proxy de /api, así
//   que el navegador ve todo en el mismo origen—. Esto solo afecta a clientes externos.
//   Si CORS_ORIGIN no está definido (desarrollo local), se mantiene el comportamiento
//   permisivo de antes para no romper el flujo de trabajo con Vite en el 5173/3000.
const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: corsOrigins.length > 0 ? corsOrigins : '*',
}));
app.use(express.json());

// app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
// ↑ Comentado (11/08/2026): servía la carpeta tal cual, dejando que el navegador
//   INTERPRETE el archivo según su extensión. Como los CVs ahora se guardan en disco y se
//   sirven desde el mismo origen que el panel admin, un archivo con extensión ejecutable
//   (.html, .svg, .js) subido por el formulario público se convertía en XSS almacenado:
//   el script corría en nuestro dominio y podía leer el token admin del localStorage.
//   La causa raíz se tapó en cvUpload.middleware.js (whitelist de extensiones); esto es la
//   segunda capa, para que ni siquiera un archivo viejo o subido por otra vía se ejecute:
//     - Content-Disposition: attachment → el navegador lo DESCARGA en vez de renderizarlo.
//       No afecta a las imágenes viejas de propiedades: las etiquetas <img> ignoran este
//       header y siguen mostrándose igual (verificado: nada navega directo a /uploads).
//     - X-Content-Type-Options: nosniff → impide que el navegador adivine un tipo distinto
//       al declarado (por ejemplo, tratar como HTML un archivo servido como texto plano).
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res) => {
    res.setHeader('Content-Disposition', 'attachment');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // noindex (12/08/2026): el link al CV es público a propósito —se manda por WhatsApp y
    // funciona sin credenciales—, y su seguridad depende de que el nombre del archivo sea
    // imposible de adivinar (128 bits, ver cvUpload.middleware.js). Ese modelo se rompe si
    // un buscador llega a indexar la URL: dejaría de ser secreta y aparecería en Google.
    // Este header le dice a Google/Bing que no lo indexen aunque lleguen a la URL.
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  },
}));

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/catalogs', catalogRoutes);
app.use('/api/applications', applicationRoutes);
// Montado fuera de /api a propósito: no es una API para el frontend, es contenido que
// consumen Google y los bots sociales. El nginx del frontend le hace proxy solo a
// /sitemap.xml y (por User-Agent) al prerender; no hay location público para /seo/.
app.use('/seo', seoRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// --- Manejo de errores (03/09/2026) ---
// FALTABA por completo. Sin este middleware, cualquier error de multer o de Cloudinary
// caia en el handler por defecto de Express, que responde un 500 con cuerpo HTML y sin
// campo `message`. El panel admin lee `err.response.data.message` (ver
// AdminPropertyForm.jsx) y, al no encontrarlo, mostraba SIEMPRE el mismo texto generico
// "Error al guardar. Intente nuevamente." — daba igual si el video pesaba de mas, si
// Cloudinary habia tardado mucho o si se habia cortado la conexion. Por eso el cliente
// no podia decir que le estaba pasando: el sistema no se lo decia.
// Ahora cada causa devuelve un JSON con un `message` en castellano que el admin entiende.
// Va DESPUES de todas las rutas y con los 4 argumentos (err, req, res, next): Express
// identifica un error handler por la aridad, con 3 lo trataria como middleware comun.
app.use((err, req, res, next) => {
  // Si ya se empezo a escribir la respuesta no se puede cambiar el status: se delega
  // en el handler por defecto, que cierra la conexion.
  if (res.headersSent) return next(err);

  console.error('[error]', req.method, req.originalUrl, err?.code || err?.name || '', err?.message || err);

  // 1) Errores de multer (limites de subida). Se reconocen por `err.code`, no por
  //    instanceof, para no tener que importar multer aca.
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'Archivo demasiado grande',
      // message: 'Uno de los archivos supera los 100 MB. Comprimi el video o subi uno mas corto.',
      // ↑ Comentado (10/09/2026): el tope subio a 500 MB (ver upload.middleware.js).
      message: 'Uno de los archivos supera los 500 MB. Subi un video mas corto o grabalo en 1080p en vez de 4K.',
    });
  }

  // 1b) Compresion de video con ffmpeg (10/09/2026, ver videoCompress.service.js).
  if (err?.code === 'VIDEO_COMPRESS_TIMEOUT') {
    return res.status(504).json({
      error: 'Video demasiado largo',
      message: 'El video tardo demasiado en comprimirse y se cancelo. Proba con un video mas corto (hasta 2 minutos aprox.) o grabado en 1080p.',
    });
  }
  if (err?.code === 'VIDEO_COMPRESS_FAILED') {
    return res.status(422).json({
      error: 'No se pudo procesar el video',
      message: 'No se pudo convertir el video. Puede estar danado o en un formato no soportado: proba exportarlo como MP4 y subirlo de nuevo.',
    });
  }
  if (err?.code === 'VIDEO_COMPRESS_MISSING') {
    return res.status(500).json({
      error: 'ffmpeg no disponible',
      message: 'El servidor no tiene instalado el conversor de video (ffmpeg). Avisale al desarrollador.',
    });
  }
  if (err?.code === 'LIMIT_FILE_COUNT' || err?.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Demasiados archivos',
      message: 'Se pueden subir hasta 20 archivos por propiedad.',
    });
  }
  if (err?.code?.startsWith?.('LIMIT_')) {
    return res.status(400).json({
      error: 'Subida rechazada',
      message: 'La subida fue rechazada por superar un limite. Proba con menos archivos o mas livianos.',
    });
  }

  // 2) Timeout de Cloudinary. El SDK aborta con { http_code: 499, name: 'TimeoutError' }
  //    y multer-storage-cloudinary lo propaga; segun el camino puede venir anidado en
  //    `err.error`, asi que se miran las dos formas.
  const cloudErr = err?.error || err;
  if (cloudErr?.http_code === 499 || cloudErr?.name === 'TimeoutError' || err?.code === 'ETIMEDOUT') {
    return res.status(504).json({
      error: 'Tiempo de espera agotado',
      message: 'El video tardo demasiado en procesarse y se corto la subida. Proba de nuevo con un video mas corto o de menor resolucion.',
    });
  }

  // 3) Conexion cortada a mitad de la subida (el navegador cancelo, se cayo la red).
  if (err?.code === 'ECONNRESET' || err?.code === 'EPIPE' || err?.type === 'request.aborted') {
    return res.status(400).json({
      error: 'Subida interrumpida',
      message: 'Se corto la conexion durante la subida. Revisa tu internet y proba de nuevo.',
    });
  }

  // 4) Cualquier otro error de Cloudinary trae su propio mensaje, que es mas util que
  //    un generico (ej. cuota de la cuenta agotada, formato no soportado).
  if (cloudErr?.http_code) {
    return res.status(cloudErr.http_code >= 400 && cloudErr.http_code < 600 ? cloudErr.http_code : 502).json({
      error: 'Error al subir el archivo',
      message: `Cloudinary rechazo el archivo: ${cloudErr.message || 'motivo desconocido'}`,
    });
  }

  // 5) Fallback: al menos ahora viaja un `message` en JSON y no un HTML mudo.
  res.status(500).json({
    error: 'Error del servidor',
    message: 'No se pudo completar la operacion. Si se repite, avisale al desarrollador.',
  });
});

// app.listen(PORT, () => console.log(`Backend corriendo en puerto ${PORT}`));
// ↑ Comentado (10/09/2026): hacia falta la referencia al server para subir el
//   requestTimeout. Node 18+ cierra con 408 cualquier request que no termine de LLEGAR
//   en 300 s (server.requestTimeout). Con videos de hasta 500 MB y la subida de un
//   celular con 4G (5-10 Mbit/s) el body solo puede tardar 7-13 minutos en llegar; sin
//   esto el backend cortaba a los 5 min aunque nginx (proxy_send_timeout) siguiera
//   esperando. 20 min de margen. headersTimeout se deja en su default (60 s), que es
//   el tiempo hasta recibir los HEADERS, y tiene que ser menor que requestTimeout.
const server = app.listen(PORT, () => console.log(`Backend corriendo en puerto ${PORT}`));
server.requestTimeout = 20 * 60 * 1000;
