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
  const [tariffId, setTariffId] = useState('');
  const [levelLabel, setLevelLabel] = useState('');
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('17:00');
  const [courtName, setCourtName] = useState('');
  const [maxCapacity, setMaxCapacity] = useState(4);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Al elegir tarifa se autocompleta el Nivel y la Capacidad Máxima (según la hoja oficial)
  const handleTariffChange = (id) => {
    setTariffId(id);
    const selected = tariffs.find((t) => String(t.id) === String(id));
    if (selected) {
      setLevelLabel(selected.level_label || selected.category_name || selected.code || '');
      if (selected.max_students) {
        setMaxCapacity(Number(selected.max_students));
      }
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    if (slotToEdit) {
      setDayOfWeek(Number(slotToEdit.day_of_week) || 1);
      setCoachId(slotToEdit.coach_id || '');
      setTariffId(slotToEdit.tariff_id || '');
      setLevelLabel(slotToEdit.level_label || '');
      setStartTime((slotToEdit.start_time || '16:00').slice(0, 5));
      setEndTime((slotToEdit.end_time || '17:00').slice(0, 5));
      setCourtName(slotToEdit.court_name || '');
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
      setCourtName('');
      setNotes('');

      // Preseleccionar primera tarifa oficial disponible y auto-rellenar nivel y plazas
      if (tariffs.length > 0) {
        const first = tariffs[0];
        setTariffId(first.id);
        setLevelLabel(first.level_label || first.category_name || first.code || '');
        setMaxCapacity(Number(first.max_students) || 4);
      } else {
        setTariffId('');
        setLevelLabel('Iniciación');
        setMaxCapacity(4);
      }
    }
    setError('');
  }, [isOpen, slotToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tariffId) {
      setError('Debes seleccionar una tarifa oficial de la escuela.');
      return;
    }
    if (!startTime || !endTime) {
      setError('Debes especificar horario de inicio y fin.');
      return;
    }

    const selectedTariff = tariffs.find((t) => String(t.id) === String(tariffId));
    const finalLevel = levelLabel.trim() || selectedTariff?.level_label || selectedTariff?.category_name || 'General';
    const finalCategory = selectedTariff?.category_name || selectedTariff?.level_label || finalLevel;

    try {
      setLoading(true);
      setError('');
      await onSave({
        day_of_week: Number(dayOfWeek),
        coach_id: coachId || null,
        sport: sport || 'tenis',
        tariff_id: tariffId,
        level_label: finalLevel,
        category_name: finalCategory,
        start_time: startTime,
        end_time: endTime,
        court_name: courtName.trim() || null,
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
      subtitle={`Configuración del horario y tarifa para ${sport === 'tenis' ? 'Tenis' : 'Pádel'}`}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
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

        {/* Tarifa Oficial Obligatoria (Vinculada directamente a la hoja oficial de OpenArena) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-800">
              Tarifa Oficial de la Escuela <span className="text-rose-500">*</span>
            </label>
            <span className="text-[10px] text-[#0055A5] font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              Autocompleta Nivel y Plazas
            </span>
          </div>
          <select
            required
            value={tariffId}
            onChange={(e) => handleTariffChange(e.target.value)}
            className="w-full px-3 py-2.5 text-xs md:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-[#0055A5] focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30 font-medium text-slate-800 cursor-pointer shadow-2xs"
          >
            <option value="" disabled>
              Selecciona una tarifa oficial...
            </option>
            {tariffs.map((t) => (
              <option key={t.id} value={t.id}>
                [{t.code}] {t.category_name || t.level_label} ({t.price_non_member}€/mes · Máx {t.max_students || 4} al.)
              </option>
            ))}
          </select>
        </div>

        {/* Nivel / Nombre de la clase (Auto-rellenado por la tarifa) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Nivel de la Clase <span className="text-[10px] font-normal text-slate-400">(Auto-asignado por tarifa)</span>
          </label>
          <input
            type="text"
            required
            value={levelLabel}
            onChange={(e) => setLevelLabel(e.target.value)}
            placeholder="Pre-Tenis, Promoción, Adultos..."
            className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30"
          />
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

        {/* Pista y Capacidad Máxima (Plazas oficiales de la tarifa) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Pista <span className="text-[10px] font-normal text-slate-400">(Opcional)</span>
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
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30 font-bold text-slate-800"
            />
          </div>
        </div>

        {/* Notas opcionales */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Notas de la clase <span className="text-[10px] font-normal text-slate-400">(Opcional)</span>
          </label>
          <textarea
            rows="2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observaciones sobre esta pista o grupo..."
            className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30"
          />
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {slotToEdit ? 'Guardar Cambios' : 'Crear Clase'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
