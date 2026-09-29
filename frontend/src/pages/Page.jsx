import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Page() {
  const [formData, setFormData] = useState({ full_name: '', email: '', requirements: '' });
  const [statusMsg, setStatusMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMsg('Enviando...');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setStatusMsg('¡Consulta enviada! Te contactaremos pronto.');
        setFormData({ full_name: '', email: '', requirements: '' });
      } else {
        setStatusMsg('Error al enviar la consulta. Intenta nuevamente.');
      }
    } catch {
      setStatusMsg('Error de conexión con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-brand-dark text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <a href="#hero" className="flex items-center space-x-3 group">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-brand-accent p-0.5 group-hover:border-brand-cyan transition duration-300">
              <img src="/assets/logo.png" alt="FEStudio Desarrollos Logo" className="w-full h-full object-cover rounded-full" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-green-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">FEStudio</span>
              <span className="block text-xs font-semibold tracking-widest text-gray-400 -mt-1">desarrollos</span>
            </div>
          </a>
          <nav className="hidden md:flex space-x-8 text-sm font-medium items-center">
            <a href="#servicios" className="hover:text-brand-accent transition">Servicios</a>
            <a href="#contacto" className="hover:text-brand-amber transition">Contacto</a>
            <Link to="/login" className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold transition shadow-lg">
              Acceso Clientes
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero Section */}
        <section id="hero" className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-brand-dark to-brand-dark -z-10"></div>
          <div className="max-w-7xl mx-auto px-4 text-center relative">
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mb-6">
              Transformamos Ideas en <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-amber-400 bg-clip-text text-transparent">Software de Alto Impacto</span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg text-gray-300 mb-10">
              Especialistas en arquitecturas robustas, aplicaciones web modernas y soluciones digitales a medida.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a href="https://wa.me/5493467441266" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-emerald-500 text-gray-900 font-bold hover:bg-emerald-400 transition transform hover:-translate-y-0.5 glow-effect">
                <i className="fab fa-whatsapp text-xl mr-2"></i> Contactar por WhatsApp
              </a>
              <a href="https://instagram.com/festudio.desarrollos" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl border border-gray-700 bg-brand-card hover:bg-gray-800 text-white font-semibold transition">
                <i className="fab fa-instagram text-xl mr-2 text-pink-500"></i> Síguenos en Instagram
              </a>
            </div>
          </div>
        </section>

        {/* Sección de Servicios */}
        <section id="servicios" className="py-20 border-t border-gray-800/80 bg-brand-card/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl">Nuestros Servicios</h2>
              <p className="mt-4 text-gray-400 max-w-2xl mx-auto">Soluciones tecnológicas integrales diseñadas para impulsar el crecimiento de tu negocio.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="glass-card p-6 rounded-2xl border border-gray-800 hover:border-brand-accent/50 transition">
                <div className="w-12 h-12 rounded-xl bg-brand-accent/20 flex items-center justify-center mb-4 text-brand-accent text-2xl">
                  <i className="fas fa-laptop-code"></i>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Desarrollo Web & SaaS</h3>
                <p className="text-gray-400 text-sm">Plataformas interactivas, paneles de control y landing pages optimizadas con React, Next.js y Vite.</p>
              </div>

              <div className="glass-card p-6 rounded-2xl border border-gray-800 hover:border-brand-cyan/50 transition">
                <div className="w-12 h-12 rounded-xl bg-brand-cyan/20 flex items-center justify-center mb-4 text-brand-cyan text-2xl">
                  <i className="fas fa-server"></i>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Arquitectura & APIs</h3>
                <p className="text-gray-400 text-sm">Backends escalables, microservicios en Python/Flask y bases de datos seguras con PostgreSQL y Supabase.</p>
              </div>

              <div className="glass-card p-6 rounded-2xl border border-gray-800 hover:border-brand-amber/50 transition">
                <div className="w-12 h-12 rounded-xl bg-brand-amber/20 flex items-center justify-center mb-4 text-brand-amber text-2xl">
                  <i className="fas fa-shield-alt"></i>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Mantenimiento & Soporte</h3>
                <p className="text-gray-400 text-sm">Monitoreo continuo, resolución ágil de incidencias mediante tickets de soporte y actualizaciones periódicas.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Formulario de Contacto / Presupuesto */}
        <section id="contacto" className="py-20 bg-brand-dark/50 border-t border-gray-800/50">
          <div className="max-w-3xl mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white">Solicita tu Presupuesto</h2>
              <p className="text-gray-400 mt-2">Cuéntanos sobre tu proyecto y evaluaremos la mejor solución.</p>
            </div>
            <form onSubmit={handleContactSubmit} className="glass-card p-8 rounded-2xl space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" required placeholder="Nombre completo" 
                  value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-brand-accent" 
                />
                <input 
                  type="email" required placeholder="Correo electrónico" 
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-brand-accent" 
                />
              </div>
              <textarea 
                rows="4" required placeholder="Describe los requerimientos de tu app..." 
                value={formData.requirements} onChange={e => setFormData({...formData, requirements: e.target.value})}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-brand-accent" 
              ></textarea>
              
              {statusMsg && <p className="text-brand-accent text-sm text-center font-medium">{statusMsg}</p>}
              
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-3 bg-brand-accent text-brand-dark font-bold rounded-lg hover:bg-emerald-400 transition glow-effect disabled:opacity-50"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar Consulta'}
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-brand-dark border-t border-gray-800/80 py-8 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
             <img src="/assets/logo.png" alt="FEStudio Logo" className="w-6 h-6 rounded-full" />
             <span>&copy; 2026 <strong>FEStudio Desarrollos</strong>.</span>
          </div>
          <div className="flex space-x-4">
            <a href="mailto:festudio.desarrollos@gmail.com" className="hover:text-cyan-400" title="Email"><i className="far fa-envelope text-lg"></i></a>
            <a href="https://wa.me/5493467441266" target="_blank" rel="noreferrer" className="hover:text-emerald-400" title="WhatsApp"><i className="fab fa-whatsapp text-lg"></i></a>
            <a href="https://instagram.com/festudio.desarrollos" target="_blank" rel="noreferrer" className="hover:text-pink-400" title="Instagram"><i className="fab fa-instagram text-lg"></i></a>
          </div>
        </div>
      </footer>
    </div>
  );
}