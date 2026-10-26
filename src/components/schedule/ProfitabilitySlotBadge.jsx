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
  // 1. Identify active students in this class slot
  const tariffsById = tariffs.reduce((acc, t) => {
    acc[t.id] = t;
    return acc;
  }, {});

  const activeEnrolled = [];
  let bajasCount = 0;

  enrollments.forEach((enroll) => {
    const student = allStudents.find((s) => s.id === enroll.student_id);
    if (!student) return;

    const isBaja = isStudentBaja ? isStudentBaja(student.id) : false;
    if (isBaja) {
      bajasCount += 1;
    } else {
      activeEnrolled.push(student);
    }
  });

  // 2. Identify coach & hourly cost
  const coach = coaches.find((c) => c.id === slot.coach_id);
  const hourlyCost = Number(coach?.hourly_cost) || 0;

  // Duration in hours (e.g. 1.0h, 1.5h)
  const [sh = 0, sm = 0] = (slot.start_time || '16:00').split(':').map(Number);
  const [eh = 0, em = 0] = (slot.end_time || '17:00').split(':').map(Number);
  const durationHours = Math.max(0.5, (eh * 60 + em - (sh * 60 + sm)) / 60);

  // Coste profesor = coach.hourly_cost * duracion
  const costeProfesor = hourlyCost * durationHours;

  // 3. FÓRMULA MATEMÁTICA OBLIGATORIA:
  // Paso 1: Ingreso Bruto = Suma (precio tarifa alumno / (sesiones_semanales * 4))
  let ingresoBruto = 0;

  activeEnrolled.forEach((student) => {
    const tariff =
      tariffsById[student.tariff_id] ||
      tariffsById[slot.tariff_id] ||
      tariffs.find((t) => t.code && t.code.toLowerCase() === student.tariff_code?.toLowerCase());
    let monthlyPrice = 0;

    if (tariff) {
      monthlyPrice = student.is_member
        ? Number(tariff.price_member || tariff.price_non_member)
        : Number(tariff.price_non_member);
    } else {
      // Fallback estándar si no tiene tarifa fija
      monthlyPrice = student.is_member ? 45 : 55;
    }

    // Sesiones semanales que tiene (mínimo 1)
    const weeklySessions = Math.max(
      1,
      Number(student.weekly_hours_contracted) || 1
    );

    // Precio de este alumno por sesión (asumiendo 4 semanas al mes)
    const sessionGross = monthlyPrice / (weeklySessions * 4);
    ingresoBruto += sessionGross;
  });

  // Paso 2: Descuenta el 21% de IVA (Ingreso Neto = Ingreso Bruto / 1.21)
  const ingresoNetoSinIva = ingresoBruto / 1.21;

  // Paso 3: Beneficio Real = Ingreso Neto - costeProfesor
  const beneficioReal = ingresoNetoSinIva - costeProfesor;
  const isPositive = beneficioReal >= 0;

  return (
    <div className="py-2.5 px-3 bg-slate-50 rounded-xl border border-slate-200/90 flex flex-col justify-between text-xs space-y-2.5">
      {/* Active Students & Baja notice */}
      <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-slate-200/70">
        <span className="flex items-center gap-1 font-bold text-slate-700">
          <Users className="w-3.5 h-3.5 text-[#0055A5]" />
          <span>{activeEnrolled.length} alumnos en pista</span>
        </span>

        {bajasCount > 0 ? (
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-0.5">
            <UserX className="w-2.5 h-2.5" />
            <span>{bajasCount} baja</span>
          </span>
        ) : (
          <span className="text-[10px] text-slate-400">
            {durationHours}h sesión
          </span>
        )}
      </div>

      {/* Financial Details (Ingreso Bruto -> Neto sin IVA -> Coste Monitor) */}
      <div className="space-y-1.5 text-slate-600 bg-white p-2 rounded-lg border border-slate-150">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 text-[11px]">Ingresos pista (Brutos):</span>
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

        <div className="flex items-center justify-between">
          <span className="text-slate-500 text-[11px]">
            Coste monitor {coach ? `(${coach.name.split(' ')[0]})` : ''}:
          </span>
          <span className="font-bold text-slate-700">
            -{costeProfesor.toFixed(2)} €
          </span>
        </div>
      </div>

      {/* Hero Badge: Beneficio Real (Neto sin IVA - Coste monitor) */}
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
