import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import { geocodeAddress } from '../services/geocode';

// Selector de ubicación en un mapa (Leaflet + OpenStreetMap). El admin marca el punto
// EXACTO de la propiedad haciendo clic o arrastrando el marcador, y eso guarda lat/lng
// reales en la BD. Así el mapa de búsqueda no depende de geocodificar la dirección en
// vivo (que fallaba con direcciones ambiguas). También hay un botón "Ubicar por
// dirección" que centra el marcador a partir de la dirección escrita, como ayuda.

const BUENOS_AIRES = [-34.6083, -58.3712];

// Ícono de pin (DivIcon SVG) para evitar el problema de íconos rotos de Leaflet con bundlers.
const pinIcon = L.divIcon({
  className: 'manhattan-pin',
  html: `<svg width="30" height="40" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 20 12 20s12-11.6 12-20c0-6.6-5.4-12-12-12z" fill="#bb000f"/>
    <circle cx="12" cy="12" r="4.5" fill="#ffffff"/>
  </svg>`,
  iconSize: [30, 40],
  iconAnchor: [15, 40],
});

export default function LocationPicker({ lat, lng, onChange, address = '', city = '', neighborhood = '' }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [locating, setLocating] = useState(false);

  const hasCoords = lat != null && lat !== '' && lng != null && lng !== '';

  // Coloca o mueve el marcador (draggable) en una posición y avisa al padre.
  const placeMarker = (la, ln) => {
    const map = mapRef.current;
    if (!map) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([la, ln]);
    } else {
      const m = L.marker([la, ln], { icon: pinIcon, draggable: true }).addTo(map);
      m.on('dragend', () => {
        const p = m.getLatLng();
        onChangeRef.current(Number(p.lat.toFixed(6)), Number(p.lng.toFixed(6)));
      });
      markerRef.current = m;
    }
  };

  // Init del mapa (una vez).
  useEffect(() => {
    if (mapRef.current || !mapEl.current) return undefined;
    const start = hasCoords ? [Number(lat), Number(lng)] : BUENOS_AIRES;
    const map = L.map(mapEl.current, { center: start, zoom: hasCoords ? 16 : 12 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    // Clic en el mapa = poner/mover el marcador ahí.
    map.on('click', (e) => {
      onChangeRef.current(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
    });
    mapRef.current = map;
    if (hasCoords) placeMarker(Number(lat), Number(lng));
    setTimeout(() => map.invalidateSize(), 200);
    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincroniza el marcador cuando cambian lat/lng desde afuera (clic, arrastre, ubicar).
  useEffect(() => {
    if (!mapRef.current) return;
    if (hasCoords) {
      placeMarker(Number(lat), Number(lng));
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  // Geocodifica la dirección escrita y centra el marcador ahí (ayuda, editable después).
  const locateByAddress = async () => {
    if (!address.trim()) { toast.error('Escribí primero la dirección (calle y altura)'); return; }
    setLocating(true);
    try {
      const coords = await geocodeAddress({ address, city, neighborhood });
      if (!coords) { toast.error('No se encontró esa dirección. Marcá el punto en el mapa a mano.'); return; }
      onChangeRef.current(Number(coords.lat.toFixed(6)), Number(coords.lng.toFixed(6)));
      mapRef.current?.setView([coords.lat, coords.lng], 16);
      toast.success('Ubicación aproximada marcada. Ajustala si hace falta.');
    } catch {
      toast.error('No se pudo ubicar la dirección');
    } finally {
      setLocating(false);
    }
  };

  const clearLocation = () => onChangeRef.current('', '');

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={locateByAddress}
          disabled={locating}
          className="inline-flex items-center gap-1 px-3 py-2 rounded border border-primary text-primary font-label-md text-sm hover:bg-primary/5 transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">my_location</span>
          {locating ? 'Ubicando...' : 'Ubicar por dirección'}
        </button>
        {hasCoords && (
          <button
            type="button"
            onClick={clearLocation}
            className="inline-flex items-center gap-1 px-3 py-2 rounded border border-outline-variant text-on-surface-variant font-label-md text-sm hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
            Quitar ubicación
          </button>
        )}
        <span className="font-body-md text-sm text-on-surface-variant">
          {hasCoords
            ? `📍 ${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`
            : 'Sin ubicación marcada'}
        </span>
      </div>

      <div ref={mapEl} className="w-full h-72 rounded-lg border border-outline-variant overflow-hidden z-0" />

      <p className="font-body-md text-xs text-on-surface-variant">
        Hacé clic en el mapa para marcar la propiedad, o arrastrá el marcador para ajustarlo.
        Esta ubicación es la que se muestra en el mapa de búsqueda del sitio.
      </p>
    </div>
  );
}
