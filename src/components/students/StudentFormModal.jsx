import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import { useSchool } from '../../context/SchoolContext';
import { useTariffs } from '../../hooks/useTariffs';
import { useCoaches } from '../../hooks/useCoaches';
import { useSchedule } from '../../hooks/useSchedule';
import { Clock, Calendar, Sparkles } from 'lucide-react';

const DAYS_OF_WEEK = [
  { day: 1, short: 'L', label: 'Lunes' },
  { day: 2, short: 'M', label: 'Martes' },
  { day: 3, short: 'X', label: 'Miércoles' },
  { day: 4, short: 'J', label: 'Jueves' },
  { day: 5, short: 'V', label: 'Viernes' },
  { day: 6, short: 'S', label: 'Sábado' },
];

const TIME_SLOTS = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
  '19:30',
  '20:00',
  '20:30',
  '21:00',
];

const STATUS_OPTIONS = [
  { value: 'activo', label: 'Activo' },
  { value: 'pendiente_aprobacion', label: 'Pendiente de Aprobación (Clase de Prueba)' },
];

export const StudentFormModal = ({
  isOpen,
  onClose,
  studentToEdit = null,
  onSave,
}) => {
  const { sport } = useSchool();
  const { filteredTariffs } = useTariffs();
  const { filteredCoaches } = useCoaches();
  const { autoAssignStudentToSchedule } = useSchedule();

  // ONLY full_name is mandatory!
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [studentSport, setStudentSport] = useState('tenis');
  const [tariffId, setTariffId] = useState('');
  const [isMember, setIsMember] = useState(false);
  const [weeklyHours, setWeeklyHours] = useState('');
  const [status, setStatus] = useState('activo');
  const [notes, setNotes] = useState('');

  // Nueva sección: Horario y Asignación Automática Inteligente
  const [assignedCoachId, setAssignedCoachId] = useState('');
  const [assignedDays, setAssignedDays] = useState([]);
  const [assignedTime, setAssignedTime] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (studentToEdit) {
      setFullName(studentToEdit.full_name || '');
      setPhone(studentToEdit.phone || '');
      setStudentSport(studentToEdit.sport || sport || 'tenis');
      setTariffId(studentToEdit.tariff_id || '');
      setIsMember(Boolean(studentToEdit.is_member));
      setWeeklyHours(
        studentToEdit.weekly_hours_contracted
          ? String(studentToEdit.weekly_hours_contracted)
          : ''
      );
      setStatus(studentToEdit.status || 'activo');
      setNotes(studentToEdit.notes || '');
      setAssignedCoachId('');
      setAssignedDays([]);
      setAssignedTime('');
    } else {
      setFullName('');
      setPhone('');
      setStudentSport(sport || 'tenis');
      setTariffId('');
      setIsMember(false);
      setWeeklyHours('');
      setStatus('activo');
      setNotes('');
      setAssignedCoachId('');
      setAssignedDays([]);
      setAssignedTime('');
    }
    setError('');
  }, [studentToEdit, sport, isOpen]);

  const handleToggleDay = (dayNum) => {
    setAssignedDays((prev) => {
      const exists = prev.includes(dayNum);
      const updated = exists
        ? prev.filter((d) => d !== dayNum)
        : [...prev, dayNum].sort((a, b) => a - b);

      if (updated.length > 0) {
        setWeeklyHours(String(updated.length));
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('El nombre completo es el único campo obligatorio.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const selectedTariff = filteredTariffs.find((t) => t.id === tariffId);

      const savedStudent = await onSave({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        sport: studentSport,
        category_name: selectedTariff?.category_name || selectedTariff?.level_label || 'Adultos',
        tariff_id: tariffId || null,
        tariff_code: selectedTariff?.code || null,
        is_member: isMember,
        weekly_hours_contracted: weeklyHours ? Number(weeklyHours) : (assignedDays.length || null),
        status: status,
        notes: notes.trim() || null,
      });

      // LÓGICA INTELIGENTE DE AUTO-ASIGNACIÓN DE CLASES
      const targetStudentId = savedStudent?.id || studentToEdit?.id;
      if (targetStudentId && assignedDays.length > 0 && assignedTime) {
        await autoAssignStudentToSchedule({
          studentId: targetStudentId,
          coachId: assignedCoachId || null,
          daysOfWeek: assignedDays,
          startTime: assignedTime,
          tariffId: tariffId || null,
          levelLabel: selectedTariff?.level_label || selectedTariff?.category_name || 'General',
          sport: studentSport,
          maxCapacity: selectedTariff?.max_students || 4,
        });
      }

      onClose();
    } catch (err) {
      setError(err.message || 'Error guardando alumno');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={studentToEdit ? 'Editar Alumno' : 'Nuevo Alumno'}
      subtitle="Creación rápida y auto-asignación inteligente de clases."
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        {/* ÚNICO CAMPO OBLIGATORIO: full_name */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Nombre Completo * <span className="text-[11px] font-normal text-slate-400">(Obligatorio)</span>
          </label>
          <input
            type="text"
            required
            autoFocus
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ej. Carlos Alcaraz, María Pérez..."
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30 focus:border-[#0055A5]"
          />
        </div>

        {/* Teléfono y Deporte */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Teléfono / WhatsApp <span className="text-[10px] font-normal text-slate-400">(Opcional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="600 000 000"
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Deporte
            </label>
            <select
              value={studentSport}
              onChange={(e) => setStudentSport(e.target.value)}
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30 cursor-pointer"
            >
              <option value="tenis">Tenis</option>
              <option value="padel">Pádel</option>
            </select>
          </div>
        </div>

        {/* Tarifa Oficial y Horas */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tarifa / Nivel <span className="text-[10px] font-normal text-slate-400">(Opcional)</span>
            </label>
            <select
              value={tariffId}
              onChange={(e) => setTariffId(e.target.value)}
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30 cursor-pointer"
            >
              <option value="">Sin tarifa fija</option>
              {filteredTariffs.map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.code}] {t.category_name || t.level_label} ({t.price_non_member}€)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Horas Semanales <span className="text-[10px] font-normal text-slate-400">(Opcional)</span>
            </label>
            <input
              type="number"
              step="0.5"
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(e.target.value)}
              placeholder="1, 2, 3..."
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30"
            />
          </div>
        </div>

        {/* Estado del Alumno (Regular vs Prueba en Naranja) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Estado del Alumno
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30 cursor-pointer font-medium"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {status === 'pendiente_aprobacion' && (
            <p className="text-[11px] text-amber-700 mt-1 font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Aparecerá en color naranja con etiqueta de "Prueba" en el cuadrante de clases.
            </p>
          )}
        </div>

        {/* NUEVA SECCIÓN: HORARIO Y ASIGNACIÓN AUTOMÁTICA */}
        <div className="p-3.5 bg-gradient-to-br from-blue-50/70 to-indigo-50/40 rounded-2xl border border-blue-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black text-[#0055A5] uppercase tracking-wide">
              <Calendar className="w-4 h-4 text-[#0055A5]" />
              <span>Horario y Asignación Automática</span>
            </div>
            <span className="text-[10px] text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
              Auto-Inscripción
            </span>
          </div>

          <p className="text-[11px] text-slate-500 leading-snug">
            Indica el profesor, días y hora. El sistema buscará las clases en el cuadrante o las creará al vuelo para inscribir al alumno de forma inmediata.
          </p>

          {/* Profesor */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Profesor
            </label>
            <select
              value={assignedCoachId}
              onChange={(e) => setAssignedCoachId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30 cursor-pointer font-medium text-slate-800"
            >
              <option value="">Cualquier monitor disponible</option>
              {filteredCoaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({Number(c.hourly_cost || 0).toFixed(2)}€/h)
                </option>
              ))}
            </select>
          </div>

          {/* Días de la semana (Selector múltiple) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold text-slate-700">
                Días de la Semana
              </label>
              <span className="text-[10px] font-semibold text-slate-400">
                {assignedDays.length === 0
                  ? 'Sin asignar'
                  : `${assignedDays.length} ${assignedDays.length === 1 ? 'día' : 'días'} elegidos`}
              </span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {DAYS_OF_WEEK.map(({ day, short, label }) => {
                const isSelected = assignedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleToggleDay(day)}
                    className={`py-2 text-xs font-black rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      isSelected
                        ? 'bg-[#0055A5] text-white border-[#0055A5] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                    title={label}
                  >
                    <span>{short}</span>
                    <span className="text-[9px] font-medium opacity-80">{label.slice(0, 3)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hora */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Hora de la Clase
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                <select
                  value={assignedTime}
                  onChange={(e) => setAssignedTime(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30 cursor-pointer font-medium text-slate-800"
                >
                  <option value="">Selecciona hora habitual...</option>
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="time"
                value={assignedTime}
                onChange={(e) => setAssignedTime(e.target.value)}
                className="w-28 px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30 text-center font-medium"
              />
            </div>
          </div>
        </div>

        {/* Abonado toggle */}
        <div className="pt-1">
          <Switch
            checked={isMember}
            onChange={setIsMember}
            label="¿Es abonado de OpenArena?"
            description="Aplica precios reducidos de abonado en recibos"
            size="sm"
          />
        </div>

        {/* Notas */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Notas u Observaciones <span className="text-[10px] font-normal text-slate-400">(Opcional)</span>
          </label>
          <textarea
            rows="2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Alergias, disponibilidad, historial..."
            className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {studentToEdit ? 'Guardar Alumno' : 'Crear e Inscribir Alumno'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
