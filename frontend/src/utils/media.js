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
