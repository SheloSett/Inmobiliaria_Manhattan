import { useState } from 'react';

const periods = ['Mes', 'Trimestre', 'Año'];

const metrics = [
  {
    icon: 'payments',
    label: 'Ventas Totales',
    value: '$0',
    trend: null,
    trendLabel: 'Sin datos aún',
  },
  {
    icon: 'real_estate_agent',
    label: 'Propiedades Cerradas',
    value: '0',
    trend: null,
    trendLabel: 'Sin datos aún',
  },
  {
    icon: 'group_add',
    label: 'Nuevos Leads',
    value: '0',
    trend: null,
    trendLabel: 'Sin datos aún',
  },
  {
    icon: 'schedule',
    label: 'Tiempo Promedio en Mercado',
    value: '— Días',
    trend: null,
    trendLabel: 'Sin datos aún',
  },
];

// meses del año para el eje X del chart
const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// tipos de propiedad para leyenda del donut
const propertyTypes = [
  { label: 'Departamentos', color: 'bg-primary', pct: 0 },
  { label: 'Casas',         color: 'bg-secondary', pct: 0 },
  { label: 'Comercial',     color: 'bg-tertiary-fixed', pct: 0 },
];

// agentes - vacío, se llenará con datos reales
const agents = [];

function StarRating({ rating }) {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <div className="flex items-center text-yellow-500">
      {[...Array(full)].map((_, i)  => <span key={`f${i}`}  className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>)}
      {half &&                          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star_half</span>}
      {[...Array(empty)].map((_, i) => <span key={`e${i}`}  className="material-symbols-outlined text-[16px]">star</span>)}
      <span className="ml-1 text-on-surface-variant text-xs">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function AdminReports() {
  const [activePeriod, setActivePeriod] = useState('Trimestre');

  return (
    <div className="p-margin-mobile md:p-gutter bg-surface flex flex-col gap-stack-lg min-h-full">

      {/* Header & Controls */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-stack-sm">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary">Reportes de Rendimiento</h2>
          <p className="text-on-surface-variant font-body-md text-body-md mt-1">Análisis detallado de ventas y desempeño del equipo.</p>
        </div>
        <div className="flex flex-wrap items-center gap-unit">
          {/* Period Filter */}
          <div className="flex items-center bg-surface-container-lowest border border-outline-variant rounded-lg p-1">
            {periods.map((p) => (
              <button
                key={p}
                onClick={() => setActivePeriod(p)}
                className={`px-4 py-2 font-label-md text-label-md rounded-md transition-colors ${
                  activePeriod === p
                    ? 'bg-surface-container-high text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                {p}
              </button>
            ))}
            <div className="w-px h-6 bg-outline-variant mx-2" />
            <button className="flex items-center gap-2 px-3 py-2 text-on-surface-variant hover:bg-surface-container-low rounded-md transition-colors">
              <span className="material-symbols-outlined text-[20px]">calendar_month</span>
              <span className="font-label-md text-label-md">Personalizado</span>
            </button>
          </div>
          {/* Export Buttons */}
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border border-outline-variant text-primary font-label-md text-label-md rounded-lg hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
              PDF
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border border-outline-variant text-primary font-label-md text-label-md rounded-lg hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-[20px]">csv</span>
              CSV
            </button>
          </div>
        </div>
      </header>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">

        {/* Key Metrics Row */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          {metrics.map((m) => (
            <div key={m.label} className="bg-surface-container-lowest p-stack-md rounded-xl border border-outline-variant shadow-sm flex flex-col">
              <div className="flex justify-between items-start mb-stack-sm">
                <p className="font-label-md text-label-md text-on-surface-variant">{m.label}</p>
                <div className="p-2 bg-tertiary-fixed rounded-full text-primary">
                  <span className="material-symbols-outlined">{m.icon}</span>
                </div>
              </div>
              <h3 className="font-price-display text-price-display text-primary">{m.value}</h3>
              <p className="font-body-md text-sm text-on-surface-variant flex items-center gap-1 mt-auto pt-2">
                <span className="material-symbols-outlined text-[16px]">horizontal_rule</span>
                {m.trendLabel}
              </p>
            </div>
          ))}
        </div>

        {/* Bar Chart: Ventas por Mes */}
        <div className="lg:col-span-2 bg-surface-container-lowest p-stack-md rounded-xl border border-outline-variant shadow-sm flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center mb-stack-md">
            <h3 className="font-headline-md text-headline-md text-primary">Ventas por Mes (USD)</h3>
            <button className="text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined">more_vert</span>
            </button>
          </div>
          {/* Barras en 0 — se reemplazarán con recharts */}
          <div className="flex-1 flex items-end gap-2 sm:gap-4 relative pt-8 pb-6 border-b border-l border-outline-variant px-4">
            <div className="absolute -left-10 top-0 bottom-6 flex flex-col justify-between text-xs text-on-surface-variant text-right w-8">
              <span>$1M</span>
              <span>$750k</span>
              <span>$500k</span>
              <span>$250k</span>
              <span>0</span>
            </div>
            <div className="w-full flex justify-between items-end h-full">
              {months.map((m) => (
                <div key={m} className="w-1/12 group relative flex justify-center h-full items-end">
                  <div className="w-full max-w-[24px] bg-surface-container-high rounded-t-sm h-[2%]" />
                  <span className="absolute -bottom-6 text-[10px] text-on-surface-variant">{m}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Donut Chart: Distribución por Tipo */}
        <div className="lg:col-span-1 bg-surface-container-lowest p-stack-md rounded-xl border border-outline-variant shadow-sm flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center mb-stack-md">
            <h3 className="font-headline-md text-headline-md text-primary">Distribución por Tipo</h3>
            <button className="text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined">more_vert</span>
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Donut vacío */}
            <div className="relative w-48 h-48 rounded-full mb-8" style={{ background: 'conic-gradient(#e0e3e5 0% 100%)' }}>
              <div className="absolute inset-0 m-auto w-32 h-32 bg-surface-container-lowest rounded-full flex flex-col items-center justify-center">
                <span className="font-label-md text-label-md text-on-surface-variant">Total</span>
                <span className="font-price-display text-xl text-primary">0</span>
              </div>
            </div>
            <div className="w-full space-y-3">
              {propertyTypes.map((t) => (
                <div key={t.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${t.color}`} />
                    <span className="font-body-md text-sm text-on-surface-variant">{t.label}</span>
                  </div>
                  <span className="font-label-md text-sm text-primary">{t.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabla: Agentes Destacados */}
        <div className="lg:col-span-3 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="p-stack-md border-b border-outline-variant flex justify-between items-center bg-surface-bright">
            <h3 className="font-headline-md text-headline-md text-primary">Agentes Destacados</h3>
            <button className="text-secondary font-label-md text-sm hover:underline">Ver Todos</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-lowest">
                  <th className="p-4 font-label-md text-sm text-on-surface-variant">Agente</th>
                  <th className="p-4 font-label-md text-sm text-on-surface-variant">Propiedades Vendidas</th>
                  <th className="p-4 font-label-md text-sm text-on-surface-variant">Volumen Total</th>
                  <th className="p-4 font-label-md text-sm text-on-surface-variant">Calificación</th>
                  <th className="p-4 font-label-md text-sm text-on-surface-variant text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="font-body-md text-sm">
                {agents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center">
                      <div className="flex flex-col items-center gap-2 text-on-surface-variant">
                        <span className="material-symbols-outlined text-[40px] text-outline">manage_accounts</span>
                        <p className="font-label-md text-label-md">No hay agentes registrados aún.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  agents.map((a) => (
                    <tr key={a.id} className="border-b border-surface-container-high hover:bg-surface-container-low transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${a.avatarBg} ${a.avatarColor}`}>
                            {a.initials}
                          </div>
                          <div>
                            <p className="font-label-md text-primary">{a.name}</p>
                            <p className="text-xs text-on-surface-variant">{a.specialty}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-on-background">{a.sold}</td>
                      <td className="p-4 text-primary font-semibold">{a.volume}</td>
                      <td className="p-4"><StarRating rating={a.rating} /></td>
                      <td className="p-4 text-right">
                        <button className="text-primary hover:text-secondary transition-colors p-2 rounded-full hover:bg-surface-container">
                          <span className="material-symbols-outlined">visibility</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
