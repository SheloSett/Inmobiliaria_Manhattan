// Presencia "en vivo" de la ficha pública de propiedades: quién está viendo qué
// propiedad ahora mismo. Vive en memoria (no en la BD) porque es un dato efímero —
// se resetea si el backend reinicia, lo cual es aceptable para este uso. El cliente
// (PropertyDetail.jsx) manda un heartbeat cada ~20s mientras la ficha está abierta;
// STALE_MS filtra a los que dejaron de mandar heartbeat (cerraron la pestaña, etc.).
const STALE_MS = 45_000; // ~2x el intervalo de heartbeat del cliente

// Map<propertyId, Map<sessionId, lastSeenTimestamp>>
const store = new Map();

function ping(propertyId, sessionId) {
  if (!store.has(propertyId)) store.set(propertyId, new Map());
  store.get(propertyId).set(sessionId, Date.now());
}

// Poda perezosa: solo se limpia cuando se lee, no hace falta un timer aparte.
function getLive() {
  const now = Date.now();
  const result = [];
  for (const [propertyId, sessions] of store) {
    for (const [sessionId, lastSeen] of sessions) {
      if (now - lastSeen > STALE_MS) sessions.delete(sessionId);
    }
    if (sessions.size === 0) store.delete(propertyId);
    else result.push({ propertyId, viewers: sessions.size });
  }
  return result.sort((a, b) => b.viewers - a.viewers);
}

module.exports = { ping, getLive };
