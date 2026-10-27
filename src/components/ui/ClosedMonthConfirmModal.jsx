import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Lock, AlertTriangle } from 'lucide-react';

export const ClosedMonthConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  monthLabel = '',
  actionName = 'modificar este mes',
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError('');
      if (onConfirm) {
        await onConfirm();
      }
      onClose();
    } catch (err) {
      console.error('Error al permitir modificación en mes cerrado:', err);
      setError(err.message || 'No se pudo realizar la acción.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !loading && onClose()}
      maxWidth="max-w-md"
    >
      <div className="text-center pt-1 pb-1">
        {/* Warning Icon Badge */}
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/90 flex items-center justify-center mx-auto mb-3 shadow-xs">
          <Lock className="w-7 h-7" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-black text-slate-900 tracking-tight">
          Mes Cerrado y Bloqueado
        </h3>

        {/* Badge month */}
        {monthLabel && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <span>🔒</span>
            <span className="capitalize">{monthLabel}</span>
          </div>
        )}

        {/* Description */}
        <div className="mt-3 text-xs text-slate-600 max-w-sm mx-auto leading-relaxed space-y-2">
          <p>
            Este mes ya ha sido <strong className="text-slate-900 font-bold">cerrado oficialmente</strong> y sus datos se encuentran bloqueados para proteger el registro histórico de rentabilidad y facturación.
          </p>
          <p className="bg-amber-50/80 p-2 rounded-xl border border-amber-200/80 text-amber-900 font-medium text-[11px]">
            Has intentado <strong className="font-bold">{actionName}</strong>. Si continúas, se aplicará la modificación sobre este mes cerrado.
          </p>
          <p className="text-slate-500 font-semibold text-[11px]">
            ¿Deseas modificarlo de todos modos?
          </p>
        </div>

        {error && (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2 text-left">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={loading}
            className="cursor-pointer"
          >
            No, Cancelar
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleConfirm}
            loading={loading}
            className="bg-amber-600 hover:bg-amber-700 focus:ring-amber-500/20 text-white font-bold cursor-pointer border-amber-600"
          >
            Sí, Modificar Mes
          </Button>
        </div>
      </div>
    </Modal>
  );
};
