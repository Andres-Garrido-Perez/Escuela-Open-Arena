import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useStudents } from '../../hooks/useStudents';
import { useTariffs } from '../../hooks/useTariffs';
import { useCoaches } from '../../hooks/useCoaches';
import { useSchedule } from '../../hooks/useSchedule';
import { useMonthlyRegistry } from '../../hooks/useMonthlyRegistry';
import { useMonthlyClosures } from '../../hooks/useMonthlyClosures';
import { MonthlyClosuresHistory } from './MonthlyClosuresHistory';
import { CloseMonthModal } from './CloseMonthModal';
import { CoachSalaryModal } from '../coaches/CoachSalaryModal';
import { StudentFormModal } from '../students/StudentFormModal';
import { ConfirmDeleteModal } from '../ui/ConfirmDeleteModal';
import { resolveStudentTariff } from '../../utils/tariffResolver';
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
  Phone,
  Lock,
  Edit2,
  History,
  AlertCircle,
} from 'lucide-react';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';

export const MonthlyBillingTable = () => {
  const { selectedMonth, sport, showProfitability, toggleProfitability } = useSchool();
  const { filteredStudents, updateStudent, deleteStudent } = useStudents();
  const { tariffs } = useTariffs();
  const { filteredCoaches, updateCoach } = useCoaches();
  const { allSlots, slots, enrollments } = useSchedule();
  const { registryMap, setStudentStatus } = useMonthlyRegistry();
  const { isMonthClosed, getClosuresForMonth, closeMonth } = useMonthlyClosures();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [showCoachesBreakdown, setShowCoachesBreakdown] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [coachForSalary, setCoachForSalary] = useState(null);
  const [studentToEdit, setStudentToEdit] = useState(null);
  const [studentToDelete, setStudentToDelete] = useState(null);

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    await deleteStudent(studentToDelete.id);
    setStudentToDelete(null);
    if (studentToEdit?.id === studentToDelete.id) {
      setStudentToEdit(null);
    }
  };

  const handleOpenSalary = (coach) => {
    setCoachForSalary(coach);
    setSalaryModalOpen(true);
  };

  const handleSaveSalary = async (coachId, hourlyCost) => {
    await updateCoach(coachId, { hourly_cost: hourlyCost });
  };

  const handleConfirmCloseMonth = async () => {
    await closeMonth(selectedMonth, coachesBreakdown);
  };

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
        const tariff =
          tariffsById[student.tariff_id] ||
          resolveStudentTariff(student, tariffs, allSlots || slots, enrollments);

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
          registry,
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

  const formatMonthShort = (monthStr) => {
    if (!monthStr) return '';
    try {
      const parsed = parse(monthStr, 'yyyy-MM', new Date(2026, 0, 1));
      return format(parsed, 'MMM yyyy', { locale: es });
    } catch {
      return monthStr;
    }
  };

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

  // Detección inteligente de si el mes está cerrado y si han ocurrido cambios desde el cierre
  const { isClosed, hasPendingChanges } = useMemo(() => {
    const monthClosures = getClosuresForMonth(selectedMonth);
    if (!monthClosures || monthClosures.length === 0) {
      return { isClosed: false, hasPendingChanges: false };
    }

    const savedByCoach = {};
    monthClosures.forEach((c) => {
      savedByCoach[c.coach_id] = {
        revenue: Number(c.total_revenue || 0),
        cost: Number(c.coach_cost || 0),
        profit: Number(c.net_profit || 0),
      };
    });

    const liveCoaches = coachesBreakdown || [];
    let changed = false;

    for (const item of liveCoaches) {
      const coachId = item.coach?.id || item.coach_id;
      const saved = savedByCoach[coachId];
      const currentRevenue = Number((item.gross_revenue ?? item.total_revenue ?? 0).toFixed(2));
      const currentCost = Number((item.coach_cost ?? 0).toFixed(2));
      const currentProfit = Number((item.net_margin ?? item.net_profit ?? 0).toFixed(2));

      if (!saved) {
        if (currentRevenue > 0.05 || currentCost > 0.05) {
          changed = true;
          break;
        }
      } else {
        if (
          Math.abs(currentRevenue - saved.revenue) > 0.05 ||
          Math.abs(currentCost - saved.cost) > 0.05 ||
          Math.abs(currentProfit - saved.profit) > 0.05
        ) {
          changed = true;
          break;
        }
      }
    }

    if (!changed) {
      for (const coachId of Object.keys(savedByCoach)) {
        const saved = savedByCoach[coachId];
        const live = liveCoaches.find((item) => (item.coach?.id || item.coach_id) === coachId);
        if (!live) {
          if (saved.revenue > 0.05 || saved.cost > 0.05) {
            changed = true;
            break;
          }
        }
      }
    }

    return { isClosed: true, hasPendingChanges: changed };
  }, [getClosuresForMonth, selectedMonth, coachesBreakdown]);



  const query = search.trim().toLowerCase();
  const filteredRows = rows.filter(({ student, status }) => {
    const matchesSearch =
      !query ||
      student.full_name.toLowerCase().includes(query) ||
      (student.phone && student.phone.includes(query));

    if (!matchesSearch) return false;
    if (statusFilter === 'activos' && status === 'baja_temporal') return false;
    if (statusFilter === 'bajas' && status !== 'baja_temporal') return false;

    return true;
  });

  const handleStatusChange = async (studentId, newStatus, currentPrice) => {
    try {
      await setStudentStatus(studentId, newStatus, currentPrice);
    } catch (err) {
      alert('Error actualizando estado del alumno: ' + err.message);
    }
  };

  return (
    <div className="flex-1 p-4 lg:p-6 bg-slate-50 overflow-y-auto">
      {/* Top Header & Metrics */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight capitalize m-0 flex items-center gap-2">
              <span>{showProfitability ? 'Facturación & Alumnos' : 'Directorio de Alumnos'} — {formattedMonth}</span>
              {showProfitability && (
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                  Rentabilidad Activa
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {showProfitability
                ? `Gestión de alumnos, cálculo de rentabilidad y desglose por monitor en escuela de ${sport === 'tenis' ? 'Tenis' : 'Pádel'}.`
                : `Gestión de alumnos, asistencias y control de bajas temporales en escuela de ${sport === 'tenis' ? 'Tenis' : 'Pádel'}.`}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {/* Opciones financieras solo visibles cuando Rentabilidad está desbloqueada */}
            {showProfitability && (
              <>
                {/* Botón Cerrar Mes */}
                <button
                  type="button"
                  onClick={() => setCloseModalOpen(true)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                    !isClosed
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : hasPendingChanges
                      ? 'bg-slate-900 text-amber-300 border border-amber-400 hover:bg-slate-800'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                  title={
                    !isClosed
                      ? 'Congelar y guardar en el histórico los beneficios de este mes'
                      : hasPendingChanges
                      ? 'Se detectaron modificaciones contables respecto al cierre guardado. Haz clic para actualizar el histórico.'
                      : 'El mes está cerrado y al día con el histórico congelado'
                  }
                >
                  {!isClosed ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Cerrar Mes y Guardar Histórico</span>
                    </>
                  ) : hasPendingChanges ? (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      <span>Mes Cerrado (Actualizar cambios)</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Mes Cerrado</span>
                    </>
                  )}
                </button>

                {/* Botón Histórico de Beneficios */}
                <button
                  type="button"
                  onClick={() => setShowHistory(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shadow-xs cursor-pointer bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  title="Ver histórico de meses cerrados y beneficios pasados"
                >
                  <History className="w-3.5 h-3.5 text-[#0055A5]" />
                  <span>Histórico Beneficios</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Global Summary Cards: Condicional a showProfitability */}
        {showProfitability ? (
          /* Vista Rentabilidad Desbloqueada: 5 métricas financieras */
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {/* Total Alumnos */}
            <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Alumnos Totales
                </span>
                <Users className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[#0055A5]" />
              </div>
              <div className="text-lg sm:text-xl font-black text-slate-900">
                {filteredStudents.length}
              </div>
              <span className="text-[9px] sm:text-[10px] text-slate-400">
                Escuela de {sport}
              </span>
            </div>

            {/* Facturado / Pagado */}
            <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-emerald-200/80 shadow-xs bg-emerald-50/20">
              <div className="flex items-center justify-between text-emerald-600 mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                  Recaudado Bruto
                </span>
                <CheckCircle2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-emerald-600" />
              </div>
              <div className="text-lg sm:text-xl font-black text-emerald-700 truncate">
                {totalRecaudado.toFixed(2)} €
              </div>
              <span className="text-[9px] sm:text-[10px] text-emerald-600 font-medium">
                Con IVA incluido
              </span>
            </div>

            {/* Facturación Neta (sin 21% IVA) */}
            <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-600 mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                  Base Neta (-21%)
                </span>
                <TrendingUp className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-slate-500" />
              </div>
              <div className="text-lg sm:text-xl font-black text-slate-900 truncate">
                {totalRecaudadoNetoSinIva.toFixed(2)} €
              </div>
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium">
                Ingreso real club
              </span>
            </div>

            {/* Coste Total Monitores */}
            <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                  Nómina Monitores
                </span>
                <Briefcase className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-slate-500" />
              </div>
              <div className="text-lg sm:text-xl font-black text-slate-800 truncate">
                -{totalCosteMonitores.toFixed(2)} €
              </div>
              <span className="text-[9px] sm:text-[10px] text-slate-400">
                Coste mensual
              </span>
            </div>

            {/* Beneficio Neto Escuela: Spans 2 cols on mobile */}
            <div
              className={`col-span-2 lg:col-span-1 p-3 sm:p-3.5 rounded-2xl border shadow-xs ${
                totalBeneficioEscuela >= 0
                  ? 'bg-sky-50/50 border-sky-200'
                  : 'bg-rose-50/50 border-rose-200'
              }`}
            >
              <div className="flex items-center justify-between text-[#0055A5] mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                  Margen Neto Real Club
                </span>
                <TrendingUp className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[#0055A5]" />
              </div>
              <div
                className={`text-lg sm:text-xl font-black ${
                  totalBeneficioEscuela >= 0
                    ? 'text-[#0055A5]'
                    : 'text-rose-700'
                }`}
              >
                {totalBeneficioEscuela >= 0 ? '+' : ''}
                {totalBeneficioEscuela.toFixed(2)} €
              </div>
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium">
                Base sin IVA - Nóminas
              </span>
            </div>
          </div>
        ) : (
          /* Vista Rentabilidad Bloqueada: Solo métricas de Alumnos */
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Total Alumnos */}
            <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Total Alumnos
                </span>
                <Users className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[#0055A5]" />
              </div>
              <div className="text-lg sm:text-xl font-black text-slate-900">
                {filteredStudents.length}
              </div>
              <span className="text-[9px] sm:text-[10px] text-slate-400">
                Inscritos en escuela de {sport}
              </span>
            </div>

            {/* Alumnos Activos */}
            <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-emerald-200/80 shadow-xs bg-emerald-50/20">
              <div className="flex items-center justify-between text-emerald-600 mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                  Alumnos Activos
                </span>
                <CheckCircle2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-emerald-600" />
              </div>
              <div className="text-lg sm:text-xl font-black text-emerald-700">
                {rows.filter((r) => r.status !== 'baja_temporal').length}
              </div>
              <span className="text-[9px] sm:text-[10px] text-emerald-600 font-medium">
                En clases regulares
              </span>
            </div>

            {/* Bajas Temporales */}
            <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-rose-200/70 shadow-xs bg-rose-50/20">
              <div className="flex items-center justify-between text-rose-600 mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                  Bajas Temporales
                </span>
                <UserX className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-rose-500" />
              </div>
              <div className="text-lg sm:text-xl font-black text-rose-700">
                {totalBajas}
              </div>
              <span className="text-[9px] sm:text-[10px] text-rose-500 font-medium">
                Mes de {formattedMonth}
              </span>
            </div>

            {/* Alumnos en Prueba */}
            <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-amber-200/70 shadow-xs bg-amber-50/20">
              <div className="flex items-center justify-between text-amber-600 mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                  En Periodo de Prueba
                </span>
                <Clock className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-amber-500" />
              </div>
              <div className="text-lg sm:text-xl font-black text-amber-700">
                {rows.filter((r) => r.student?.status === 'pendiente_aprobacion').length}
              </div>
              <span className="text-[9px] sm:text-[10px] text-amber-600 font-medium">
                Pendientes de confirmación
              </span>
            </div>
          </div>
        )}
      </div>

      {/* SECTION: DESGLOSE DE RENTABILIDAD POR MONITOR */}
      {showProfitability && showCoachesBreakdown && (
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
                        <span className="text-slate-600 font-medium flex items-center gap-1">
                          Coste monitor{' '}
                          <button
                            type="button"
                            onClick={() => handleOpenSalary(coach)}
                            className="inline-flex items-center gap-0.5 text-[10px] text-[#0055A5] hover:underline font-bold cursor-pointer"
                            title="Haz clic para editar el sueldo / coste por hora de este monitor"
                          >
                            <span>({weeklyHours}h/sem × 4s × {hourlyRate}€/h)</span>
                            <Edit2 className="w-2.5 h-2.5 ml-0.5" />
                          </button>
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
                    <button
                      type="button"
                      onClick={() => handleOpenSalary(coach)}
                      className="text-[10px] text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2 py-1 rounded-lg mt-2 block w-full text-center font-bold cursor-pointer transition-colors"
                    >
                      ✏️ Asignar sueldo/hora a {coach.name} para calcular nómina
                    </button>
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
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs w-full sm:w-auto overflow-x-auto no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('todos')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                statusFilter === 'todos'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Todos ({rows.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('activos')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                statusFilter === 'activos'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Activos ({rows.filter((r) => r.status !== 'baja_temporal').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('bajas')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                statusFilter === 'bajas'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Bajas ({totalBajas})
            </button>
          </div>
        </div>

        {/* MOBILE VIEW: Touch-friendly Student Cards (Visible on < md) */}
        <div className="md:hidden divide-y divide-slate-100 p-2 sm:p-3 space-y-2.5">
          {filteredRows.map(({ student, tariff, status, price, registry }) => {
            const isBaja = status === 'baja_temporal';
            const cleanPhone = student.phone ? student.phone.replace(/[^0-9]/g, '') : '';
            const isPrueba = student.status === 'pendiente_aprobacion';

            return (
              <div
                key={student.id}
                className={`p-3 rounded-2xl border transition-all ${
                  isBaja
                    ? 'bg-slate-50/70 border-slate-200'
                    : 'bg-white border-slate-200 shadow-2xs'
                }`}
              >
                {/* Header: Name & Price */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`font-black text-sm tracking-tight text-slate-900`}
                      >
                        {student.full_name}
                      </span>
                      {student.is_member && (
                        <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded-full border border-sky-200">
                          Abonado
                        </span>
                      )}
                      {isBaja && (
                        <Badge variant="baja" size="xs">
                          [BAJA]
                        </Badge>
                      )}
                    </div>

                    {/* Plan & Phone */}
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 flex-wrap">
                      <span className="font-semibold text-slate-600">
                        {tariff ? `${tariff.code} - ${tariff.category_name}` : (student.category_name || 'Estándar')}
                      </span>
                      {student.phone && (
                        <>
                          <span>•</span>
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-0.5 text-emerald-600 font-semibold"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{student.phone}</span>
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Monthly Amount */}
                  {showProfitability && (
                    <div className="text-right shrink-0">
                      <span className="text-base font-black text-slate-900 block">
                        {isBaja ? '0.00 €' : `${price.toFixed(2)} €`}
                      </span>
                      <span className="text-[10px] text-slate-400">mensual</span>
                    </div>
                  )}
                </div>

                {/* Status Indicator & Quick Action Buttons */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    {isBaja ? (
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700 border border-slate-300">
                          <UserX className="w-3 h-3 text-slate-600" />
                          <span>Baja</span>
                        </span>
                        {registry?.inheritedFromMonth && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            Desde {formatMonthShort(registry.inheritedFromMonth)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Activo</span>
                        </span>
                        {isPrueba && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-full">
                            Prueba
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick Action Buttons: Editar y Baja */}
                  <div className="inline-flex items-center gap-1.5">
                    {/* Botón Editar Alumno */}
                    <button
                      type="button"
                      onClick={() => setStudentToEdit(student)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all bg-white hover:bg-slate-100 text-[#0055A5] border border-slate-200 shadow-2xs cursor-pointer"
                      title="Editar datos del alumno"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>

                    {/* Toggle Baja */}
                    <button
                      type="button"
                      onClick={() =>
                        handleStatusChange(
                          student.id,
                          isBaja ? 'pagado' : 'baja_temporal',
                          price
                        )
                      }
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isBaja
                          ? 'bg-slate-900 text-white hover:bg-slate-800'
                          : 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200/80'
                      }`}
                    >
                      {isBaja ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Reactivar</span>
                        </>
                      ) : (
                        <>
                          <UserX className="w-3 h-3 text-rose-500" />
                          <span>Baja</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredRows.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              No se encontraron alumnos para los filtros aplicados.
            </div>
          )}
        </div>

        {/* DESKTOP VIEW: Full Data Table (Visible on md+) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Alumno</th>
                <th className="py-3 px-4">Teléfono</th>
                <th className="py-3 px-4">Abonado</th>
                <th className="py-3 px-4">Tarifa / Plan</th>
                {showProfitability && <th className="py-3 px-4">Importe Mensual</th>}
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map(({ student, tariff, status, price, registry }) => {
                const isBaja = status === 'baja_temporal';
                const isPrueba = student.status === 'pendiente_aprobacion';

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
                        <span>
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
                    {showProfitability && (
                      <td className="py-3 px-4 font-black text-slate-900">
                        {isBaja ? '0.00 € (Baja)' : `${price.toFixed(2)} €`}
                      </td>
                    )}

                    {/* Estado Badge (Activo / Baja Temporal) */}
                    <td className="py-3 px-4">
                      {isBaja ? (
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700 border border-slate-300">
                            <UserX className="w-3.5 h-3.5 text-slate-600" />
                            <span>Baja Temporal</span>
                          </span>
                          {registry?.inheritedFromMonth && (
                            <span className="text-[10px] text-slate-400 font-medium pl-1">
                              Desde {formatMonthShort(registry.inheritedFromMonth)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Activo</span>
                          </span>
                          {isPrueba && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-full">
                              Prueba
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Acciones Rápidas: Editar y Baja */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {/* Botón Editar Alumno */}
                        <button
                          type="button"
                          onClick={() => setStudentToEdit(student)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all bg-white hover:bg-slate-100 text-[#0055A5] border border-slate-200 hover:border-[#0055A5] shadow-2xs cursor-pointer"
                          title="Editar datos del alumno"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Editar</span>
                        </button>

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
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isBaja
                              ? 'bg-slate-900 text-white hover:bg-slate-800'
                              : 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200/80'
                          }`}
                          title="Alternar baja temporal para este mes"
                        >
                          {isBaja ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Reactivar</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-3.5 h-3.5 text-rose-500" />
                              <span>Baja</span>
                            </>
                          )}
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

      {/* Modal Histórico de Beneficios */}
      <MonthlyClosuresHistory
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />

      {/* Modal Cierre Mensual */}
      <CloseMonthModal
        isOpen={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        monthYear={selectedMonth}
        formattedMonth={formattedMonth}
        coachesBreakdown={coachesBreakdown}
        totalRecaudado={totalRecaudado}
        totalCosteMonitores={totalCosteMonitores}
        totalBeneficioEscuela={totalBeneficioEscuela}
        isAlreadyClosed={isClosed}
        hasPendingChanges={hasPendingChanges}
        onConfirmClose={handleConfirmCloseMonth}
      />

      {/* Modal Rápido Sueldo Monitor */}
      <CoachSalaryModal
        isOpen={salaryModalOpen}
        onClose={() => setSalaryModalOpen(false)}
        coach={coachForSalary}
        onSaveSalary={handleSaveSalary}
      />

      {/* Modal Edición de Alumno */}
      <StudentFormModal
        isOpen={!!studentToEdit}
        onClose={() => setStudentToEdit(null)}
        studentToEdit={studentToEdit}
        onSave={async (studentData) => {
          if (studentToEdit?.id) {
            const updated = await updateStudent(studentToEdit.id, studentData);
            setStudentToEdit(null);
            return updated;
          }
        }}
        onDelete={(st) => setStudentToDelete(st)}
      />

      {/* Modal Confirmación de Eliminación de Alumno */}
      <ConfirmDeleteModal
        isOpen={Boolean(studentToDelete)}
        onClose={() => setStudentToDelete(null)}
        onConfirm={handleDeleteStudent}
        title="¿Eliminar Alumno?"
        itemName={studentToDelete?.full_name}
        itemType="alumno"
        description={`¿Estás seguro de que deseas eliminar permanentemente a "${studentToDelete?.full_name}"? Esta acción lo desmatriculará de todas las clases y borrará su ficha.`}
        confirmText="Sí, Eliminar Alumno"
      />
    </div>
  );
};
