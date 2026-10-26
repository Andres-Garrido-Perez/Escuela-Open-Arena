import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Lock, TrendingUp, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';

export const CloseMonthModal = ({
  isOpen,
  onClose,
  monthYear,
  formattedMonth,
  coachesBreakdown = [],
  totalRecaudado = 0,
  totalCosteMonitores = 0,
  totalBeneficioEscuela = 0,
  isAlreadyClosed = false,
  hasPendingChanges = false,
  onConfirmClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError('');
      await onConfirmClose();
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message || 'Error al guardar el cierre mensual.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        !isAlreadyClosed
          ? 'Cerrar Mes y Guardar Histórico'
          : hasPendingChanges
          ? 'Actualizar Cierre de Mes'
          : 'Mes Ya Cerrado'
      }
      subtitle={
        !isAlreadyClosed
          ? `Congelar beneficios para ${formattedMonth} (${monthYear})`
          : hasPendingChanges
          ? `Se detectaron cambios en ${formattedMonth}. Pulsa para actualizar el histórico congelado.`
          : `El histórico de ${formattedMonth} está al día con los datos actuales.`
      }
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="py-6 text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-800">
              ¡Cierre Guardado con Éxito!
            </h3>
            <p className="text-xs text-slate-500">
              Los beneficios de {formattedMonth} han quedado congelados en el histórico.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Recaudación Bruta Alumnos:</span>
                <span className="font-bold text-slate-800">{totalRecaudado.toFixed(2)} €</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Nómina Total Monitores:</span>
                <span className="font-bold text-slate-700">-{totalCosteMonitores.toFixed(2)} €</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-black text-sm">
                <span className="text-slate-900">Beneficio Neto Escuela:</span>
                <span
                  className={totalBeneficioEscuela >= 0 ? 'text-emerald-700' : 'text-rose-600'}
                >
                  {totalBeneficioEscuela >= 0 ? '+' : ''}
                  {totalBeneficioEscuela.toFixed(2)} €
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 space-y-1.5 bg-amber-50/80 border border-amber-200/80 p-3 rounded-xl">
              <div className="flex items-start gap-1.5 text-amber-900 font-bold">
                <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>¿Qué ocurre al cerrar el mes?</span>
              </div>
              <p className="m-0 text-amber-800 leading-relaxed">
                Se guardará una instantánea con el desglose exacto de {coachesBreakdown.length} monitores en la tabla oficial de cierres (<code className="font-bold text-amber-900">monthly_closures</code>). Podrás consultarlo siempre en el Histórico de Beneficios aunque cambien los alumnos o tarifas en el futuro.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="secondary" onClick={onClose} disabled={loading} size="sm">
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirm}
                loading={loading}
                icon={Lock}
                size="sm"
                className="bg-slate-900 hover:bg-slate-800 text-white"
              >
                {!isAlreadyClosed
                  ? 'Confirmar y Congelar'
                  : hasPendingChanges
                  ? 'Actualizar Cierre'
                  : 'Volver a Guardar'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
