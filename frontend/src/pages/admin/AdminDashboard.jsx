import { useState, useEffect } from 'react';
import api from '../../services/api';

// ARRAYS MOCK COMENTADOS (28/07/2026): eran datos hardcodeados, nunca conectados a la
// API — por eso el dashboard "no andaba" (no fallaba, nunca se había conectado). A
// pedido del cliente, de las 4 tarjetas originales solo "Propiedades Activas" se
// queda; el resto (Consultas Activas, Ventas del Mes, Nuevos Leads) y el gráfico
// falso + "Actividad Reciente" se reemplazan por métricas reales: propiedades más
// vistas, más consultadas y quién está viendo ahora. No se borran, según la regla
// del proyecto de comentar en vez de eliminar.
// const metrics = [
//   { icon: 'apartment', iconBg: 'bg-tertiary-fixed', iconColor: 'text-primary', label: 'Propiedades Activas', value: '0' },
//   { icon: 'forum', iconBg: 'bg-secondary-fixed', iconColor: 'text-secondary', label: 'Consultas Activas', value: '0' },
//   { icon: 'attach_money', iconBg: 'bg-surface-tint', iconColor: 'text-surface-container-lowest', label: 'Ventas del Mes (USD)', value: '$0' },
//   { icon: 'group_add', iconBg: 'bg-primary-fixed', iconColor: 'text-primary', label: 'Nuevos Leads', value: '0' },
// ];
// const activities = [];
// const chartBars = [40, 65, 50, 80, 60, 75, 55, 90, 70, 85, 45, 60];

// Cada cuánto refresca "Viendo ahora" (28/07/2026). El backend considera "en vivo" a
// quien mandó heartbeat en los últimos 45s (ver backend/src/services/presence.service.js);
// 15s de polling deja margen para no perderse a nadie sin generar tráfico de más.
const LIVE_POLL_MS = 15000;

const PERIOD_OPTIONS = [
  { value: 7, label: 'Últimos 7 días' },
  { value: 30, label: 'Últimos 30 días' },
  { value: 90, label: 'Últimos 90 días' },
];

function EmptyState({ icon, text }) {
  return (
    <div className="flex-grow flex flex-col items-center justify-center text-center py-8">
      <span className="material-symbols-outlined text-[40px] text-outline mb-2">{icon}</span>
      <p className="font-label-md text-label-md text-on-surface-variant">{text}</p>
    </div>
  );
}

// Lista rankeada genérica: se usa tanto para "Más Vistas" como "Más Consultadas",
// que tienen la misma forma de dato ({ id, title, address, city, count }).
function RankedList({ items, emptyIcon, emptyText, countIcon, countColorClass }) {
  if (!items || items.length === 0) return <EmptyState icon={emptyIcon} text={emptyText} />;
  return (
    <div className="flex-grow flex flex-col gap-3">
      {items.map((p, i) => (
        <div key={p.id} className="flex items-center gap-3 pb-3 border-b border-surface-container-high last:border-0">
          <span className="w-6 h-6 flex-shrink-0 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-bold flex items-center justify-center">
            {i + 1}
          </span>
          <div className="flex-grow min-w-0">
            <p className="font-body-md text-sm text-primary truncate">{p.title}</p>
            <p className="text-xs text-on-surface-variant truncate">{p.address}{p.city ? `, ${p.city}` : ''}</p>
          </div>
          <span className={`flex items-center gap-1 flex-shrink-0 font-label-md text-xs px-2 py-1 rounded-full ${countColorClass}`}>
            <span className="material-symbols-outlined text-[14px]">{countIcon}</span>
            {p.count}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [live, setLive] = useState([]);

  useEffect(() => {
    api.get(`/reports/dashboard?days=${days}`).then((res) => setData(res.data)).catch(() => {});
  }, [days]);

  // Polling de "Viendo ahora" (no WebSockets: volumen trivial para este sitio y sin
  // sumar infraestructura nueva al VPS — ver backend/src/services/presence.service.js).
  useEffect(() => {
    let active = true;
    const poll = () => api.get('/properties/live').then((res) => { if (active) setLive(res.data); }).catch(() => {});
    poll();
    const interval = setInterval(poll, LIVE_POLL_MS);
    return () => { active = false; clearInterval(interval); };
  }, []);

  const totalLiveViewers = live.reduce((sum, p) => sum + p.viewers, 0);

  return (
    <div className="p-margin-mobile md:p-margin-desktop bg-surface flex flex-col gap-stack-lg min-h-full">

      {/* Header */}
      <header className="flex justify-between items-end border-b border-outline-variant pb-unit mb-stack-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary">Resumen de Actividad</h1>
          <p className="text-on-surface-variant font-body-md text-body-md mt-1">Bienvenido de nuevo, aquí está el rendimiento de hoy.</p>
        </div>
        <div className="flex items-center gap-gutter">
          {/* Antes un pill fijo en "Últimos 30 días" sin funcionalidad; ahora es el
              selector real del período de las métricas de abajo (28/07/2026). */}
          <div className="flex items-center bg-surface-container px-4 py-2 rounded border border-outline-variant text-sm">
            <span className="material-symbols-outlined text-outline mr-2 text-[20px]">calendar_today</span>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="bg-transparent font-label-md text-primary outline-none cursor-pointer"
            >
              {PERIOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </header>

      {/* Tarjetas de métrica: antes eran 4 (todas con datos mock, ver arriba). Solo
          "Propiedades Activas" se queda, ahora con el dato real; se agrega "Viendo
          Ahora" como resumen del panel "en vivo" de más abajo. */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-gutter max-w-3xl">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col gap-4">
          <div className="p-3 rounded bg-tertiary-fixed text-primary w-fit">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>apartment</span>
          </div>
          <div>
            <p className="font-label-md text-label-md text-on-surface-variant mb-1">Propiedades Activas</p>
            <p className="font-price-display text-price-display text-primary">{data ? data.properties.available : '—'}</p>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col gap-4">
          <div className="p-3 rounded bg-secondary-fixed text-secondary w-fit relative">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>visibility</span>
            {totalLiveViewers > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            )}
          </div>
          <div>
            <p className="font-label-md text-label-md text-on-surface-variant mb-1">Viendo Ahora</p>
            <p className="font-price-display text-price-display text-primary">{totalLiveViewers}</p>
          </div>
        </div>
      </section>

      {/* Más vistas / Más consultadas / En vivo */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">

        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col">
          <h3 className="font-headline-md text-headline-md text-primary mb-6">Propiedades Más Vistas</h3>
          <RankedList
            items={data?.topViewed}
            emptyIcon="visibility_off"
            emptyText="Todavía no hay vistas registradas"
            countIcon="visibility"
            countColorClass="bg-tertiary-fixed text-primary"
          />
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col">
          <h3 className="font-headline-md text-headline-md text-primary mb-6">Propiedades Más Consultadas</h3>
          <RankedList
            items={data?.topConsulted}
            emptyIcon="forum"
            emptyText="Todavía no hay consultas registradas"
            countIcon="chat"
            countColorClass="bg-[#25D366]/15 text-[#128C7E]"
          />
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-headline-md text-headline-md text-primary">Viendo Ahora</h3>
            {live.length > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                <span className="relative flex w-2 h-2">
                  <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
                  <span className="absolute inset-0 rounded-full bg-green-500" />
                </span>
                En vivo
              </span>
            )}
          </div>
          {live.length === 0 ? (
            <EmptyState icon="visibility_off" text="Nadie viendo propiedades ahora" />
          ) : (
            <div className="flex-grow flex flex-col gap-3">
              {live.map((p) => (
                <div key={p.id} className="flex items-center gap-3 pb-3 border-b border-surface-container-high last:border-0">
                  <span className="relative flex-shrink-0 w-2.5 h-2.5">
                    <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
                    <span className="absolute inset-0 rounded-full bg-green-500" />
                  </span>
                  <div className="flex-grow min-w-0">
                    <p className="font-body-md text-sm text-primary truncate">{p.title}</p>
                    <p className="text-xs text-on-surface-variant truncate">{p.address}{p.city ? `, ${p.city}` : ''}</p>
                  </div>
                  <span className="flex-shrink-0 font-label-md text-xs px-2 py-1 rounded-full bg-surface-container-high text-on-surface-variant">
                    {p.viewers} {p.viewers === 1 ? 'persona' : 'personas'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </section>
    </div>
  );
}
