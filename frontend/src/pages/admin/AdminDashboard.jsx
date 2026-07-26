const metrics = [
  {
    icon: 'apartment',
    iconBg: 'bg-tertiary-fixed',
    iconColor: 'text-primary',
    label: 'Propiedades Activas',
    value: '0',
  },
  {
    icon: 'forum',
    iconBg: 'bg-secondary-fixed',
    iconColor: 'text-secondary',
    label: 'Consultas Activas',
    value: '0',
  },
  {
    icon: 'attach_money',
    iconBg: 'bg-surface-tint',
    iconColor: 'text-surface-container-lowest',
    label: 'Ventas del Mes (USD)',
    value: '$0',
  },
  {
    icon: 'group_add',
    iconBg: 'bg-primary-fixed',
    iconColor: 'text-primary',
    label: 'Nuevos Leads',
    value: '0',
  },
];

// activities vacío - se llenará con datos reales de la API
const activities = [];

// alturas relativas de las barras del chart placeholder
const chartBars = [40, 65, 50, 80, 60, 75, 55, 90, 70, 85, 45, 60];

export default function AdminDashboard() {
  return (
    <div className="p-margin-mobile md:p-margin-desktop bg-surface flex flex-col gap-stack-lg min-h-full">

      {/* Header */}
      <header className="flex justify-between items-end border-b border-outline-variant pb-unit mb-stack-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary">Resumen de Actividad</h1>
          <p className="text-on-surface-variant font-body-md text-body-md mt-1">Bienvenido de nuevo, aquí está el rendimiento de hoy.</p>
        </div>
        <div className="flex items-center gap-gutter">
          <div className="flex items-center bg-surface-container px-4 py-2 rounded border border-outline-variant text-sm">
            <span className="material-symbols-outlined text-outline mr-2 text-[20px]">calendar_today</span>
            <span className="font-label-md text-primary">Últimos 30 días</span>
          </div>
        </div>
      </header>

      {/* Metric Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
        {metrics.map((m) => (
          <div key={m.label} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded ${m.iconBg} ${m.iconColor}`}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{m.icon}</span>
              </div>
            </div>
            <div>
              <p className="font-label-md text-label-md text-on-surface-variant mb-1">{m.label}</p>
              <p className="font-price-display text-price-display text-primary">{m.value}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Chart + Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">

        {/* Chart Area */}
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline-md text-headline-md text-primary">Vistas y Leads (Mensual)</h3>
            <button className="text-outline hover:text-primary transition-colors">
              <span className="material-symbols-outlined">more_vert</span>
            </button>
          </div>
          <div className="w-full h-64 bg-surface-container-low rounded border border-outline-variant flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 flex items-end px-4 gap-2 opacity-50 pb-4">
              {chartBars.map((h, i) => (
                <div key={i} className="w-full bg-tertiary-fixed rounded-t-sm" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent" />
            <p className="text-on-surface-variant font-label-md relative z-10 bg-surface/80 px-4 py-2 rounded backdrop-blur-sm">
              Chart Render Area
            </p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline-md text-headline-md text-primary">Actividad Reciente</h3>
            <a className="text-secondary hover:text-secondary-container font-label-md text-xs" href="#">Ver Todo</a>
          </div>
          <div className="flex-grow flex flex-col gap-4">
            {activities.length === 0 ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center py-8">
                <span className="material-symbols-outlined text-[40px] text-outline mb-2">inbox</span>
                <p className="font-label-md text-label-md text-on-surface-variant">Sin actividad reciente</p>
              </div>
            ) : (
              activities.map((a, i) => (
                <div key={i} className="flex gap-4 items-start pb-4 border-b border-surface-container-high last:border-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${a.iconBg} ${a.iconColor}`}>
                    <span className="material-symbols-outlined text-[20px]">{a.icon}</span>
                  </div>
                  <div>
                    <p className="font-body-md text-sm text-primary">{a.text}</p>
                    <p className="text-xs text-outline mt-1 font-label-md">{a.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </section>
    </div>
  );
}
