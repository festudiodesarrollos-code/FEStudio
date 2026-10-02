import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  // Modos posibles: 'login' | 'register' | 'forgot_password' | 'update_password'
  const [authMode, setAuthMode] = useState('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Escuchar si el usuario llega mediante un enlace de recuperación de contraseña
  useEffect(() => {
    // 1. Escuchar evento de Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('update_password');
        setErrorMessage('');
        setSuccessMessage('Has accedido mediante un enlace de recuperación. Ingresa tu nueva contraseña a continuación.');
      }
    });

    // 2. Verificar parámetros en la URL (hash o query)
    const hash = window.location.hash;
    const search = window.location.search;
    if (hash.includes('type=recovery') || search.includes('type=recovery')) {
      setAuthMode('update_password');
    }

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Manejar Inicio de Sesión o Registro
  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      if (authMode === 'register') {
        // --- FLUJO DE REGISTRO ---
        if (password.length < 6) {
          setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
          setIsLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setErrorMessage('Las contraseñas no coinciden.');
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password
        });

        if (error) {
          setErrorMessage(
            error.message === 'User already registered'
              ? 'Este correo electrónico ya está registrado. Intenta iniciar sesión o recuperar tu contraseña.'
              : error.message
          );
          return;
        }

        // Crear perfil de cliente en la tabla profiles
        if (data?.user) {
          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              email: data.user.email,
              is_superuser: false
            });
          } catch (profileErr) {
            console.error('Error al inicializar perfil:', profileErr);
          }
        }

        if (data?.session) {
          navigate('/dashboard');
        } else {
          setSuccessMessage('¡Cuenta creada exitosamente! Puedes iniciar sesión a continuación.');
          setAuthMode('login');
          setPassword('');
          setConfirmPassword('');
        }

      } else {
        // --- FLUJO DE INICIO DE SESIÓN ---
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password
        });

        if (error) {
          setErrorMessage(
            error.message === 'Invalid login credentials'
              ? 'Credenciales incorrectas. Verifica tu email y contraseña.'
              : error.message
          );
        } else {
          navigate('/dashboard');
        }
      }
    } catch {
      setErrorMessage('Error al conectar con el servidor de autenticación.');
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar Solicitud de Recuperación de Contraseña
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Ingresa tu correo electrónico registrado.');
      setIsLoading(false);
      return;
    }

    try {
      const redirectUrl = `${window.location.origin}/login?type=recovery`;
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl
      });

      if (error) {
        setErrorMessage(error.message || 'No se pudo enviar el correo de recuperación.');
      } else {
        setSuccessMessage(
          `¡Enlace de recuperación enviado a ${cleanEmail}! Revisa tu bandeja de entrada o carpeta de spam y sigue el enlace para restablecer tu contraseña.`
        );
      }
    } catch {
      setErrorMessage('Error de conexión al solicitar la recuperación de contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar Guardado de la Nueva Contraseña (cuando llega desde el enlace de email)
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    if (newPassword.length < 6) {
      setErrorMessage('La nueva contraseña debe tener al menos 6 caracteres.');
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        setErrorMessage(error.message || 'No se pudo actualizar la contraseña. El enlace puede haber expirado.');
      } else {
        setSuccessMessage('¡Tu contraseña ha sido actualizada con éxito! Redirigiendo a tu Dashboard...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch {
      setErrorMessage('Error al actualizar la contraseña en el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-dark text-brand-text relative overflow-hidden px-4 selection:bg-brand-accent selection:text-gray-900">
      {/* Glow de fondo */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-brand-dark to-brand-dark -z-10"></div>

      {/* Brand Header */}
      <Link to="/" className="mb-6 flex items-center space-x-3 group">
        <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-brand-accent p-0.5 group-hover:border-brand-cyan transition duration-300">
          <img 
            src="/assets/logo.png" 
            onError={(e) => { e.currentTarget.src = 'https://placehold.co/100x100/161d2f/10b981?text=FE'; }} 
            alt="FEStudio Logo" 
            className="w-full h-full object-cover rounded-full" 
          />
        </div>
        <div>
          <span className="text-2xl font-extrabold tracking-wider bg-gradient-to-r from-green-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">FEStudio</span>
          <span className="block text-xs font-semibold tracking-widest text-gray-400 -mt-1">desarrollos</span>
        </div>
      </Link>

      {/* Tarjeta de Autenticación Glass-Card */}
      <div className="glass-card p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700/60 relative">
        
        {/* ========================================================================= */}
        {/* CASO 1: FORMULARIO DE INICIO DE SESIÓN O REGISTRO                          */}
        {/* ========================================================================= */}
        {(authMode === 'login' || authMode === 'register') && (
          <div>
            {/* Pestañas para alternar entre Iniciar Sesión y Crear Cuenta */}
            <div className="flex rounded-xl bg-gray-900/80 p-1 border border-gray-800 mb-6">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  authMode === 'login' 
                    ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-white border border-emerald-500/40 shadow' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <i className="fas fa-sign-in-alt mr-1.5"></i> Iniciar Sesión
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                  authMode === 'register' 
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-white border border-cyan-500/40 shadow' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <i className="fas fa-user-plus mr-1.5"></i> Crear Cuenta
              </button>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white">
                {authMode === 'register' ? 'Registro de Cliente' : 'Ingreso al Dashboard'}
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                {authMode === 'register' 
                  ? 'Crea tu cuenta para acceder a tus aplicaciones y licencias' 
                  : 'Accede a tus apps activas, licencias y facturación'}
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center">
                <i className="fas fa-exclamation-circle mr-2 text-base"></i>
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center">
                <i className="fas fa-check-circle mr-2 text-base"></i>
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Correo Electrónico</label>
                <div className="relative">
                  <input 
                    type="email" 
                    placeholder="cliente@tuempresa.com" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 pl-10 text-white text-sm focus:outline-none focus:border-brand-cyan transition" 
                  />
                  <i className="far fa-envelope absolute left-3.5 top-3.5 text-gray-500 text-sm"></i>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-gray-300">Contraseña</label>
                  {authMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('forgot_password');
                        setErrorMessage('');
                        setSuccessMessage('');
                      }}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline transition cursor-pointer"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
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
                {authMode === 'register' && (
                  <span className="text-[10px] text-gray-500 mt-1 block">Mínimo 6 caracteres</span>
                )}
              </div>

              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Confirmar Contraseña</label>
                  <div className="relative">
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 pl-10 text-white text-sm focus:outline-none focus:border-brand-cyan transition" 
                    />
                    <i className="fas fa-shield-alt absolute left-3.5 top-3.5 text-gray-500 text-sm"></i>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-gray-950 font-bold py-3.5 rounded-xl transition glow-effect disabled:opacity-50 text-sm mt-2 shadow-lg"
              >
                {isLoading 
                  ? (authMode === 'register' ? 'Creando Cuenta...' : 'Autenticando...') 
                  : (authMode === 'register' ? 'Registrarme como Cliente' : 'Ingresar al Dashboard')}
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CASO 2: SOLICITUD DE RECUPERACIÓN DE CONTRASEÑA                           */}
        {/* ========================================================================= */}
        {authMode === 'forgot_password' && (
          <div>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xl mx-auto mb-3">
                <i className="fas fa-key"></i>
              </div>
              <h2 className="text-2xl font-bold text-white">Recuperar Contraseña</h2>
              <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                Ingresa tu correo electrónico registrado y te enviaremos un enlace seguro para restablecer el acceso a tu cuenta.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center">
                <i className="fas fa-exclamation-circle mr-2 text-base"></i>
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start">
                <i className="fas fa-paper-plane mr-2 text-base mt-0.5"></i>
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Correo Electrónico Registrado</label>
                <div className="relative">
                  <input 
                    type="email" 
                    placeholder="cliente@tuempresa.com" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 pl-10 text-white text-sm focus:outline-none focus:border-cyan-400 transition" 
                  />
                  <i className="far fa-envelope absolute left-3.5 top-3.5 text-gray-500 text-sm"></i>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold py-3.5 rounded-xl transition glow-effect disabled:opacity-50 text-sm shadow-lg flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i> Enviando Enlace...
                  </>
                ) : (
                  <>
                    <i className="fas fa-envelope mr-2"></i> Enviar Enlace de Recuperación
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="text-xs text-gray-400 hover:text-white transition inline-flex items-center"
                >
                  <i className="fas fa-arrow-left mr-1.5"></i> Volver a Iniciar Sesión
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CASO 3: RESTABLECER NUEVA CONTRASEÑA (LLEGA POR ENLACE DE EMAIL)          */}
        {/* ========================================================================= */}
        {authMode === 'update_password' && (
          <div>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xl mx-auto mb-3">
                <i className="fas fa-lock-open"></i>
              </div>
              <h2 className="text-2xl font-bold text-white">Nueva Contraseña</h2>
              <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                Ingresa tu nueva clave de acceso para asegurar y restablecer tu cuenta.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center">
                <i className="fas fa-exclamation-circle mr-2 text-base"></i>
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center">
                <i className="fas fa-check-circle mr-2 text-base"></i>
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Nueva Contraseña</label>
                <div className="relative">
                  <input 
                    type="password" 
                    placeholder="Mínimo 6 caracteres" 
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 pl-10 text-white text-sm focus:outline-none focus:border-emerald-400 transition" 
                  />
                  <i className="fas fa-lock absolute left-3.5 top-3.5 text-gray-500 text-sm"></i>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Confirmar Nueva Contraseña</label>
                <div className="relative">
                  <input 
                    type="password" 
                    placeholder="Repite la contraseña" 
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 pl-10 text-white text-sm focus:outline-none focus:border-emerald-400 transition" 
                  />
                  <i className="fas fa-shield-alt absolute left-3.5 top-3.5 text-gray-500 text-sm"></i>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-gray-950 font-bold py-3.5 rounded-xl transition glow-effect disabled:opacity-50 text-sm mt-2 shadow-lg"
              >
                {isLoading ? 'Actualizando Contraseña...' : 'Guardar y Acceder'}
              </button>
            </form>
          </div>
        )}

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