import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Link, Navigate } from 'react-router-dom';

export default function Dashboard() {
  const { user, profile, loading } = useAuth();

  // Pestaña activa del Dashboard Superusuario
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'apps', 'licenses', 'generator', 'arca', 'helpdesk'

  // Datos principales del panel administrativo
  const [adminData, setAdminData] = useState({
    queries: [],
    tickets: [],
    apps: [],
    licenses: [],
    clients: []
  });
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState({ text: '', type: '' });

  // Estado del Facturador ARCA
  const [arcaConfig, setArcaConfig] = useState({
    environment: 'homologacion',
    cuit_emisor: '30-71112233-4',
    punto_venta: 1,
    razon_social: 'FEStudio Desarrollos S.A.',
    condicion_iva: 'IVA Responsable Inscripto',
    wsfe_status: 'En Línea - WSFE v1.0',
    wsaa_status: 'Token & Sign Activo'
  });
  const [arcaInvoices, setArcaInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [isEmittingInvoice, setIsEmittingInvoice] = useState(false);

  // Formulario de emisión ARCA
  const [invoiceForm, setInvoiceForm] = useState({
    invoice_type: 'A',
    client_name: '',
    client_cuit: '',
    concept: '2',
    service_type: 'Licencia Anual de Software FEStudio CRM',
    net_amount: 45000,
    iva_rate: 21,
    user_id: '',
    app_id: ''
  });

  // Estado del Generador de Códigos de Licencia
  const [generatorForm, setGeneratorForm] = useState({
    app_name: 'FEStudio CRM',
    license_type: 'ANUAL',
    client_email: '',
    seats: 1,
    prefix: 'FEST'
  });
  const [generatedLicense, setGeneratedLicense] = useState(null);
  const [generatedHistory, setGeneratedHistory] = useState([]);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Modales de Gestión de Apps
  const [showAppModal, setShowAppModal] = useState(false);
  const [appFormMode, setAppFormMode] = useState('create'); // 'create' | 'edit'
  const [editingAppId, setEditingAppId] = useState(null);
  const [appFormData, setAppFormData] = useState({
    name: '',
    url: '',
    description: ''
  });

  // Modal Asignar Licencia Manual
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [newLicenseData, setNewLicenseData] = useState({
    user_id: '',
    app_id: '',
    status: 'active'
  });

  // Cargar datos administrativos consolidados
  const fetchAdminData = useCallback(async () => {
    if (!profile?.is_superuser) return;

    setIsLoadingAdmin(true);
    setAdminError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setAdminError('Sesión no encontrada o expirada.');
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setAdminData({
          queries: Array.isArray(data.queries) ? data.queries : [],
          tickets: Array.isArray(data.tickets) ? data.tickets : [],
          apps: Array.isArray(data.apps) ? data.apps : [],
          licenses: Array.isArray(data.licenses) ? data.licenses : [],
          clients: Array.isArray(data.clients) ? data.clients : []
        });

        // Preseleccionar en los formularios si hay apps disponibles
        if (data.apps?.length > 0 && !appFormData.name) {
          setGeneratorForm(prev => ({ ...prev, app_name: data.apps[0].name }));
        }
      } else {
        setAdminError(data.error || 'Error al recuperar datos del panel maestro.');
      }

      // Cargar estado e historial ARCA
      try {
        const arcaRes = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/arca/status`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        const arcaData = await arcaRes.json();
        if (arcaRes.ok && arcaData.success) {
          setArcaConfig(arcaData.config);
        }

        const invRes = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/arca/invoices`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        const invData = await invRes.json();
        if (invRes.ok && invData.success) {
          setArcaInvoices(Array.isArray(invData.invoices) ? invData.invoices : []);
        }
      } catch (arcaErr) {
        console.warn('Nota sobre WSFE ARCA:', arcaErr);
      }

    } catch {
      setAdminError('Fallo de conexión al cargar la información del servidor.');
    } finally {
      setIsLoadingAdmin(false);
    }
  }, [profile, appFormData.name]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // Si está cargando la sesión o perfil
  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold tracking-wide text-gray-300">Autenticando Superusuario...</p>
        </div>
      </div>
    );
  }

  // BLINDAJE ESTRICTO: Si no es superusuario, redirigir al portal cliente
  if (!profile.is_superuser) {
    return <Navigate to="/dashboard/client" replace />;
  }

  const showNotification = (text, type = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg({ text: '', type: '' }), 4000);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Error al cerrar sesión:', e);
    }
  };

  // --- ACCIONES DE GESTIÓN DE APPS ---
  const handleOpenCreateApp = () => {
    setAppFormMode('create');
    setAppFormData({ name: '', url: '', description: '' });
    setShowAppModal(true);
  };

  const handleOpenEditApp = (app) => {
    setAppFormMode('edit');
    setEditingAppId(app.id);
    setAppFormData({
      name: app.name || '',
      url: app.url || '',
      description: app.description || ''
    });
    setShowAppModal(true);
  };

  const handleSaveApp = async (e) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const url = appFormMode === 'create'
        ? `${import.meta.env.VITE_API_URL}/api/admin/apps`
        : `${import.meta.env.VITE_API_URL}/api/admin/apps/${editingAppId}`;
      const method = appFormMode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(appFormData)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showNotification(appFormMode === 'create' ? '¡Aplicación creada con éxito!' : '¡Aplicación actualizada!');
        setShowAppModal(false);
        fetchAdminData();
      } else {
        alert(data.error || 'No se pudo guardar la aplicación');
      }
    } catch {
      alert('Error de conexión al guardar la aplicación');
    }
  };

  const handleDeleteApp = async (appId, appName) => {
    if (!window.confirm(`¿Estás seguro de eliminar la aplicación "${appName}"? Se revocarán todas sus licencias asociadas.`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/apps/${appId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(`Aplicación "${appName}" eliminada correctamente.`);
        fetchAdminData();
      } else {
        alert(data.error || 'No se pudo eliminar la aplicación.');
      }
    } catch {
      alert('Error de conexión al eliminar la aplicación');
    }
  };

  // --- ACCIONES DE GESTIÓN DE LICENCIAS ---
  const handleToggleLicenseStatus = async (licenseId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/licenses/${licenseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(`Licencia marcada como ${newStatus === 'active' ? 'Activa' : 'Suspendida'}`);
        fetchAdminData();
      }
    } catch {
      alert('Error al modificar el estado de la licencia');
    }
  };

  const handleRenewLicense = async (licenseId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/licenses/${licenseId}/renew`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ days: 365 })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('¡Licencia renovada por +1 año exitosamente!');
        fetchAdminData();
      }
    } catch {
      alert('Error al renovar la licencia');
    }
  };

  const handleDeleteLicense = async (licenseId) => {
    if (!window.confirm('¿Revocar y eliminar definitivamente esta licencia?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/licenses/${licenseId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('Licencia revocada del sistema');
        fetchAdminData();
      }
    } catch {
      alert('Error al revocar licencia');
    }
  };

  const handleCreateLicense = async (e) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/licenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(newLicenseData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('¡Licencia asignada al cliente!');
        setShowLicenseModal(false);
        fetchAdminData();
      } else {
        alert(data.error || 'No se pudo asignar la licencia');
      }
    } catch {
      alert('Error de conexión al asignar licencia');
    }
  };

  // --- GENERADOR CRIPTOGRÁFICO DE CÓDIGOS DE LICENCIA ---
  const handleGenerateLicenseKey = async (e) => {
    e.preventDefault();
    setIsGeneratingKey(true);
    setCopiedKey(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/licenses/generate-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(generatorForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGeneratedLicense(data.license);
        setGeneratedHistory(prev => [data.license, ...prev.slice(0, 9)]);
        showNotification('¡Código de Licencia generado y firmado criptográficamente!');
      } else {
        alert(data.error || 'Error al generar clave de licencia');
      }
    } catch {
      alert('Error de conexión con el generador de claves');
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleCopyKey = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    showNotification('Clave de licencia copiada al portapapeles');
    setTimeout(() => setCopiedKey(false), 3000);
  };

  const handleDownloadLicenseJson = (lic) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(lic, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `license_${lic.key}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // --- FACTURADOR WEB SERVICE ARCA (EX-AFIP) ---
  const handleEmitInvoice = async (e) => {
    e.preventDefault();
    setIsEmittingInvoice(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/arca/emit-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(invoiceForm)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showNotification(`¡${data.message}! CAE Otorgado.`);
        setArcaInvoices(prev => [data.invoice, ...prev]);
        setSelectedInvoice(data.invoice);
        setShowInvoiceModal(true);
        // Reset campos específicos
        setInvoiceForm(prev => ({
          ...prev,
          client_name: '',
          client_cuit: '',
          net_amount: 45000
        }));
      } else {
        alert(data.error || 'Rechazo de facturación en ARCA');
      }
    } catch {
      alert('Error al conectar con el Web Service de ARCA');
    } finally {
      setIsEmittingInvoice(false);
    }
  };

  const handleToggleArcaEnv = async (newEnv) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/arca/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ environment: newEnv })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setArcaConfig(data.config);
        showNotification(`Entorno ARCA cambiado a: ${newEnv === 'produccion' ? 'Producción Oficial' : 'Homologación (Testing)'}`);
      }
    } catch {
      alert('Error al cambiar entorno ARCA');
    }
  };

  // Cálculos en tiempo real de importes ARCA
  const calculatedIva = Number((invoiceForm.net_amount * (invoiceForm.iva_rate / 100)).toFixed(2));
  const calculatedTotal = Number((Number(invoiceForm.net_amount) + calculatedIva).toFixed(2));

  // KPIs para la pestaña Overview
  const totalAppsCount = adminData.apps.length;
  const activeLicensesCount = adminData.licenses.filter(l => l.status === 'active').length;
  const totalClientsCount = adminData.clients.length;
  const totalInvoicedAmount = arcaInvoices.reduce((acc, inv) => acc + (Number(inv.amount) || 0), 0);
  const openTicketsCount = adminData.tickets.filter(t => t.status !== 'Resuelto' && t.status !== 'Cerrado').length;

  return (
    <div className="min-h-screen bg-brand-dark text-brand-text font-sans antialiased flex flex-col justify-between selection:bg-brand-accent selection:text-gray-900">
      
      {/* ========================================================================= */}
      {/* 1. HEADER MASTER: EXCLUSIVO SUPERUSUARIO                                 */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 glass-card border-b border-gray-800 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo y Credencial Master */}
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-emerald-400 p-0.5 group-hover:border-cyan-400 transition duration-300">
                <img 
                  src="/assets/logo.png" 
                  onError={(e) => { e.currentTarget.src = 'https://placehold.co/100x100/161d2f/10b981?text=FE'; }} 
                  alt="FEStudio" 
                  className="w-full h-full object-cover rounded-full" 
                />
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">FEStudio</span>
                <span className="block text-[11px] font-semibold tracking-widest text-gray-400 -mt-1">ADMINISTRACIÓN MASTER</span>
              </div>
            </Link>

            <div className="h-7 w-px bg-gray-800 hidden md:block"></div>

            {/* Badges de Estado del Sistema */}
            <div className="hidden md:flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span>
                Supabase PG: Online
              </span>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium border ${
                arcaConfig.environment === 'produccion'
                  ? 'bg-red-500/10 text-red-400 border-red-500/30'
                  : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
              }`}>
                <i className="fas fa-satellite-dish mr-1.5 text-[10px]"></i>
                ARCA WSFE: {arcaConfig.environment === 'produccion' ? 'PRODUCCIÓN' : 'HOMOLOGACIÓN'}
              </span>
            </div>
          </div>

          {/* Perfil Superusuario y Acciones */}
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-white flex items-center justify-end">
                <i className="fas fa-crown text-amber-400 mr-1.5 text-xs"></i> Superusuario Master
              </span>
              <p className="text-[11px] text-gray-400">{profile?.email}</p>
            </div>

            <Link 
              to="/dashboard/client" 
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold transition border border-gray-700 hidden lg:inline-flex items-center"
              title="Ver el panel exactamente como lo ve un cliente"
            >
              <i className="fas fa-user-circle mr-1.5 text-cyan-400"></i> Vista Cliente
            </Link>

            <button 
              onClick={handleLogout} 
              className="px-3.5 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 text-xs font-semibold transition flex items-center"
            >
              <i className="fas fa-sign-out-alt mr-1.5"></i> Salir
            </button>
          </div>

        </div>

        {/* Barra de Navegación por Pestañas / Módulos */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-gray-800/80 overflow-x-auto flex space-x-1 sm:space-x-3 py-2">
          {[
            { id: 'overview', label: 'Resumen & KPIs', icon: 'fa-chart-pie' },
            { id: 'apps', label: 'Gestión de Apps', icon: 'fa-cubes', count: totalAppsCount },
            { id: 'licenses', label: 'Gestión de Licencias', icon: 'fa-id-card', count: activeLicensesCount },
            { id: 'generator', label: 'Generador de Claves', icon: 'fa-key', badge: 'Crypto' },
            { id: 'arca', label: 'Facturador ARCA', icon: 'fa-file-invoice-dollar', badge: 'WSFE' },
            { id: 'helpdesk', label: 'Soporte & Leads', icon: 'fa-headset', count: openTicketsCount }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center space-x-2 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                <i className={`fas ${tab.icon} ${isActive ? 'text-emerald-400' : 'text-gray-500'}`}></i>
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-emerald-500/30 text-emerald-300' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 uppercase tracking-wider">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Notificación Flotante */}
      {feedbackMsg.text && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className="px-4 py-3 rounded-xl bg-gray-900 border border-emerald-500/50 text-emerald-400 text-xs shadow-2xl flex items-center space-x-2">
            <i className="fas fa-check-circle text-emerald-400 text-sm"></i>
            <span className="font-medium">{feedbackMsg.text}</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CONTENIDO PRINCIPAL SEGÚN PESTAÑA ACTIVA                               */}
      {/* ========================================================================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow w-full">
        
        {adminError && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between">
            <div className="flex items-center">
              <i className="fas fa-exclamation-triangle mr-2.5 text-base"></i>
              <span>{adminError}</span>
            </div>
            <button onClick={fetchAdminData} className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-[11px] font-semibold">
              Reintentar
            </button>
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* PESTAÑA 1: RESUMEN & KPIS (OVERVIEW)                                  */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Header del módulo */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-800">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center">
                  <i className="fas fa-tachometer-alt text-emerald-400 mr-2.5"></i> Centro de Control & Métricas Globales
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Visión consolidada del catálogo, licencias activas, facturación ARCA y requerimientos de soporte.
                </p>
              </div>
              <button 
                onClick={fetchAdminData} 
                disabled={isLoadingAdmin}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition border border-gray-700 flex items-center"
              >
                <i className={`fas fa-sync-alt mr-2 text-cyan-400 ${isLoadingAdmin ? 'animate-spin' : ''}`}></i>
                Actualizar Métricas
              </button>
            </div>

            {/* Grid de KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              <div className="glass-card rounded-2xl p-5 border border-emerald-500/20 hover:border-emerald-500/40 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Apps en Producción</p>
                    <h3 className="text-2xl font-extrabold text-white mt-1">{totalAppsCount}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                    <i className="fas fa-cubes text-base"></i>
                  </div>
                </div>
                <div className="mt-3 flex items-center text-[11px] text-emerald-400">
                  <i className="fas fa-check mr-1"></i> Software disponible para licenciamiento
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-cyan-500/20 hover:border-cyan-500/40 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Licencias Otorgadas</p>
                    <h3 className="text-2xl font-extrabold text-white mt-1">{adminData.licenses.length}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                    <i className="fas fa-id-card text-base"></i>
                  </div>
                </div>
                <div className="mt-3 flex items-center text-[11px] text-cyan-400">
                  <span className="font-semibold">{activeLicensesCount} activas</span>&nbsp;({adminData.licenses.length - activeLicensesCount} inactivas)
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-blue-500/20 hover:border-blue-500/40 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Facturación ARCA</p>
                    <h3 className="text-2xl font-extrabold text-white mt-1">
                      ${totalInvoicedAmount.toLocaleString('es-AR')}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                    <i className="fas fa-file-invoice-dollar text-base"></i>
                  </div>
                </div>
                <div className="mt-3 flex items-center text-[11px] text-blue-400">
                  <i className="fas fa-stamp mr-1"></i> {arcaInvoices.length} comprobantes con CAE
                </div>
              </div>

              <div className="glass-card rounded-2xl p-5 border border-amber-500/20 hover:border-amber-500/40 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Tickets Pendientes</p>
                    <h3 className="text-2xl font-extrabold text-white mt-1">{openTicketsCount}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                    <i className="fas fa-headset text-base"></i>
                  </div>
                </div>
                <div className="mt-3 flex items-center text-[11px] text-amber-400">
                  <i className="fas fa-inbox mr-1"></i> {adminData.queries.length} consultas de presupuesto
                </div>
              </div>

            </div>

            {/* Accesos Rápidos y Estado de Web Services */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Tarjeta de Servicios ARCA */}
              <div className="glass-card rounded-2xl p-6 border border-gray-800 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center">
                  <i className="fas fa-network-wired text-cyan-400 mr-2"></i> Integración ARCA (ex-AFIP)
                </h4>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-gray-800">
                    <span className="text-gray-400">Entorno:</span>
                    <span className="font-bold text-cyan-400 uppercase">{arcaConfig.environment}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-800">
                    <span className="text-gray-400">Punto de Venta WSFE:</span>
                    <span className="font-mono text-white">{String(arcaConfig.punto_venta).padStart(4, '0')}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-800">
                    <span className="text-gray-400">CUIT Emisor:</span>
                    <span className="font-mono text-white">{arcaConfig.cuit_emisor}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-800">
                    <span className="text-gray-400">WSAA Token & Sign:</span>
                    <span className="text-emerald-400 font-semibold">Válido (12hs)</span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('arca')}
                  className="w-full py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40 rounded-xl text-xs font-semibold transition"
                >
                  <i className="fas fa-paper-plane mr-1.5"></i> Abrir Facturador Electrónico
                </button>
              </div>

              {/* Generador Rápido de Licencias */}
              <div className="glass-card rounded-2xl p-6 border border-gray-800 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center">
                  <i className="fas fa-key text-emerald-400 mr-2"></i> Emisión de Seriales
                </h4>
                <p className="text-xs text-gray-400">
                  Genera códigos de activación criptográficos con verificación de integridad por SHA-256 para distribuir a clientes.
                </p>
                <div className="p-3 bg-brand-dark/80 rounded-xl border border-gray-800 font-mono text-[11px] text-emerald-400 break-all">
                  FEST-CRM-ANU-XXXX-YYYY-2026-HASH
                </div>
                <button
                  onClick={() => setActiveTab('generator')}
                  className="w-full py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-xl text-xs font-semibold transition"
                >
                  <i className="fas fa-magic mr-1.5"></i> Generar Nueva Licencia
                </button>
              </div>

              {/* Catálogo de Software */}
              <div className="glass-card rounded-2xl p-6 border border-gray-800 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center">
                  <i className="fas fa-laptop-code text-blue-400 mr-2"></i> Catálogo de Aplicaciones
                </h4>
                <p className="text-xs text-gray-400">
                  Administra las URLs de despliegue, versiones y asignación de licencias para tus aplicaciones cliente.
                </p>
                <div className="space-y-1.5">
                  {adminData.apps.slice(0, 2).map(app => (
                    <div key={app.id} className="p-2 rounded-lg bg-brand-dark/60 text-xs flex justify-between items-center border border-gray-800/80">
                      <span className="font-semibold text-white">{app.name}</span>
                      <span className="text-[10px] text-cyan-400">{app.url}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setActiveTab('apps')}
                  className="w-full py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/40 rounded-xl text-xs font-semibold transition"
                >
                  <i className="fas fa-plus-circle mr-1.5"></i> Administrar Aplicaciones
                </button>
              </div>

            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* PESTAÑA 2: GESTIÓN DE APLICACIONES (APPS)                              */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'apps' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-800">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center">
                  <i className="fas fa-cubes text-emerald-400 mr-2.5"></i> Catálogo de Aplicaciones
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Registra nuevas aplicaciones, actualiza URLs de acceso y gestiona el software protegido de FEStudio.
                </p>
              </div>
              <button
                onClick={handleOpenCreateApp}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-bold rounded-xl text-xs transition shadow-lg flex items-center"
              >
                <i className="fas fa-plus mr-1.5"></i> Nueva Aplicación
              </button>
            </div>

            {/* Listado de Apps */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {adminData.apps.length > 0 ? (
                adminData.apps.map(app => {
                  const licCount = adminData.licenses.filter(l => l.app_id === app.id).length;
                  return (
                    <div key={app.id} className="glass-card rounded-2xl p-6 border border-gray-800 hover:border-cyan-500/40 transition flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="text-base font-bold text-white flex items-center">
                            <i className="fas fa-cube text-cyan-400 mr-2"></i> {app.name}
                          </h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-800 text-gray-300 font-mono">
                            {licCount} Licencias
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                          {app.description || 'Sin descripción detallada registrada.'}
                        </p>
                        <a 
                          href={app.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-xs text-cyan-400 hover:underline mt-3"
                        >
                          <i className="fas fa-external-link-alt mr-1 text-[10px]"></i> {app.url}
                        </a>
                      </div>

                      <div className="pt-4 border-t border-gray-800 flex justify-between items-center text-xs">
                        <button
                          onClick={() => handleOpenEditApp(app)}
                          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold transition"
                        >
                          <i className="fas fa-edit mr-1 text-cyan-400"></i> Editar
                        </button>
                        <button
                          onClick={() => handleDeleteApp(app.id, app.name)}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-semibold transition border border-red-500/20"
                        >
                          <i className="fas fa-trash-alt mr-1"></i> Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full glass-card p-12 text-center rounded-2xl border border-gray-800 text-gray-400">
                  <i className="fas fa-box-open text-4xl mb-3 text-gray-600"></i>
                  <p className="text-sm">No hay aplicaciones registradas en la base de datos.</p>
                  <button onClick={handleOpenCreateApp} className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold">
                    Crear primera App
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* PESTAÑA 3: GESTIÓN DE LICENCIAS                                       */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'licenses' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-800">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center">
                  <i className="fas fa-id-card text-cyan-400 mr-2.5"></i> Gestión Global de Licencias
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Control de vigencias, renovaciones anuales y estado de acceso de cada cliente al software FEStudio.
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowLicenseModal(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-bold rounded-xl text-xs transition shadow-lg flex items-center"
                >
                  <i className="fas fa-plus mr-1.5"></i> Asignar Licencia Manual
                </button>
              </div>
            </div>

            {/* Tabla de Licencias */}
            <div className="glass-card rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-gray-800/60 text-gray-400 uppercase font-semibold text-[11px] tracking-wider border-b border-gray-700/80">
                    <tr>
                      <th className="p-4">Aplicación</th>
                      <th className="p-4">Cliente / Email</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4">Vencimiento</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {adminData.licenses.length > 0 ? (
                      adminData.licenses.map(lic => {
                        const isActive = lic.status === 'active';
                        const expDate = lic.expires_at ? new Date(lic.expires_at) : null;
                        const formattedExp = expDate ? expDate.toLocaleDateString('es-AR') : 'Vigencia Anual';
                        return (
                          <tr key={lic.id} className="hover:bg-gray-800/30 transition">
                            <td className="p-4">
                              <span className="font-bold text-white flex items-center">
                                <i className="fas fa-cube text-cyan-400 mr-2"></i>
                                {lic.apps?.name || 'Aplicación'}
                              </span>
                              <span className="text-[10px] text-gray-500 font-mono">ID: {lic.id.slice(0, 8)}...</span>
                            </td>
                            <td className="p-4">
                              <p className="font-medium text-gray-200">{lic.profiles?.email || 'Cliente registrado'}</p>
                              <span className="text-[10px] text-gray-500">ID Usuario: {lic.user_id.slice(0, 8)}...</span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider inline-flex items-center ${
                                isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isActive ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                                {isActive ? 'Activa' : 'Suspendida'}
                              </span>
                            </td>
                            <td className="p-4">
                              <p className="text-gray-200 font-medium">{formattedExp}</p>
                              <span className="text-[10px] text-gray-500">
                                Asignada: {new Date(lic.created_at).toLocaleDateString('es-AR')}
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-2">
                              <button
                                onClick={() => handleToggleLicenseStatus(lic.id, lic.status)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border ${
                                  isActive
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                }`}
                                title={isActive ? 'Suspender temporalmente' : 'Activar licencia'}
                              >
                                {isActive ? 'Suspender' : 'Activar'}
                              </button>
                              <button
                                onClick={() => handleRenewLicense(lic.id)}
                                className="px-2.5 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 text-[11px] font-semibold transition"
                                title="Extender vencimiento por 1 año"
                              >
                                <i className="fas fa-redo-alt mr-1"></i> Renovar (+1 año)
                              </button>
                              <button
                                onClick={() => handleDeleteLicense(lic.id)}
                                className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 text-[11px] transition"
                                title="Revocar definitivamente"
                              >
                                <i className="fas fa-trash-alt"></i>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-gray-500 italic">
                          No se encontraron licencias asignadas en la plataforma.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* PESTAÑA 4: GENERADOR CRIPTOGRÁFICO DE CLAVES DE LICENCIA              */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'generator' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="pb-6 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white flex items-center">
                <i className="fas fa-key text-emerald-400 mr-2.5"></i> Generador de Código & Certificados de Licencia
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Generador de claves seriales para aplicaciones de escritorio, web o servidores con firma SHA-256 integrada.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Formulario Generador */}
              <div className="lg:col-span-6 glass-card rounded-2xl p-6 border border-gray-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center">
                  <i className="fas fa-sliders-h text-cyan-400 mr-2"></i> Parámetros de la Licencia
                </h3>

                <form onSubmit={handleGenerateLicenseKey} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Aplicación Destino</label>
                    <select
                      value={generatorForm.app_name}
                      onChange={e => setGeneratorForm({ ...generatorForm, app_name: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 transition"
                    >
                      {adminData.apps.length > 0 ? (
                        adminData.apps.map(a => (
                          <option key={a.id} value={a.name}>{a.name}</option>
                        ))
                      ) : (
                        <>
                          <option value="FEStudio CRM">FEStudio CRM</option>
                          <option value="FEStudio ERP">FEStudio ERP</option>
                          <option value="FEStudio Core">FEStudio Core</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">Tipo de Licencia</label>
                      <select
                        value={generatorForm.license_type}
                        onChange={e => setGeneratorForm({ ...generatorForm, license_type: e.target.value })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 transition"
                      >
                        <option value="DEMO">Demo / Trial (15 días)</option>
                        <option value="ANUAL">Comercial Anual (365 días)</option>
                        <option value="ENTERPRISE">Enterprise Perpetua (10 años)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">Puestos / Activaciones</label>
                      <select
                        value={generatorForm.seats}
                        onChange={e => setGeneratorForm({ ...generatorForm, seats: Number(e.target.value) })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 transition"
                      >
                        <option value="1">1 Puesto (Monousuario)</option>
                        <option value="5">5 Puestos (PyME)</option>
                        <option value="25">25 Puestos (Corporativo)</option>
                        <option value="-1">Ilimitado (Multi-tenant)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Email del Cliente (Opcional)</label>
                    <input
                      type="email"
                      placeholder="cliente@empresa.com"
                      value={generatorForm.client_email}
                      onChange={e => setGeneratorForm({ ...generatorForm, client_email: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isGeneratingKey}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-bold rounded-xl transition shadow-lg glow-effect flex items-center justify-center space-x-2 disabled:opacity-50 text-sm mt-4"
                  >
                    <i className="fas fa-fingerprint"></i>
                    <span>{isGeneratingKey ? 'Generando Clave Criptográfica...' : 'Generar y Firmar Clave'}</span>
                  </button>
                </form>
              </div>

              {/* Resultado de la Licencia Generada */}
              <div className="lg:col-span-6 space-y-4">
                {generatedLicense ? (
                  <div className="glass-card rounded-2xl p-6 border border-emerald-500/40 glow-effect space-y-4 animate-fadeIn">
                    <div className="flex justify-between items-center pb-3 border-b border-gray-800">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center">
                        <i className="fas fa-certificate mr-1.5"></i> Certificado de Licencia Válido
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {generatedLicense.signature_algorithm}
                      </span>
                    </div>

                    <div>
                      <p className="text-[11px] text-gray-400 mb-1 font-semibold">SERIAL KEY:</p>
                      <div className="p-3.5 bg-black/60 rounded-xl border border-emerald-500/30 font-mono text-emerald-300 text-sm font-bold tracking-wide break-all flex justify-between items-center">
                        <span>{generatedLicense.key}</span>
                        <button
                          onClick={() => handleCopyKey(generatedLicense.key)}
                          className="ml-2 p-2 bg-emerald-500/20 hover:bg-emerald-500/40 rounded-lg text-emerald-300 transition text-xs"
                          title="Copiar clave"
                        >
                          <i className={`fas ${copiedKey ? 'fa-check' : 'fa-copy'}`}></i>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs bg-brand-dark/60 p-4 rounded-xl border border-gray-800">
                      <div>
                        <span className="text-gray-500 block text-[10px]">APLICACIÓN:</span>
                        <span className="text-white font-semibold">{generatedLicense.app_name}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">TIPO:</span>
                        <span className="text-cyan-400 font-semibold">{generatedLicense.license_type}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">VIGENCIA:</span>
                        <span className="text-gray-300">{generatedLicense.expires_at} ({generatedLicense.duration_days} días)</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">CHECKSUM SHA-256:</span>
                        <span className="text-amber-400 font-mono text-[11px]">{generatedLicense.checksum}</span>
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-2">
                      <button
                        onClick={() => handleDownloadLicenseJson(generatedLicense)}
                        className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl text-xs font-semibold transition border border-gray-700 flex items-center justify-center space-x-1.5"
                      >
                        <i className="fas fa-file-download text-cyan-400"></i>
                        <span>Descargar Licencia (.json)</span>
                      </button>
                      <button
                        onClick={() => handleCopyKey(generatedLicense.key)}
                        className="flex-1 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-xs font-semibold transition border border-emerald-500/30 flex items-center justify-center space-x-1.5"
                      >
                        <i className="fas fa-clipboard-check"></i>
                        <span>{copiedKey ? '¡Copiado!' : 'Copiar Serial'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="glass-card rounded-2xl p-12 border border-gray-800 text-center text-gray-500 flex flex-col items-center justify-center h-full min-h-[300px]">
                    <i className="fas fa-shield-alt text-5xl mb-3 text-gray-700"></i>
                    <p className="text-xs text-gray-400 max-w-sm">
                      Configura los parámetros a la izquierda y presiona "Generar y Firmar Clave" para obtener el serial de software con checksum.
                    </p>
                  </div>
                )}

                {/* Historial de claves en la sesión */}
                {generatedHistory.length > 0 && (
                  <div className="glass-card rounded-2xl p-4 border border-gray-800 space-y-2">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center">
                      <i className="fas fa-history mr-1.5 text-cyan-400"></i> Claves Generadas Recientemente ({generatedHistory.length})
                    </h4>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {generatedHistory.map((h, i) => (
                        <div key={i} className="p-2 rounded-lg bg-brand-dark/80 text-[11px] font-mono flex justify-between items-center border border-gray-800/80">
                          <span className="text-gray-300 truncate max-w-xs">{h.key}</span>
                          <button onClick={() => handleCopyKey(h.key)} className="text-emerald-400 hover:text-emerald-300 ml-2">
                            <i className="fas fa-copy"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* PESTAÑA 5: FACTURADOR WEB SERVICE ARCA (EX-AFIP)                      */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'arca' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header del Módulo ARCA */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-800">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center">
                  <i className="fas fa-file-invoice-dollar text-cyan-400 mr-2.5"></i> Facturador Electrónico Web Service ARCA
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Emisión de comprobantes oficiales con solicitud y validación de CAE ante la Agencia de Recaudación y Control Aduanero (ex-AFIP).
                </p>
              </div>

              {/* Selector de Entorno ARCA */}
              <div className="flex items-center space-x-2 bg-gray-900 p-1.5 rounded-xl border border-gray-800">
                <span className="text-[11px] text-gray-400 font-semibold px-2">Modo:</span>
                <button
                  onClick={() => handleToggleArcaEnv('homologacion')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    arcaConfig.environment === 'homologacion'
                      ? 'bg-cyan-500 text-gray-950 shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Homologación (Testing)
                </button>
                <button
                  onClick={() => handleToggleArcaEnv('produccion')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    arcaConfig.environment === 'produccion'
                      ? 'bg-red-500 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Producción Oficial
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Formulario de Emisión ARCA */}
              <div className="lg:col-span-5 glass-card rounded-2xl p-6 border border-gray-800 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-800">
                  <h3 className="text-sm font-bold text-white flex items-center">
                    <i className="fas fa-receipt text-cyan-400 mr-2"></i> Emitir Comprobante WSFE
                  </h3>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Pto. Venta: {String(arcaConfig.punto_venta).padStart(4, '0')}
                  </span>
                </div>

                <form onSubmit={handleEmitInvoice} className="space-y-4 text-xs">
                  
                  {/* Tipo de Factura */}
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Tipo de Factura</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { type: 'A', desc: 'Factura A (001)' },
                        { type: 'B', desc: 'Factura B (006)' },
                        { type: 'C', desc: 'Factura C (011)' }
                      ].map(f => (
                        <button
                          key={f.type}
                          type="button"
                          onClick={() => setInvoiceForm({ ...invoiceForm, invoice_type: f.type })}
                          className={`p-2.5 rounded-xl border text-center transition font-bold ${
                            invoiceForm.invoice_type === f.type
                              ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                              : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'
                          }`}
                        >
                          <div className="text-sm">{f.type}</div>
                          <div className="text-[10px] font-normal text-gray-400">{f.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Receptor */}
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Razón Social del Receptor</label>
                    <input
                      type="text"
                      required
                      placeholder="Empresa Cliente S.A. o Nombre y Apellido"
                      value={invoiceForm.client_name}
                      onChange={e => setInvoiceForm({ ...invoiceForm, client_name: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">CUIT / DNI del Receptor</label>
                    <input
                      type="text"
                      required
                      placeholder="30-71112233-4 o 35489123"
                      value={invoiceForm.client_cuit}
                      onChange={e => setInvoiceForm({ ...invoiceForm, client_cuit: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 transition font-mono"
                    />
                  </div>

                  {/* Concepto y Detalle */}
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Detalle del Servicio o Producto</label>
                    <input
                      type="text"
                      required
                      value={invoiceForm.service_type}
                      onChange={e => setInvoiceForm({ ...invoiceForm, service_type: e.target.value })}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 transition"
                    />
                  </div>

                  {/* Importes */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">Neto Gravado ($ ARS)</label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        required
                        value={invoiceForm.net_amount}
                        onChange={e => setInvoiceForm({ ...invoiceForm, net_amount: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 transition font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">Alícuota IVA</label>
                      <select
                        value={invoiceForm.iva_rate}
                        onChange={e => setInvoiceForm({ ...invoiceForm, iva_rate: parseFloat(e.target.value) })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 transition"
                      >
                        <option value="21">21.0% (General)</option>
                        <option value="10.5">10.5% (Diferencial)</option>
                        <option value="0">0% (Exento)</option>
                      </select>
                    </div>
                  </div>

                  {/* Resumen de cálculo en vivo */}
                  <div className="p-3.5 bg-brand-dark/90 rounded-xl border border-gray-800 space-y-1.5 text-xs">
                    <div className="flex justify-between text-gray-400">
                      <span>Subtotal Neto:</span>
                      <span className="font-mono text-white">${Number(invoiceForm.net_amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>IVA ({invoiceForm.iva_rate}%):</span>
                      <span className="font-mono text-white">${calculatedIva.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-cyan-400 pt-1 border-t border-gray-800">
                      <span>Total Factura:</span>
                      <span className="font-mono">${calculatedTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })} ARS</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isEmittingInvoice}
                    className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl transition shadow-lg glow-cyan flex items-center justify-center space-x-2 disabled:opacity-50 text-sm mt-4"
                  >
                    <i className="fas fa-stamp"></i>
                    <span>{isEmittingInvoice ? 'Solicitando CAE a ARCA...' : 'Emitir Factura y Solicitar CAE'}</span>
                  </button>
                </form>
              </div>

              {/* Historial de Comprobantes Emitidos ARCA */}
              <div className="lg:col-span-7 space-y-4">
                <div className="glass-card rounded-2xl p-6 border border-gray-800 space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-800">
                    <h3 className="text-sm font-bold text-white flex items-center">
                      <i className="fas fa-history text-cyan-400 mr-2"></i> Comprobantes Autorizados ({arcaInvoices.length})
                    </h3>
                    <span className="text-xs text-gray-400">WSFE v1.0</span>
                  </div>

                  <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                    {arcaInvoices.length > 0 ? (
                      <table className="w-full text-left text-xs text-gray-300">
                        <thead className="bg-gray-800/60 text-gray-400 uppercase font-semibold text-[10px] tracking-wider sticky top-0">
                          <tr>
                            <th className="p-3">Comprobante</th>
                            <th className="p-3">Receptor</th>
                            <th className="p-3">CAE / Vto</th>
                            <th className="p-3">Total</th>
                            <th className="p-3 text-right">Ver</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {arcaInvoices.map(inv => (
                            <tr key={inv.id || inv.invoice_number} className="hover:bg-gray-800/30 transition">
                              <td className="p-3">
                                <span className="font-bold text-white font-mono">{inv.invoice_number}</span>
                                <span className="block text-[10px] text-emerald-400">
                                  <i className="fas fa-check-circle mr-1"></i> Autorizado
                                </span>
                              </td>
                              <td className="p-3">
                                <p className="font-medium text-gray-200">{inv.client_name || inv.concept}</p>
                                <span className="text-[10px] text-gray-500 font-mono">{inv.client_cuit || 'Consumidor'}</span>
                              </td>
                              <td className="p-3 font-mono">
                                <p className="text-xs text-cyan-400 font-semibold">{inv.cae || '74391823091048'}</p>
                                <span className="text-[10px] text-gray-500">{inv.cae_due_date || inv.due_date}</span>
                              </td>
                              <td className="p-3 font-mono font-bold text-white">
                                ${Number(inv.amount || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => {
                                    setSelectedInvoice(inv);
                                    setShowInvoiceModal(true);
                                  }}
                                  className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-cyan-400 rounded-lg text-xs font-semibold transition"
                                  title="Ver Comprobante Oficial"
                                >
                                  <i className="fas fa-eye"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="py-12 text-center text-gray-500 italic">
                        No hay facturas emitidas recientemente. Emite la primera con el formulario.
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* PESTAÑA 6: MESA DE AYUDA & LEADS (HELPDESK)                            */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'helpdesk' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="pb-6 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white flex items-center">
                <i className="fas fa-headset text-amber-400 mr-2.5"></i> Mesa de Ayuda & Leads de Contacto
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Atención de tickets técnicos de aplicaciones y seguimiento de solicitudes de presupuesto de la web.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Tickets de Soporte */}
              <div className="glass-card rounded-2xl p-6 border border-gray-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center justify-between">
                  <span className="flex items-center">
                    <i className="fas fa-life-ring text-amber-400 mr-2"></i> Incidencias Técnicas
                  </span>
                  <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-400 font-mono">
                    {adminData.tickets.length} Total
                  </span>
                </h3>

                <div className="overflow-x-auto max-h-[500px] overflow-y-auto space-y-3">
                  {adminData.tickets.length > 0 ? (
                    adminData.tickets.map(t => (
                      <div key={t.id} className="p-4 rounded-xl bg-brand-dark/80 border border-gray-800 space-y-2">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-white text-xs">{t.subject}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            t.status === 'Resuelto'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {t.status || 'Abierto'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-3 whitespace-pre-line">{t.description}</p>
                        <div className="flex justify-between items-center text-[10px] text-gray-500 pt-2 border-t border-gray-800/80">
                          <span>Usuario: <strong className="text-gray-300">{t.profiles?.email || 'Cliente'}</strong></span>
                          <span>{new Date(t.created_at).toLocaleDateString('es-AR')}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500 py-8 text-center italic">No hay tickets de soporte registrados.</p>
                  )}
                </div>
              </div>

              {/* Consultas de Presupuesto / Contacto */}
              <div className="glass-card rounded-2xl p-6 border border-gray-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center justify-between">
                  <span className="flex items-center">
                    <i className="fas fa-envelope text-cyan-400 mr-2"></i> Consultas de la Landing Page
                  </span>
                  <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-400 font-mono">
                    {adminData.queries.length} Mensajes
                  </span>
                </h3>

                <div className="overflow-x-auto max-h-[500px] overflow-y-auto space-y-3">
                  {adminData.queries.length > 0 ? (
                    adminData.queries.map(q => (
                      <div key={q.id} className="p-4 rounded-xl bg-brand-dark/80 border border-gray-800 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-white text-xs">{q.full_name}</p>
                            <a href={`mailto:${q.email}`} className="text-cyan-400 text-[11px] hover:underline">
                              {q.email}
                            </a>
                          </div>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {new Date(q.created_at).toLocaleDateString('es-AR')}
                          </span>
                        </div>
                        <div className="p-2.5 rounded bg-gray-900/60 border border-gray-800 text-xs text-gray-300 italic">
                          "{q.requirements}"
                        </div>
                        <div className="text-right pt-1">
                          <a 
                            href={`mailto:${q.email}?subject=Respuesta de FEStudio Desarrollos a tu consulta`}
                            className="inline-flex items-center text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                          >
                            <i className="fas fa-reply mr-1"></i> Responder al cliente
                          </a>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500 py-8 text-center italic">No hay consultas de presupuesto pendientes.</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* 3. MODALES INTERACTIVOS                                                   */}
      {/* ========================================================================= */}

      {/* Modal Crear / Editar App */}
      {showAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-card rounded-2xl max-w-lg w-full p-6 border border-gray-700 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-800">
              <h3 className="text-base font-bold text-white flex items-center">
                <i className="fas fa-cube text-emerald-400 mr-2"></i>
                {appFormMode === 'create' ? 'Nueva Aplicación' : 'Editar Aplicación'}
              </h3>
              <button onClick={() => setShowAppModal(false)} className="text-gray-400 hover:text-white">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSaveApp} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Nombre de la Aplicación</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: FEStudio CRM"
                  value={appFormData.name}
                  onChange={e => setAppFormData({ ...appFormData, name: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">URL de Producción o Acceso</label>
                <input
                  type="url"
                  required
                  placeholder="https://crm.festudio.dev"
                  value={appFormData.url}
                  onChange={e => setAppFormData({ ...appFormData, url: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Descripción</label>
                <textarea
                  rows="3"
                  placeholder="Describe las funcionalidades y alcance de esta aplicación..."
                  value={appFormData.description}
                  onChange={e => setAppFormData({ ...appFormData, description: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 transition"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAppModal(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-xl transition shadow-lg"
                >
                  {appFormMode === 'create' ? 'Guardar Aplicación' : 'Actualizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Asignar Licencia Manual */}
      {showLicenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-card rounded-2xl max-w-md w-full p-6 border border-gray-700 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-gray-800">
              <h3 className="text-base font-bold text-white flex items-center">
                <i className="fas fa-id-card text-cyan-400 mr-2"></i> Asignar Licencia
              </h3>
              <button onClick={() => setShowLicenseModal(false)} className="text-gray-400 hover:text-white">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleCreateLicense} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Cliente Receptor</label>
                <select
                  required
                  value={newLicenseData.user_id}
                  onChange={e => setNewLicenseData({ ...newLicenseData, user_id: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 transition"
                >
                  <option value="">Selecciona un cliente registrado...</option>
                  {adminData.clients.map(c => (
                    <option key={c.id} value={c.id}>{c.email} (ID: {c.id.slice(0, 6)}...)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Aplicación</label>
                <select
                  required
                  value={newLicenseData.app_id}
                  onChange={e => setNewLicenseData({ ...newLicenseData, app_id: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 transition"
                >
                  <option value="">Selecciona la aplicación...</option>
                  {adminData.apps.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Estado Inicial</label>
                <select
                  value={newLicenseData.status}
                  onChange={e => setNewLicenseData({ ...newLicenseData, status: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 transition"
                >
                  <option value="active">Activa</option>
                  <option value="inactive">Inactiva</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowLicenseModal(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-xl transition shadow-lg"
                >
                  Asignar Licencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Visualizador de Comprobante Oficial ARCA (con CAE y QR) */}
      {showInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-white text-gray-900 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 border-4 border-gray-200">
            
            {/* Encabezado Factura Oficial */}
            <div className="border-b-2 border-gray-900 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-gray-900">FEStudio Desarrollos S.A.</h2>
                  <p className="text-xs text-gray-600 mt-1">Av. Colón 1234, Centro, Córdoba, Argentina</p>
                  <p className="text-xs text-gray-600">IVA Responsable Inscripto | CUIT: 30-71112233-4</p>
                  <p className="text-xs text-gray-600">Inicio de Actividades: 01/03/2021</p>
                </div>

                {/* Letra del Comprobante (A / B / C) */}
                <div className="text-center border-2 border-gray-900 rounded px-4 py-2 bg-gray-50">
                  <span className="text-3xl font-black block">{selectedInvoice.invoice_type || 'A'}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider block text-gray-700">
                    COD. {selectedInvoice.cbte_tipo_code || '001'}
                  </span>
                </div>

                <div className="text-right">
                  <h3 className="text-base font-extrabold uppercase">FACTURA</h3>
                  <p className="font-mono text-base font-black text-gray-900">{selectedInvoice.invoice_number}</p>
                  <p className="text-xs text-gray-600 mt-1">Fecha: <strong>{selectedInvoice.issue_date}</strong></p>
                  <p className="text-xs text-gray-600">Pto. Venta: <strong>0001</strong></p>
                </div>
              </div>
            </div>

            {/* Datos del Receptor */}
            <div className="bg-gray-100 p-4 rounded-xl text-xs space-y-1.5 border border-gray-300">
              <div className="flex justify-between">
                <span><strong>Receptor:</strong> {selectedInvoice.client_name || 'Cliente FEStudio'}</span>
                <span><strong>CUIT/DNI:</strong> {selectedInvoice.client_cuit || '30-71987654-2'}</span>
              </div>
              <div className="flex justify-between">
                <span><strong>Condición IVA:</strong> IVA Responsable Inscripto / Consumidor</span>
                <span><strong>Condición de Venta:</strong> Contado / Transferencia</span>
              </div>
            </div>

            {/* Detalle de Conceptos */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-200 text-gray-700 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-2.5">Descripción del Servicio</th>
                    <th className="p-2.5 text-center">Alíc. IVA</th>
                    <th className="p-2.5 text-right">Subtotal Neto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="p-3">
                      <p className="font-bold text-gray-900">{selectedInvoice.service_type || selectedInvoice.concept}</p>
                      <span className="text-[11px] text-gray-500">Período de Facturación Anual</span>
                    </td>
                    <td className="p-3 text-center">{selectedInvoice.iva_rate || 21}%</td>
                    <td className="p-3 text-right font-mono font-bold">
                      ${Number(selectedInvoice.net_amount || (selectedInvoice.amount / 1.21)).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totales */}
            <div className="flex justify-end pt-3 border-t border-gray-300">
              <div className="w-64 space-y-1.5 text-xs text-right">
                <div className="flex justify-between text-gray-600">
                  <span>Importe Neto No Gravado:</span>
                  <span className="font-mono">$0.00</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Importe Neto Gravado:</span>
                  <span className="font-mono">${Number(selectedInvoice.net_amount || (selectedInvoice.amount / 1.21)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>IVA ({selectedInvoice.iva_rate || 21}%):</span>
                  <span className="font-mono">${Number(selectedInvoice.iva_amount || (selectedInvoice.amount - (selectedInvoice.amount / 1.21))).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t-2 border-gray-900">
                  <span>Importe Total:</span>
                  <span className="font-mono">${Number(selectedInvoice.amount).toFixed(2)} ARS</span>
                </div>
              </div>
            </div>

            {/* SECCIÓN ARCA OFICIAL: CAE, CÓDIGO DE BARRAS Y QR */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-300 text-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-gray-900">CAE N°:</span>
                  <span className="font-mono font-black text-sm text-gray-900">{selectedInvoice.cae}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600 font-semibold">Fecha de Vto. de CAE:</span>
                  <span className="font-mono font-bold">{selectedInvoice.cae_due_date || '15/10/2026'}</span>
                </div>
                {selectedInvoice.barcode && (
                  <div className="pt-2">
                    <span className="text-[10px] text-gray-500 block">Código de Barras ARCA (42 dígitos):</span>
                    <span className="font-mono text-[10px] tracking-widest text-gray-700 bg-white p-1 rounded border block overflow-x-auto">
                      {selectedInvoice.barcode}
                    </span>
                  </div>
                )}
              </div>

              {/* QR ARCA Oficial */}
              {selectedInvoice.qr_url && (
                <div className="text-center p-2 bg-white rounded-lg border border-gray-300">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(selectedInvoice.qr_url)}`}
                    alt="QR ARCA"
                    className="w-20 h-20 mx-auto"
                  />
                  <span className="text-[9px] font-bold text-gray-600 block mt-1">ARCA OFICIAL</span>
                </div>
              )}
            </div>

            {/* Botones de acción modal */}
            <div className="flex justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-bold transition flex items-center"
              >
                <i className="fas fa-print mr-1.5"></i> Imprimir / Guardar PDF
              </button>
              <button
                type="button"
                onClick={() => setShowInvoiceModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold transition"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. FOOTER                                                                 */}
      {/* ========================================================================= */}
      <footer className="bg-brand-dark border-t border-gray-800/80 py-6 text-center text-xs text-gray-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <span>&copy; 2026 <strong>FEStudio Desarrollos</strong>. Panel Superusuario Blindado.</span>
          <div className="flex space-x-4">
            <Link to="/" className="text-gray-400 hover:text-emerald-400 transition">Sitio Web</Link>
            <Link to="/dashboard/client" className="text-gray-400 hover:text-cyan-400 transition">Vista Portal Cliente</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}