import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// Login del panel admin — rediseño Manhattan Prestige basado en Stitch_Templates/admin_login.
// Se mantiene intacta la lógica de autenticación original (useAuth + navigate + toast);
// solo cambió la presentación. El JSX anterior quedó comentado al final del archivo.

export default function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/admin/dashboard');
    } catch {
      toast.error('Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen bg-background text-on-surface font-body-md">
      {/* Lado izquierdo: imagen con overlay navy */}
      <section className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            alt="Skyline corporativo"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBHzY3a1XpEFK3tggpopvkvCSEzARlxOtkwn72iF67kwRiWAdYm-LQgOnJlT7IZ120LNcg88qqfnr9u6qtI1tQTix5cbN1yfmz4GH-eg2yDXvK14y0CdI8Prp3P9hIGN4KTKSqzyGQdAdndtuMAuwLjKNDjzzgx6HtivhDNKKTpHBvcspJuDKzv4c1PXlQ04A7HFr0GpyrLeyLeykBvIO3dvqUqsFbOpyPq3MKX2uduxeQUtRcX4979PEJP7cuc2hQBChzNLq8GxHHr"
          />
        </div>
        <div className="absolute inset-0 z-10 flex flex-col justify-center px-16 text-white bg-gradient-to-br from-primary/85 to-primary/95">
          <div className="max-w-md">
            <h1 className="font-headline-xl text-headline-xl mb-6 leading-tight">Excelencia en Gestión Inmobiliaria</h1>
            <div className="w-20 h-1 bg-secondary mb-8"></div>
            <p className="font-body-lg text-body-lg text-on-primary-container leading-relaxed">
              Accedé a la plataforma para la administración de propiedades de Inmobiliaria Manhattan. Gestioná inventario, consultas y reportes con precisión absoluta.
            </p>
          </div>
        </div>
        <div className="absolute bottom-12 left-16 z-20 flex items-center gap-4 opacity-70 text-white">
          <span className="material-symbols-outlined text-4xl">domain</span>
          <div>
            <p className="font-label-md text-label-md tracking-widest uppercase">Manhattan</p>
            <p className="text-[12px]">Negocios Inmobiliarios</p>
          </div>
        </div>
      </section>

      {/* Lado derecho: formulario */}
      <section className="w-full lg:w-1/2 bg-surface-container-lowest flex flex-col justify-between items-center py-stack-lg px-gutter relative">
        <div className="w-full max-w-md my-auto">
          <div className="text-center mb-stack-md">
            <div className="font-headline-xl text-headline-xl text-primary font-bold tracking-tight mb-stack-md">Manhattan</div>
            <h2 className="font-headline-lg text-headline-lg text-primary mb-2">Acceso al Panel de Control</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Ingresá tus credenciales para gestionar tus propiedades</p>
          </div>

          <form className="space-y-stack-md" onSubmit={handleSubmit}>
            <div>
              <label className="block font-label-md text-label-md text-primary mb-2" htmlFor="email">Correo Electrónico</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">mail</span>
                <input
                  className="w-full pl-12 pr-4 py-4 bg-white border border-outline-variant rounded-lg font-body-md text-primary placeholder:text-outline focus:ring-0 focus:border-primary transition-all shadow-sm"
                  id="email"
                  placeholder="admin@manhattan.com"
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block font-label-md text-label-md text-primary mb-2" htmlFor="password">Contraseña</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">lock</span>
                <input
                  className="w-full pl-12 pr-12 py-4 bg-white border border-outline-variant rounded-lg font-body-md text-primary placeholder:text-outline focus:ring-0 focus:border-primary transition-all shadow-sm"
                  id="password"
                  placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                />
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary focus:outline-none transition-colors"
                  type="button"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShowPassword(s => !s)}
                >
                  <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            <button
              className="w-full mt-stack-md py-4 bg-secondary text-on-secondary font-label-md text-label-md rounded-lg shadow-lg hover:brightness-90 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-60"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Ingresando...' : 'Iniciar Sesión'}
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </form>
        </div>

        <footer className="w-full max-w-md mt-stack-lg border-t border-outline-variant pt-stack-sm">
          <div className="flex flex-col md:flex-row justify-center items-center gap-4 text-on-surface-variant">
            <p className="text-[12px] opacity-60">© 2024 Manhattan Negocios Inmobiliarios. Todos los derechos reservados.</p>
          </div>
        </footer>
      </section>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CÓDIGO ORIGINAL COMENTADO (no eliminado, según regla del proyecto).
// Motivo: el JSX anterior usaba el design system viejo (dorado/gold + font-serif);
// se reemplazó por el rediseño Manhattan Prestige del template admin_login.
// La lógica (login, navigate, toast, estados) se conservó tal cual en la versión nueva.
//
//   return (
//     <div className="min-h-screen bg-primary flex items-center justify-center">
//       <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
//         <h1 className="font-serif text-3xl text-primary mb-2">Manhattan</h1>
//         <p className="text-gray-500 mb-8">Panel de Administración</p>
//         <form onSubmit={handleSubmit} className="space-y-4">
//           <input
//             type="email"
//             placeholder="Email"
//             value={form.email}
//             onChange={e => setForm({ ...form, email: e.target.value })}
//             className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gold"
//             required
//           />
//           <input
//             type="password"
//             placeholder="Contraseña"
//             value={form.password}
//             onChange={e => setForm({ ...form, password: e.target.value })}
//             className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gold"
//             required
//           />
//           <button
//             type="submit"
//             disabled={loading}
//             className="w-full bg-gold text-white font-semibold py-3 rounded-lg hover:bg-gold-dark transition disabled:opacity-60"
//           >
//             {loading ? 'Ingresando...' : 'Ingresar'}
//           </button>
//         </form>
//       </div>
//     </div>
//   );
