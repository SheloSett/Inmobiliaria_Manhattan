// Geocoding de direcciones para el mapa de búsqueda.
//
// Las propiedades tienen lat/lng opcionales en la BD, pero el formulario de alta no
// los captura, así que casi siempre vienen vacíos. Para poder marcarlas en el mapa
// sin depender de una API key de Google, geocodificamos la dirección con Nominatim
// (OpenStreetMap, gratis y sin key) y cacheamos el resultado en localStorage para no
// repetir la consulta ni pegarle de más al servicio (Nominatim pide ~1 request/seg).
//
// Si una dirección no se puede geocodificar, se guarda un "null" en cache (cache
// negativo) y esa propiedad simplemente no tendrá pin, pero igual aparece en la lista.

const CACHE_KEY = 'manhattan_geocode_cache_v1';

function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; }
  catch { return {}; }
}

function saveCache(cache) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); }
  catch { /* localStorage lleno o no disponible: se ignora */ }
}

const norm = (address) => String(address || '').trim().toLowerCase();

// Devuelve { lat, lng } o null. Usa cache; si no está, consulta Nominatim.
export async function geocodeAddress(address) {
  const key = norm(address);
  if (!key) return null;

  const cache = loadCache();
  if (Object.prototype.hasOwnProperty.call(cache, key)) return cache[key];

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const data = await res.json();
    const hit = Array.isArray(data) && data[0];
    const coords = hit ? { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) } : null;
    cache[key] = coords;
    saveCache(cache);
    return coords;
  } catch {
    return null; // error de red: no cacheamos, para reintentar la próxima
  }
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
