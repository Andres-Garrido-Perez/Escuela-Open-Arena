import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../config/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useSchool } from '../context/SchoolContext';

export const useMonthlyRegistry = () => {
  const { adminId } = useAuth();
  const { selectedMonth, refreshKey, triggerRefresh, isMonthClosed } = useSchool();
  const [allEntries, setAllEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMonthlyRegistry = useCallback(async () => {
    if (!adminId) {
      setAllEntries([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      // Fetch all registry entries for this admin ordered chronologically
      const { data, error: err } = await supabase
        .from('monthly_registry')
        .select('*')
        .eq('admin_id', adminId)
        .order('month_year', { ascending: true });

      if (err) throw err;
      setAllEntries(data || []);
    } catch (err) {
      console.error('Error fetching monthly registry:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [adminId]);

  useEffect(() => {
    fetchMonthlyRegistry();
  }, [fetchMonthlyRegistry, refreshKey]);

  // Build effective registry map for selectedMonth with forward persistence:
  // Cuando se da de baja a un alumno en el mes M, permanece de baja en todos los meses siguientes (M+1, M+2...)
  // hasta que en algún mes futuro se reactive expresamente, momento a partir del cual vuelve a estar activo en todos los siguientes.
  const registryMap = useMemo(() => {
    if (!selectedMonth) return {};

    // Agrupar entradas históricas por student_id
    const entriesByStudent = {};
    allEntries.forEach((entry) => {
      if (!entriesByStudent[entry.student_id]) {
        entriesByStudent[entry.student_id] = [];
      }
      entriesByStudent[entry.student_id].push(entry);
    });

    const map = {};

    Object.keys(entriesByStudent).forEach((studentId) => {
      const studentEntries = entriesByStudent[studentId];

      // 1. Entrada explícita para este mes concreto (selectedMonth)
      const exactEntry = studentEntries.find(
        (e) => e.month_year === selectedMonth
      );

      if (exactEntry) {
        map[studentId] = exactEntry;
        return;
      }

      // 2. Si no hay registro explícito este mes, buscar la última entrada anterior a selectedMonth (month_year < selectedMonth)
      const pastEntries = studentEntries
        .filter((e) => e.month_year < selectedMonth)
        .sort((a, b) => (b.month_year || '').localeCompare(a.month_year || ''));

      const latestPastEntry = pastEntries[0];

      if (latestPastEntry && latestPastEntry.status === 'baja_temporal') {
        // El alumno se dio de baja en un mes anterior y aún no se ha reactivado:
        // Hereda el estado de baja temporal para el mes actual y siguientes!
        map[studentId] = {
          ...latestPastEntry,
          id: null,
          month_year: selectedMonth,
          status: 'baja_temporal',
          isInherited: true,
          inheritedFromMonth: latestPastEntry.month_year,
        };
      } else if (latestPastEntry) {
        // El último estado anterior fue activo (pagado), por tanto sigue activo
        map[studentId] = {
          id: null,
          student_id: studentId,
          month_year: selectedMonth,
          status: 'pagado',
          isInherited: true,
          inheritedFromMonth: latestPastEntry.month_year,
        };
      }
    });

    return map;
  }, [allEntries, selectedMonth]);

  const getStudentStatus = (studentId) => {
    return registryMap[studentId]?.status || 'pagado';
  };

  const isStudentBaja = (studentId) => {
    return registryMap[studentId]?.status === 'baja_temporal';
  };

  const getStudentRegistry = (studentId) => {
    return registryMap[studentId] || null;
  };

  const setStudentStatus = async (
    studentId,
    status,
    amountExpected = null,
    notes = null
  ) => {
    if (!adminId) throw new Error('Usuario no autenticado');

    const exactExisting = allEntries.find(
      (e) => e.student_id === studentId && e.month_year === selectedMonth
    );
    const previousEntries = [...allEntries];

    // Optimistic entry for selectedMonth
    const optimisticCurrent = exactExisting
      ? {
          ...exactExisting,
          status,
          amount_expected: amountExpected ?? exactExisting.amount_expected,
          notes: notes ?? exactExisting.notes,
        }
      : {
          id: `temp-${Date.now()}`,
          admin_id: adminId,
          student_id: studentId,
          month_year: selectedMonth,
          status,
          amount_expected: amountExpected,
          notes,
        };

    // Actualización optimista: actualizar mes actual y propagar hacia meses futuros NO CERRADOS en memoria
    setAllEntries((prev) => {
      let updated = prev.map((e) => {
        if (e.student_id === studentId) {
          if (e.month_year === selectedMonth) {
            return optimisticCurrent;
          }
          if (e.month_year > selectedMonth && !isMonthClosed?.(e.month_year)) {
            return { ...e, status };
          }
        }
        return e;
      });

      if (!exactExisting) {
        updated = [...updated, optimisticCurrent];
      }
      return updated;
    });

    try {
      // 1. Guardar o actualizar registro en selectedMonth
      if (exactExisting) {
        const { error: updateErr } = await supabase
          .from('monthly_registry')
          .update({
            status,
            amount_expected: amountExpected ?? exactExisting.amount_expected,
            notes: notes ?? exactExisting.notes,
          })
          .eq('id', exactExisting.id)
          .eq('admin_id', adminId);

        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from('monthly_registry')
          .insert({
            admin_id: adminId,
            student_id: studentId,
            month_year: selectedMonth,
            status,
            amount_expected: amountExpected,
            notes,
          });

        if (insertErr) throw insertErr;
      }

      // 2. Propagación hacia adelante: actualizar registros existentes de meses futuros
      // que NO estén cerrados (protección inmutable de meses cerrados)
      const { data: futureEntries } = await supabase
        .from('monthly_registry')
        .select('id, month_year')
        .eq('admin_id', adminId)
        .eq('student_id', studentId)
        .gt('month_year', selectedMonth);

      const unclosedFutureIds = (futureEntries || [])
        .filter((entry) => !isMonthClosed?.(entry.month_year))
        .map((entry) => entry.id);

      if (unclosedFutureIds.length > 0) {
        await supabase
          .from('monthly_registry')
          .update({ status })
          .in('id', unclosedFutureIds);
      }

      await fetchMonthlyRegistry();
      if (triggerRefresh) triggerRefresh();
      return true;
    } catch (err) {
      console.error('Error setting student status:', err);
      setAllEntries(previousEntries);
      throw err;
    }
  };

  const toggleBajaTemporal = async (studentId) => {
    const current = getStudentStatus(studentId);
    const newStatus = current === 'baja_temporal' ? 'pagado' : 'baja_temporal';
    return await setStudentStatus(studentId, newStatus);
  };

  return {
    registryEntries: allEntries.filter((e) => e.month_year === selectedMonth),
    allRegistryEntries: allEntries,
    registryMap,
    loading,
    error,
    getStudentStatus,
    isStudentBaja,
    getStudentRegistry,
    setStudentStatus,
    toggleBajaTemporal,
    refreshMonthlyRegistry: fetchMonthlyRegistry,
  };
};
