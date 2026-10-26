import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import { useSchool } from '../../context/SchoolContext';
import { useTariffs } from '../../hooks/useTariffs';
import { useCoaches } from '../../hooks/useCoaches';
import { useSchedule } from '../../hooks/useSchedule';
import { resolveStudentTariff } from '../../utils/tariffResolver';
import { Clock, Calendar, Sparkles, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';

const DAYS_OF_WEEK = [
  { day: 1, short: 'L', label: 'Lunes' },
  { day: 2, short: 'M', label: 'Martes' },
  { day: 3, short: 'X', label: 'Miércoles' },
  { day: 4, short: 'J', label: 'Jueves' },
  { day: 5, short: 'V', label: 'Viernes' },
  { day: 6, short: 'S', label: 'Sábado' },
];

const DAY_NAMES = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

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
  onDelete = null,
}) => {
  const { sport, triggerRefresh } = useSchool();
  const { filteredTariffs } = useTariffs();
  const { filteredCoaches } = useCoaches();
  const { autoAssignStudentToSchedule, unenrollStudent, slots, allSlots, enrollments } =
    useSchedule();
  const scheduleSlots = allSlots || slots || [];

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

  // Modal para avisos de conflicto elegantes (sustituye a window.alert)
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictModalData, setConflictModalData] = useState(null);

  useEffect(() => {
    if (studentToEdit) {
      setFullName(studentToEdit.full_name || '');
      setPhone(studentToEdit.phone || '');
      setStudentSport(studentToEdit.sport || sport || 'tenis');
      setIsMember(Boolean(studentToEdit.is_member));
      setStatus(studentToEdit.status || 'activo');
      setNotes(studentToEdit.notes || '');

      // 1. Cargar clases y horarios en los que el alumno ya está matriculado
      const studentEnrollments = (enrollments || []).filter(
        (e) => e.student_id === studentToEdit.id
      );
      const studentSlots = studentEnrollments
        .map((e) => scheduleSlots.find((s) => s.id === e.class_slot_id))
        .filter(Boolean);

      if (studentSlots.length > 0) {
        const days = Array.from(
          new Set(studentSlots.map((s) => Number(s.day_of_week)))
        ).sort((a, b) => a - b);
        setAssignedDays(days);

        const coachSlot = studentSlots.find((s) => s.coach_id);
        setAssignedCoachId(coachSlot?.coach_id || '');

        const firstTime = studentSlots[0]?.start_time
          ? studentSlots[0].start_time.slice(0, 5)
          : '';
        setAssignedTime(firstTime);
      } else {
        setAssignedDays([]);
        setAssignedCoachId('');
        setAssignedTime('');
      }

      // 2. Resolución inteligente de tarifa
      const resolved = resolveStudentTariff(
        studentToEdit,
        filteredTariffs,
        scheduleSlots,
        enrollments
      );
      setTariffId(resolved?.id || studentToEdit.tariff_id || '');

      // 3. Horas contratadas
      if (studentToEdit.weekly_hours_contracted) {
        setWeeklyHours(String(studentToEdit.weekly_hours_contracted));
      } else if (resolved?.hours_per_week) {
        setWeeklyHours(String(resolved.hours_per_week));
      } else if (studentSlots.length > 0) {
        setWeeklyHours(String(studentSlots.length));
      } else {
        setWeeklyHours('');
      }
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
  }, [studentToEdit, sport, isOpen, enrollments, scheduleSlots, filteredTariffs]);

  const selectedTariff = filteredTariffs.find((t) => t.id === tariffId);
  const contractedHoursNum = Number(weeklyHours) || 0;
  const selectedDaysCount = assignedDays.length;

  // Conflict detection: contracted weekly hours vs days chosen
  const hasHoursConflict = contractedHoursNum > 0 && selectedDaysCount > contractedHoursNum;

  // Detección en tiempo real de grupos existentes y verificación de aforo completo
  const targetGroupSummary = useMemo(() => {
    if (!assignedCoachId || assignedDays.length === 0) {
      return { matches: [], fullConflicts: [] };
    }

    const targetLevel = (selectedTariff?.level_label || selectedTariff?.category_name || '').trim().toLowerCase();
    const targetCat = (selectedTariff?.category_name || '').trim().toLowerCase();

    const matches = [];
    const fullConflicts = [];

    for (const dayNum of assignedDays) {
      const dayName = DAY_NAMES[dayNum] || `Día ${dayNum}`;

      // Búsqueda de clase existente para este monitor y nivel en este día
      let found = scheduleSlots.find((s) => {
        if (Number(s.day_of_week) !== dayNum) return false;
        if (s.coach_id !== assignedCoachId) return false;
        if (tariffId && s.tariff_id === tariffId) return true;

        const sLevel = (s.level_label || '').trim().toLowerCase();
        const sCat = (s.category_name || '').trim().toLowerCase();

        if (
          targetLevel &&
          (sLevel === targetLevel ||
            sCat === targetLevel ||
            (targetLevel.length > 3 && (sLevel.includes(targetLevel) || targetLevel.includes(sLevel))))
        ) {
          return true;
        }

        if (
          targetCat &&
          (sLevel === targetCat ||
            sCat === targetCat ||
            (targetCat.length > 3 && (sCat.includes(targetCat) || targetCat.includes(sCat))))
        ) {
          return true;
        }

        return false;
      });

      if (found) {
        const currentStudentId = studentToEdit?.id;
        const slotEnrollments = (enrollments || []).filter(
          (e) => e.class_slot_id === found.id && e.student_id !== currentStudentId
        );
        const maxCap = Number(found.max_capacity) || Number(selectedTariff?.max_students) || 4;
        const enrolledCount = slotEnrollments.length;
        const isFull = enrolledCount >= maxCap;

        const matchInfo = {
          dayNum,
          dayName,
          startTime: (found.start_time || '').slice(0, 5),
          endTime: (found.end_time || '').slice(0, 5),
          levelLabel: found.level_label || found.category_name || 'Grupo',
          slotId: found.id,
          enrolledCount,
          maxCapacity: maxCap,
          isFull,
        };

        matches.push(matchInfo);

        if (isFull) {
          fullConflicts.push({
            ...matchInfo,
            message: `La clase del ${dayName} (${matchInfo.levelLabel} a las ${matchInfo.startTime}) está completa (${enrolledCount}/${maxCap} plazas).`,
          });
        }
      }
    }

    return { matches, fullConflicts };
  }, [
    assignedCoachId,
    assignedDays,
    tariffId,
    selectedTariff,
    scheduleSlots,
    enrollments,
    studentToEdit,
  ]);

  const existingGroupMatches = targetGroupSummary.matches;
  const fullClassConflicts = targetGroupSummary.fullConflicts;
  const hasFullClassConflict = fullClassConflicts.length > 0;

  // Calcular la próxima hora disponible para el monitor si a las 17:00 ya tiene otra clase
  const nextAvailableTime = useMemo(() => {
    if (!assignedCoachId || assignedDays.length === 0) return '17:00';

    // Si ya existe un grupo de este nivel, la hora del grupo manda
    if (existingGroupMatches.length > 0 && existingGroupMatches[0]?.startTime) {
      return existingGroupMatches[0].startTime;
    }

    const preferred = assignedTime || '17:00';
    const cleanPref = preferred.slice(0, 5);

    const isBusyOnAnyDay = (timeStr) => {
      const cleanTime = timeStr.slice(0, 5);
      return assignedDays.some((dayNum) =>
        scheduleSlots.some(
          (s) =>
            Number(s.day_of_week) === dayNum &&
            s.coach_id === assignedCoachId &&
            (s.start_time || '').slice(0, 5) === cleanTime
        )
      );
    };

    if (!isBusyOnAnyDay(cleanPref)) return cleanPref;

    // 1. Probar hacia adelante: +1h, +2h, etc. hasta 21:00
    const [prefH = 17, prefM = 0] = cleanPref.split(':').map(Number);
    for (let h = prefH + 1; h <= 21; h++) {
      const cand = `${String(h).padStart(2, '0')}:${String(prefM).padStart(2, '0')}`;
      if (!isBusyOnAnyDay(cand)) return cand;
    }

    // 2. Probar hacia atrás (16:00, 15:00)
    for (let h = prefH - 1; h >= 15; h--) {
      const cand = `${String(h).padStart(2, '0')}:${String(prefM).padStart(2, '0')}`;
      if (!isBusyOnAnyDay(cand)) return cand;
    }

    // 3. Probar mañanas
    for (const cand of ['10:00', '11:00', '12:00', '09:00']) {
      if (!isBusyOnAnyDay(cand)) return cand;
    }

    return cleanPref;
  }, [assignedCoachId, assignedDays, assignedTime, existingGroupMatches, scheduleSlots]);

  const handleTariffChange = (newTariffId) => {
    setTariffId(newTariffId);
    const found = filteredTariffs.find((t) => t.id === newTariffId);
    if (found?.hours_per_week) {
      setWeeklyHours(String(found.hours_per_week));
    }
  };

  const handleToggleDay = (dayNum) => {
    setAssignedDays((prev) => {
      const exists = prev.includes(dayNum);
      const updated = exists
        ? prev.filter((d) => d !== dayNum)
        : [...prev, dayNum].sort((a, b) => a - b);

      // If weeklyHours wasn't set, sync it with selected days
      if (!weeklyHours && updated.length > 0) {
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

    // 1. Bloqueo por conflicto de horas contratadas vs días
    if (hasHoursConflict) {
      setError(
        `Conflicto de horario: Has seleccionado ${selectedDaysCount} días (${assignedDays.map((d) => DAY_NAMES[d]).join(', ')}), pero el alumno tiene ${contractedHoursNum} hora${contractedHoursNum > 1 ? 's' : ''} semanal${contractedHoursNum > 1 ? 'es' : ''} contratada${contractedHoursNum > 1 ? 's' : ''}. Un alumno de ${contractedHoursNum}h no puede tener ${selectedDaysCount} clases. Ajusta los días o amplía las horas contratadas.`
      );
      return;
    }

    // 2. Bloqueo por clase completa (aforo superado) -> NO SE PERMITE CREAR
    if (hasFullClassConflict) {
      setConflictModalData({
        title: 'Clase Completa — Sin Plazas Libres',
        conflicts: fullClassConflicts.map((c) => c.message),
        solution: 'Esta clase ya ha alcanzado el límite máximo de alumnos (4/4). No es posible crear ni matricular al alumno aquí. Selecciona otro día u otro monitor para continuar.',
      });
      setShowConflictModal(true);
      return;
    }

    try {
      setLoading(true);
      setError('');

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
      if (targetStudentId) {
        // Si estamos editando y se desmarcó algún día de la semana, desmatricular de ese slot
        if (studentToEdit && unenrollStudent) {
          const studentEnrollments = (enrollments || []).filter(
            (e) => e.student_id === targetStudentId
          );
          const slotsToUnenroll = studentEnrollments
            .map((e) => scheduleSlots.find((s) => s.id === e.class_slot_id))
            .filter(Boolean)
            .filter((s) => !assignedDays.includes(Number(s.day_of_week)));

          for (const s of slotsToUnenroll) {
            await unenrollStudent(s.id, targetStudentId);
          }
        }

        if (assignedDays.length > 0) {
          const effectiveStartTime =
            assignedTime || existingGroupMatches[0]?.startTime || nextAvailableTime || '17:00';

          const result = await autoAssignStudentToSchedule({
            studentId: targetStudentId,
            coachId: assignedCoachId || null,
            daysOfWeek: assignedDays,
            startTime: effectiveStartTime,
            tariffId: tariffId || null,
            levelLabel: selectedTariff?.level_label || selectedTariff?.category_name || 'General',
            categoryName: selectedTariff?.category_name || 'General',
            sport: studentSport,
            maxCapacity: selectedTariff?.max_students || 4,
          });

          if (result?.conflicts && result.conflicts.length > 0) {
            setConflictModalData({
              title: 'Aviso de Conflicto en Cuadrante',
              conflicts: result.conflicts,
              solution: 'El alumno ha sido registrado, pero no se ha podido inscribir automáticamente en todas las clases por limitaciones de aforo. Puedes resolverlo manualmente en el cuadrante.',
            });
            setShowConflictModal(true);
            return;
          }
        }
      }

      if (triggerRefresh) triggerRefresh();
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
              onChange={(e) => handleTariffChange(e.target.value)}
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30 cursor-pointer"
            >
              <option value="">Sin tarifa fija</option>
              {filteredTariffs.map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.code}] {t.category_name || t.level_label} ({t.hours_per_week ? `${t.hours_per_week}h/sem - ` : ''}{t.price_non_member}€)
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
              min="0.5"
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(e.target.value)}
              placeholder="1, 2, 3..."
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30"
            />
          </div>
        </div>

        {/* ¿Es Abonado de OpenArena? */}
        <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <span className="text-xs font-bold text-slate-800 block">
              ¿Es Abonado del Club?
            </span>
            <span className="text-[11px] text-slate-500">
              Aplica automáticamente la tarifa reducida de abonado
            </span>
          </div>
          <Switch
            checked={isMember}
            onChange={setIsMember}
            size="sm"
          />
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
            Indica el profesor y los días. Si el profesor ya tiene un grupo de este nivel, el alumno se integrará automáticamente en su misma clase.
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

            {/* Aviso visual inmediato de conflicto de horas contratadas vs días */}
            {hasHoursConflict && (
              <div className="mt-2 p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-start gap-2 shadow-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Conflicto de horas contratadas vs días:</span>
                  <p className="mt-0.5 text-[11px] leading-relaxed">
                    El alumno tiene <strong>{contractedHoursNum}h/semana</strong> contratadas, pero has seleccionado <strong>{selectedDaysCount} días</strong> ({assignedDays.map((d) => DAY_NAMES[d]).join(', ')}). No puede tener más clases que horas contratadas. Ajusta los días o amplía las horas semanales.
                  </p>
                </div>
              </div>
            )}

            {/* Aviso visual inmediato de CLASE COMPLETA (Aforo superado) */}
            {hasFullClassConflict && (
              <div className="mt-2 p-3 bg-rose-50 border-2 border-rose-400 rounded-2xl text-xs text-rose-900 flex items-start gap-2.5 shadow-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-rose-800 uppercase tracking-tight text-[11px]">
                      Clase Completa (Sin plazas disponibles)
                    </span>
                    <span className="text-[10px] bg-rose-200/80 text-rose-900 font-bold px-2 py-0.5 rounded-full uppercase">
                      No se puede crear
                    </span>
                  </div>
                  <div className="mt-1.5 space-y-1 text-[11px]">
                    {fullClassConflicts.map((c) => (
                      <div
                        key={c.dayNum}
                        className="flex items-center justify-between bg-white/80 p-2 rounded-xl border border-rose-200"
                      >
                        <span>
                          • <strong>{c.dayName} a las {c.startTime}</strong> ({c.levelLabel})
                        </span>
                        <span className="font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md text-[11px]">
                          {c.enrolledCount}/{c.maxCapacity} plazas
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] text-rose-700 font-semibold leading-snug">
                    Esta clase está al 100% de ocupación. No se puede crear el alumno aquí. Selecciona otro día disponible o cambia de monitor.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Detección de Grupo Existente con el profesor (Solo si hay plazas libres) */}
          {existingGroupMatches.length > 0 && !hasFullClassConflict && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 flex items-start gap-2 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Grupo existente detectado con este monitor:</span>
                <div className="mt-1 text-[11px] text-emerald-700 space-y-1">
                  {existingGroupMatches.map((m) => (
                    <div key={m.dayNum} className="flex items-center justify-between">
                      <span>
                        • <strong>{m.dayName} a las {m.startTime}</strong> ({m.levelLabel})
                      </span>
                      <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100/90 px-1.5 py-0.5 rounded">
                        {m.enrolledCount}/{m.maxCapacity} plazas ({m.maxCapacity - m.enrolledCount} {m.maxCapacity - m.enrolledCount === 1 ? 'libre' : 'libres'})
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-emerald-600 font-medium">
                  El alumno se unirá automáticamente a esta misma clase existente en su hora establecida.
                </p>
              </div>
            </div>
          )}

          {/* Hora de la clase (Opcional) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-700">
                Hora de la Clase <span className="text-[10px] font-normal text-slate-400">(Opcional)</span>
              </label>
              {existingGroupMatches.length > 0 ? (
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100/80 px-1.5 py-0.5 rounded">
                  Usa hora del grupo ({existingGroupMatches[0]?.startTime})
                </span>
              ) : nextAvailableTime && nextAvailableTime !== '17:00' ? (
                <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-100/80 px-1.5 py-0.5 rounded">
                  Siguiente libre: {nextAvailableTime}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                <select
                  value={assignedTime}
                  onChange={(e) => setAssignedTime(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30 cursor-pointer font-medium text-slate-800"
                >
                  <option value="">
                    {existingGroupMatches.length > 0
                      ? `Automática (${existingGroupMatches[0]?.startTime})`
                      : nextAvailableTime && nextAvailableTime !== '17:00'
                      ? `Siguiente disponible (${nextAvailableTime})`
                      : 'Por defecto (17:00)'}
                  </option>
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
                placeholder={existingGroupMatches[0]?.startTime || nextAvailableTime || '17:00'}
                className="w-28 px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30 text-center font-medium"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {existingGroupMatches.length > 0
                ? 'El monitor ya imparte este nivel en ese horario. Se agruparán juntos automáticamente.'
                : nextAvailableTime && nextAvailableTime !== '17:00'
                ? `El monitor ya tiene otra clase a las 17:00. Se creará automáticamente a las ${nextAvailableTime} (primera hora libre).`
                : 'Si no indicas hora, se creará la clase a las 17:00 automáticamente.'}
            </p>
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

        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 flex-wrap">
          <div>
            {studentToEdit && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(studentToEdit)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                title="Eliminar permanentemente a este alumno"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Alumno</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button variant="secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant={hasFullClassConflict ? 'danger' : 'primary'}
              loading={loading}
              disabled={loading || hasHoursConflict || hasFullClassConflict}
              title={
                hasFullClassConflict
                  ? 'No se puede crear el alumno: la clase seleccionada está completa'
                  : hasHoursConflict
                  ? 'Corrige el conflicto de horas vs días antes de guardar'
                  : ''
              }
            >
              {hasFullClassConflict
                ? 'Clase Completa (Sin Plazas)'
                : studentToEdit
                ? 'Guardar Alumno'
                : 'Crear e Inscribir Alumno'}
            </Button>
          </div>
        </div>
      </form>

      {/* Modal de Conflicto de Aforo / Horario (Sustituye a window.alert nativo) */}
      {showConflictModal && (
        <Modal
          isOpen={showConflictModal}
          onClose={() => setShowConflictModal(false)}
          title={conflictModalData?.title || 'Conflicto de Horario'}
          subtitle="No es posible realizar la inscripción."
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl">
              <div className="p-2 bg-rose-100 text-rose-700 rounded-xl shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div className="text-xs text-rose-900 flex-1">
                <h4 className="font-bold text-sm text-rose-800 mb-1">
                  Aforo Completo — No se puede crear
                </h4>
                <p className="text-rose-700 leading-relaxed">
                  La clase a la que intentas asignar al alumno no dispone de plazas libres:
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {conflictModalData?.conflicts?.map((msg, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between"
                >
                  <span className="leading-snug">{msg}</span>
                  <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ml-2">
                    Completa
                  </span>
                </div>
              ))}
            </div>

            {conflictModalData?.solution && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <span className="font-bold block mb-0.5">¿Cómo proceder?</span>
                <p className="text-[11px] text-amber-800 leading-snug">
                  {conflictModalData.solution}
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button
                variant="primary"
                onClick={() => setShowConflictModal(false)}
                className="w-full sm:w-auto text-xs font-bold"
              >
                Entendido, cambiar horario
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
};
