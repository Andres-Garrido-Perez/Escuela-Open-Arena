import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useStudents } from '../../hooks/useStudents';
import { useTariffs } from '../../hooks/useTariffs';
import { useCoaches } from '../../hooks/useCoaches';
import { useSchedule } from '../../hooks/useSchedule';
import { useMonthlyRegistry } from '../../hooks/useMonthlyRegistry';
import { Badge } from '../ui/Badge';
import { SearchInput } from '../ui/SearchInput';
import {
  CheckCircle2,
  Clock,
  UserX,
  TrendingUp,
  Briefcase,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';

export const MonthlyBillingTable = () => {
  const { selectedMonth, sport } = useSchool();
  const { filteredStudents } = useStudents();
  const { tariffs } = useTariffs();
  const { filteredCoaches } = useCoaches();
  const { allSlots, slots, enrollments } = useSchedule();
  const { registryMap, setStudentStatus } = useMonthlyRegistry();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [showCoachesBreakdown, setShowCoachesBreakdown] = useState(true);

  // Month title formatted
  const formattedMonth = useMemo(() => {
    const parsedMonth = parse(selectedMonth, 'yyyy-MM', new Date(2026, 0, 1));
    return format(parsedMonth, 'MMMM yyyy', { locale: es });
  }, [selectedMonth]);

  const tariffsById = useMemo(() => {
    return tariffs.reduce((acc, t) => {
      acc[t.id] = t;
      return acc;
    }, {});
  }, [tariffs]);

  // Map student_id -> { student, tariff, status, price, notes }
  // DEFAULT STATUS IS 'pagado' (a petición del usuario)
  const { rows, rowsByStudentId, totalRecaudado, totalPendiente, totalBajas } =
    useMemo(() => {
      let recaudado = 0;
      let pendiente = 0;
      let bajas = 0;
      const byStudentId = {};

      const computedRows = filteredStudents.map((student) => {
        const registry = registryMap[student.id];
        // Por defecto todos aparecen como 'pagado' salvo que expresamente se hayan marcado
        const status = registry?.status || 'pagado';
        const tariff = tariffsById[student.tariff_id];

        let price = 0;
        if (
          registry?.amount_expected !== null &&
          registry?.amount_expected !== undefined
        ) {
          price = Number(registry.amount_expected);
        } else if (tariff) {
          price = student.is_member
            ? Number(tariff.price_member || tariff.price_non_member)
            : Number(tariff.price_non_member);
        }

        if (status === 'pagado') {
          recaudado += price;
        } else if (status === 'pendiente') {
          pendiente += price;
        } else if (status === 'baja_temporal') {
          bajas += 1;
        }

        const item = {
          student,
          tariff,
          status,
          price,
          notes: registry?.notes || '',
        };

        byStudentId[student.id] = item;
        return item;
      });

      return {
        rows: computedRows,
        rowsByStudentId: byStudentId,
        totalRecaudado: recaudado,
        totalPendiente: pendiente,
        totalBajas: bajas,
      };
    }, [filteredStudents, registryMap, tariffsById]);

  // Calculate coach breakdown & profitability ALWAYS across ALL slots
  const {
    coachesBreakdown,
    totalCosteMonitores,
    totalRecaudadoNetoSinIva,
    totalBeneficioEscuela,
  } = useMemo(() => {

      const effectiveSlots = allSlots || slots;

      // Group slots by coach_id
      const slotsByCoach = effectiveSlots.reduce((acc, s) => {
        const cid = s.coach_id || 'unassigned';
        if (!acc[cid]) acc[cid] = [];
        acc[cid].push(s);
        return acc;
      }, {});


      // Map each student to count of total slots enrolled in (to attribute revenue proportionally)
      const studentSlotCount = {};
      enrollments.forEach((e) => {
        studentSlotCount[e.student_id] = (studentSlotCount[e.student_id] || 0) + 1;
      });

      let sumCost = 0;
      let sumRevenueAllCoaches = 0;

      const breakdown = filteredCoaches.map((coach) => {
        const coachSlots = slotsByCoach[coach.id] || [];

        // 1. Calculate weekly & monthly hours
        let weeklyHours = 0;
        coachSlots.forEach((slot) => {
          const [sh = 0, sm = 0] = (slot.start_time || '00:00')
            .split(':')
            .map(Number);
          const [eh = 0, em = 0] = (slot.end_time || '00:00')
            .split(':')
            .map(Number);
          const duration = Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
          weeklyHours += duration;
        });

        // 4 weeks per month approx
        const monthlyHours = weeklyHours * 4;
        const hourlyRate = Number(coach.hourly_cost) || 0;
        const cost = monthlyHours * hourlyRate;
        sumCost += cost;

        // 2. Identify students enrolled in this coach's classes & calculate revenue
        const coachSlotIds = new Set(coachSlots.map((s) => s.id));
        const coachEnrollments = enrollments.filter((e) =>
          coachSlotIds.has(e.class_slot_id)
        );

        const uniqueStudentIds = new Set(coachEnrollments.map((e) => e.student_id));
        let activeStudentsCount = 0;
        let revenue = 0;

        coachEnrollments.forEach((enroll) => {
          const studentRow = rowsByStudentId[enroll.student_id];
          if (!studentRow) return;

          // If student is on temporary leave, they don't generate income
          if (studentRow.status === 'baja_temporal') return;

          const totalClassesOfStudent =
            studentSlotCount[enroll.student_id] || 1;
          const share = studentRow.price / totalClassesOfStudent;
          revenue += share;
        });

        uniqueStudentIds.forEach((sid) => {
          const studentRow = rowsByStudentId[sid];
          if (studentRow && studentRow.status !== 'baja_temporal') {
            activeStudentsCount += 1;
          }
        });

        // FÓRMULA CONTABLE EXACTA DE LA ESCUELA:
        // 1. Ingreso Bruto Mensual (gross_revenue): Suma de lo que pagan los alumnos
        const gross_revenue = revenue;
        // 2. Ingreso Neto sin 21% IVA (net_revenue): gross_revenue / 1.21
        const net_revenue = gross_revenue / 1.21;
        // 3. Coste Mensual del Monitor (coach_cost): Horas a la semana * 4 semanas * coach.hourly_cost
        const coach_cost = cost;
        // 4. Margen Neto Final (net_margin): net_revenue - coach_cost
        const net_margin = net_revenue - coach_cost;
        const marginPct = net_revenue > 0 ? (net_margin / net_revenue) * 100 : 0;

        sumRevenueAllCoaches += gross_revenue;

        return {
          coach,
          slotsCount: coachSlots.length,
          weeklyHours,
          monthlyHours,
          hourlyRate,
          activeStudentsCount,
          gross_revenue,
          net_revenue,
          coach_cost,
          net_margin,
          marginPct,
        };
      });

      // Cálculos globales de la escuela sin IVA
      const totalRecaudadoNetoSinIva = totalRecaudado / 1.21;
      const totalBeneficioNetoEscuela = totalRecaudadoNetoSinIva - sumCost;

      return {
        coachesBreakdown: breakdown,
        totalCosteMonitores: sumCost,
        totalRecaudadoNetoSinIva,
        totalBeneficioEscuela: totalBeneficioNetoEscuela,
      };
    }, [allSlots, slots, enrollments, filteredCoaches, rowsByStudentId, totalRecaudado]);



  const query = search.trim().toLowerCase();
  const filteredRows = rows.filter(({ student, status }) => {
    const matchesSearch =
      !query ||
      student.full_name.toLowerCase().includes(query) ||
      (student.phone && student.phone.includes(query));

    if (!matchesSearch) return false;
    if (statusFilter !== 'todos' && status !== statusFilter) return false;

    return true;
  });

  const handleStatusChange = async (studentId, newStatus, currentPrice) => {
    try {
      await setStudentStatus(studentId, newStatus, currentPrice);
    } catch (err) {
      alert('Error actualizando estado del recibo: ' + err.message);
    }
  };

  return (
    <div className="flex-1 p-4 lg:p-6 bg-slate-50 overflow-y-auto">
      {/* Top Header & Metrics */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight capitalize m-0">
              Control de Facturación & Rentabilidad — {formattedMonth}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Estado de cobros (por defecto pagados) y desglose de costes por
              monitor en escuela de {sport === 'tenis' ? 'Tenis' : 'Pádel'}.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCoachesBreakdown(!showCoachesBreakdown)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
          >
            <Briefcase className="w-3.5 h-3.5 text-[#0055A5]" />
            <span>
              {showCoachesBreakdown
                ? 'Ocultar Rentabilidad Monitores'
                : 'Ver Rentabilidad Monitores'}
            </span>
            {showCoachesBreakdown ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Global Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Total Alumnos */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Alumnos Totales
              </span>
              <Users className="w-4 h-4 text-[#0055A5]" />
            </div>
            <div className="text-xl font-black text-slate-900">
              {filteredStudents.length}
            </div>
            <span className="text-[10px] text-slate-400">
              Escuela de {sport}
            </span>
          </div>

          {/* Facturado / Pagado */}
          <div className="bg-white p-3.5 rounded-2xl border border-emerald-200/80 shadow-xs bg-emerald-50/20">
            <div className="flex items-center justify-between text-emerald-600 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Recaudado Bruto (con IVA)
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-emerald-700">
              {totalRecaudado.toFixed(2)} €
            </div>
            <span className="text-[10px] text-emerald-600 font-medium">
              Total pagado por familias
            </span>
          </div>

          {/* Facturación Neta (sin 21% IVA) */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-600 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Base Neta (sin 21% IVA)
              </span>
              <TrendingUp className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-xl font-black text-slate-900">
              {totalRecaudadoNetoSinIva.toFixed(2)} €
            </div>
            <span className="text-[10px] text-slate-500 font-medium">
              Ingreso real escuela
            </span>
          </div>

          {/* Coste Total Monitores */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Nómina Monitores
              </span>
              <Briefcase className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-xl font-black text-slate-800">
              -{totalCosteMonitores.toFixed(2)} €
            </div>
            <span className="text-[10px] text-slate-400">
              Coste horas mensuales
            </span>
          </div>

          {/* Beneficio Neto Escuela */}
          <div
            className={`p-3.5 rounded-2xl border shadow-xs ${
              totalBeneficioEscuela >= 0
                ? 'bg-sky-50/40 border-sky-200'
                : 'bg-rose-50/40 border-rose-200'
            }`}
          >
            <div className="flex items-center justify-between text-[#0055A5] mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Margen Neto Real Club
              </span>
              <TrendingUp className="w-4 h-4 text-[#0055A5]" />
            </div>
            <div
              className={`text-xl font-black ${
                totalBeneficioEscuela >= 0
                  ? 'text-[#0055A5]'
                  : 'text-rose-700'
              }`}
            >
              {totalBeneficioEscuela >= 0 ? '+' : ''}
              {totalBeneficioEscuela.toFixed(2)} €
            </div>
            <span className="text-[10px] text-slate-500 font-medium">
              Base sin IVA - Nóminas
            </span>
          </div>
        </div>
      </div>

      {/* SECTION: DESGLOSE DE RENTABILIDAD POR MONITOR */}
      {showCoachesBreakdown && (
        <div className="mb-6 bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight m-0 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#0055A5]" />
                <span>Desglose de Rentabilidad por Monitor</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Ingresos brutos generados por sus alumnos activos vs coste de
                sus horas de pista en {formattedMonth}.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-150">
              {coachesBreakdown.length} Monitores en activo
            </span>
          </div>

          {/* Coaches Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {coachesBreakdown.map((item) => {
              const {
                coach,
                slotsCount,
                weeklyHours,
                monthlyHours,
                hourlyRate,
                activeStudentsCount,
                gross_revenue,
                net_revenue,
                coach_cost,
                net_margin,
                marginPct,
              } = item;

              const isPositive = net_margin >= 0;
              const colorDot = coach.color_theme || '#0055A5';

              return (
                <div
                  key={coach.id}
                  className="bg-slate-50/70 rounded-xl border border-slate-200/90 p-4 flex flex-col justify-between hover:border-slate-300 hover:bg-slate-50 transition-all"
                >
                  {/* Top: Name & Color */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs ring-2 ring-white"
                          style={{ backgroundColor: colorDot }}
                        />
                        <span className="font-black text-slate-800 text-sm">
                          {coach.name}
                        </span>
                      </div>

                      <Badge
                        variant={isPositive ? 'green' : 'red'}
                        size="xs"
                        className="font-bold"
                      >
                        {marginPct.toFixed(0)}% Margen
                      </Badge>
                    </div>

                    {/* Stat Badges */}
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div className="bg-white p-2 rounded-lg border border-slate-150">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Alumnos Activos
                        </span>
                        <span className="font-black text-slate-800">
                          {activeStudentsCount} alumnos
                        </span>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-slate-150">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Clases y Horas
                        </span>
                        <span className="font-black text-slate-800">
                          {slotsCount} clases • {weeklyHours}h/sem ({monthlyHours}h/mes)
                        </span>
                      </div>
                    </div>

                    {/* Financial Equation: Ingresos Brutos -> Neto sin IVA -> Coste -> Margen Neto */}
                    <div className="space-y-2 py-2.5 px-3 bg-white rounded-lg border border-slate-150 text-xs">
                      {/* 1. Ingresos generados (Brutos) */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">
                          Ingresos generados (Brutos):
                        </span>
                        <span className="font-bold text-slate-900">
                          +{gross_revenue.toFixed(2)} €
                        </span>
                      </div>

                      {/* 2. Ingresos netos sin IVA (desglose) */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50/80 px-2 py-1 rounded border border-slate-100">
                        <span>Base neta (sin 21% IVA):</span>
                        <span className="font-semibold text-slate-700">
                          {net_revenue.toFixed(2)} €
                        </span>
                      </div>

                      {/* 3. Coste monitor */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-medium">
                          Coste monitor{' '}
                          <span className="text-[10px] text-slate-400">
                            ({weeklyHours}h/sem × 4s × {hourlyRate}€/h)
                          </span>
                          :
                        </span>
                        <span className="font-bold text-slate-700">
                          -{coach_cost.toFixed(2)} €
                        </span>
                      </div>

                      {/* 4. Margen Neto (Ingreso sin IVA - coste monitor) */}
                      <div className="pt-2 border-t border-slate-150 flex items-center justify-between font-black">
                        <div>
                          <span className="text-slate-900 block">Margen Neto:</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            Base neta - Nómina
                          </span>
                        </div>
                        <span
                          className={`text-base font-black ${
                            isPositive ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {isPositive ? '+' : ''}
                          {net_margin.toFixed(2)} €
                        </span>
                      </div>
                    </div>
                  </div>

                  {hourlyRate === 0 && (
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-2 block text-center">
                      ℹ️ Añade su coste/hora en la pestaña de monitor para calcular nómina exacta.
                    </span>
                  )}
                </div>
              );
            })}


            {coachesBreakdown.length === 0 && (
              <div className="col-span-full py-8 text-center text-slate-400 text-xs">
                No hay monitores registrados para calcular rentabilidad.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TABLE CONTAINER: ALUMNOS BILLING TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-72">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nombre alumno..."
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs w-full sm:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('todos')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'todos'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Todos ({rows.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pagado')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'pagado'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Pagados (
              {rows.filter((r) => r.status === 'pagado').length}
              )
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pendiente')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'pendiente'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Pendientes ({totalPendiente > 0 ? rows.filter((r) => r.status === 'pendiente').length : 0})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('baja_temporal')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'baja_temporal'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Bajas Temporales ({totalBajas})
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Alumno</th>
                <th className="py-3 px-4">Teléfono</th>
                <th className="py-3 px-4">Abonado</th>
                <th className="py-3 px-4">Tarifa / Plan</th>
                <th className="py-3 px-4">Importe Mensual</th>
                <th className="py-3 px-4">Estado del Recibo</th>
                <th className="py-3 px-4 text-right">Acción Rápida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map(({ student, tariff, status, price }) => {
                const isBaja = status === 'baja_temporal';
                const isPagado = status === 'pagado';
                const isPendiente = status === 'pendiente';

                return (
                  <tr
                    key={student.id}
                    className={`hover:bg-slate-50/60 transition-colors ${
                      isBaja ? 'bg-slate-50/40 text-slate-400' : ''
                    }`}
                  >
                    {/* Alumno */}
                    <td className="py-3 px-4 font-bold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={
                            isBaja ? 'line-through text-slate-400' : ''
                          }
                        >
                          {student.full_name}
                        </span>
                        {isBaja && (
                          <Badge variant="baja" size="xs">
                            [BAJA]
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* Teléfono */}
                    <td className="py-3 px-4 text-slate-500">
                      {student.phone || '—'}
                    </td>

                    {/* Abonado */}
                    <td className="py-3 px-4">
                      {student.is_member ? (
                        <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                          Abonado
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">No</span>
                      )}
                    </td>

                    {/* Tarifa */}
                    <td className="py-3 px-4">
                      {tariff ? (
                        <span className="font-semibold text-slate-700">
                          {tariff.code} - {tariff.category_name}
                        </span>
                      ) : student.category_name ? (
                        <span className="text-slate-500">
                          {student.category_name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Estándar</span>
                      )}
                    </td>

                    {/* Importe */}
                    <td className="py-3 px-4 font-black text-slate-900">
                      {isBaja ? '0.00 € (Baja)' : `${price.toFixed(2)} €`}
                    </td>

                    {/* Estado Badge */}
                    <td className="py-3 px-4">
                      {isPagado && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Pagado</span>
                        </span>
                      )}
                      {isPendiente && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <Clock className="w-3.5 h-3.5 text-amber-700" />
                          <span>Pendiente de Pago</span>
                        </span>
                      )}
                      {isBaja && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700 border border-slate-300">
                          <UserX className="w-3.5 h-3.5 text-slate-600" />
                          <span>Baja Temporal</span>
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        {/* Botón para cambiar entre Pagado y Pendiente */}
                        {isPagado ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleStatusChange(
                                student.id,
                                'pendiente',
                                price
                              )
                            }
                            className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 cursor-pointer"
                            title="Marcar como pendiente si aún no ha pagado"
                          >
                            Marcar Pendiente
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleStatusChange(
                                student.id,
                                'pagado',
                                price
                              )
                            }
                            className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                            title="Marcar como pagado"
                          >
                            Marcar Pagado
                          </button>
                        )}

                        {/* Botón de Baja Temporal */}
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange(
                              student.id,
                              isBaja ? 'pagado' : 'baja_temporal',
                              price
                            )
                          }
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isBaja
                              ? 'bg-slate-900 text-white hover:bg-slate-800'
                              : 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700'
                          }`}
                          title="Alternar baja temporal para este mes"
                        >
                          {isBaja ? 'Reactivar' : 'Baja'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    No se encontraron alumnos para los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
