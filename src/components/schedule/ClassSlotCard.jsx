import React from 'react';
import { Badge } from '../ui/Badge';
import { EnrolledStudentRow } from './EnrolledStudentRow';
import { QuickEnrollInput } from './QuickEnrollInput';
import { useMonthlyRegistry } from '../../hooks/useMonthlyRegistry';
import { useSchool } from '../../context/SchoolContext';
import { useCoaches } from '../../hooks/useCoaches';
import { useTariffs } from '../../hooks/useTariffs';
import { ProfitabilitySlotBadge } from './ProfitabilitySlotBadge';
import { Edit2, Trash2, MapPin, GripVertical } from 'lucide-react';

export const ClassSlotCard = ({
  slot,
  enrollments = [],
  allStudents = [],
  onEnrollExisting,
  onCreateAndEnroll,
  onUnenroll,
  onEditSlot,
  onDeleteSlot,
  isReorganizing: propIsReorganizing,
  isDragging = false,
}) => {
  const { isStudentBaja } = useMonthlyRegistry();
  const { showProfitability, isReorganizing: contextIsReorganizing } = useSchool();
  const { filteredCoaches } = useCoaches();
  const { tariffs } = useTariffs();

  const isReorganizing = propIsReorganizing ?? contextIsReorganizing;

  // Find enrolled students objects
  const enrolledStudents = enrollments
    .map((enroll) => {
      const student = allStudents.find((s) => s.id === enroll.student_id);
      return {
        enrollmentId: enroll.id,
        enrollmentNote: enroll.enrollment_note,
        student,
        isBaja: student ? isStudentBaja(student.id) : false,
      };
    })
    .filter((item) => Boolean(item.student));

  const maxCapacity = Number(slot.max_capacity) || 4;

  // IMPORTANT: Students with baja_temporal do NOT occupy a spot!
  const activeCount = enrolledStudents.filter((item) => !item.isBaja).length;
  const bajasCount = enrolledStudents.filter((item) => item.isBaja).length;
  const freeSpots = Math.max(0, maxCapacity - activeCount);

  // Semáforo de capacidad: Azul, Verde, Ámbar, Rojo
  let capacityVariant = 'capacityAvailable';
  let capacityLabel = `${activeCount}/${maxCapacity}`;

  if (activeCount === 0) {
    capacityVariant = 'capacityEmpty';
    capacityLabel = `0/${maxCapacity} Libre`;
  } else if (freeSpots === 0) {
    capacityVariant = 'capacityFull';
    capacityLabel = `${activeCount}/${maxCapacity} Lleno`;
  } else if (freeSpots === 1) {
    capacityVariant = 'capacityAlmostFull';
    capacityLabel = `${activeCount}/${maxCapacity} (1 libre)`;
  } else {
    capacityVariant = 'capacityAvailable';
    capacityLabel = `${activeCount}/${maxCapacity} (${freeSpots} libres)`;
  }

  // Format time display e.g. "16:00 - 17:00"
  const timeDisplay = `${(slot.start_time || '').slice(0, 5)} - ${(slot.end_time || '').slice(0, 5)}`;

  return (
    <div
      className={`group/card bg-white rounded-xl transition-all duration-150 p-3 flex flex-col justify-between ${
        isDragging
          ? 'ring-2 ring-[#0055A5] border-[#0055A5] shadow-lg opacity-40'
          : isReorganizing
          ? 'border-blue-300 ring-1 ring-blue-300/80 shadow-xs hover:border-[#0055A5] hover:ring-2 hover:ring-blue-400/40 select-none'
          : 'border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300'
      }`}
    >
      {/* Wrapper that disables pointer clicks during reorganizing mode so the whole card drags */}
      <div className={isReorganizing ? 'pointer-events-none select-none' : ''}>
        {/* Header */}
        <div className="flex items-start justify-between gap-1 mb-1.5">
          {/* Time, Drag Grip & Court */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {isReorganizing && (
              <GripVertical className="w-4 h-4 text-[#0055A5] shrink-0" />
            )}
            <span className="text-xs font-black text-slate-800 tracking-tight">
              {timeDisplay}
            </span>

            {slot.court_name && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                <MapPin className="w-2.5 h-2.5 text-slate-400" />
                {slot.court_name}
              </span>
            )}
          </div>

          {/* Action buttons (Edit / Delete) in normal mode, or Mover badge in reorganize mode */}
          {isReorganizing ? (
            <span className="text-[10px] font-black uppercase tracking-wider text-[#0055A5] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-2xs">
              Mover
            </span>
          ) : (
            <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover/card:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => onEditSlot?.(slot)}
                className="p-1.5 text-slate-400 hover:text-[#0055A5] hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                title="Editar clase"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDeleteSlot?.(slot.id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                title="Eliminar clase"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Level and Capacity Semaphore Bar */}
        <div className="flex items-center justify-between gap-1 mb-2">
          <div className="flex items-center gap-1 overflow-hidden">
            {slot.level_label && (
              <span className="text-[10px] font-bold text-[#0055A5] bg-blue-50 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                {slot.level_label}
              </span>
            )}
            {slot.category_name && (
              <span className="text-[10px] font-medium text-slate-500 truncate max-w-[90px]">
                {slot.category_name}
              </span>
            )}
          </div>

          {/* Semaphore badge */}
          <Badge variant={capacityVariant} size="xs" className="font-bold shrink-0">
            {capacityLabel}
          </Badge>
        </div>

        {/* Notice if any student has Baja Temporal in this class */}
        {bajasCount > 0 && !showProfitability && (
          <div className="mb-2 px-1.5 py-0.5 bg-amber-50/80 border border-amber-200/80 rounded text-[10px] text-amber-800 flex items-center justify-between">
            <span>{bajasCount} {bajasCount === 1 ? 'plaza liberada por baja' : 'plazas liberadas por baja'}</span>
            <span className="font-bold text-amber-900">+Suplente</span>
          </div>
        )}

        {/* Si Vista Rentabilidad está activa, sustituye la lista por ProfitabilitySlotBadge */}
        {showProfitability ? (
          <ProfitabilitySlotBadge
            slot={slot}
            enrollments={enrollments}
            allStudents={allStudents}
            coaches={filteredCoaches}
            tariffs={tariffs}
            isStudentBaja={isStudentBaja}
          />
        ) : (
          <>
            {/* Enrolled Students List */}
            <div className="space-y-1">
              {enrolledStudents.map(({ student, enrollmentNote, isBaja }) => (
                <EnrolledStudentRow
                  key={student.id}
                  student={student}
                  enrollmentNote={enrollmentNote}
                  dayOfWeek={slot.day_of_week}
                  isBaja={isBaja}
                  isReorganizing={isReorganizing}
                  onUnenroll={() => onUnenroll?.(slot.id, student.id)}
                />
              ))}

              {enrolledStudents.length === 0 && (
                <div className="py-2.5 text-center text-[11px] text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                  Sin alumnos inscritos
                </div>
              )}
            </div>

            {/* Quick Enroll Footer (hidden in reorganize mode) */}
            {!isReorganizing && (
              <QuickEnrollInput
                classSlot={slot}
                availableStudents={allStudents}
                alreadyEnrolledIds={enrolledStudents.map((e) => e.student.id)}
                onEnrollExisting={(studentId, alsoAddPairDay) =>
                  onEnrollExisting?.({
                    classSlotId: slot.id,
                    studentId,
                    alsoAddPairDay,
                  })
                }
                onCreateAndEnroll={(fullName, alsoAddPairDay) =>
                  onCreateAndEnroll?.({
                    classSlotId: slot.id,
                    fullName,
                    alsoAddPairDay,
                  })
                }
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};
