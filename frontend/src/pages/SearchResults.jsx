import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';
import PublicNavbar from '../components/PublicNavbar';
import { resolveCoords } from '../services/geocode';
import { useCatalogs } from '../hooks/useCatalogs';
import { propertyThumbnail } from '../utils/media';

// Página de búsqueda con mapa — basada en Stitch_Templates/search_results_template.
// Layout split: mapa a la izquierda (con un pin por propiedad) y lista de resultados
// a la derecha con filtros. Reemplaza al buscador del hero, que antes no hacía nada:
// ahora ese buscador navega acá (/buscar) con los filtros como query params.
//
// El mapa usa Leaflet + OpenStreetMap (gratis, sin API key). Como las propiedades no
// suelen tener lat/lng cargadas, las coordenadas se resuelven geocodificando la
// dirección (ver services/geocode.js). Filtros operación/tipo/búsqueda van a la API;
// dormitorios y cochera se aplican sobre los resultados (la API no los filtra).

const OPERATION_LABELS = { SALE: 'Venta', RENT: 'Alquiler' };
const TYPE_LABELS = {
  HOUSE: 'Casa', APARTMENT: 'Departamento', OFFICE: 'Oficina',
  LOCAL: 'Local', LAND: 'Terreno', PH: 'PH',
};
const TYPE_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'APARTMENT', label: 'Departamento' },
  { value: 'HOUSE', label: 'Casa' },
  { value: 'OFFICE', label: 'Oficina' },
  { value: 'LOCAL', label: 'Local' },
  { value: 'LAND', label: 'Terreno' },
  { value: 'PH', label: 'PH' },
];
const BUENOS_AIRES = [-34.6083, -58.3712];

function formatPrice(currency, price, operation) {
  const formatted = `${currency} $${Number(price).toLocaleString('es-AR')}`;
  return operation === 'RENT' ? `${formatted}/mes` : formatted;
}

// Ícono de pin de Leaflet (DivIcon con SVG) coloreado según la operación. Se usa un
// DivIcon para evitar el clásico problema de los íconos rotos de Leaflet con bundlers.
function pinIcon(color) {
  return L.divIcon({
    className: 'manhattan-pin',
    html: `<svg width="30" height="40" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 20 12 20s12-11.6 12-20c0-6.6-5.4-12-12-12z" fill="${color}"/>
      <circle cx="12" cy="12" r="4.5" fill="#ffffff"/>
    </svg>`,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -38],
  });
}

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { operations, propertyTypes } = useCatalogs();

  // Filtros que edita el usuario (controlados). Se inicializan desde la URL.
  const [pending, setPending] = useState({
    operation: searchParams.get('operation') || '',
    type: searchParams.get('type') || '',
    search: searchParams.get('search') || '',
    bedrooms: searchParams.get('bedrooms') || '',
    garage: searchParams.get('garage') || '',
  });

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);

  const mapRef = useRef(null);        // instancia Leaflet
  const mapEl = useRef(null);         // div contenedor
  const markersRef = useRef({});      // { [propertyId]: L.marker }

  // --- Fetch de propiedades según los filtros de la URL ---
  useEffect(() => {
    setLoading(true);
    const params = { limit: 50 };
    const operation = searchParams.get('operation');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    if (operation) params.operation = operation;
    if (type) params.type = type;
    if (search) params.search = search;

    api.get('/properties', { params })
      .then((res) => {
        let list = res.data.properties || [];
        // Filtros que la API no soporta: se aplican en el cliente.
        const minBeds = Number(searchParams.get('bedrooms'));
        const garage = searchParams.get('garage');
        if (minBeds) list = list.filter((p) => (p.bedrooms ?? 0) >= minBeds);
        if (garage === 'true') list = list.filter((p) => p.garage);
        setProperties(list);
      })
      .catch(() => setProperties([]))
      .finally(() => setLoading(false));
  }, [searchParams]);

  // --- Inicialización del mapa (una vez) ---
  useEffect(() => {
    if (mapRef.current || !mapEl.current) return;
    const map = L.map(mapEl.current, { center: BUENOS_AIRES, zoom: 12, scrollWheelZoom: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    // Corrige el tamaño si el contenedor terminó de layoutear después del init.
    setTimeout(() => map.invalidateSize(), 200);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // --- Pins: geocodifica y ubica cada propiedad en el mapa ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;

    // Limpia marcadores previos
    Object.values(markersRef.current).forEach((m) => map.removeLayer(m));
    markersRef.current = {};

    (async () => {
      const bounds = [];
      for (const p of properties) {
        const coords = await resolveCoords(p);
        if (cancelled || !coords) continue;
        const color = p.operation === 'SALE' ? '#bb000f' : '#00172b';
        const marker = L.marker([coords.lat, coords.lng], { icon: pinIcon(color) }).addTo(map);
        marker.bindPopup(
          `<div style="min-width:160px">
             <strong>${formatPrice(p.currency, p.price, p.operation)}</strong><br/>
             <span>${p.title}</span><br/>
             <a href="/propiedades/${p.id}" style="color:#bb000f;font-weight:600">Ver detalle →</a>
           </div>`
        );
        marker.on('click', () => setActiveId(p.id));
        markersRef.current[p.id] = marker;
        bounds.push([coords.lat, coords.lng]);
        // Pequeña pausa para respetar el límite de Nominatim (~1 req/seg) cuando
        // hay que geocodificar (las que ya están en cache resuelven al instante).
        if (!(p.lat != null && p.lng != null)) await new Promise((r) => setTimeout(r, 400));
      }
      if (!cancelled && bounds.length) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    })();

    return () => { cancelled = true; };
  }, [properties]);

  // Al hacer click en una card, centra el mapa en esa propiedad y abre su popup.
  const focusProperty = useCallback((id) => {
    setActiveId(id);
    const marker = markersRef.current[id];
    const map = mapRef.current;
    if (marker && map) {
      map.setView(marker.getLatLng(), Math.max(map.getZoom(), 15));
      marker.openPopup();
    }
  }, []);

  const applyFilters = (e) => {
    e.preventDefault();
    const next = {};
    Object.entries(pending).forEach(([k, v]) => { if (v) next[k] = v; });
    setSearchParams(next);
  };

  const clearFilters = () => {
    setPending({ operation: '', type: '', search: '', bedrooms: '', garage: '' });
    setSearchParams({});
  };

  const setField = (name, value) => setPending((prev) => ({ ...prev, [name]: value }));

  const selectClass = 'w-full rounded border border-outline-variant text-sm bg-surface-container-lowest text-on-surface focus:border-primary focus:ring-1 focus:ring-primary py-2 px-3 outline-none';

  return (
    <div className="flex flex-col h-screen bg-background">
      <PublicNavbar active="Propiedades" />

      <main className="flex-1 flex overflow-hidden min-h-0">
        {/* Mapa (izquierda, solo desktop) */}
        <section className="hidden lg:block lg:w-3/5 h-full relative">
          <div ref={mapEl} className="w-full h-full z-0" />
        </section>

        {/* Resultados (derecha) */}
        <section className="w-full lg:w-2/5 h-full flex flex-col border-l border-outline-variant bg-surface-container-lowest">
          {/* Filtros */}
          <form onSubmit={applyFilters} className="p-4 border-b border-outline-variant bg-surface-container-low shrink-0">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <select className={selectClass} value={pending.operation} onChange={(e) => setField('operation', e.target.value)}>
                <option value="">Venta y Alquiler</option>
                {operations.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select className={selectClass} value={pending.type} onChange={(e) => setField('type', e.target.value)}>
                <option value="">Todos los tipos</option>
                {propertyTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <select className={selectClass} value={pending.bedrooms} onChange={(e) => setField('bedrooms', e.target.value)}>
                <option value="">Dormitorios</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </select>
              <select className={selectClass} value={pending.garage} onChange={(e) => setField('garage', e.target.value)}>
                <option value="">Cochera</option>
                <option value="true">Con cochera</option>
              </select>
            </div>
            <div className="relative mb-3">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
              <input
                className={`${selectClass} pl-10`}
                placeholder="Barrio, ciudad, título..."
                value={pending.search}
                onChange={(e) => setField('search', e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md py-2 px-4 rounded transition-colors">
                Buscar
              </button>
              <button type="button" onClick={clearFilters} className="bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-md text-label-md py-2 px-4 rounded transition-colors">
                Limpiar
              </button>
            </div>
          </form>

          {/* Contador */}
          <div className="px-4 py-3 border-b border-outline-variant flex justify-between items-center shrink-0">
            <span className="font-label-md text-label-md text-on-surface-variant">
              {loading ? 'Buscando...' : `${properties.length} resultado${properties.length !== 1 ? 's' : ''} encontrado${properties.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-container-low">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="bg-surface-container-lowest rounded-lg border border-outline-variant h-40 animate-pulse" />
              ))
            ) : properties.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[48px] mb-3">search_off</span>
                <p className="font-label-md text-label-md">No se encontraron propiedades con esos filtros.</p>
              </div>
            ) : (
              properties.map((p) => {
                const img = propertyThumbnail(p.images);
                const isActive = activeId === p.id;
                return (
                  <article
                    key={p.id}
                    onClick={() => focusProperty(p.id)}
                    className={`bg-surface-container-lowest rounded-lg border overflow-hidden flex flex-col sm:flex-row hover:shadow-md transition-all cursor-pointer ${isActive ? 'border-secondary ring-1 ring-secondary' : 'border-outline-variant'}`}
                  >
                    <div className="w-full sm:w-2/5 h-40 sm:h-auto relative bg-surface-container shrink-0">
                      {img ? (
                        <img alt={p.title} className="w-full h-full object-cover" src={img} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-[40px] text-outline">image_not_supported</span>
                        </div>
                      )}
                      {p.featured && (
                        <span className="absolute top-2 left-2 bg-primary text-on-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Destacado</span>
                      )}
                    </div>
                    <div className="p-4 flex flex-col justify-between flex-1 min-w-0">
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${p.operation === 'SALE' ? 'bg-secondary text-on-secondary' : 'bg-primary text-on-primary'}`}>
                            {p.operationLabel || OPERATION_LABELS[p.operation] || p.operation}
                          </span>
                          <span className="block font-price-display text-primary leading-none whitespace-nowrap">
                            {formatPrice(p.currency, p.price, p.operation)}
                          </span>
                        </div>
                        <h3 className="font-label-md text-on-surface text-sm mb-1 leading-tight line-clamp-2">{p.title}</h3>
                        <p className="text-xs text-on-surface-variant mb-2 line-clamp-2 flex items-start gap-1">
                          <span className="material-symbols-outlined text-[14px] mt-[2px]">location_on</span>
                          {[p.address, p.neighborhood, p.city].filter(Boolean).join(', ')}
                        </p>
                        <p className="text-[10px] text-outline font-semibold uppercase tracking-wider mb-2">{p.typeLabel || TYPE_LABELS[p.type] || p.type}</p>
                      </div>
                      <div className="flex items-center gap-4 border-t border-outline-variant pt-2 text-on-surface-variant">
                        {p.bedrooms != null && (
                          <span className="flex items-center gap-1 text-xs"><span className="material-symbols-outlined text-[16px]">bed</span>{p.bedrooms}</span>
                        )}
                        {p.bathrooms != null && (
                          <span className="flex items-center gap-1 text-xs"><span className="material-symbols-outlined text-[16px]">shower</span>{p.bathrooms}</span>
                        )}
                        {p.area != null && (
                          <span className="flex items-center gap-1 text-xs"><span className="material-symbols-outlined text-[16px]">straighten</span>{p.area} m²</span>
                        )}
                        {/* Botón destacado (antes era un link de texto chico poco visible) */}
                        <Link
                          to={`/propiedades/${p.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="ml-auto inline-flex items-center gap-1 bg-secondary text-on-secondary font-label-md text-xs px-4 py-2 rounded-lg shadow-sm hover:brightness-110 hover:shadow-md active:scale-95 transition-all"
                        >
                          Ver detalle
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
