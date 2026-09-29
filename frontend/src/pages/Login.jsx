import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-dark relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-accent/10 via-brand-dark to-brand-dark -z-10"></div>
      
      <Link to="/" className="mb-8 flex items-center space-x-3">
        <img src="/assets/logo.png" alt="Logo" className="w-16 h-16 rounded-full border-2 border-brand-accent" />
        <span className="text-3xl font-extrabold text-white tracking-wider">FEStudio</span>
      </Link>

      <form onSubmit={handleLogin} className="glass-card p-8 rounded-2xl shadow-2xl w-96 border border-gray-700/60">
        <h2 className="text-2xl mb-6 font-bold text-center text-white">Acceso a Clientes</h2>
        <div className="space-y-4">
          <input 
            type="email" placeholder="Email" required
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-gray-900/80 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-brand-cyan" 
          />
          <input 
            type="password" placeholder="Contraseña" required
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-900/80 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-brand-cyan" 
          />
          <button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold py-3 rounded-lg hover:from-emerald-400 hover:to-cyan-400 transition glow-effect">
            Ingresar al Dashboard
          </button>
        </div>
      </form>
    </div>
  );
}