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

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Backend corriendo en puerto ${PORT}`));
