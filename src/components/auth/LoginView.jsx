import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Shield, Mail, Lock, ArrowRight, Activity } from 'lucide-react';

export const LoginView = () => {
  const { signIn } = useAuth();
  // Registro comentado temporalmente:
  // const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!email || !password) {
      setErrorMessage('Por favor, introduce tu email y contraseña.');
      return;
    }

    try {
      setLoading(true);
      await signIn(email, password);
    } catch (err) {
      console.error('Error en autenticación:', err);
      setErrorMessage(
        err.message || 'Error al autenticar. Revisa tus credenciales.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#003870] to-[#0055A5] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        {/* Header Branding */}
        <div className="bg-gradient-to-r from-[#0055A5] to-[#0284C7] p-8 text-white text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-[#38BDF8]/20 rounded-full blur-xl pointer-events-none" />

          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 mb-3 shadow-inner">
            <Activity className="w-8 h-8 text-white animate-pulse" />
          </div>

          <h1 className="text-2xl font-black tracking-tight text-white m-0">
            OPENARENA
          </h1>
          <p className="text-sky-100 text-xs font-medium uppercase tracking-widest mt-1">
            Gestión de Escuelas Deportivas
          </p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="text-[11px] bg-white/20 px-2.5 py-0.5 rounded-full font-semibold">
              🎾 Tenis
            </span>
            <span className="text-[11px] bg-white/20 px-2.5 py-0.5 rounded-full font-semibold">
              🏸 Pádel
            </span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-8">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-bold text-slate-800 m-0">
              Acceso de Administrador
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Introduce tus credenciales para acceder al cuadrante
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs leading-relaxed flex items-start gap-2">
              <span className="font-bold shrink-0">⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@openarena.es"
                  required
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30 focus:border-[#0055A5] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30 focus:border-[#0055A5] transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full py-3 mt-2 shadow-md font-semibold text-sm"
              icon={ArrowRight}
            >
              Iniciar Sesión
            </Button>
          </form>

          {/* Opción de registro comentada temporalmente:
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMessage('');
              }}
              className="text-xs text-[#0055A5] hover:text-[#004385] font-semibold underline underline-offset-2 cursor-pointer"
            >
              {isSignUp
                ? '¿Ya tienes cuenta? Inicia sesión aquí'
                : '¿No tienes cuenta? Regístrate aquí'}
            </button>
          </div>
          */}
        </div>


        {/* Footer */}
        <div className="bg-slate-50 px-8 py-3.5 border-t border-slate-100 text-center flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>Aislamiento seguro multi-tenant con Supabase RLS</span>
        </div>
      </div>
    </div>
  );
};
