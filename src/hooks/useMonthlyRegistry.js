import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useSchool } from '../context/SchoolContext';

export const useMonthlyRegistry = () => {
  const { adminId } = useAuth();
  const { selectedMonth, refreshKey } = useSchool();
  const [registryEntries, setRegistryEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMonthlyRegistry = useCallback(async () => {
    if (!adminId || !selectedMonth) {
      setRegistryEntries([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('monthly_registry')
        .select('*')
        .eq('admin_id', adminId)
        .eq('month_year', selectedMonth);

      if (err) throw err;
      setRegistryEntries(data || []);
    } catch (err) {
      console.error('Error fetching monthly registry:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [adminId, selectedMonth]);

  useEffect(() => {
    fetchMonthlyRegistry();
  }, [fetchMonthlyRegistry, refreshKey]);

  // Lookup map: student_id -> entry
  const registryMap = registryEntries.reduce((acc, entry) => {
    acc[entry.student_id] = entry;
    return acc;
  }, {});

  const getStudentStatus = (studentId) => {
    return registryMap[studentId]?.status || 'pendiente';
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

    const existing = registryMap[studentId];
    const previousEntries = [...registryEntries];

    // Optimistic entry
    const optimisticEntry = existing
      ? { ...existing, status, amount_expected: amountExpected ?? existing.amount_expected, notes: notes ?? existing.notes }
      : {
          id: `temp-${Date.now()}`,
          admin_id: adminId,
          student_id: studentId,
          month_year: selectedMonth,
          status,
          amount_expected: amountExpected,
          notes,
        };

    setRegistryEntries((prev) => {
      const idx = prev.findIndex((e) => e.student_id === studentId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = optimisticEntry;
        return next;
      }
      return [...prev, optimisticEntry];
    });

    try {
      if (existing) {
        const { data, error: err } = await supabase
          .from('monthly_registry')
          .update({
            status,
            amount_expected: amountExpected ?? existing.amount_expected,
            notes: notes ?? existing.notes,
          })
          .eq('id', existing.id)
          .eq('admin_id', adminId)
          .select()
          .single();

        if (err) throw err;
        setRegistryEntries((prev) =>
          prev.map((e) => (e.id === existing.id ? data : e))
        );
        return data;
      } else {
        const { data, error: err } = await supabase
          .from('monthly_registry')
          .insert({
            admin_id: adminId,
            student_id: studentId,
            month_year: selectedMonth,
            status,
            amount_expected: amountExpected,
            notes,
          })
          .select()
          .single();

        if (err) throw err;
        setRegistryEntries((prev) =>
          prev.map((e) => (e.student_id === studentId ? data : e))
        );
        return data;
      }
    } catch (err) {
      // Rollback
      setRegistryEntries(previousEntries);
      throw err;
    }
  };

  const toggleBajaTemporal = async (studentId) => {
    const current = getStudentStatus(studentId);
    const newStatus = current === 'baja_temporal' ? 'pendiente' : 'baja_temporal';
    return await setStudentStatus(studentId, newStatus);
  };

  return {
    registryEntries,
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
