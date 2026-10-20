import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Euro, TrendingUp, AlertCircle } from 'lucide-react';

export const CoachSalaryModal = ({
  isOpen,
  onClose,
  coach,
  onSaveSalary,
}) => {
  const [hourlyCost, setHourlyCost] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (coach) {
      setHourlyCost(
        coach.hourly_cost !== null && coach.hourly_cost !== undefined
          ? String(coach.hourly_cost)
          : ''
      );
    } else {
      setHourlyCost('');
    }
    setError('');
  }, [coach, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!coach) return;

    const parsedRate = hourlyCost === '' ? null : Number(hourlyCost);
    if (parsedRate !== null && (isNaN(parsedRate) || parsedRate < 0)) {
      setError('Introduce un coste por hora válido (número mayor o igual a 0).');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onSaveSalary(coach.id, parsedRate);
      onClose();
    } catch (err) {
      setError(err.message || 'Error actualizando coste por hora');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Editar Sueldo / Coste por Hora`}
      subtitle={`Monitor: ${coach?.name || ''}`}
      maxWidth="max-w-sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 font-bold text-xs"
            style={{ backgroundColor: coach?.color_theme || '#0055A5' }}
          >
            {coach?.name?.charAt(0) || 'M'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-800 truncate m-0">
              {coach?.name}
            </p>
            <p className="text-[11px] text-slate-400 m-0">
              {coach?.sport === 'tenis' ? 'Escuela Tenis' : 'Escuela Pádel'}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Coste por Hora (€ / hora de clase)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.10"
              min="0"
              required
              autoFocus
              value={hourlyCost}
              onChange={(e) => setHourlyCost(e.target.value)}
              placeholder="Ej. 13.30 o 18.00"
              className="w-full pl-8 pr-12 py-2.5 text-base font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30 focus:border-[#0055A5] text-slate-900"
            />
            <Euro className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <span className="text-xs font-semibold text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              € / h
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              El margen neto mensual se recalculará automáticamente al guardar.
            </span>
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose} disabled={loading} size="sm">
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={loading} size="sm">
            Guardar Sueldo
          </Button>
        </div>
      </form>
    </Modal>
  );
};
