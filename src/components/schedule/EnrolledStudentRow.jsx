import React from 'react';
import { Badge } from '../ui/Badge';
import { X, AlertTriangle, Phone, Sparkles } from 'lucide-react';

const DAY_NAMES = {
  1: 'lunes',
  2: 'martes',
  3: 'miércoles',
  4: 'jueves',
  5: 'viernes',
  6: 'sábado',
};

export const EnrolledStudentRow = ({
  student,
  enrollmentNote,
  dayOfWeek,
  isBaja = false,
  isReorganizing = false,
  onUnenroll,
}) => {
  if (!student) return null;

  const isPrueba =
    student.status === 'pendiente_aprobacion' ||
    student.status === 'confirmado_prueba';

  // Restriction validation
  const dayName = DAY_NAMES[dayOfWeek] || '';
  const restrictionsText = (student.restrictions_text || '').toLowerCase();
  let hasDayRestriction = false;
  let restrictionReason = '';

  if (restrictionsText) {
    if (
      restrictionsText.includes(`no ${dayName}`) ||
      restrictionsText.includes(`sin ${dayName}`) ||
      (restrictionsText.includes(dayName) &&
        (restrictionsText.includes('no') || restrictionsText.includes('imposible') || restrictionsText.includes('bloqueado')))
    ) {
      hasDayRestriction = true;
      restrictionReason = student.restrictions_text;
    }
  }

  // Also check restrictions_json if present
  if (student.restrictions_json) {
    try {
      const parsed = typeof student.restrictions_json === 'string'
        ? JSON.parse(student.restrictions_json)
        : student.restrictions_json;

      if (Array.isArray(parsed?.blocked_days) && parsed.blocked_days.includes(Number(dayOfWeek))) {
        hasDayRestriction = true;
        restrictionReason = parsed.reason || `Bloqueado los ${dayName}`;
      }
    } catch {
      // Ignore JSON parse error
    }
  }

  return (
    <div
      className={`group flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors text-xs border ${
        isBaja
          ? 'bg-slate-100/90 border-slate-200 text-slate-400'
          : isPrueba
          ? 'bg-amber-50/50 hover:bg-amber-50/80 border-amber-300/80 text-amber-950 shadow-2xs'
          : 'bg-white hover:bg-slate-50 border-slate-150 text-slate-800'
      }`}
    >
      {/* Student Details */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
        {/* Full Name & Strikethrough if Baja / Orange if Prueba */}
        <span
          className={`truncate ${
            isBaja
              ? 'line-through text-slate-400 italic font-medium'
              : isPrueba
              ? 'text-amber-600 font-bold'
              : 'text-slate-800 font-semibold'
          }`}
          title={`${student.full_name}${isPrueba ? ' (Alumno en clase de prueba)' : ''}`}
        >
          {student.full_name}
        </span>

        {/* Badge "Prueba" (Vital para el monitor) */}
        {isPrueba && !isBaja && (
          <span
            className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-full shrink-0 shadow-2xs"
            title="Alumno en prueba (Pendiente de Aprobación)"
          >
            <Sparkles className="w-2.5 h-2.5 text-amber-600" />
            Prueba
          </span>
        )}

        {/* Baja Temporal Tag */}
        {isBaja && (
          <Badge
            variant="baja"
            size="xs"
            className="uppercase tracking-wider text-[9px] shrink-0"
          >
            [BAJA]
          </Badge>
        )}

        {/* Restriction Alert Badge */}
        {hasDayRestriction && (
          <Badge
            variant="amber"
            size="xs"
            icon={AlertTriangle}
            className="shrink-0 text-[10px]"
            title={`Aviso de restricción: ${restrictionReason || 'Conflicto de horario'}`}
          >
            Aviso {dayName}
          </Badge>
        )}

        {/* Member Indicator (Abonado) */}
        {student.is_member && !isBaja && (
          <span
            className="text-[9px] font-bold text-sky-600 bg-sky-50 px-1 rounded shrink-0 cursor-default"
            title="Abonado de OpenArena"
          >
            Ab.
          </span>
        )}

        {/* Enrollment Note if present (ignoring auto-asignado) */}
        {enrollmentNote && !enrollmentNote.toLowerCase().includes('auto-asignado') && (
          <span className="text-[10px] text-slate-400 truncate hidden md:inline shrink-0" title={enrollmentNote}>
            • {enrollmentNote}
          </span>
        )}
      </div>

      {/* Actions */}
      {!isReorganizing && (
        <div className="flex items-center gap-1 shrink-0">
          {student.phone && (
            <a
              href={`https://wa.me/${student.phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-600 sm:text-slate-300 sm:hover:text-emerald-600 p-1 rounded-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              title={`WhatsApp: ${student.phone}`}
            >
              <Phone className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            type="button"
            onClick={() => onUnenroll(student.id)}
            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-md transition-all cursor-pointer"
            title="Desinscribir de esta clase"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
