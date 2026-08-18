import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

// Contador de pendientes de Postulaciones para el sidebar del admin (17/08/2026).
// Suma las NO LEÍDAS de las dos solapas del panel: postulaciones de trabajo
// (/applications/jobs) y solicitudes de sucursal (/applications/branches). Así el
// admin ve desde cualquier pantalla si hay algo sin revisar, sin tener que entrar.
//
// Se pide con limit=1 porque solo interesa el campo `unread` de la respuesta (que el
// backend calcula sin filtrar): traer la lista entera sería tirar datos al pedo.
//
// Se refresca en tres momentos:
//   1. Al cambiar de ruta dentro del admin (por ejemplo, al salir de Postulaciones
//      después de marcar varias como leídas).
//   2. Cada 60 s, por si entran postulaciones nuevas con el panel abierto.
//   3. Al recibir el evento 'applications:updated', que dispara AdminApplications
//      cuando marca una como leída o elimina una sin leer. Es un CustomEvent global y
//      no un contexto para no tener que envolver todo el admin en un provider nuevo.

export const APPLICATIONS_UPDATED_EVENT = 'applications:updated';

// Helper para que quien cambie el estado de una postulación avise al sidebar.
export function notifyApplicationsUpdated() {
  window.dispatchEvent(new CustomEvent(APPLICATIONS_UPDATED_EVENT));
}

const REFRESH_MS = 60000;

export function useUnreadApplications() {
  const [counts, setCounts] = useState({ jobs: 0, branches: 0 });
  const location = useLocation();

  const fetchCounts = useCallback(async () => {
    try {
      const [jobs, branches] = await Promise.all([
        api.get('/applications/jobs?limit=1'),
        api.get('/applications/branches?limit=1'),
      ]);
      setCounts({
        jobs: jobs.data?.unread ?? 0,
        branches: branches.data?.unread ?? 0,
      });
    } catch {
      // Silencioso: si falla (401 o red), el interceptor de api.js ya se encarga y el
      // badge simplemente se queda con el último valor conocido.
    }
  }, []);

  // 1) Al montar y en cada cambio de ruta del admin.
  useEffect(() => { fetchCounts(); }, [fetchCounts, location.pathname]);

  // 2) Polling suave + 3) evento manual.
  useEffect(() => {
    const id = setInterval(fetchCounts, REFRESH_MS);
    window.addEventListener(APPLICATIONS_UPDATED_EVENT, fetchCounts);
    return () => {
      clearInterval(id);
      window.removeEventListener(APPLICATIONS_UPDATED_EVENT, fetchCounts);
    };
  }, [fetchCounts]);

  return {
    jobs: counts.jobs,
    branches: counts.branches,
    total: counts.jobs + counts.branches,
    refresh: fetchCounts,
  };
}
