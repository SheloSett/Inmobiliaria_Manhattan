import { Link } from 'react-router-dom';
import { useSiteContent } from '../hooks/useSiteContent';
import SitePageShell from '../components/SitePageShell';

// Centro de Ayuda. Título, subtítulo y las preguntas frecuentes (agregar/editar/
// eliminar) son editables desde Ajustes → Contenido → Ayuda. Las FAQ usan el
// acordeón nativo <details> para expandir/colapsar cada respuesta.
export default function Help() {
  const c = useSiteContent('help');
  const faqs = c.faqs || [];

  return (
    <SitePageShell>
      <header className="mb-stack-lg text-center">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-xl md:text-headline-xl text-primary mb-2">{c.title}</h1>
        {c.subtitle && <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">{c.subtitle}</p>}
      </header>

      <div className="space-y-3">
        {faqs.map((f, i) => (
          <details key={i} className="group bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
            <summary className="flex items-center justify-between gap-4 p-4 cursor-pointer list-none font-label-md text-body-md text-on-surface hover:bg-surface-container-low transition-colors">
              <span>{f.question}</span>
              <span className="material-symbols-outlined text-on-surface-variant transition-transform group-open:rotate-180">expand_more</span>
            </summary>
            <div className="px-4 pb-4 font-body-md text-body-md text-on-surface-variant whitespace-pre-line">{f.answer}</div>
          </details>
        ))}
      </div>

      {/* CTA de contacto para cuando la FAQ no alcanza */}
      <div className="mt-stack-lg text-center bg-surface-container-low border border-outline-variant rounded-xl p-stack-md">
        <p className="font-body-md text-body-md text-on-surface-variant mb-3">¿No encontraste lo que buscabas?</p>
        <Link
          to="/contacto"
          className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded font-label-md text-label-md hover:bg-primary-container transition-colors"
        >
          Contactanos
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
      </div>
    </SitePageShell>
  );
}
