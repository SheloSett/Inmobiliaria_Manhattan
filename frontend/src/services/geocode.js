// Geocoding de direcciones para el mapa de búsqueda.
//
// Las propiedades tienen lat/lng opcionales en la BD, pero el formulario de alta no
// los captura, así que casi siempre vienen vacíos. Para poder marcarlas en el mapa
// sin depender de una API key de Google, geocodificamos la dirección con Nominatim
// (OpenStreetMap, gratis y sin key) y cacheamos el resultado en localStorage para no
// repetir la consulta ni pegarle de más al servicio (Nominatim pide ~1 request/seg).
//
// Solo se cachean resultados POSITIVOS (si una dirección no se encuentra, NO se cachea
// el null, así se puede reintentar más adelante). La búsqueda se limita a Argentina y,
// si la dirección con número no aparece, se reintenta a nivel calle (sin el número).

const CACHE_KEY = 'manhattan_geocode_cache_v2';

function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; }
  catch { return {}; }
}

function saveCache(cache) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); }
  catch { /* localStorage lleno o no disponible: se ignora */ }
}

const norm = (address) => String(address || '').trim().toLowerCase();

// Devuelve { lat, lng } o null. Usa cache (solo positivo); si no, consulta Nominatim.
// Prueba primero la dirección completa y, si no aparece, a nivel calle (sin el número).
export async function geocodeAddress(address) {
  const key = norm(address);
  if (!key) return null;

  const cache = loadCache();
  if (cache[key]) return cache[key]; // solo devuelve del cache si hubo un acierto previo

  // Variantes de búsqueda: la completa y, como fallback, sin el número de calle (que
  // suele encontrarse aunque el número exacto no esté mapeado en OpenStreetMap).
  const variants = [address];
  const noNumber = address
    .replace(/(^|,|\s)\d{1,5}(?=\s|,|$)/, ' ') // saca el número de altura
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+,/g, ',')
    .trim();
  if (noNumber && norm(noNumber) !== key) variants.push(noNumber);

  for (const q of variants) {
    try {
      // countrycodes=ar limita a Argentina (evita, ej., que "San Nicolás" caiga en otro país).
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ar&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = await res.json();
      const hit = Array.isArray(data) && data[0];
      if (hit) {
        const coords = { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) };
        cache[key] = coords;
        saveCache(cache);
        return coords;
      }
    } catch {
      // error de red en esta variante: probamos la siguiente / devolvemos null
    }
  }
  return null; // no se cachea el null → se puede reintentar más adelante
}

// Resuelve las coordenadas de una propiedad: primero usa lat/lng de la BD si existen;
// si no, geocodifica a partir de la dirección + barrio + ciudad.
export async function resolveCoords(property) {
  if (property.lat != null && property.lng != null) {
    return { lat: property.lat, lng: property.lng };
  }
  const parts = [property.address, property.neighborhood, property.city, 'Argentina'].filter(Boolean);
  return geocodeAddress(parts.join(', '));
}
