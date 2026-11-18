// Helpers de media (fotos/videos) de una propiedad.

// Dada una URL de video de Cloudinary, devuelve la URL de una imagen con su primer
// frame (para usar como miniatura/poster). Cloudinary genera el frame agregando la
// transformación `so_0` (start offset 0) y pidiendo un formato de imagen (.jpg).
// Ej: .../video/upload/v123/abc.mp4 → .../video/upload/so_0/v123/abc.jpg
export function videoPoster(url) {
  if (!url || !url.includes('/video/upload/')) return null;
  return url
    .replace('/video/upload/', '/video/upload/so_0/')
    .replace(/\.(mp4|mov|webm|m4v|avi|mkv)$/i, '.jpg');
}

// Versión liviana de una foto de Cloudinary para mostrarla a `width` px (18/11/2026).
// POR QUÉ: las fotos se servían TAL CUAL las subió el admin. Medido en producción: las 12
// portadas de la primera página del catálogo pesaban 9,2 MB (había PNG de 3 MB) y la ficha
// bajaba cada foto entera aunque se viera a 800 px. Con una conexión floja eso es "la web
// carga recontra lento", aunque el servidor responda en 0,2 s. Con esta transformación
// las mismas 12 portadas pesan 1,2 MB.
// Cloudinary arma la versión achicada en su CDN a partir de la URL (la primera vez, y
// después la cachea); el original no se toca:
//   - f_auto:       el formato más liviano que acepte el navegador (AVIF/WebP, si no JPG).
//   - q_auto:       compresión ajustada a cada foto, sin diferencia visible.
//   - c_limit,w_N:  como máximo N px de ancho; una foto más chica NO se agranda.
// Conviene pedir ~2x el ancho en pantalla para que se vea nítida en celulares y pantallas
// de alta densidad.
// Solo toca URLs de Cloudinary; cualquier otra cosa (blob: de una preview, /uploads/
// viejas, placeholders) vuelve sin cambios.
export function optimizedImage(url, width = 800) {
  if (typeof url !== 'string' || !url.includes('res.cloudinary.com')) return url;
  const t = `c_limit,w_${width},q_auto`;
  // Foto: .../image/upload/v123/abc.jpg → .../image/upload/f_auto,c_limit,w_800,q_auto/v123/abc.jpg
  // (solo si después de /upload/ viene directo la versión, o sea, sin transformaciones previas).
  if (/\/image\/upload\/v\d+\//.test(url)) {
    return url.replace('/image/upload/', `/image/upload/f_auto,${t}/`);
  }
  // Poster de un video (ver videoPoster): se suman al so_0 que ya tiene. Sin f_auto: en un
  // recurso de video, f_auto elegiría un formato de VIDEO; la extensión .jpg pide imagen.
  if (url.includes('/video/upload/so_0/')) {
    return url.replace('/video/upload/so_0/', `/video/upload/so_0,${t}/`);
  }
  return url;
}

// Devuelve la URL de miniatura para los listados: prioriza la foto principal, luego
// la primera foto; si la propiedad SOLO tiene videos, usa el primer frame del primer
// video como poster. Devuelve null si no hay nada (se muestra el placeholder).
export function propertyThumbnail(images = []) {
  const primary = images.find((i) => i.isPrimary)?.url;
  if (primary) return primary;
  const firstImage = images.find((i) => i.type !== 'video')?.url;
  if (firstImage) return firstImage;
  const firstVideo = images.find((i) => i.type === 'video')?.url;
  if (firstVideo) return videoPoster(firstVideo);
  return null;
}
