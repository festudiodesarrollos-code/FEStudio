import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Page() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Estados del formulario de presupuesto / contacto funcional
  const [formData, setFormData] = useState({ full_name: '', email: '', requirements: '' });
  const [statusMsg, setStatusMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

 

  // Modales interactivos
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);

  const [newAppName, setNewAppName] = useState('');
  const [newAppUrl, setNewAppUrl] = useState('');

  const [newLicClient, setNewLicClient] = useState('');
  const [newLicDate, setNewLicDate] = useState('');

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
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg('¡Consulta enviada! Te contactaremos a la brevedad.');
        setFormData({ full_name: '', email: '', requirements: '' });
      } else {
        setStatusMsg(data.error || 'Error al enviar la consulta. Intenta nuevamente.');
      }
    } catch {
      setStatusMsg('Error de conexión con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  
  return (
    <div className="bg-brand-dark text-brand-text font-sans antialiased min-h-screen flex flex-col justify-between selection:bg-brand-accent selection:text-gray-900">
      
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <a href="#hero" className="flex items-center space-x-3 group">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-brand-accent p-0.5 group-hover:border-brand-cyan transition duration-300">
              <img 
                src="/assets/logo.png" 
                onError={(e) => { e.currentTarget.src = 'https://placehold.co/100x100/161d2f/10b981?text=FEStudio'; }} 
                alt="FEStudio Desarrollos Logo" 
                className="w-full h-full object-cover rounded-full" 
              />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-green-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">FEStudio</span>
              <span className="block text-xs font-semibold tracking-widest text-gray-400 -mt-1">desarrollos</span>
            </div>
          </a>

          {/* Navigation Links Desktop */}
          <nav className="hidden md:flex space-x-8 text-sm font-medium items-center">
            <a href="#servicios" className="hover:text-brand-accent transition">Servicios</a>
            
            <a href="#contacto" className="hover:text-brand-amber transition">Contacto</a>
            <Link to="/login" className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold transition shadow-lg">
              Login
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button 
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            className="md:hidden text-gray-300 hover:text-white text-2xl p-2 focus:outline-none"
            aria-label="Abrir menú"
          >
            <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
          </button>
        </div>

        {/* Mobile Nav Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden glass-card border-t border-gray-800 px-4 pt-2 pb-6 space-y-3">
            <a href="#servicios" onClick={() => setMobileMenuOpen(false)} className="block py-2 hover:text-brand-accent">Servicios</a>
            
            <a href="#contacto" onClick={() => setMobileMenuOpen(false)} className="block py-2 hover:text-brand-amber">Contacto</a>
            <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-brand-accent font-bold">
              Login
            </Link>
          </div>
        )}
      </header>

      <main className="flex-grow">
        
        {/* Hero Section */}
        <section id="hero" className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-brand-dark to-brand-dark -z-10"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Innovación & Desarrollo a Medida</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mb-6">
              Transformamos Ideas en <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-amber-400 bg-clip-text text-transparent">Software de Alto Impacto</span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg text-gray-300 mb-10">
              Especialistas en arquitecturas robustas, aplicaciones web modernas, paneles de gestión y soluciones digitales escalables para potenciar tu empresa.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a 
                href="https://wa.me/5493467441266?text=Hola%20FEStudio,%20quisiera%20consultar%20por%20un%20proyecto" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-emerald-500 text-gray-900 font-bold hover:bg-emerald-400 transition transform hover:-translate-y-0.5 glow-effect"
              >
                <i className="fab fa-whatsapp text-xl mr-2"></i> Contactar por WhatsApp
              </a>
              <a 
                href="https://instagram.com/festudio.desarrollos" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl border border-gray-700 bg-brand-card hover:bg-gray-800 text-white font-semibold transition"
              >
                <i className="fab fa-instagram text-xl mr-2 text-pink-500"></i> Síguenos en Instagram
              </a>
            </div>
          </div>
        </section>

        {/* Sección Servicios / Soluciones */}
        <section id="servicios" className="py-16 bg-brand-dark/50 border-t border-gray-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white">Nuestras Soluciones</h2>
              <p className="text-gray-400 mt-2">Construimos ecosistemas digitales eficientes y personalizados</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="glass-card p-8 rounded-2xl hover:border-emerald-500/50 transition group">
                <div className="w-14 h-14 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition">
                  <i className="fas fa-code"></i>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Desarrollo Web & SaaS</h3>
                <p className="text-gray-400 text-sm leading-relaxed">Plataformas escalables con tecnologías modernas (Python, Flask, Tailwind, Postgres), optimizadas para velocidad y respuesta.</p>
              </div>

              <div className="glass-card p-8 rounded-2xl hover:border-cyan-500/50 transition group">
                <div className="w-14 h-14 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition">
                  <i className="fas fa-key"></i>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Gestión de Licencias</h3>
                <p className="text-gray-400 text-sm leading-relaxed">Sistemas seguros de autenticación, control de accesos, claves de producto y gestión de usuarios en tiempo real.</p>
              </div>

              <div className="glass-card p-8 rounded-2xl hover:border-amber-500/50 transition group">
                <div className="w-14 h-14 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition">
                  <i className="fas fa-server"></i>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Infraestructura & Docker</h3>
                <p className="text-gray-400 text-sm leading-relaxed">Despliegue automatizado con contenedores Docker, bases de datos integradas con Supabase y alto rendimiento.</p>
              </div>
            </div>
          </div>
        </section>

          
        {/* Sección Contacto: Canales Directos y Formulario */}
        <section id="contacto" className="py-16 bg-brand-card/40 border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-2">Canales de Contacto Directo</h2>
            <p className="text-gray-400 mb-10">Estamos disponibles para resolver tus consultas y comenzar tu proyecto.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {/* Instagram */}
              <a 
                href="https://instagram.com/festudio.desarrollos" 
                target="_blank" 
                rel="noreferrer"
                className="glass-card p-6 rounded-xl hover:border-pink-500/50 transition flex flex-col items-center group"
              >
                <i className="fab fa-instagram text-3xl text-pink-500 mb-3 group-hover:scale-110 transition"></i>
                <span className="text-sm font-semibold text-gray-300">Instagram</span>
                <span className="text-xs text-pink-400 mt-1">@festudio.desarrollos</span>
              </a>

              {/* WhatsApp */}
              <a 
                href="https://wa.me/5493467441266?text=Hola%20FEStudio,%20quisiera%20consultar%20por%20un%20proyecto" 
                target="_blank" 
                rel="noreferrer"
                className="glass-card p-6 rounded-xl hover:border-emerald-500/50 transition flex flex-col items-center group"
              >
                <i className="fab fa-whatsapp text-3xl text-emerald-400 mb-3 group-hover:scale-110 transition"></i>
                <span className="text-sm font-semibold text-gray-300">WhatsApp</span>
                <span className="text-xs text-emerald-400 mt-1">+54 9 3467 441266</span>
              </a>

              {/* Email */}
              <a 
                href="mailto:festudio.desarrollos@gmail.com" 
                className="glass-card p-6 rounded-xl hover:border-cyan-500/50 transition flex flex-col items-center group"
              >
                <i className="far fa-envelope text-3xl text-cyan-400 mb-3 group-hover:scale-110 transition"></i>
                <span className="text-sm font-semibold text-gray-300">Correo Electrónico</span>
                <span className="text-xs text-cyan-400 mt-1">festudio.desarrollos@gmail.com</span>
              </a>
            </div>

            {/* Formulario de Presupuesto Conectado a la Base de Datos */}
            <div className="mt-14 max-w-3xl mx-auto text-left">
              <div className="text-center mb-8">
                <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Solicitud Online</span>
                <h3 className="text-2xl font-bold text-white mt-1">Pide tu Presupuesto Personalizado</h3>
                <p className="text-xs text-gray-400 mt-1">Detalla los requerimientos y te enviaremos una propuesta formal.</p>
              </div>

              <form onSubmit={handleContactSubmit} className="glass-card p-8 rounded-2xl space-y-4 border border-gray-700/60 shadow-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Nombre Completo</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Ej: Martín Rodríguez" 
                      value={formData.full_name} 
                      onChange={e => setFormData({...formData, full_name: e.target.value})}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-brand-accent" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Correo Electrónico</label>
                    <input 
                      type="email" 
                      required 
                      placeholder="correo@ejemplo.com" 
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-brand-accent" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Requerimientos del Proyecto</label>
                  <textarea 
                    rows="4" 
                    required 
                    placeholder="Describe las funcionalidades, objetivos y tiempos estimados de tu aplicación..." 
                    value={formData.requirements} 
                    onChange={e => setFormData({...formData, requirements: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-brand-accent" 
                  ></textarea>
                </div>
                
                {statusMsg && (
                  <p className="text-brand-accent text-xs text-center font-medium bg-emerald-500/10 py-2 rounded-lg border border-emerald-500/20">
                    {statusMsg}
                  </p>
                )}
                
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-bold rounded-xl transition glow-effect disabled:opacity-50 text-sm"
                >
                  {isSubmitting ? 'Enviando requerimientos...' : 'Enviar Solicitud de Presupuesto'}
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-brand-dark border-t border-gray-800/80 py-8 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-2">
            <img 
              src="/assets/logo.png" 
              onError={(e) => { e.currentTarget.src = 'https://placehold.co/50x50/161d2f/10b981?text=FE'; }} 
              alt="FEStudio Logo" 
              className="w-6 h-6 rounded-full" 
            />
            <span>&copy; 2026 <strong>FEStudio Desarrollos</strong>. Todos los derechos reservados.</span>
          </div>
          <div className="flex space-x-6">
            <a href="https://instagram.com/festudio.desarrollos" target="_blank" rel="noreferrer" className="hover:text-pink-400 text-base" title="Instagram">
              <i className="fab fa-instagram"></i>
            </a>
            <a href="https://wa.me/5493467441266" target="_blank" rel="noreferrer" className="hover:text-emerald-400 text-base" title="WhatsApp">
              <i className="fab fa-whatsapp"></i>
            </a>
            <a href="mailto:festudio.desarrollos@gmail.com" className="hover:text-cyan-400 text-base" title="Correo">
              <i className="far fa-envelope"></i>
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}