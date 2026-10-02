import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

export default function DashboardClient() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('apps'); // 'apps', 'tickets', 'billing', 'invoices'

  // Datos principales del cliente
  const [licenses, setLicenses] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [companyBilling, setCompanyBilling] = useState({
    business_name: '',
    cuit: '',
    tax_condition: 'Responsable Inscripto',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    billing_email: '',
    phone: ''
  });

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modales
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Formulario nuevo Ticket por Fallo
  const [ticketApp, setTicketApp] = useState('');
  const [ticketFailureType, setTicketFailureType] = useState('Error en funcionalidad');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  // Formulario Empresa / Facturación
  const [isSavingBilling, setIsSavingBilling] = useState(false);

  // Cargar datos del dashboard desde backend
  const fetchClientData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setErrorMessage('Sesión no encontrada. Por favor inicia sesión nuevamente.');
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/client/dashboard`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setLicenses(Array.isArray(data.licenses) ? data.licenses : []);
        setTickets(Array.isArray(data.tickets) ? data.tickets : []);
        setInvoices(Array.isArray(data.invoices) ? data.invoices : []);
        
        if (data.company_billing && Object.keys(data.company_billing).length > 0) {
          setCompanyBilling({
            business_name: data.company_billing.business_name || '',
            cuit: data.company_billing.cuit || '',
            tax_condition: data.company_billing.tax_condition || 'Responsable Inscripto',
            address: data.company_billing.address || '',
            city: data.company_billing.city || '',
            province: data.company_billing.province || '',
            postal_code: data.company_billing.postal_code || '',
            billing_email: data.company_billing.billing_email || profile?.email || user?.email || '',
            phone: data.company_billing.phone || ''
          });
        } else {
          setCompanyBilling(prev => ({
            ...prev,
            billing_email: profile?.email || user?.email || ''
          }));
        }
      } else {
        setErrorMessage(data.error || 'Error al obtener la información de cliente.');
      }
    } catch {
      setErrorMessage('Error de conexión al cargar tus datos.');
    } finally {
      setIsLoading(false);
    }
  }, [profile, user]);

  useEffect(() => {
    const timeoutId = setTimeout(fetchClientData, 0);
    return () => clearTimeout(timeoutId);
  }, [fetchClientData]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Error al cerrar sesión:', e);
    }
  };

  // Abrir modal de ticket pre-seleccionando una app que presentó falla
  const handleOpenReportTicket = (appName = '') => {
    setTicketApp(appName || (licenses.length > 0 ? licenses[0]?.apps?.name : 'General'));
    setTicketSubject(appName ? `Fallo reportado en ${appName}` : '');
    setTicketDesc('');
    setShowTicketModal(true);
  };

  // Enviar nuevo Ticket de Soporte por Fallo
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setIsSubmittingTicket(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setErrorMessage('Sesión expirada. Inicia sesión nuevamente.');
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          subject: ticketSubject.trim(),
          description: ticketDesc.trim(),
          app_name: ticketApp || 'General',
          failure_type: ticketFailureType
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMessage('¡Ticket de soporte creado con éxito! Nuestro equipo técnico atenderá la incidencia de inmediato.');
        setTicketSubject('');
        setTicketDesc('');
        setShowTicketModal(false);
        fetchClientData();
        setActiveTab('tickets');
      } else {
        setErrorMessage(data.error || 'No se pudo crear el ticket de soporte.');
      }
    } catch {
      setErrorMessage('Error de conexión al registrar el ticket.');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  // Guardar datos de facturación de la empresa
  const handleSaveBilling = async (e) => {
    e.preventDefault();
    setIsSavingBilling(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setErrorMessage('Sesión expirada. Inicia sesión nuevamente.');
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/client/company-billing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(companyBilling)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMessage('¡Datos de facturación empresarial guardados correctamente!');
        fetchClientData();
      } else {
        setErrorMessage(data.error || 'Error al guardar los datos de facturación.');
      }
    } catch {
      setErrorMessage('Error de conexión con el servidor.');
    } finally {
      setIsSavingBilling(false);
    }
  };

  // Abrir comprobante / factura
  const handleViewInvoice = (inv) => {
    setSelectedInvoice(inv);
    setShowInvoiceModal(true);
  };

  const activeLicenses = licenses.filter(l => l.status === 'active');

  return (
    <div className="min-h-screen bg-brand-dark text-brand-text font-sans antialiased flex flex-col justify-between selection:bg-brand-accent selection:text-gray-900">
      
      {/* Header Dashboard Cliente */}
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
                Portal Cliente
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1"></span>
                  Cliente Verificado
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
        
        {/* Banner de Bienvenida y Acciones Rápidas */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 border border-gray-700/60 shadow-2xl mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-accent/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-medium mb-3">
                <i className="fas fa-building"></i>
                <span>{companyBilling.business_name || 'Portal Corporativo del Cliente'}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Panel de Servicios & <span className="bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">Licencias Activas</span>
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-2xl">
                Monitorea el vencimiento de tus licencias, reporta incidentes técnicos o fallos en tus aplicaciones, carga los datos fiscales de tu empresa y descarga tus facturas.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <button 
                onClick={fetchClientData} 
                disabled={isLoading}
                className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded-xl text-xs font-semibold transition flex items-center"
                title="Actualizar información"
              >
                <i className={`fas fa-sync-alt mr-1.5 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`}></i>
                Actualizar
              </button>

              <button 
                onClick={() => handleOpenReportTicket()} 
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-950 font-bold rounded-xl text-xs transition shadow-md flex items-center"
              >
                <i className="fas fa-exclamation-triangle mr-1.5"></i>
                Reportar Fallo en App
              </button>
            </div>
          </div>

          {/* Alertas */}
          {errorMessage && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center">
              <i className="fas fa-check-circle mr-2"></i>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Tarjetas KPI Resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div 
              onClick={() => setActiveTab('apps')} 
              className={`rounded-xl p-4 border transition cursor-pointer ${activeTab === 'apps' ? 'bg-gray-800/80 border-brand-accent' : 'bg-brand-dark/70 border-gray-800 hover:border-gray-700'}`}
            >
              <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
                <span>Apps & Licencias</span>
                <i className="fas fa-cube text-emerald-400"></i>
              </div>
              <p className="text-xl font-bold text-white">{licenses.length}</p>
              <span className="text-[10px] text-emerald-400">{activeLicenses.length} Activas</span>
            </div>

            <div 
              onClick={() => setActiveTab('tickets')} 
              className={`rounded-xl p-4 border transition cursor-pointer ${activeTab === 'tickets' ? 'bg-gray-800/80 border-amber-400' : 'bg-brand-dark/70 border-gray-800 hover:border-gray-700'}`}
            >
              <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
                <span>Tickets de Soporte</span>
                <i className="fas fa-headset text-amber-400"></i>
              </div>
              <p className="text-xl font-bold text-amber-400">{tickets.length}</p>
              <span className="text-[10px] text-gray-400">Fallos & Consultas</span>
            </div>

            <div 
              onClick={() => setActiveTab('invoices')} 
              className={`rounded-xl p-4 border transition cursor-pointer ${activeTab === 'invoices' ? 'bg-gray-800/80 border-cyan-400' : 'bg-brand-dark/70 border-gray-800 hover:border-gray-700'}`}
            >
              <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
                <span>Facturas Generadas</span>
                <i className="fas fa-file-invoice-dollar text-cyan-400"></i>
              </div>
              <p className="text-xl font-bold text-white">{invoices.length}</p>
              <span className="text-[10px] text-cyan-400">Servicios & Licencias</span>
            </div>

            <div 
              onClick={() => setActiveTab('billing')} 
              className={`rounded-xl p-4 border transition cursor-pointer ${activeTab === 'billing' ? 'bg-gray-800/80 border-blue-400' : 'bg-brand-dark/70 border-gray-800 hover:border-gray-700'}`}
            >
              <div className="flex items-center justify-between text-gray-400 text-xs mb-1">
                <span>Datos de Empresa</span>
                <i className="fas fa-id-card text-blue-400"></i>
              </div>
              <p className="text-xs font-bold text-white truncate">
                {companyBilling.cuit ? companyBilling.cuit : 'Sin Cargar'}
              </p>
              <span className="text-[10px] text-gray-400">
                {companyBilling.business_name ? 'Perfil Fiscal Listo' : 'Configurar Facturación'}
              </span>
            </div>
          </div>
        </div>

        {/* Navegación por Pestañas */}
        <div className="flex flex-wrap gap-2 border-b border-gray-800 mb-6">
          <button 
            onClick={() => setActiveTab('apps')} 
            className={`px-4 py-2.5 text-xs font-bold transition rounded-t-xl border-t border-l border-r ${
              activeTab === 'apps' 
                ? 'bg-gray-800/80 text-brand-accent border-gray-700 shadow-md' 
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <i className="fas fa-th-large mr-2"></i> Mis Apps & Licencias ({licenses.length})
          </button>

          <button 
            onClick={() => setActiveTab('tickets')} 
            className={`px-4 py-2.5 text-xs font-bold transition rounded-t-xl border-t border-l border-r ${
              activeTab === 'tickets' 
                ? 'bg-gray-800/80 text-brand-amber border-gray-700 shadow-md' 
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <i className="fas fa-exclamation-triangle mr-2 text-amber-400"></i> Tickets por Fallos en Apps ({tickets.length})
          </button>

          <button 
            onClick={() => setActiveTab('billing')} 
            className={`px-4 py-2.5 text-xs font-bold transition rounded-t-xl border-t border-l border-r ${
              activeTab === 'billing' 
                ? 'bg-gray-800/80 text-blue-400 border-gray-700 shadow-md' 
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <i className="fas fa-building mr-2 text-blue-400"></i> Datos de Facturación (Empresa)
          </button>

          <button 
            onClick={() => setActiveTab('invoices')} 
            className={`px-4 py-2.5 text-xs font-bold transition rounded-t-xl border-t border-l border-r ${
              activeTab === 'invoices' 
                ? 'bg-gray-800/80 text-brand-cyan border-gray-700 shadow-md' 
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <i className="fas fa-receipt mr-2 text-cyan-400"></i> Facturas & Servicios ({invoices.length})
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: MIS APLICACIONES ACTIVAS CON LICENCIA Y FECHA DE VENCIMIENTO       */}
        {/* ========================================================================= */}
        {activeTab === 'apps' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-brand-dark/70 p-4 rounded-xl border border-gray-800">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center">
                  <i className="fas fa-shield-alt text-brand-accent mr-2"></i> Aplicaciones Activas & Control de Licencias
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Supervisa tus accesos autorizados, claves de licencia y plazos de vigencia y vencimiento.
                </p>
              </div>
            </div>

            {licenses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {licenses.map((lic) => {
                  const app = lic.apps || {};
                  const isActive = lic.status === 'active';
                  const licCode = `FES-2026-${lic.id.substring(0, 8).toUpperCase()}`;

                  return (
                    <div 
                      key={lic.id} 
                      className="glass-card rounded-2xl p-6 border border-gray-700/60 shadow-xl hover:border-brand-accent/50 transition duration-300 flex flex-col justify-between group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition"></div>
                      
                      <div>
                        {/* Header de la tarjeta */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-brand-accent text-xl group-hover:scale-105 transition">
                            <i className="fas fa-laptop-code"></i>
                          </div>
                          
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            isActive 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                              : 'bg-red-500/10 text-red-400 border-red-500/30'
                          }`}>
                            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
                            {isActive ? 'Licencia Activa' : 'Inactiva / Pausada'}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-white group-hover:text-brand-accent transition">
                          {app.name || 'Aplicación Asignada'}
                        </h3>
                        <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                          {app.description || 'Sistema y solución empresarial contratada en FEStudio.'}
                        </p>

                        {/* Bloque de Fechas y Vencimiento */}
                        <div className="mt-5 p-3.5 bg-gray-900/80 rounded-xl border border-gray-800 space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-400 flex items-center">
                              <i className="fas fa-key text-cyan-400 mr-1.5 text-[10px]"></i> Clave Licencia:
                            </span>
                            <span className="font-mono text-cyan-400 font-bold">{licCode}</span>
                          </div>

                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-400 flex items-center">
                              <i className="fas fa-calendar-alt text-gray-400 mr-1.5 text-[10px]"></i> Alta del Servicio:
                            </span>
                            <span className="text-gray-300 font-medium">
                              {lic.created_at ? new Date(lic.created_at).toLocaleDateString() : 'Activa'}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-xs pt-1 border-t border-gray-800">
                            <span className="text-gray-300 font-semibold flex items-center">
                              <i className="fas fa-hourglass-half text-amber-400 mr-1.5 text-[10px]"></i> Vencimiento:
                            </span>
                            <span className="text-amber-400 font-bold">
                              {lic.formatted_expiry || '31/12/2026'}
                            </span>
                          </div>

                          <div className="pt-1 flex justify-between items-center text-[11px]">
                            <span className="text-gray-500">Renovación:</span>
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-semibold">
                              {lic.days_left ? `${lic.days_left} días restantes` : 'Suscripción Activa'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Botones de acción */}
                      <div className="mt-6 pt-2 space-y-2">
                        {app.url ? (
                          <a 
                            href={app.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-gray-950 font-bold rounded-xl text-xs transition shadow-md glow-effect"
                          >
                            <i className="fas fa-external-link-alt mr-2"></i>
                            Acceder a la Aplicación
                          </a>
                        ) : (
                          <button disabled className="w-full py-2 bg-gray-800 text-gray-500 rounded-xl text-xs">
                            URL en preparación
                          </button>
                        )}

                        <button 
                          onClick={() => handleOpenReportTicket(app.name)}
                          className="w-full py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold transition flex items-center justify-center"
                        >
                          <i className="fas fa-bug mr-1.5 text-amber-400"></i>
                          Reportar Fallo en esta App
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass-card rounded-2xl p-10 text-center border border-gray-800 max-w-2xl mx-auto">
                <div className="w-16 h-16 rounded-full bg-gray-800/80 border border-gray-700 flex items-center justify-center mx-auto text-2xl text-gray-500 mb-4">
                  <i className="fas fa-key"></i>
                </div>
                <h4 className="text-base font-bold text-white mb-2">No tienes aplicaciones o licencias activadas</h4>
                <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed mb-6">
                  Si contrataste una solución de FEStudio o requieres la activación de una licencia, nuestro equipo técnico lo habilitará en tu cuenta. También puedes abrir un ticket de soporte a continuación.
                </p>
                <button 
                  onClick={() => handleOpenReportTicket()}
                  className="px-5 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded-xl text-xs font-bold transition inline-flex items-center"
                >
                  <i className="fas fa-headset mr-2"></i> Contactar a Soporte Técnico
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: TICKETS DE SOPORTE POR FALLOS EN APLICACIONES                      */}
        {/* ========================================================================= */}
        {activeTab === 'tickets' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-brand-dark/70 p-4 rounded-xl border border-gray-800">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center">
                  <i className="fas fa-exclamation-triangle text-amber-400 mr-2"></i> Incidencias & Tickets de Soporte por Fallos
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Reporta fallas, bugs, caídas de servicio o consultas técnicas de las aplicaciones que utilizas.
                </p>
              </div>
              <button 
                onClick={() => handleOpenReportTicket()}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-950 font-bold rounded-xl text-xs transition shadow-md flex items-center"
              >
                <i className="fas fa-plus mr-1.5"></i> Crear Ticket por Fallo
              </button>
            </div>

            {tickets.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {tickets.map(ticket => {
                  // Detectar app name si está en el subject con formato [App Name]
                  let appTag = 'General';
                  let cleanSubject = ticket.subject;
                  const match = ticket.subject?.match(/^\[(.*?)\]\s*(.*)$/);
                  if (match) {
                    appTag = match[1];
                    cleanSubject = match[2];
                  }

                  const isResolved = ticket.status === 'resuelto';
                  const inProgress = ticket.status === 'en progreso' || ticket.status === 'en revision';

                  return (
                    <div key={ticket.id} className="glass-card rounded-xl p-5 border border-gray-800 hover:border-gray-700 transition">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-sm">
                            <i className="fas fa-tools"></i>
                          </span>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                                App: {appTag}
                              </span>
                              <h5 className="text-sm font-bold text-white">{cleanSubject}</h5>
                            </div>
                            <span className="text-[10px] text-gray-500 font-mono">ID: {ticket.id}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            isResolved
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : inProgress
                              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}>
                            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
                              isResolved ? 'bg-emerald-400' : inProgress ? 'bg-cyan-400 animate-pulse' : 'bg-amber-400 animate-pulse'
                            }`}></span>
                            {ticket.status || 'Abierto'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(ticket.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="bg-gray-900/70 p-3.5 rounded-lg border border-gray-800 text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {ticket.description}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass-card rounded-2xl p-10 text-center border border-gray-800">
                <i className="fas fa-check-circle text-4xl text-gray-600 mb-3"></i>
                <h5 className="text-sm font-bold text-white">No tienes tickets de soporte registrados</h5>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                  Si alguna de tus aplicaciones presenta un problema o fallo técnico, genera una solicitud para recibir asistencia.
                </p>
                <button 
                  onClick={() => handleOpenReportTicket()}
                  className="mt-4 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded-xl text-xs font-bold transition inline-flex items-center"
                >
                  <i className="fas fa-bug mr-1.5"></i> Reportar un Fallo Ahora
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: CARGAR DATOS COMO EMPRESA PARA RECIBIR FACTURACIÓN                 */}
        {/* ========================================================================= */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div className="bg-brand-dark/70 p-5 rounded-xl border border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center">
                  <i className="fas fa-building text-blue-400 mr-2"></i> Datos Fiscales de la Empresa para Facturación
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Ingresa o actualiza la información fiscal para que FEStudio Desarrollos emita tus facturas y comprobantes correspondientes.
                </p>
              </div>

              {companyBilling.cuit ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <i className="fas fa-check-circle mr-1.5"></i> Datos Fiscales Guardados
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <i className="fas fa-info-circle mr-1.5"></i> Pendiente de Carga
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Formulario de Carga de Datos */}
              <div className="lg:col-span-2 glass-card rounded-2xl p-6 sm:p-8 border border-gray-700/60 shadow-xl">
                <form onSubmit={handleSaveBilling} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Razón Social / Nombre Comercial <span className="text-red-400">*</span>
                      </label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ej: AgroSoluciones S.A. o Juan Pérez"
                        value={companyBilling.business_name}
                        onChange={e => setCompanyBilling({...companyBilling, business_name: e.target.value})}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-xs focus:outline-none focus:border-blue-400 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        CUIT / RUT / Identificación Fiscal <span className="text-red-400">*</span>
                      </label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ej: 30-71234567-9"
                        value={companyBilling.cuit}
                        onChange={e => setCompanyBilling({...companyBilling, cuit: e.target.value})}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-xs focus:outline-none focus:border-blue-400 transition font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Condición Frente al IVA
                      </label>
                      <select 
                        value={companyBilling.tax_condition}
                        onChange={e => setCompanyBilling({...companyBilling, tax_condition: e.target.value})}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-xs focus:outline-none focus:border-blue-400 transition cursor-pointer"
                      >
                        <option value="Responsable Inscripto">IVA Responsable Inscripto (Factura A)</option>
                        <option value="Monotributo">Responsable Monotributo (Factura B)</option>
                        <option value="IVA Exento">IVA Exento</option>
                        <option value="Consumidor Final">Consumidor Final (Factura B)</option>
                        <option value="Cliente Exterior">Cliente Exterior / Exportación de Servicios</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">
                        Email para Recepción de Facturas <span className="text-red-400">*</span>
                      </label>
                      <input 
                        type="email" 
                        required
                        placeholder="administracion@tuempresa.com"
                        value={companyBilling.billing_email}
                        onChange={e => setCompanyBilling({...companyBilling, billing_email: e.target.value})}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-xs focus:outline-none focus:border-blue-400 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Domicilio Fiscal (Calle, Número, Piso/Oficina)
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ej: Av. San Martín 1420, Piso 3"
                      value={companyBilling.address}
                      onChange={e => setCompanyBilling({...companyBilling, address: e.target.value})}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-xs focus:outline-none focus:border-blue-400 transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Ciudad / Localidad</label>
                      <input 
                        type="text" 
                        placeholder="Ej: Rosario"
                        value={companyBilling.city}
                        onChange={e => setCompanyBilling({...companyBilling, city: e.target.value})}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-xs focus:outline-none focus:border-blue-400 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Provincia / Región</label>
                      <input 
                        type="text" 
                        placeholder="Ej: Santa Fe"
                        value={companyBilling.province}
                        onChange={e => setCompanyBilling({...companyBilling, province: e.target.value})}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-xs focus:outline-none focus:border-blue-400 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">Código Postal</label>
                      <input 
                        type="text" 
                        placeholder="Ej: 2000"
                        value={companyBilling.postal_code}
                        onChange={e => setCompanyBilling({...companyBilling, postal_code: e.target.value})}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-xs focus:outline-none focus:border-blue-400 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Teléfono de Contacto Fiscal / Administración</label>
                    <input 
                      type="text" 
                      placeholder="Ej: +54 9 341 555-4321"
                      value={companyBilling.phone}
                      onChange={e => setCompanyBilling({...companyBilling, phone: e.target.value})}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-xs focus:outline-none focus:border-blue-400 transition"
                    />
                  </div>

                  <div className="pt-2">
                    <button 
                      type="submit" 
                      disabled={isSavingBilling}
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white font-bold rounded-xl text-xs transition shadow-lg disabled:opacity-50 flex items-center"
                    >
                      <i className="fas fa-save mr-2"></i>
                      {isSavingBilling ? 'Guardando Datos...' : 'Guardar Datos de Facturación'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Tarjeta de Resumen Fiscal */}
              <div className="glass-card rounded-2xl p-6 border border-gray-700/60 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xl mb-4">
                    <i className="fas fa-file-invoice"></i>
                  </div>
                  <h5 className="text-base font-bold text-white mb-2">Comprobantes Fiscales Oficiales</h5>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Las facturas se emiten automáticamente con el detalle de las licencias contratadas, mantenimiento y servicios de software.
                  </p>

                  <div className="mt-6 pt-4 border-t border-gray-800 space-y-3 text-xs">
                    <div>
                      <span className="text-gray-500 block text-[11px]">Razón Social Registrada:</span>
                      <span className="text-white font-semibold">
                        {companyBilling.business_name || 'No configurada'}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500 block text-[11px]">Identificación CUIT:</span>
                      <span className="text-cyan-400 font-mono font-bold">
                        {companyBilling.cuit || 'Sin CUIT'}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500 block text-[11px]">Tipo de Factura:</span>
                      <span className="text-brand-accent font-semibold">
                        {companyBilling.tax_condition === 'Responsable Inscripto' ? 'Factura A' : 'Factura B'}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500 block text-[11px]">Envío Digital:</span>
                      <span className="text-gray-300 truncate block">
                        {companyBilling.billing_email || profile?.email || 'Email de cuenta'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-800/80">
                  <button 
                    onClick={() => setActiveTab('invoices')}
                    className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition flex items-center justify-center"
                  >
                    <i className="fas fa-receipt mr-1.5 text-cyan-400"></i> Ver Mis Facturas Generadas
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: FACTURAS GENERADAS POR SERVICIOS, LICENCIAS Y OTROS                */}
        {/* ========================================================================= */}
        {activeTab === 'invoices' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-brand-dark/70 p-4 rounded-xl border border-gray-800">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center">
                  <i className="fas fa-file-invoice-dollar text-cyan-400 mr-2"></i> Facturas por Servicios Contratados & Licencias
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Visualiza y descarga los comprobantes fiscales correspondientes a tus suscripciones de software y servicios.
                </p>
              </div>

              {!companyBilling.cuit && (
                <button 
                  onClick={() => setActiveTab('billing')}
                  className="px-3.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-semibold transition flex items-center"
                >
                  <i className="fas fa-building mr-1.5"></i> Cargar Datos de Facturación
                </button>
              )}
            </div>

            <div className="glass-card rounded-xl border border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                {invoices.length > 0 ? (
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead className="bg-gray-800/60 text-gray-400 uppercase font-semibold text-[11px]">
                      <tr>
                        <th className="p-3.5">N° Comprobante</th>
                        <th className="p-3.5">Concepto / Servicio</th>
                        <th className="p-3.5">Emisión / Vto.</th>
                        <th className="p-3.5">Importe</th>
                        <th className="p-3.5">Estado</th>
                        <th className="p-3.5 text-right">Comprobante</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {invoices.map((inv) => {
                        const isPaid = inv.status === 'Pagada';

                        return (
                          <tr key={inv.id} className="hover:bg-gray-800/30 transition">
                            <td className="p-3.5 whitespace-nowrap">
                              <span className="font-mono font-bold text-white block">{inv.invoice_number}</span>
                              <span className="text-[10px] text-gray-500">{inv.service_type}</span>
                            </td>
                            <td className="p-3.5">
                              <p className="font-semibold text-white">{inv.concept}</p>
                              {inv.app_name && (
                                <span className="text-[10px] text-cyan-400">Software: {inv.app_name}</span>
                              )}
                            </td>
                            <td className="p-3.5 whitespace-nowrap text-gray-400">
                              <div>{inv.issue_date}</div>
                              <div className="text-[10px] text-gray-500">Vence: {inv.due_date}</div>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className="font-mono font-bold text-emerald-400">
                                $ {inv.amount?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] text-gray-500 ml-1">{inv.currency}</span>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                isPaid 
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              }`}>
                                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${isPaid ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                                {inv.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-right whitespace-nowrap">
                              <button 
                                onClick={() => handleViewInvoice(inv)}
                                className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-semibold transition"
                              >
                                <i className="fas fa-eye mr-1"></i> Ver Factura
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-10 text-center text-gray-500 text-xs">
                    <i className="fas fa-file-invoice text-3xl mb-2 text-gray-600 block"></i>
                    No se registran facturas emitidas por el momento.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* MODAL: REPORTAR FALLO EN APLICACIÓN                                       */}
      {/* ========================================================================= */}
      {showTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-card rounded-2xl border border-gray-700/80 p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
            <button 
              onClick={() => setShowTicketModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
            >
              <i className="fas fa-times text-lg"></i>
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-lg">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reportar Fallo o Incidencia en App</h3>
                <p className="text-xs text-gray-400">Describe el inconveniente para que el equipo lo investigue.</p>
              </div>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Aplicación que presentó el fallo
                </label>
                <select 
                  value={ticketApp}
                  onChange={e => setTicketApp(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-400 transition cursor-pointer"
                >
                  {licenses.map(lic => (
                    <option key={lic.id} value={lic.apps?.name || 'App'}>
                      {lic.apps?.name || 'Aplicación'}
                    </option>
                  ))}
                  <option value="General / Otra Solución">Otra Aplicación / Solución General</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Tipo de Falla Detectada
                </label>
                <select 
                  value={ticketFailureType}
                  onChange={e => setTicketFailureType(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-400 transition cursor-pointer"
                >
                  <option value="Error al Guardar o Procesar Datos">Error al Guardar o Procesar Datos</option>
                  <option value="Falla de Inicio de Sesión o Permisos">Falla de Inicio de Sesión o Permisos</option>
                  <option value="Falla de Conexión / Servidor Lento">Falla de Conexión / Servidor Lento</option>
                  <option value="Error en Emisión o Reportes">Error en Emisión de Comprobantes o Reportes</option>
                  <option value="Pantalla en Blanco o Bloqueo">Pantalla en Blanco / Bloqueo del Sistema</option>
                  <option value="Consulta Técnica General">Consulta Técnica / Ajuste</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Asunto Breve del Problema
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Mensaje de error al emitir factura o error 500"
                  value={ticketSubject}
                  onChange={e => setTicketSubject(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Descripción Detallada del Fallo
                </label>
                <textarea 
                  rows="4" 
                  required
                  placeholder="Indica qué estabas haciendo, los pasos para reproducir el fallo y cualquier código de error que haya mostrado la aplicación..."
                  value={ticketDesc}
                  onChange={e => setTicketDesc(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-xs focus:outline-none focus:border-amber-400 transition"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowTicketModal(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSubmittingTicket}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-950 font-bold rounded-lg text-xs transition shadow-md disabled:opacity-50"
                >
                  {isSubmittingTicket ? 'Enviando...' : 'Enviar Reporte de Fallo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VER COMPROBANTE / FACTURA DETALLADA (IMPRIMIBLE)                   */}
      {/* ========================================================================= */}
      {showInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white text-gray-900 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8 print:p-0 print:shadow-none">
            
            {/* Botón cerrar */}
            <button 
              onClick={() => setShowInvoiceModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 print:hidden text-lg"
            >
              <i className="fas fa-times"></i>
            </button>

            {/* Cabecera Factura */}
            <div className="border-b-2 border-gray-800 pb-4 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-wider">FEStudio Desarrollos</h3>
                  <p className="text-xs text-gray-600">Software Architecture & Cloud Solutions</p>
                  <p className="text-xs text-gray-600 mt-1">CUIT: 30-71829341-4</p>
                  <p className="text-xs text-gray-600">IVA Responsable Inscripto</p>
                </div>

                {/* Letra de Factura */}
                <div className="border-2 border-gray-900 px-4 py-2 text-center rounded-lg bg-gray-50">
                  <span className="text-3xl font-black block">
                    {companyBilling.tax_condition === 'Responsable Inscripto' ? 'A' : 'B'}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-gray-700">Comprobante</span>
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">FACTURA N°</p>
                  <p className="text-base font-mono font-extrabold text-gray-900">{selectedInvoice.invoice_number}</p>
                  <p className="text-xs text-gray-600 mt-1">Fecha Emisión: {selectedInvoice.issue_date}</p>
                  <p className="text-xs text-gray-600">Fecha Vto.: {selectedInvoice.due_date}</p>
                </div>
              </div>
            </div>

            {/* Datos de la Empresa Cliente */}
            <div className="bg-gray-100 p-4 rounded-xl mb-6 text-xs text-gray-800">
              <h5 className="font-bold text-gray-900 uppercase text-[11px] mb-2 border-b border-gray-300 pb-1">
                Datos del Receptor / Cliente
              </h5>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-semibold text-gray-600">Razón Social: </span>
                  <span className="font-bold text-gray-900">
                    {companyBilling.business_name || profile?.email || user?.email}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-600">CUIT / RUT: </span>
                  <span className="font-mono font-bold text-gray-900">
                    {companyBilling.cuit || 'Consumidor Final'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-600">Condición IVA: </span>
                  <span>{companyBilling.tax_condition || 'Consumidor Final'}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-600">Domicilio: </span>
                  <span>
                    {companyBilling.address ? `${companyBilling.address}, ${companyBilling.city}` : 'No especificado'}
                  </span>
                </div>
              </div>
            </div>

            {/* Tabla de Conceptos */}
            <div className="border border-gray-300 rounded-lg overflow-hidden mb-6">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-200 text-gray-800 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Detalle / Servicio Contratado</th>
                    <th className="p-2.5 text-center">Cant.</th>
                    <th className="p-2.5 text-right">Precio Unitario</th>
                    <th className="p-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-800">
                  <tr>
                    <td className="p-3">
                      <p className="font-bold text-gray-900">{selectedInvoice.concept}</p>
                      <p className="text-[11px] text-gray-600">{selectedInvoice.service_type}</p>
                    </td>
                    <td className="p-3 text-center">1</td>
                    <td className="p-3 text-right font-mono">
                      $ {(selectedInvoice.amount / 1.21).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold">
                      $ {(selectedInvoice.amount / 1.21).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totales */}
            <div className="flex justify-end mb-6">
              <div className="w-64 space-y-1.5 text-xs text-gray-800">
                <div className="flex justify-between">
                  <span>Subtotal Neto:</span>
                  <span className="font-mono font-semibold">
                    $ {(selectedInvoice.amount / 1.21).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>IVA (21%):</span>
                  <span className="font-mono font-semibold">
                    $ {(selectedInvoice.amount - (selectedInvoice.amount / 1.21)).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between border-t-2 border-gray-900 pt-2 text-sm font-extrabold text-gray-900">
                  <span>TOTAL {selectedInvoice.currency}:</span>
                  <span className="font-mono text-emerald-600">
                    $ {selectedInvoice.amount?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Pie de comprobante */}
            <div className="border-t border-gray-300 pt-4 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 gap-3">
              <div className="flex items-center space-x-2">
                <i className="fas fa-qrcode text-3xl text-gray-800"></i>
                <div className="text-[10px]">
                  <p className="font-mono font-bold text-gray-800">CAE N°: 74182948291048</p>
                  <p>Vto. CAE: {selectedInvoice.due_date}</p>
                </div>
              </div>

              <div className="flex space-x-3 print:hidden">
                <button 
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg font-semibold text-xs hover:bg-gray-800 transition flex items-center shadow"
                >
                  <i className="fas fa-print mr-1.5"></i> Imprimir / PDF
                </button>
                <button 
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold text-xs hover:bg-gray-300 transition"
                >
                  Cerrar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Footer Dashboard */}
      <footer className="bg-brand-dark border-t border-gray-800/80 py-6 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <span>&copy; 2026 <strong>FEStudio Desarrollos</strong>. Portal de Clientes.</span>
          <div className="flex space-x-4">
            <Link to="/" className="text-gray-400 hover:text-brand-accent transition">Sitio Web</Link>
            <a href="mailto:festudio.desarrollos@gmail.com" className="text-gray-400 hover:text-cyan-400 transition">Contacto Directo</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
