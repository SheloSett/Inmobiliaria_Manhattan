import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// React Router no hace scroll al principio en cada cambio de ruta (a diferencia de
// la navegación tradicional del navegador). Sin esto, al ir de una página larga
// (ej. el detalle de una propiedad) a otra, se queda en el scroll donde estabas.
// Agregado 04/08/2026 a pedido del cliente.
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
