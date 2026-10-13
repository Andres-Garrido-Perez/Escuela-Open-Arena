import React from 'react';
import { Badge } from '../ui/Badge';
import { X, AlertTriangle, Phone } from 'lucide-react';

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
  onUnenroll,
}) => {
  if (!student) return null;

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
          : 'bg-white hover:bg-slate-50 border-slate-150 text-slate-800'
      }`}
    >
      {/* Student Details */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
        {/* Full Name & Strikethrough if Baja */}
        <span
          className={`font-semibold truncate ${
            isBaja ? 'line-through text-slate-400 italic' : 'text-slate-800'
          }`}
          title={student.full_name}
        >
          {student.full_name}
        </span>

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

        {/* Member Indicator */}
        {student.is_member && !isBaja && (
          <span className="text-[9px] font-bold text-sky-600 bg-sky-50 px-1 rounded shrink-0">
            S
          </span>
        )}

        {/* Enrollment Note if present */}
        {enrollmentNote && (
          <span className="text-[10px] text-slate-400 truncate hidden md:inline shrink-0" title={enrollmentNote}>
            • {enrollmentNote}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {student.phone && (
          <a
            href={`https://wa.me/${student.phone.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="text-slate-300 hover:text-emerald-600 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            title={`WhatsApp: ${student.phone}`}
          >
            <Phone className="w-3 h-3" />
          </a>
        )}

        <button
          type="button"
          onClick={() => onUnenroll(student.id)}
          className="text-slate-300 hover:text-rose-600 hover:bg-rose-50 p-0.5 rounded transition-all cursor-pointer"
          title="Desinscribir de esta clase"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
