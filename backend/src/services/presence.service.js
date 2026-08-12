// Presencia "en vivo" de la ficha pública de propiedades: quién está viendo qué
// propiedad ahora mismo. Vive en memoria (no en la BD) porque es un dato efímero —
// se resetea si el backend reinicia, lo cual es aceptable para este uso. El cliente
// (PropertyDetail.jsx) manda un heartbeat cada ~20s mientras la ficha está abierta;
// STALE_MS filtra a los que dejaron de mandar heartbeat (cerraron la pestaña, etc.).
const STALE_MS = 45_000; // ~2x el intervalo de heartbeat del cliente

// Topes de memoria (11/08/2026). El endpoint que alimenta esto (POST /properties/:id/
// heartbeat) es PÚBLICO y no pide nada: cualquiera puede llamarlo en loop con un
// sessionId distinto cada vez. Como `store` es un Map que solo crecía, un script
// trivial podía inflarlo hasta quedarse con la RAM del contenedor y voltear el backend.
// Con estos límites el peor caso está acotado: 500 propiedades x 200 sesiones.
const MAX_PROPERTIES = 500;
const MAX_SESSIONS_PER_PROPERTY = 200;
// Un sessionId legítimo es un UUID (36) o el fallback "v-<base36>-<base36>" (~20). Se
// recorta a 64 para que nadie meta strings de megabytes como clave del Map.
const MAX_SESSION_ID_LEN = 64;
// Cada cuánto, como mucho, se recorre el store para limpiar. Sin esto habría que podar
// en cada ping y un flood de requests pagaría el costo de recorrer todo cada vez.
const PRUNE_INTERVAL_MS = 10_000;

// Map<propertyId, Map<sessionId, lastSeenTimestamp>>
const store = new Map();
let lastPrune = 0;

// Poda las sesiones vencidas y las propiedades que quedaron sin nadie.
// Antes esto vivía dentro de getLive() y por lo tanto SOLO corría cuando un admin tenía
// el dashboard abierto: sin nadie mirando, la basura se acumulaba indefinidamente.
// Ahora es compartida y también corre al escribir (con throttle).
function prune(force = false) {
  const now = Date.now();
  if (!force && now - lastPrune < PRUNE_INTERVAL_MS) return;
  lastPrune = now;

  for (const [propertyId, sessions] of store) {
    for (const [sessionId, lastSeen] of sessions) {
      if (now - lastSeen > STALE_MS) sessions.delete(sessionId);
    }
    if (sessions.size === 0) store.delete(propertyId);
  }
}

// function ping(propertyId, sessionId) {
//   if (!store.has(propertyId)) store.set(propertyId, new Map());
//   store.get(propertyId).set(sessionId, Date.now());
// }
//
// ↑ Comentada (11/08/2026): aceptaba cualquier cosa como clave y no tenía ningún techo.
//   Tres problemas concretos:
//     1. `propertyId` llegaba como Number(req.params.id) sin validar, así que una URL como
//        /properties/abc/heartbeat creaba una entrada con la clave NaN.
//     2. `sessionId` se usaba tal cual, de cualquier largo.
//     3. El Map solo crecía; la limpieza dependía de que un admin abriera el dashboard.
//   La versión de abajo valida las claves y aplica los topes de arriba.
function ping(propertyId, sessionId) {
  // Solo ids de propiedad reales (entero positivo). Descarta NaN, negativos y decimales.
  if (!Number.isInteger(propertyId) || propertyId <= 0) return;

  const id = String(sessionId || '').slice(0, MAX_SESSION_ID_LEN);
  if (!id) return;

  prune();

  let sessions = store.get(propertyId);
  if (!sessions) {
    // Techo duro: si ya hay demasiadas propiedades vivas, se ignora la nueva en vez de
    // seguir creciendo. Es un contador de curiosos, no un dato crítico.
    if (store.size >= MAX_PROPERTIES) return;
    sessions = new Map();
    store.set(propertyId, sessions);
  }

  // Una sesión ya conocida siempre refresca su timestamp (si no, los visitantes reales
  // se caerían del panel al llegar al tope). Una sesión nueva entra solo si hay lugar.
  if (sessions.has(id) || sessions.size < MAX_SESSIONS_PER_PROPERTY) {
    sessions.set(id, Date.now());
  }
}

function getLive() {
  // force: al leer siempre se poda, para no reportar viewers que ya se fueron.
  prune(true);
  const result = [];
  for (const [propertyId, sessions] of store) {
    result.push({ propertyId, viewers: sessions.size });
  }
  return result.sort((a, b) => b.viewers - a.viewers);
}

module.exports = { ping, getLive };
