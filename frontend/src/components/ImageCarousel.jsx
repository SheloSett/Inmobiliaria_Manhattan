import { useState, useEffect, useCallback } from 'react';

// Carrusel de imágenes para la ficha de propiedad. Reemplaza al grid "bento" que
// amontonaba las fotos y se rompía con muchas imágenes. Muestra una foto a la vez,
// con flechas, contador, tira de miniaturas y autoplay cada `interval` ms (que se
// pausa al pasar el mouse).
//
// Importante sobre el encuadre: se usa `object-contain` (no `object-cover`) para que
// la foto se vea COMPLETA sin recortar; el espacio sobrante se rellena con una copia
// borrosa de la misma imagen de fondo, así no quedan barras vacías feas.
export default function ImageCarousel({ images = [], alt = '', interval = 5000 }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = images.length;

  const goTo = useCallback((n) => setIndex(((n % count) + count) % count), [count]);
  const prev = () => goTo(index - 1);
  const next = () => goTo(index + 1);

  // Si cambia la cantidad de imágenes, evita quedar en un índice fuera de rango.
  useEffect(() => { setIndex((i) => (i >= count ? 0 : i)); }, [count]);

  // Autoplay: avanza solo salvo que haya una sola imagen, esté pausado (hover) o el
  // slide actual sea un video (para no cortar la reproducción mientras se mira).
  const currentIsVideo = images[index]?.type === 'video';
  useEffect(() => {
    if (count <= 1 || paused || currentIsVideo) return undefined;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => clearInterval(t);
  }, [count, paused, interval, currentIsVideo]);

  if (count === 0) return null;

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {/* Visor principal */}
      <div className="relative h-[400px] md:h-[520px] rounded-xl overflow-hidden bg-surface-container">
        {images.map((img, i) => (
          <div
            key={img.id ?? i}
            className={`absolute inset-0 transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            {img.type === 'video' ? (
              // Video: reproductor con controles, sobre fondo negro. Se muestra completo
              // (object-contain). No autoplay aquí para no arrancar solo al cambiar de slide.
              <div className="absolute inset-0 bg-black flex items-center justify-center">
                <video
                  src={img.url}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <>
                {/* Fondo borroso (rellena el espacio sobrante sin barras vacías) */}
                <img src={img.url} aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-40" />
                {/* Imagen completa, sin recortar */}
                <img
                  src={img.url}
                  alt={`${alt}${count > 1 ? ` — foto ${i + 1}` : ''}`}
                  className="relative w-full h-full object-contain"
                />
              </>
            )}
          </div>
        ))}

        {count > 1 && (
          <>
            {/* Flechas */}
            <button
              type="button"
              onClick={prev}
              aria-label="Foto anterior"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-surface/80 backdrop-blur-sm text-primary flex items-center justify-center shadow-md hover:bg-surface transition-colors z-10"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Foto siguiente"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-surface/80 backdrop-blur-sm text-primary flex items-center justify-center shadow-md hover:bg-surface transition-colors z-10"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>

            {/* Contador */}
            <div className="absolute top-4 right-4 bg-surface/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 font-label-md text-label-md text-primary shadow-sm z-10">
              <span className="material-symbols-outlined text-[16px]">photo_library</span>
              {index + 1} / {count}
            </div>
          </>
        )}
      </div>

      {/* Tira de miniaturas (clic para saltar a una foto) */}
      {count > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id ?? i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Ver foto ${i + 1}`}
              className={`relative flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all bg-surface-container ${
                i === index ? 'border-secondary' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              {img.type === 'video' ? (
                <>
                  <video src={img.url} className="w-full h-full object-cover" muted preload="metadata" />
                  <span className="material-symbols-outlined absolute inset-0 m-auto w-5 h-5 flex items-center justify-center text-white text-[18px] drop-shadow">play_circle</span>
                </>
              ) : (
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
