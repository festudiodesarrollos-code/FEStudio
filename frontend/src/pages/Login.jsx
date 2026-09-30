import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMessage(
          error.message === 'Invalid login credentials'
            ? 'Credenciales incorrectas. Verifica tu email y contraseña.'
            : error.message
        );
      } else {
        navigate('/dashboard');
      }
    } catch {
      setErrorMessage('Error al conectar con el servidor de autenticación.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-dark text-brand-text relative overflow-hidden px-4 selection:bg-brand-accent selection:text-gray-900">
      {/* Glow de fondo exacto como el template */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-brand-dark to-brand-dark -z-10"></div>

      {/* Brand Header */}
      <Link to="/" className="mb-8 flex items-center space-x-3 group">
        <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-brand-accent p-0.5 group-hover:border-brand-cyan transition duration-300">
          <img 
            src="/assets/logo.png" 
            onError={(e) => { e.currentTarget.src = 'https://placehold.co/100x100/161d2f/10b981?text=FEStudio'; }} 
            alt="FEStudio Logo" 
            className="w-full h-full object-cover rounded-full" 
          />
        </div>
        <div>
          <span className="text-2xl font-extrabold tracking-wider bg-gradient-to-r from-green-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">FEStudio</span>
          <span className="block text-xs font-semibold tracking-widest text-gray-400 -mt-1">desarrollos</span>
        </div>
      </Link>

      {/* Formulario Glass-Card */}
      <div className="glass-card p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700/60">
        <div className="text-center mb-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Acceso Clientes & Gestión</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Ingreso al Dashboard</h2>
          <p className="text-xs text-gray-400 mt-1">Accede con tus credenciales asignadas</p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center">
            <i className="fas fa-exclamation-circle mr-2 text-base"></i>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Correo Electrónico</label>
            <div className="relative">
              <input 
                type="email" 
                placeholder="cliente@festudio.dev" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 pl-10 text-white text-sm focus:outline-none focus:border-brand-cyan transition" 
              />
              <i className="far fa-envelope absolute left-3.5 top-3.5 text-gray-500 text-sm"></i>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Contraseña</label>
            <div className="relative">
              <input 
                type="password" 
                placeholder="••••••••" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 pl-10 text-white text-sm focus:outline-none focus:border-brand-cyan transition" 
              />
              <i className="fas fa-lock absolute left-3.5 top-3.5 text-gray-500 text-sm"></i>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-bold py-3.5 rounded-xl transition glow-effect disabled:opacity-50 text-sm mt-2"
          >
            {isLoading ? 'Autenticando...' : 'Ingresar al Dashboard'}
          </button>
        </form>

        <div className="mt-6 text-center pt-4 border-t border-gray-800">
          <Link to="/" className="text-xs text-gray-400 hover:text-brand-accent transition inline-flex items-center">
            <i className="fas fa-arrow-left mr-2"></i> Volver a la página principal
          </Link>
        </div>
      </div>

      {/* Footer inferior sutil */}
      <p className="text-xs text-gray-600 mt-8">
        &copy; 2026 FEStudio Desarrollos. Todos los derechos reservados.
      </p>
    </div>
  );
}