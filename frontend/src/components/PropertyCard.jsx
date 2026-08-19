import { useState } from 'react';
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

// Estado de la llave (19/08/2026): keyStatus reemplazó al booleano hasKey.
// Fallback al booleano viejo por si alguna respuesta cacheada todavía no lo trae.
function keyStatusOf(property) {
  if (property.keyStatus) return property.keyStatus;
  return property.hasKey ? 'WITH' : 'WITHOUT';
}

export default function PropertyCard({ property }) {
  // Fotos de la card (19/08/2026): antes se mostraba SOLO la portada. Ahora se pueden
  // pasar todas con flechitas, sin entrar a la ficha. Se usan únicamente las FOTOS
  // (los videos no se reproducen acá); si la propiedad solo tiene videos, queda el
  // poster del primero como imagen única, igual que antes.
  const photos = (property.images ?? []).filter((i) => i.type !== 'video' && i.url).map((i) => i.url);
  const fallback = propertyThumbnail(property.images);
  const slides = photos.length ? photos : (fallback ? [fallback] : []);
  const [index, setIndex] = useState(0);

  // Posición REAL que se dibuja. Es `index` acotado al rango válido: si el array de
  // fotos se achica sin que el componente se vuelva a montar (mismo `key`), un `index`
  // viejo apuntaría a una foto que ya no existe y la card quedaría EN BLANCO, porque
  // todas las imágenes se renderizan con opacity-0 salvo la activa. Se lee siempre este
  // valor derivado en vez del estado crudo (19/08/2026).
  const current = slides.length ? Math.min(index, slides.length - 1) : 0;

  // Las flechas van ENCIMA del link que cubre la foto, así que frenar la propagación
  // alcanza para que pasar de foto no navegue a la ficha.
  const go = (e, delta) => {
    e.preventDefault();
    e.stopPropagation();
    // Se acota el valor previo antes de sumar, para que la primera flecha después de un
    // cambio de fotos no salte a una posición inexistente. Se mantiene la forma
    // funcional (i => …) para no perder clics seguidos si React agrupa dos eventos.
    setIndex((i) => {
      const safe = Math.min(i, slides.length - 1);
      return (safe + delta + slides.length) % slides.length;
    });
  };

  // Prefiere el label enriquecido del backend (catálogo gestionable); fallback al mapa.
  const opLabel = property.operationLabel ?? OPERATION_LABELS[property.operation] ?? property.operation;
  const opStyle = property.operation === 'SALE'
    ? 'bg-secondary text-on-secondary'
    : 'bg-primary text-on-primary';
  const keyStatus = keyStatusOf(property);

  return (
    <article className="bg-surface-container-lowest border border-outline-variant hover:shadow-lg transition-shadow duration-300 group overflow-hidden rounded-lg flex flex-col">
      {/* Imagen */}
      <div className="relative h-56 overflow-hidden flex-shrink-0">
        {slides.length > 0 ? (
          slides.map((src, i) => {
            // VENTANA DE MONTAJE (19/08/2026): solo se montan la foto actual y sus dos
            // vecinas (la anterior y la siguiente, dando la vuelta porque el carrusel es
            // circular). Antes se renderizaban TODAS apiladas y `loading="lazy"` no
            // servía de nada: las fotos ocultas ocupan igual el alto completo de la card,
            // así que apenas la card entraba en pantalla el navegador se bajaba las 10 o
            // 20 fotos de CADA propiedad de la grilla. Con la ventana, pasar de foto
            // sigue siendo instantáneo (la vecina ya está cargada en opacity-0) pero el
            // catálogo descarga solo lo que se usa.
            const near =
              Math.abs(i - current) <= 1 ||
              (current === 0 && i === slides.length - 1) ||
              (current === slides.length - 1 && i === 0);
            if (!near) return null;
            return (
              <img
                key={`${i}-${src}`}
                alt={property.title}
                // Las fotos montadas se apilan y se cruzan por opacidad. La activa queda
                // visible; el resto no recibe clics.
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
                  i === current ? 'opacity-100' : 'opacity-0'
                }`}
                src={src}
                loading={i === 0 ? undefined : 'lazy'}
              />
            );
          })
        ) : (
          <div className="w-full h-full bg-surface-container flex items-center justify-center">
            <span className="material-symbols-outlined text-[48px] text-outline">image_not_supported</span>
          </div>
        )}

        {/* Capa clickeable sobre la foto (19/08/2026): antes solo el CUERPO de la card
            entraba a la ficha y tocar la foto no hacía nada, que es justo donde la
            gente toca primero. Va como <Link> absoluto en vez de envolver toda la card
            para no meter los botones de las flechas adentro de un <a>. */}
        <Link
          to={`/propiedades/${property.id}`}
          aria-label={`Ver ${property.title}`}
          className="absolute inset-0 z-10"
        />

        {/* Badges arriba a la IZQUIERDA: operación + estado (apilados). El estado se movió
            acá (antes iba arriba a la derecha) para dejar libre la esquina superior derecha
            para el sello "SIN LLAVE" (28/07/2026). */}
        <div className="absolute top-4 left-4 flex flex-col items-start gap-2 z-20 pointer-events-none">
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
            tiene llave, se sigue mostrando el ícono de llave en la fila de specs.
            Con keyStatus "HIDDEN" no se muestra ni el sello ni el ícono (19/08/2026). */}
        {keyStatus === 'WITHOUT' && (
          <div className="absolute top-4 right-4 z-20 pointer-events-none bg-secondary text-on-secondary px-3 py-1 font-label-md text-[12px] uppercase tracking-wider rounded">
            Sin llave
          </div>
        )}

        {/* Flechas + puntitos para pasar las fotos. Sin autoplay: con una grilla entera
            de cards rotando sola el catálogo queda parpadeando. Son botones grandes
            (40px) porque también se usan con el dedo. */}
        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => go(e, -1)}
              aria-label="Foto anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-surface/80 backdrop-blur-sm text-primary flex items-center justify-center shadow-md hover:bg-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={(e) => go(e, 1)}
              aria-label="Foto siguiente"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-surface/80 backdrop-blur-sm text-primary flex items-center justify-center shadow-md hover:bg-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
            <div className="absolute bottom-2 left-0 right-0 z-20 pointer-events-none flex justify-center gap-1.5">
              {slides.map((src, i) => (
                <span
                  key={`${i}-${src}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === current ? 'w-4 bg-surface' : 'w-1.5 bg-surface/60'
                  }`}
                />
              ))}
            </div>
          </>
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
          {keyStatus === 'WITH' && (
            <div className="flex items-center gap-1 text-secondary" title="Con llave">
              <span className="material-symbols-outlined text-[20px]">key</span>
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
