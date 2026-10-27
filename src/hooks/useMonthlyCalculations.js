import { useMemo, useCallback } from 'react';
import { useSchool } from '../context/SchoolContext';
import { useStudents } from './useStudents';
import { useTariffs } from './useTariffs';
import { useCoaches } from './useCoaches';
import { useSchedule } from './useSchedule';
import { useMonthlyRegistry } from './useMonthlyRegistry';
import { useMonthlyClosures } from './useMonthlyClosures';
import { resolveStudentTariff } from '../utils/tariffResolver';
import { parse, format } from 'date-fns';
import { es } from 'date-fns/locale';

export const useMonthlyCalculations = (targetMonth = null) => {
  const {
    selectedMonth: contextMonth,
    isCurrentMonthUnlocked,
    lockMonthEditing,
  } = useSchool();
  const selectedMonth = targetMonth || contextMonth;

  const { filteredStudents } = useStudents();
  const { tariffs } = useTariffs();
  const { filteredCoaches } = useCoaches();
  const { allSlots, slots, enrollments } = useSchedule();
  const { registryMap } = useMonthlyRegistry();
  const { getClosuresForMonth, closeMonth, isMonthClosed } = useMonthlyClosures();

  const formattedMonth = useMemo(() => {
    if (!selectedMonth) return '';
    try {
      const parsed = parse(selectedMonth, 'yyyy-MM', new Date(2026, 0, 1));
      return format(parsed, 'MMMM yyyy', { locale: es });
    } catch {
      return selectedMonth;
    }
  }, [selectedMonth]);

  const tariffsById = useMemo(() => {
    return tariffs.reduce((acc, t) => {
      acc[t.id] = t;
      return acc;
    }, {});
  }, [tariffs]);

  // 1. Calculate student rows and totals
  const {
    rows,
    rowsByStudentId,
    totalRecaudado,
    totalPendiente,
    totalBajas,
  } = useMemo(() => {
    let recaudado = 0;
    let pendiente = 0;
    let bajas = 0;
    const byStudentId = {};

    const computedRows = filteredStudents.map((student) => {
      const registry = registryMap[student.id];
      const status = registry?.status || 'pagado';
      const tariff =
        tariffsById[student.tariff_id] ||
        resolveStudentTariff(student, tariffs, allSlots || slots, enrollments);

      let price = 0;
      if (
        registry?.amount_expected !== null &&
        registry?.amount_expected !== undefined &&
        Number(registry.amount_expected) > 0
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
  }, [filteredStudents, registryMap, tariffsById, tariffs, allSlots, slots, enrollments]);

  // 2. Calculate coach breakdown & profitability
  const {
    coachesBreakdown,
    totalCosteMonitores,
    totalRecaudadoNetoSinIva,
    totalBeneficioEscuela,
  } = useMemo(() => {
    const effectiveSlots = allSlots || slots;

    const slotsByCoach = effectiveSlots.reduce((acc, s) => {
      const cid = s.coach_id || 'unassigned';
      if (!acc[cid]) acc[cid] = [];
      acc[cid].push(s);
      return acc;
    }, {});

    const studentSlotCount = {};
    enrollments.forEach((e) => {
      studentSlotCount[e.student_id] = (studentSlotCount[e.student_id] || 0) + 1;
    });

    let sumCost = 0;
    let sumRevenueAllCoaches = 0;

    const breakdown = filteredCoaches.map((coach) => {
      const coachSlots = slotsByCoach[coach.id] || [];

      let weeklyHours = 0;
      coachSlots.forEach((slot) => {
        const [sh = 0, sm = 0] = (slot.start_time || '00:00').split(':').map(Number);
        const [eh = 0, em = 0] = (slot.end_time || '00:00').split(':').map(Number);
        const duration = Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
        weeklyHours += duration;
      });

      const monthlyHours = weeklyHours * 4;
      const hourlyRate = Number(coach.hourly_cost) || 0;
      const cost = monthlyHours * hourlyRate;
      sumCost += cost;

      const coachSlotIds = new Set(coachSlots.map((s) => s.id));
      const coachEnrollments = enrollments.filter((e) =>
        coachSlotIds.has(e.class_slot_id)
      );
      const uniqueStudentIds = new Set(coachEnrollments.map((e) => e.student_id));

      let activeStudentsCount = 0;
      let bajasCount = 0;
      let pruebaCount = 0;
      let revenue = 0;

      coachEnrollments.forEach((enroll) => {
        const studentRow = rowsByStudentId[enroll.student_id];
        if (!studentRow) return;

        if (studentRow.status === 'baja_temporal') return;

        const totalClassesOfStudent = studentSlotCount[enroll.student_id] || 1;
        const share = studentRow.price / totalClassesOfStudent;
        revenue += share;
      });

      uniqueStudentIds.forEach((sid) => {
        const studentRow = rowsByStudentId[sid];
        if (studentRow) {
          if (studentRow.status === 'baja_temporal') {
            bajasCount += 1;
          } else {
            activeStudentsCount += 1;
          }
          if (studentRow.student?.status === 'pendiente_aprobacion') {
            pruebaCount += 1;
          }
        }
      });

      const gross_revenue = revenue;
      const net_revenue = gross_revenue / 1.21;
      const coach_cost = cost;
      const net_margin = net_revenue - coach_cost;
      const marginPct = net_revenue > 0 ? (net_margin / net_revenue) * 100 : 0;

      sumRevenueAllCoaches += gross_revenue;

      return {
        coach,
        slotsCount: coachSlots.length,
        weeklyHours,
        monthlyHours,
        hourlyRate,
        totalStudentsCount: uniqueStudentIds.size,
        activeStudentsCount,
        bajasCount,
        pruebaCount,
        gross_revenue,
        net_revenue,
        coach_cost,
        net_margin,
        marginPct,
      };
    });

    const totalRecaudadoNetoSinIva = totalRecaudado / 1.21;
    const totalBeneficioNetoEscuela = totalRecaudadoNetoSinIva - sumCost;

    return {
      coachesBreakdown: breakdown,
      totalCosteMonitores: sumCost,
      totalRecaudadoNetoSinIva,
      totalBeneficioEscuela: totalBeneficioNetoEscuela,
    };
  }, [allSlots, slots, enrollments, filteredCoaches, rowsByStudentId, totalRecaudado]);

  // 3. Detect closures & pending changes
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

    return {
      isClosed: true,
      hasPendingChanges: changed,
    };
  }, [getClosuresForMonth, selectedMonth, coachesBreakdown]);

  const handleCloseMonth = useCallback(async () => {
    await closeMonth(selectedMonth, coachesBreakdown);
    if (lockMonthEditing) {
      lockMonthEditing(selectedMonth);
    }
  }, [closeMonth, selectedMonth, coachesBreakdown, lockMonthEditing]);

  return {
    selectedMonth,
    formattedMonth,
    rows,
    rowsByStudentId,
    totalRecaudado,
    totalPendiente,
    totalBajas,
    coachesBreakdown,
    totalCosteMonitores,
    totalRecaudadoNetoSinIva,
    totalBeneficioEscuela,
    isClosed,
    hasPendingChanges,
    isCurrentMonthUnlocked,
    handleCloseMonth,
  };
};
