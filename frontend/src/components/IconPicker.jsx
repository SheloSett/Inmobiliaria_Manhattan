import { useState, useRef, useEffect } from 'react';

// Selector visual de íconos (Material Symbols) para no tener que escribir el nombre a
// mano. Muestra el ícono elegido; al hacer click abre una grilla con los íconos más
// comunes de inmobiliaria, con un buscador por nombre en español. Devuelve el nombre
// del ícono (ej "pool") vía onChange, que es lo que se guarda en Amenity.icon.

// Catálogo curado de íconos frecuentes. `name` = nombre real de Material Symbols;
// `label` = cómo lo busca/entiende el admin (en español).
const ICONS = [
  { name: 'pool', label: 'Piscina' },
  { name: 'fitness_center', label: 'Gimnasio' },
  { name: 'directions_car', label: 'Cochera / Garage' },
  { name: 'elevator', label: 'Ascensor' },
  { name: 'security', label: 'Seguridad' },
  { name: 'videocam', label: 'Cámaras / CCTV' },
  { name: 'shield', label: 'Vigilancia' },
  { name: 'outdoor_grill', label: 'Parrilla' },
  { name: 'pets', label: 'Apto mascotas' },
  { name: 'deck', label: 'Terraza' },
  { name: 'balcony', label: 'Balcón' },
  { name: 'celebration', label: 'SUM / Salón de fiestas' },
  { name: 'meeting_room', label: 'Salón de usos múltiples' },
  { name: 'wifi', label: 'WiFi / Internet' },
  { name: 'ac_unit', label: 'Aire acondicionado' },
  { name: 'local_fire_department', label: 'Calefacción / Hogar' },
  { name: 'local_laundry_service', label: 'Lavadero' },
  { name: 'kitchen', label: 'Cocina equipada' },
  { name: 'bathtub', label: 'Jacuzzi / Bañera' },
  { name: 'yard', label: 'Jardín' },
  { name: 'park', label: 'Espacio verde' },
  { name: 'grass', label: 'Parque' },
  { name: 'sports_tennis', label: 'Cancha de tenis' },
  { name: 'sports_soccer', label: 'Cancha de fútbol' },
  { name: 'sports_basketball', label: 'Cancha deportiva' },
  { name: 'solar_power', label: 'Paneles solares' },
  { name: 'water_drop', label: 'Tanque de agua' },
  { name: 'bolt', label: 'Grupo electrógeno' },
  { name: 'roofing', label: 'Techo / Azotea' },
  { name: 'stairs', label: 'Escalera' },
  { name: 'accessible', label: 'Accesibilidad' },
  { name: 'door_front', label: 'Portería' },
  { name: 'apartment', label: 'Edificio' },
  { name: 'house', label: 'Casa' },
  { name: 'villa', label: 'Casa quinta' },
  { name: 'king_bed', label: 'Amoblado' },
  { name: 'desk', label: 'Oficina / Coworking' },
  { name: 'checkroom', label: 'Vestidor / Placard' },
  { name: 'cleaning_services', label: 'Servicio de limpieza' },
  { name: 'elderly', label: 'Apto adultos mayores' },
  { name: 'child_care', label: 'Apto niños / Juegos' },
  { name: 'store', label: 'Comercios cerca' },
  { name: 'train', label: 'Transporte cerca' },
  { name: 'category', label: 'Genérico' },
];

export default function IconPicker({ value, onChange, className = '' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  // Cierra al hacer click afuera o con Escape.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const filtered = query.trim()
    ? ICONS.filter((i) => i.label.toLowerCase().includes(query.trim().toLowerCase()) || i.name.includes(query.trim().toLowerCase()))
    : ICONS;

  const select = (name) => { onChange(name); setOpen(false); setQuery(''); };

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 border border-outline-variant rounded p-2.5 bg-surface-container-lowest hover:bg-surface-container transition-colors"
        title="Elegir ícono"
      >
        <span className="material-symbols-outlined text-[22px] text-primary">{value || 'add_reaction'}</span>
        <span className="font-body-md text-sm text-on-surface-variant truncate flex-1 text-left">
          {value ? (ICONS.find((i) => i.name === value)?.label || value) : 'Elegir ícono'}
        </span>
        <span className="material-symbols-outlined text-[18px] text-outline">expand_more</span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-72 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-xl p-3">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar (ej: pileta, cochera...)"
            className="w-full border border-outline-variant rounded p-2 text-sm mb-2 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
          <div className="grid grid-cols-5 gap-1 max-h-56 overflow-y-auto">
            {filtered.map((i) => (
              <button
                key={i.name}
                type="button"
                onClick={() => select(i.name)}
                title={i.label}
                className={`aspect-square flex items-center justify-center rounded hover:bg-surface-container transition-colors ${value === i.name ? 'bg-primary-container' : ''}`}
              >
                <span className={`material-symbols-outlined text-[24px] ${value === i.name ? 'text-on-primary-container' : 'text-primary'}`}>{i.name}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-5 text-center text-sm text-on-surface-variant py-4">Sin resultados</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
