import { Link } from 'react-router-dom';
import { propertyThumbnail } from '../utils/media';

// Card de propiedad ÚNICA y compartida (28/07/2026). Antes había dos cards distintas
// —una en Home.jsx (destacadas) y otra en Catalog.jsx— que habían divergido (una mostraba
// cochera/con llave/estado y la otra no). Se unificó en este componente para que la card
// sea idéntica en Home, Catálogo y Búsqueda, y cualquier cambio se haga en un solo lugar.
// Se tomó como base la card del catálogo (la más completa).

const OPERATION_LABELS = { SALE: 'Venta', RENT: 'Alquiler' };
const STATUS_LABELS = {
  AVAILABLE: 'Disponible',
  RESERVED: 'Reservado',
  SOLD: 'Vendido',
  RENTED: 'Alquilado',
};

function formatPrice(currency, price, operation) {
  const formatted = `${currency} $${Number(price).toLocaleString('es-AR')}`;
  return operation === 'RENT' ? `${formatted}/mes` : formatted;
}

export default function PropertyCard({ property }) {
  // Thumbnail: foto principal → primera foto → poster del video (si solo hay videos).
  const primaryImg = propertyThumbnail(property.images);
  // Prefiere el label enriquecido del backend (catálogo gestionable); fallback al mapa.
  const opLabel = property.operationLabel ?? OPERATION_LABELS[property.operation] ?? property.operation;
  const opStyle = property.operation === 'SALE'
    ? 'bg-secondary text-on-secondary'
    : 'bg-primary text-on-primary';

  return (
    <article className="bg-surface-container-lowest border border-outline-variant hover:shadow-lg transition-shadow duration-300 group overflow-hidden rounded-lg flex flex-col">
      {/* Imagen */}
      <div className="relative h-56 overflow-hidden flex-shrink-0">
        {primaryImg ? (
          <img
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            src={primaryImg}
          />
        ) : (
          <div className="w-full h-full bg-surface-container flex items-center justify-center">
            <span className="material-symbols-outlined text-[48px] text-outline">image_not_supported</span>
          </div>
        )}
        {/* Badges arriba a la IZQUIERDA: operación + estado (apilados). El estado se movió
            acá (antes iba arriba a la derecha) para dejar libre la esquina superior derecha
            para el sello "SIN LLAVE" (28/07/2026). */}
        <div className="absolute top-4 left-4 flex flex-col items-start gap-2">
          <div className={`px-3 py-1 font-label-md text-[12px] uppercase tracking-wider rounded ${opStyle}`}>
            {opLabel}
          </div>
          {property.status !== 'AVAILABLE' && (
            <div className="bg-surface/90 backdrop-blur-sm text-on-surface px-2 py-1 font-label-md text-[11px] uppercase tracking-wider rounded">
              {STATUS_LABELS[property.status]}
            </div>
          )}
        </div>
        {/* Etiqueta "SIN LLAVE": cuando la propiedad NO tiene llave, se muestra en la esquina
            superior derecha con el MISMO estilo plano que las etiquetas de la izquierda
            (operación/estado): sin rotación, sin borde ni sombra (28/07/2026). Cuando SÍ
            tiene llave, se sigue mostrando el ícono de llave en la fila de specs. */}
        {!property.hasKey && (
          <div className="absolute top-4 right-4 bg-secondary text-on-secondary px-3 py-1 font-label-md text-[12px] uppercase tracking-wider rounded">
            Sin llave
          </div>
        )}
      </div>

      {/* Cuerpo */}
      <Link to={`/propiedades/${property.id}`} className="p-6 flex flex-col flex-grow">
        <div className="font-price-display text-price-display text-primary mb-1">
          {formatPrice(property.currency, property.price, property.operation)}
        </div>
        <h3 className="font-headline-md text-headline-md text-on-surface mb-2 line-clamp-2 leading-tight">
          {property.title}
        </h3>
        <p className="font-body-md text-on-surface-variant mb-4 flex items-start gap-1 text-sm line-clamp-1">
          <span className="material-symbols-outlined text-[16px] mt-[3px] flex-shrink-0">location_on</span>
          {[property.address, property.neighborhood, property.city].filter(Boolean).join(', ')}
        </p>
        <div className="mt-auto pt-4 border-t border-outline-variant flex gap-4">
          {property.bedrooms != null && (
            <div className="flex items-center gap-1 text-on-surface-variant" title="Dormitorios">
              <span className="material-symbols-outlined text-[20px]">bed</span>
              <span className="font-label-md text-label-md">{property.bedrooms}</span>
            </div>
          )}
          {property.bathrooms != null && (
            <div className="flex items-center gap-1 text-on-surface-variant" title="Baños">
              <span className="material-symbols-outlined text-[20px]">shower</span>
              <span className="font-label-md text-label-md">{property.bathrooms}</span>
            </div>
          )}
          {property.area != null && (
            <div className="flex items-center gap-1 text-on-surface-variant" title="Superficie">
              <span className="material-symbols-outlined text-[20px]">straighten</span>
              <span className="font-label-md text-label-md">{property.area} m²</span>
            </div>
          )}
          {property.garage && (
            <div className="flex items-center gap-1 text-on-surface-variant" title="Cochera">
              <span className="material-symbols-outlined text-[20px]">directions_car</span>
            </div>
          )}
          {/* "Con llave": ícono de llave, solo si la propiedad la tiene. */}
          {property.hasKey && (
            <div className="flex items-center gap-1 text-secondary" title="Con llave">
              <span className="material-symbols-outlined text-[20px]">key</span>
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
