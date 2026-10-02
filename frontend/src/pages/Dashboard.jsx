import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardClient from './DashboardClient';

export default function Dashboard() {
  const { user, profile, loading } = useAuth();

  // Si aún está cargando la verificación de permisos o perfil
  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium">Verificando accesos y cargando tu panel...</p>
        </div>
      </div>
    );
  }

  // Si es un cliente regular (is_superuser === false), mostrar estrictamente el DashboardClient
  if (!profile.is_superuser) {
    return <DashboardClient />;
  }

  // Estados para Administrador
  const [adminData, setAdminData] = useState({ queries: [], tickets: [] });
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);
  const [adminError, setAdminError] = useState('');

  // Estados para Cliente
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [clientMsg, setClientMsg] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  const fetchAdminData = useCallback(async () => {
    if (!profile?.is_superuser) return;

    setIsLoadingAdmin(true);
    setAdminError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setAdminError('Sesión no encontrada. Por favor vuelve a iniciar sesión.');
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/dashboard`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setAdminData({
          queries: Array.isArray(data.queries) ? data.queries : [],
          tickets: Array.isArray(data.tickets) ? data.tickets : []
        });
      } else {
        setAdminError(data.error || 'Error al recuperar información del dashboard.');
      }
    } catch {
      setAdminError('Error de conexión al cargar los datos administrativos.');
    } finally {
      setIsLoadingAdmin(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Error al cerrar sesión:', e);
    }
  };

  const handleSupportRequest = async (e) => {
    e.preventDefault();
    setIsSubmittingTicket(true);
    setClientMsg('Enviando ticket...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setClientMsg('Error: No se encontró la sesión activa. Inicia sesión nuevamente.');
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          subject: ticketSubject,
          description: ticketDesc
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setClientMsg('¡Ticket de soporte generado con éxito!');
        setTicketSubject('');
        setTicketDesc('');
        if (profile?.is_superuser) {
          fetchAdminData();
        }
      } else {
        setClientMsg(data.error || 'Error al generar el ticket de soporte.');
      }
    } catch {
      setClientMsg('Error de conexión con el servidor al enviar el ticket.');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark text-brand-text font-sans antialiased flex flex-col justify-between selection:bg-brand-accent selection:text-gray-900">
      
      {/* Header Dashboard con estética del template */}
      <header className="sticky top-0 z-50 glass-card border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-brand-accent p-0.5 group-hover:border-brand-cyan transition duration-300">
                <img 
                  src="/assets/logo.png" 
                  onError={(e) => { e.currentTarget.src = 'https://placehold.co/100x100/161d2f/10b981?text=FE'; }} 
                  alt="FEStudio Logo" 
                  className="w-full h-full object-cover rounded-full" 
                />
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-green-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">FEStudio</span>
                <span className="block text-xs font-semibold tracking-widest text-gray-400 -mt-1">desarrollos</span>
              </div>
            </Link>

            <div className="h-8 w-px bg-gray-800 mx-2 hidden sm:block"></div>

            <div>
              <h1 className="text-sm font-bold text-white flex items-center">
                {profile?.is_superuser ? 'Portal Administrador' : 'Portal Cliente'}
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1"></span>
                  Conectado
                </span>
              </h1>
              <p className="text-xs text-gray-400">{profile?.email || user?.email}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link 
              to="/" 
              className="hidden md:inline-flex items-center px-3 py-1.5 bg-gray-800/80 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold transition border border-gray-700"
            >
              <i className="fas fa-home mr-1.5 text-brand-cyan"></i> Sitio Web
            </Link>
            <button 
              onClick={handleLogout} 
              className="px-3.5 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 text-xs font-semibold transition flex items-center"
            >
              <i className="fas fa-sign-out-alt mr-1.5"></i> Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
        <div className="glass-card rounded-2xl p-6 sm:p-8 border border-gray-700/60 shadow-2xl">
          
          {profile?.is_superuser ? (
            /* --- VISTA DE SUPER USUARIO (ADMIN) --- */
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-gray-800">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center">
                    <i className="fas fa-chart-line text-emerald-400 mr-2"></i> Gestión Global de la Plataforma
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Estado de la base de datos Supabase: <span className="text-emerald-400 font-semibold">Conectado</span>
                  </p>
                </div>
                <div className="flex items-center space-x-3 w-full md:w-auto">
                  {isLoadingAdmin && <span className="text-xs text-gray-400 animate-pulse">Sincronizando...</span>}
                  <button 
                    onClick={fetchAdminData} 
                    disabled={isLoadingAdmin}
                    className="flex-1 md:flex-initial px-4 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded-lg hover:bg-cyan-500/30 text-xs font-semibold transition"
                  >
                    <i className="fas fa-sync-alt mr-1.5"></i> Actualizar Datos
                  </button>
                </div>
              </div>

              {adminError && (
                <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  <span>{adminError}</span>
                </div>
              )}

              {/* Data Tables Preview en 2 Columnas idéntico al sandbox del template */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
                
                {/* Tabla 1: Consultas de Presupuesto */}
                <div className="bg-brand-dark/80 rounded-xl p-5 border border-gray-800">
                  <h4 className="text-sm font-bold text-gray-300 mb-4 flex items-center justify-between">
                    <span className="flex items-center">
                      <i className="fas fa-envelope text-cyan-400 mr-2"></i> Consultas de Presupuesto
                    </span>
                    <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-400 font-mono">
                      {adminData.queries.length} Consultas
                    </span>
                  </h4>

                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    {adminData.queries.length > 0 ? (
                      <table className="w-full text-left text-xs text-gray-300">
                        <thead className="bg-gray-800/50 text-gray-400 uppercase font-semibold sticky top-0">
                          <tr>
                            <th className="p-2.5">Cliente</th>
                            <th className="p-2.5">Requerimientos</th>
                            <th className="p-2.5">Fecha</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {adminData.queries.map(q => (
                            <tr key={q.id} className="hover:bg-gray-800/30 transition">
                              <td className="p-2.5">
                                <p className="font-semibold text-white">{q.full_name}</p>
                                <a href={`mailto:${q.email}`} className="text-cyan-400 text-[11px] hover:underline">
                                  {q.email}
                                </a>
                              </td>
                              <td className="p-2.5 text-gray-400 max-w-xs truncate" title={q.requirements}>
                                "{q.requirements}"
                              </td>
                              <td className="p-2.5 text-gray-400 whitespace-nowrap text-[11px]">
                                {new Date(q.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-xs text-gray-500 py-6 text-center italic">No hay consultas de presupuesto pendientes.</p>
                    )}
                  </div>
                </div>

                {/* Tabla 2: Tickets de Soporte */}
                <div className="bg-brand-dark/80 rounded-xl p-5 border border-gray-800">
                  <h4 className="text-sm font-bold text-gray-300 mb-4 flex items-center justify-between">
                    <span className="flex items-center">
                      <i className="fas fa-headset text-amber-400 mr-2"></i> Tickets de Soporte
                    </span>
                    <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-400 font-mono">
                      {adminData.tickets.length} Tickets
                    </span>
                  </h4>

                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    {adminData.tickets.length > 0 ? (
                      <table className="w-full text-left text-xs text-gray-300">
                        <thead className="bg-gray-800/50 text-gray-400 uppercase font-semibold sticky top-0">
                          <tr>
                            <th className="p-2.5">Asunto / Cliente</th>
                            <th className="p-2.5">Descripción</th>
                            <th className="p-2.5">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {adminData.tickets.map(t => (
                            <tr key={t.id} className="hover:bg-gray-800/30 transition">
                              <td className="p-2.5">
                                <p className="font-semibold text-white">{t.subject}</p>
                                <span className="text-[11px] text-amber-400">{t.profiles?.email || 'Cliente'}</span>
                              </td>
                              <td className="p-2.5 text-gray-400 max-w-xs truncate" title={t.description}>
                                {t.description}
                              </td>
                              <td className="p-2.5 whitespace-nowrap">
                                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-[10px] font-medium">
                                  {t.status || 'Activo'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-xs text-gray-500 py-6 text-center italic">No hay tickets de soporte activos.</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          ) : (
            /* --- VISTA DE USUARIO / CLIENTE --- */
            <div>
              <div className="pb-6 border-b border-gray-800">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium mb-3">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  <span>Mesa de Ayuda & Asistencia</span>
                </div>
                <h3 className="text-xl font-bold text-white flex items-center">
                  <i className="fas fa-life-ring text-brand-amber mr-2"></i> Centro de Soporte Técnico
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Genera una solicitud de soporte para resolver incidencias técnicas, reportar bugs o solicitar ajustes.
                </p>
              </div>

              <div className="mt-8 max-w-2xl bg-brand-dark/80 rounded-xl p-6 border border-gray-800 shadow-xl">
                <form onSubmit={handleSupportRequest} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Asunto del Problema</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Ej: Error al conectar la base de datos o fallo en el login" 
                      value={ticketSubject} 
                      onChange={e => setTicketSubject(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-brand-amber transition" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Descripción Detallada</label>
                    <textarea 
                      rows="4" 
                      required 
                      placeholder="Describe qué ocurrió, pasos para reproducir el problema y el comportamiento esperado..." 
                      value={ticketDesc} 
                      onChange={e => setTicketDesc(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-brand-amber transition" 
                    ></textarea>
                  </div>

                  {clientMsg && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
                      {clientMsg}
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={isSubmittingTicket}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-bold rounded-xl transition glow-effect disabled:opacity-50 text-sm"
                  >
                    {isSubmittingTicket ? 'Registrando Ticket...' : 'Enviar Ticket de Soporte'}
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Footer Dashboard */}
      <footer className="bg-brand-dark border-t border-gray-800/80 py-6 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <span>&copy; 2026 <strong>FEStudio Desarrollos</strong>. Panel de Gestión.</span>
          <div className="flex space-x-4">
            <Link to="/" className="text-gray-400 hover:text-brand-accent transition">Inicio</Link>
            <a href="mailto:festudio.desarrollos@gmail.com" className="text-gray-400 hover:text-cyan-400 transition">Soporte Directo</a>
          </div>
        </div>
      </footer>

    </div>
  );
}