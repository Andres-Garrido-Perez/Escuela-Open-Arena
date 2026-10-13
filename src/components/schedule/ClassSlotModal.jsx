import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useSchool } from '../../context/SchoolContext';

const DAYS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

export const ClassSlotModal = ({
  isOpen,
  onClose,
  slotToEdit = null,
  initialDay = 1,
  coaches = [],
  tariffs = [],
  onSave,
}) => {
  const { sport, activeCoachId } = useSchool();

  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [coachId, setCoachId] = useState('');
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('17:00');
  const [courtName, setCourtName] = useState('Pista 1');
  const [levelLabel, setLevelLabel] = useState('Iniciación');
  const [categoryName, setCategoryName] = useState('Adultos');
  const [tariffId, setTariffId] = useState('');
  const [maxCapacity, setMaxCapacity] = useState(4);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (slotToEdit) {
      setDayOfWeek(Number(slotToEdit.day_of_week) || 1);
      setCoachId(slotToEdit.coach_id || '');
      setStartTime((slotToEdit.start_time || '16:00').slice(0, 5));
      setEndTime((slotToEdit.end_time || '17:00').slice(0, 5));
      setCourtName(slotToEdit.court_name || '');
      setLevelLabel(slotToEdit.level_label || '');
      setCategoryName(slotToEdit.category_name || '');
      setTariffId(slotToEdit.tariff_id || '');
      setMaxCapacity(Number(slotToEdit.max_capacity) || 4);
      setNotes(slotToEdit.notes || '');
    } else {
      setDayOfWeek(Number(initialDay) || 1);
      setCoachId(
        activeCoachId && activeCoachId !== 'all'
          ? activeCoachId
          : coaches[0]?.id || ''
      );
      setStartTime('16:00');
      setEndTime('17:00');
      setCourtName('Pista 1');
      setLevelLabel('Iniciación');
      setCategoryName('Adultos');
      setTariffId('');
      setMaxCapacity(4);
      setNotes('');
    }
    setError('');
  }, [slotToEdit, initialDay, activeCoachId, coaches, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startTime || !endTime) {
      setError('Debes especificar horario de inicio y fin.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onSave({
        day_of_week: Number(dayOfWeek),
        coach_id: coachId || null,
        sport: sport || 'tenis',
        start_time: startTime,
        end_time: endTime,
        court_name: courtName.trim() || null,
        level_label: levelLabel.trim() || null,
        category_name: categoryName.trim() || null,
        tariff_id: tariffId || null,
        max_capacity: Number(maxCapacity) || 4,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Error guardando clase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={slotToEdit ? 'Editar Bloque de Clase' : 'Crear Nueva Clase'}
      subtitle={`Configuración del horario y pista para ${sport === 'tenis' ? 'Tenis' : 'Pádel'}`}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Día y Monitor */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Día de la Semana
            </label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30 cursor-pointer"
            >
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Monitor Asignado
            </label>
            <select
              value={coachId}
              onChange={(e) => setCoachId(e.target.value)}
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30 cursor-pointer"
            >
              <option value="">Sin monitor asignado</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Horas Inicio y Fin */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Hora Inicio
            </label>
            <input
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Hora Fin
            </label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30"
            />
          </div>
        </div>

        {/* Pista y Capacidad Máxima */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Pista
            </label>
            <input
              type="text"
              value={courtName}
              onChange={(e) => setCourtName(e.target.value)}
              placeholder="Ej. Pista 1, Central..."
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Capacidad Máxima (Plazas)
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(e.target.value)}
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30"
            />
          </div>
        </div>

        {/* Nivel y Categoría */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nivel
            </label>
            <input
              type="text"
              value={levelLabel}
              onChange={(e) => setLevelLabel(e.target.value)}
              placeholder="Iniciación, Competición..."
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Categoría
            </label>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Adultos, Menores..."
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30"
            />
          </div>
        </div>

        {/* Tarifa vinculada opcional */}
        {tariffs.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tarifa Asociada (Opcional)
            </label>
            <select
              value={tariffId}
              onChange={(e) => setTariffId(e.target.value)}
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30 cursor-pointer"
            >
              <option value="">Sin tarifa fija</option>
              {tariffs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code} - {t.category_name} ({t.price_non_member}€/mes)
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Notas de la clase (Opcional)
          </label>
          <textarea
            rows="2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observaciones sobre esta pista o grupo..."
            className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {slotToEdit ? 'Actualizar Clase' : 'Crear Clase'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
