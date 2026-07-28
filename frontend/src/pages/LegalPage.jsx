import { useSiteContent } from '../hooks/useSiteContent';
import SitePageShell from '../components/SitePageShell';

// Página legal genérica reutilizable para Privacidad y Términos (misma estructura:
// título + fecha + intro + secciones). El contenido —incluidas las secciones, que se
// pueden agregar/editar/eliminar— es 100% editable desde Ajustes → Contenido.
// Se parametriza con pageKey ('privacy' | 'terms') desde las rutas en App.jsx.
export default function LegalPage({ pageKey }) {
  const c = useSiteContent(pageKey);
  const sections = c.sections || [];

  return (
    <SitePageShell>
      <header className="mb-stack-lg border-b border-outline-variant pb-stack-md">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-xl md:text-headline-xl text-primary mb-2">{c.title}</h1>
        {c.updatedAt && <p className="font-label-md text-label-md text-on-surface-variant">{c.updatedAt}</p>}
      </header>

      {c.intro && (
        <p className="font-body-lg text-body-lg text-on-surface-variant mb-stack-lg">{c.intro}</p>
      )}

      <div className="space-y-stack-md">
        {sections.map((s, i) => (
          <section key={i}>
            {s.heading && <h2 className="font-headline-md text-headline-md text-primary mb-2">{s.heading}</h2>}
            {s.body && <p className="font-body-md text-body-md text-on-surface-variant whitespace-pre-line">{s.body}</p>}
          </section>
        ))}
      </div>
    </SitePageShell>
  );
}
