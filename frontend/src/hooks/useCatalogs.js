import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

// Hook que trae los catálogos gestionables (tipos de operación, tipos de propiedad y
// amenities) desde GET /api/catalogs. Lo usan el formulario de alta, los filtros y la
// pantalla de gestión. `reload` permite refrescar después de crear/editar/eliminar.
export function useCatalogs() {
  const [catalogs, setCatalogs] = useState({ operations: [], propertyTypes: [], amenities: [] });
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    return api.get('/catalogs')
      .then((res) => setCatalogs({
        operations: res.data.operations || [],
        propertyTypes: res.data.propertyTypes || [],
        amenities: res.data.amenities || [],
      }))
      .catch(() => { /* se mantiene lo que haya */ })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { ...catalogs, loading, reload };
}
