import React from 'react';
import { Badge } from '../ui/Badge';
import { useMonthlyRegistry } from '../../hooks/useMonthlyRegistry';
import { useSchool } from '../../context/SchoolContext';
import { Phone, Edit2, Trash2, AlertTriangle, UserX, UserCheck } from 'lucide-react';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';

export const StudentCard = ({
  student,
  tariff,
  onEdit,
  onDelete,
}) => {
  const { selectedMonth } = useSchool();
  const { isStudentBaja, toggleBajaTemporal, getStudentRegistry } = useMonthlyRegistry();

  const registry = getStudentRegistry(student.id);
  const isBaja = isStudentBaja(student.id);
  const isPrueba = student.status === 'pendiente_aprobacion' || student.status === 'confirmado_prueba';

  const cleanPhone = student.phone ? student.phone.replace(/[^0-9]/g, '') : '';

  const formatMonthShort = (monthStr) => {
    if (!monthStr) return '';
    try {
      const parsed = parse(monthStr, 'yyyy-MM', new Date(2026, 0, 1));
      return format(parsed, 'MMM yyyy', { locale: es });
    } catch {
      return monthStr;
    }
  };

  return (
    <div
      className={`group p-3 rounded-xl border transition-all text-xs bg-white ${
        isBaja
          ? 'border-slate-300 bg-slate-50/80 text-slate-500'
          : isPrueba
          ? 'border-amber-300/80 bg-amber-50/20 hover:border-amber-400 hover:shadow-xs'
          : 'border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
      }`}
    >
      {/* Header: Name & Member Badge */}
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`font-black truncate text-sm tracking-tight ${
                isBaja
                  ? 'text-slate-900 font-bold'
                  : isPrueba
                  ? 'text-amber-600 font-bold'
                  : 'text-slate-900'
              }`}
            >
              {student.full_name}
            </span>

            {isPrueba && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white shadow-xs">
                Prueba
              </span>
            )}

            {student.is_member && (
              <Badge variant="sky" size="xs">
                Abonado
              </Badge>
            )}

            {isBaja && (
              <Badge variant="baja" size="xs">
                [BAJA {selectedMonth}]
              </Badge>
            )}
          </div>

          {/* Phone */}
          {student.phone && (
            <div className="flex items-center gap-1 mt-0.5 text-slate-400">
              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-emerald-600 inline-flex items-center gap-1 text-[11px] font-medium"
              >
                <Phone className="w-3 h-3 text-slate-400" />
                <span>{student.phone}</span>
              </a>
            </div>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
          <button
            type="button"
            onClick={() => onEdit(student)}
            className="p-1.5 text-slate-400 hover:text-[#0055A5] hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
            title="Editar alumno"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(student.id)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
            title="Eliminar alumno"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tariff & Contracted Hours */}
      <div className="flex items-center gap-1.5 flex-wrap my-1.5">
        {tariff ? (
          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
            {tariff.code} ({tariff.price_non_member}€)
          </span>
        ) : student.category_name ? (
          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
            {student.category_name}
          </span>
        ) : null}

        {student.weekly_hours_contracted && (
          <span className="text-[10px] text-slate-400">
            {student.weekly_hours_contracted}h/sem
          </span>
        )}
      </div>

      {/* Restrictions alert if any */}
      {student.restrictions_text && (
        <div className="my-1.5 px-2 py-1 bg-amber-50/70 border border-amber-200/80 rounded-lg text-[10px] text-amber-800 flex items-start gap-1">
          <AlertTriangle className="w-3 h-3 shrink-0 text-amber-600 mt-0.5" />
          <span className="truncate" title={student.restrictions_text}>
            {student.restrictions_text}
          </span>
        </div>
      )}

      {/* Monthly Baja Temporal Quick Toggle */}
      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[10px] text-slate-400 font-medium">
          Estado mes actual:
        </span>
        <button
          type="button"
          onClick={() => toggleBajaTemporal(student.id)}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] transition-colors cursor-pointer ${
            isBaja
              ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
          }`}
          title="Alternar baja temporal para este mes"
        >
          {isBaja ? (
            <>
              <UserX className="w-3 h-3 text-amber-700" />
              <span>
                Baja{registry?.inheritedFromMonth ? ` (desde ${formatMonthShort(registry.inheritedFromMonth)})` : ' Temporal'}
              </span>
            </>
          ) : (
            <>
              <UserCheck className="w-3 h-3 text-emerald-600" />
              <span>Activo este mes</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
