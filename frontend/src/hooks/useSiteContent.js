import { useState, useEffect } from 'react';
import api from '../services/api';
import { defaultsFor } from '../config/siteContent';

// Hook que devuelve el contenido de una página del sitio, mergeando lo guardado
// en la BD (editable desde Ajustes → Contenido) sobre los valores por defecto del
// esquema. Arranca con los defaults, así nunca hay parpadeo de contenido vacío;
// si la request falla, se queda con los defaults (el sitio siempre muestra algo).
export function useSiteContent(pageKey) {
  const [content, setContent] = useState(() => defaultsFor(pageKey));

  useEffect(() => {
    let active = true;
    setContent(defaultsFor(pageKey));
    api.get(`/content/${pageKey}`)
      .then((res) => {
        if (!active) return;
        const saved = res.data && typeof res.data === 'object' ? res.data : {};
        setContent({ ...defaultsFor(pageKey), ...saved });
      })
      .catch(() => { /* se mantienen los defaults */ });
    return () => { active = false; };
  }, [pageKey]);

  return content;
}
