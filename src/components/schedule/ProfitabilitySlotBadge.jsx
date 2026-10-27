import React from 'react';
import { TrendingUp, TrendingDown, Users, UserX, AlertCircle } from 'lucide-react';

export const ProfitabilitySlotBadge = ({
  slot,
  enrollments = [],
  allStudents = [],
  coaches = [],
  tariffs = [],
  isStudentBaja,
}) => {
  // 1. Identify active students & breakdown per student
  const tariffsById = tariffs.reduce((acc, t) => {
    acc[t.id] = t;
    return acc;
  }, {});

  const activeEnrolled = [];
  let bajasCount = 0;
  let totalCuotasMes = 0;
  let ingresoBruto = 0;

  const studentBreakdown = enrollments
    .map((enroll) => {
      const student = allStudents.find((s) => s.id === enroll.student_id);
      if (!student) return null;

      const isBaja = isStudentBaja ? isStudentBaja(student.id) : false;
      if (isBaja) {
        bajasCount += 1;
      } else {
        activeEnrolled.push(student);
      }

      const tariff =
        tariffsById[student.tariff_id] ||
        tariffsById[slot.tariff_id] ||
        tariffs.find(
          (t) => t.code && t.code.toLowerCase() === student.tariff_code?.toLowerCase()
        );

      let monthlyPrice = 0;
      if (tariff) {
        monthlyPrice = student.is_member
          ? Number(tariff.price_member || tariff.price_non_member)
          : Number(tariff.price_non_member);
      } else {
        monthlyPrice = student.is_member ? 45 : 55;
      }

      const weeklySessions = Math.max(
        1,
        Number(student.weekly_hours_contracted) || 1
      );

      // Precio por sesión de esta clase (asumiendo 4 semanas de mes)
      const sessionGross = isBaja ? 0 : monthlyPrice / (weeklySessions * 4);

      if (!isBaja) {
        totalCuotasMes += monthlyPrice;
        ingresoBruto += sessionGross;
      }

      return {
        enrollmentId: enroll.id,
        student,
        isBaja,
        monthlyPrice,
        sessionGross,
      };
    })
    .filter(Boolean);

  // 2. Identify coach & hourly cost
  const coach = coaches.find((c) => c.id === slot.coach_id);
  const hourlyCost = Number(coach?.hourly_cost) || 0;

  // Duration in hours (e.g. 1.0h, 1.5h)
  const [sh = 0, sm = 0] = (slot.start_time || '16:00').split(':').map(Number);
  const [eh = 0, em = 0] = (slot.end_time || '17:00').split(':').map(Number);
  const durationHours = Math.max(0.5, (eh * 60 + em - (sh * 60 + sm)) / 60);

  // Coste profesor = coach.hourly_cost * duracion
  const costeProfesor = hourlyCost * durationHours;

  // Paso 2: Descuenta el 21% de IVA (Ingreso Neto = Ingreso Bruto / 1.21)
  const ingresoNetoSinIva = ingresoBruto / 1.21;

  // Paso 3: Beneficio Real = Ingreso Neto - costeProfesor
  const beneficioReal = ingresoNetoSinIva - costeProfesor;
  const isPositive = beneficioReal >= 0;

  return (
    <div className="py-2.5 px-3 bg-slate-50 rounded-xl border border-slate-200/90 flex flex-col justify-between text-xs space-y-2.5">
      {/* 1. Tabla de Desglose de Alumnos (Tal como en la imagen del usuario: Nivel en rojo, Cuota Mes, Por Clase y Totales Dorados) */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
        <div className="bg-rose-50/70 border-b border-rose-200/80 py-1 px-2 text-center">
          <span className="text-[11px] font-black text-rose-600 tracking-wider uppercase">
            {slot.level_label || slot.category_name || 'Clase'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[10px] sm:text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                <th className="py-1 px-2 text-left">Alumno</th>
                <th className="py-1 px-2 text-right">Cuota Mes</th>
                <th className="py-1 px-2 text-right">Por Clase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {studentBreakdown.map(({ student, isBaja, monthlyPrice, sessionGross }) => (
                <tr
                  key={student.id}
                  className={isBaja ? 'bg-amber-50/40 text-slate-400' : 'hover:bg-slate-50/80'}
                >
                  <td
                    className="py-1 px-2 font-semibold text-slate-800 truncate max-w-[110px]"
                    title={student.name || student.full_name}
                  >
                    {student.name || student.full_name}
                    {isBaja && (
                      <span className="ml-1 text-[8px] font-bold text-amber-700 bg-amber-100 px-1 py-0.2 rounded">
                        Baja
                      </span>
                    )}
                  </td>
                  <td className="py-1 px-2 text-right font-medium text-slate-600">
                    {isBaja ? (
                      <span className="line-through text-slate-400">{monthlyPrice.toFixed(2)} €</span>
                    ) : (
                      <span>{monthlyPrice.toFixed(2)} €</span>
                    )}
                  </td>
                  <td className="py-1 px-2 text-right font-bold text-slate-900">
                    {isBaja ? '0,00 €' : `${sessionGross.toFixed(2)} €`}
                  </td>
                </tr>
              ))}
              {studentBreakdown.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-2.5 text-center text-[10px] text-slate-400 italic">
                    Sin alumnos inscritos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Resumen Financiero Completo (Ingreso Bruto -> Neto sin IVA -> Coste Monitor) */}
      <div className="space-y-1.5 text-slate-600 bg-white p-2 rounded-lg border border-slate-150">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-500">Ingresos pista (Brutos):</span>
          <span className="font-bold text-slate-900">
            +{ingresoBruto.toFixed(2)} €
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">
          <span>Neto sin 21% IVA:</span>
          <span className="font-semibold text-slate-700">
            {ingresoNetoSinIva.toFixed(2)} €
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-500">
            Coste monitor {coach ? `(${coach.name.split(' ')[0]})` : ''}:
          </span>
          <span className="font-bold text-slate-700">
            -{costeProfesor.toFixed(2)} €
          </span>
        </div>
      </div>

      {/* Hero Badge: Margen Neto / Beneficio Real */}
      <div
        className={`p-2 rounded-lg border flex items-center justify-between ${
          isPositive
            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
            : 'bg-rose-50 border-rose-300 text-rose-800'
        }`}
      >
        <div className="flex items-center gap-1.5">
          {isPositive ? (
            <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <TrendingDown className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="font-black text-xs uppercase tracking-tight">
            Margen Neto:
          </span>
        </div>

        <span
          className={`font-black text-sm tracking-tight ${
            isPositive ? 'text-emerald-700' : 'text-rose-700'
          }`}
        >
          {isPositive ? '+' : ''}
          {beneficioReal.toFixed(2)} €
        </span>
      </div>

      {/* Warning if coach has no hourly cost */}
      {hourlyCost === 0 && (
        <div className="text-[10px] text-amber-700 flex items-center gap-1 bg-amber-50/70 p-1 rounded">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>Monitor sin coste/h asignado</span>
        </div>
      )}
    </div>
  );
};
