import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useState, useEffect, useCallback } from 'react';

export default function Dashboard() {
  const { user, profile } = useAuth();
  
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
    setClientMsg('Enviando...');

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
    <div className="min-h-screen bg-brand-dark text-white">
      <header className="glass-card border-b border-gray-800 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <img src="/assets/logo.png" className="w-10 h-10 rounded-full border border-brand-accent/50" alt="FEStudio Desarrollos" />
          <div>
            <h1 className="text-white font-bold">{profile?.is_superuser ? 'Portal Administrador' : 'Portal Cliente'}</h1>
            <p className="text-xs text-gray-400">{profile?.email || user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/40 rounded-lg hover:bg-red-500/30 text-xs font-semibold transition">
          <i className="fas fa-sign-out-alt mr-2"></i>Cerrar Sesión
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="glass-card rounded-2xl p-6 border border-gray-700/60 shadow-2xl">
          
          {profile?.is_superuser ? (
            /* --- VISTA DE SUPER USUARIO --- */
            <div>
              <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                <h3 className="text-lg font-bold text-white">
                  <i className="fas fa-chart-line text-brand-accent mr-2"></i> Gestión Global
                </h3>
                <div className="flex items-center space-x-3">
                  {isLoadingAdmin && <span className="text-xs text-gray-400">Actualizando...</span>}
                  <button 
                    onClick={fetchAdminData}
                    disabled={isLoadingAdmin}
                    className="px-3 py-1 bg-brand-card hover:bg-gray-800 border border-gray-700 text-xs rounded-lg transition"
                    title="Recargar datos"
                  >
                    <i className="fas fa-sync-alt mr-1"></i> Actualizar
                  </button>
                </div>
              </div>

              {adminError && (
                <div className="mb-6 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-xs">
                  {adminError}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Consultas de Potenciales Clientes */}
                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
                  <h4 className="text-sm font-bold text-gray-300 mb-4 flex items-center">
                    <i className="fas fa-envelope text-brand-cyan mr-2"></i> Consultas de Presupuesto
                    <span className="ml-2 text-xs bg-brand-cyan/20 text-brand-cyan px-2 py-0.5 rounded-full">
                      {adminData.queries.length}
                    </span>
                  </h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {adminData.queries.map(q => (
                      <div key={q.id} className="p-3 bg-gray-800/50 rounded border-l-4 border-brand-cyan">
                        <div className="flex justify-between">
                          <p className="text-xs text-white font-bold">{q.full_name}</p>
                          <span className="text-[10px] text-gray-400">{new Date(q.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-brand-cyan mb-1">{q.email}</p>
                        <p className="text-xs text-gray-400 italic">"{q.requirements}"</p>
                      </div>
                    ))}
                    {adminData.queries.length === 0 && <p className="text-xs text-gray-500">No hay consultas registradas.</p>}
                  </div>
                </div>

                {/* Tickets de Soporte */}
                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
                  <h4 className="text-sm font-bold text-gray-300 mb-4 flex items-center">
                    <i className="fas fa-headset text-brand-amber mr-2"></i> Tickets de Soporte
                    <span className="ml-2 text-xs bg-brand-amber/20 text-brand-amber px-2 py-0.5 rounded-full">
                      {adminData.tickets.length}
                    </span>
                  </h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {adminData.tickets.map(t => (
                      <div key={t.id} className="p-3 bg-gray-800/50 rounded border-l-4 border-brand-amber">
                        <div className="flex justify-between">
                          <p className="text-xs text-white font-bold">{t.subject}</p>
                          <span className="text-[10px] bg-brand-amber/20 text-brand-amber px-2 rounded-full">{t.status || 'abierto'}</span>
                        </div>
                        <p className="text-xs text-brand-amber mb-1">Cliente: {t.profiles?.email || 'Desconocido'}</p>
                        <p className="text-xs text-gray-400">{t.description}</p>
                      </div>
                    ))}
                    {adminData.tickets.length === 0 && <p className="text-xs text-gray-500">No hay tickets activos.</p>}
                  </div>
                </div>

              </div>
            </div>
          ) : (
            /* --- VISTA DE USUARIO / CLIENTE --- */
            <div>
              <h3 className="text-lg font-bold text-white mb-6 border-b border-gray-800 pb-4">
                <i className="fas fa-life-ring text-brand-amber mr-2"></i> Soporte Técnico
              </h3>

              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800 mt-4 max-w-2xl">
                <p className="text-sm text-gray-400 mb-4">Genera un ticket de soporte y nuestro equipo técnico lo atenderá a la brevedad.</p>
                
                <form onSubmit={handleSupportRequest} className="space-y-4">
                  <input 
                    type="text" required placeholder="Asunto del problema" 
                    value={ticketSubject} onChange={e => setTicketSubject(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white text-sm focus:outline-none focus:border-brand-amber" 
                  />
                  <textarea 
                    rows="3" required placeholder="Describe el problema en detalle..." 
                    value={ticketDesc} onChange={e => setTicketDesc(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white text-sm focus:outline-none focus:border-brand-amber"
                  ></textarea>
                  
                  {clientMsg && <p className="text-brand-amber text-xs font-medium">{clientMsg}</p>}

                  <button 
                    type="submit" 
                    disabled={isSubmittingTicket}
                    className="px-6 py-2 bg-brand-amber/20 text-brand-amber border border-brand-amber/40 rounded-lg text-sm font-semibold hover:bg-brand-amber/30 transition disabled:opacity-50"
                  >
                    {isSubmittingTicket ? 'Enviando...' : 'Enviar Ticket'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}