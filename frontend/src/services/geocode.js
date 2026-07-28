// Geocoding de direcciones para el mapa (marcar propiedades por su dirección).
//
// Geocoder PRINCIPAL: Georef, la API oficial del Estado argentino (datos.gob.ar),
// gratis y sin API key, con los datos de calles/alturas de todo el país. Es mucho
// más precisa para direcciones argentinas que OpenStreetMap (encuentra la altura
// exacta). Se le pasa la calle+altura por separado de la provincia/localidad.
//
// Geocoder de RESPALDO: Nominatim (OpenStreetMap), limitado a Argentina, por si Georef
// no devuelve nada (ej. una dirección con formato raro). Si ninguno encuentra la
// dirección, la propiedad se marca a mano en el mapa (LocationPicker).
//
// Solo se cachean resultados POSITIVOS (los fallos no se cachean, para poder reintentar).

const CACHE_KEY = 'manhattan_geocode_cache_v3';

function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; }
  catch { return {}; }
}

function saveCache(cache) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); }
  catch { /* localStorage lleno o no disponible: se ignora */ }
}

const norm = (s) =>
  String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Distintas formas de escribir "Ciudad Autónoma de Buenos Aires" → Georef la quiere así.
const CABA_ALIASES = new Set([
  'caba', 'c.a.b.a', 'c.a.b.a.', 'capital federal', 'capital',
  'ciudad de buenos aires', 'ciudad autonoma de buenos aires', 'ciudad autonoma buenos aires',
]);

// --- Geocoder principal: Georef (datos.gob.ar) ---
async function geocodeGeoref(address, city) {
  const direccion = String(address || '').trim();
  if (!direccion) return null;
  const params = new URLSearchParams({ direccion, max: '1', campos: 'ubicacion,nomenclatura' });
  const cityN = norm(city);
  if (CABA_ALIASES.has(cityN)) {
    params.set('provincia', 'Ciudad Autónoma de Buenos Aires');
  } else if (city) {
    // Para el resto del país se pasa la localidad; Georef hace matching difuso.
    params.set('localidad', city);
  }
  try {
    const res = await fetch(`https://apis.datos.gob.ar/georef/api/direcciones?${params.toString()}`);
    const data = await res.json();
    const u = data?.direcciones?.[0]?.ubicacion;
    if (u && u.lat != null && u.lon != null) return { lat: u.lat, lng: u.lon };
  } catch { /* red/CORS: probamos el respaldo */ }
  return null;
}

// --- Geocoder de respaldo: Nominatim (OpenStreetMap), acotado a Argentina ---
async function geocodeNominatim(parts) {
  const full = parts.filter(Boolean).join(', ');
  if (!full) return null;
  // Variantes: dirección completa y, si falla, sin el número de altura (a nivel calle).
  const variants = [full];
  const noNumber = full.replace(/(^|,|\s)\d{1,5}(?=\s|,|$)/, ' ').replace(/\s{2,}/g, ' ').replace(/\s+,/g, ',').trim();
  if (noNumber && norm(noNumber) !== norm(full)) variants.push(noNumber);
  for (const q of variants) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ar&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = await res.json();
      const hit = Array.isArray(data) && data[0];
      if (hit) return { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) };
    } catch { /* siguiente variante */ }
  }
  return null;
}

// Geocodifica una dirección. Acepta un objeto { address, city, neighborhood } o, por
// compatibilidad, un string suelto. Devuelve { lat, lng } o null.
export async function geocodeAddress(input) {
  const obj = typeof input === 'string'
    ? { address: input, city: '', neighborhood: '' }
    : (input || {});
  const { address = '', city = '', neighborhood = '' } = obj;

  const key = norm(`${address}|${city}`);
  if (!key || key === '|') return null;

  const cache = loadCache();
  if (cache[key]) return cache[key]; // solo cache positivo

  // 1) Georef (oficial argentino, con altura exacta).
  let coords = await geocodeGeoref(address, city);
  // 2) Respaldo: Nominatim con la dirección completa.
  if (!coords) coords = await geocodeNominatim([address, neighborhood, city, 'Argentina']);

  if (coords) { cache[key] = coords; saveCache(cache); }
  return coords; // null si ninguno la encontró → se marca a mano en el mapa
}

// Resuelve las coordenadas de una propiedad: primero usa lat/lng de la BD si existen;
// si no, geocodifica a partir de su dirección/barrio/ciudad.
export async function resolveCoords(property) {
  if (property.lat != null && property.lng != null) {
    return { lat: property.lat, lng: property.lng };
  }
  return geocodeAddress({
    address: property.address,
    city: property.city,
    neighborhood: property.neighborhood,
  });
}
