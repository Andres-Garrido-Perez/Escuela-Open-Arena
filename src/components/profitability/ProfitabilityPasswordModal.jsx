import React, { useState, useEffect, useRef } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';

export const ProfitabilityPasswordModal = () => {
  const {
    isProfitabilityModalOpen,
    closeProfitabilityModal,
    unlockProfitability,
  } = useSchool();

  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // Reset state and focus input when modal opens
  useEffect(() => {
    if (isProfitabilityModalOpen) {
      setPin('');
      setError('');
      setShowPassword(false);
      setLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isProfitabilityModalOpen]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!pin.trim() || loading) return;

    setLoading(true);
    setError('');

    try {
      const result = await unlockProfitability(pin);
      if (!result.success) {
        setError(result.error || 'Contraseña incorrecta');
        setPin('');
        inputRef.current?.focus();
      }
    } catch (err) {
      setError('Error al validar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isProfitabilityModalOpen}
      onClose={closeProfitabilityModal}
      maxWidth="max-w-md"
    >
      <div className="text-center pt-2 pb-1">
        {/* Security Badge Icon */}
        <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-sky-100 rounded-2xl mx-auto flex items-center justify-center border border-blue-200/60 shadow-xs mb-3 text-[#0055A5]">
          <ShieldCheck className="w-7 h-7" />
        </div>

        <h3 className="text-lg font-black text-slate-900 tracking-tight">
          Acceso a Vista Rentabilidad
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
          Introduce la clave de seguridad para visualizar nóminas de profesores, facturación y márgenes del club.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 text-left">
          <div className="space-y-1.5">
            <label
              htmlFor="profitability-pin"
              className="text-xs font-bold text-slate-700 flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Contraseña de Seguridad</span>
            </label>

            <div className="relative">
              <input
                ref={inputRef}
                id="profitability-pin"
                type={showPassword ? 'text' : 'password'}
                inputMode="numeric"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Escribe la clave..."
                className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 pr-11 text-sm font-semibold tracking-wider text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                  error
                    ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/30'
                    : 'border-slate-200 focus:ring-blue-100 focus:border-[#0055A5]'
                }`}
                autoComplete="off"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-2.5 flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200/80 px-3 py-2 rounded-xl animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={closeProfitabilityModal}
              disabled={loading}
              className="text-xs font-bold"
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              disabled={!pin.trim() || loading}
              className="text-xs font-bold shadow-xs"
              icon={Lock}
            >
              Desbloquear Datos
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
