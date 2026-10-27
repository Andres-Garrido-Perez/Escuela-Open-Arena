import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useSchool } from '../context/SchoolContext';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const useMonthlyClosures = () => {
  const { adminId } = useAuth();
  const { refreshKey, triggerRefresh } = useSchool();
  const [closures, setClosures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClosures = useCallback(async () => {
    if (!adminId) {
      setClosures([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('monthly_closures')
        .select('id, admin_id, month_year, coach_id, total_revenue, coach_cost, net_profit')
        .eq('admin_id', adminId)
        .order('month_year', { ascending: false });

      if (err) throw err;
      setClosures(data || []);
    } catch (err) {
      console.error('Error fetching monthly closures:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [adminId]);

  useEffect(() => {
    fetchClosures();
  }, [fetchClosures, refreshKey]);

  // Check if a specific month is already closed
  const isMonthClosed = useCallback(
    (monthYear) => {
      return closures.some((c) => c.month_year === monthYear);
    },
    [closures]
  );

  // Get closures for a specific month
  const getClosuresForMonth = useCallback(
    (monthYear) => {
      return closures.filter((c) => c.month_year === monthYear);
    },
    [closures]
  );

  // Close month & freeze figures for all coaches
  const closeMonth = async (monthYear, coachesData) => {
    if (!adminId) throw new Error('Usuario no autenticado');
    if (!monthYear) throw new Error('Mes no especificado');
    if (!coachesData || coachesData.length === 0) {
      throw new Error('No hay datos de monitores para cerrar este mes.');
    }

    try {
      setLoading(true);
      setError(null);

      // Check existing closures for this month to handle updates
      const { data: existingRows, error: fetchErr } = await supabase
        .from('monthly_closures')
        .select('id, coach_id')
        .eq('admin_id', adminId)
        .eq('month_year', monthYear);

      if (fetchErr) throw fetchErr;

      const existingByCoach = (existingRows || []).reduce((acc, row) => {
        if (row.coach_id) acc[row.coach_id] = row.id;
        return acc;
      }, {});

      // Remove obsolete closures for coaches no longer present
      const currentCoachIds = new Set(
        coachesData.map((item) => item.coach?.id || item.coach_id).filter(Boolean)
      );
      const obsoleteRowIds = (existingRows || [])
        .filter((row) => !currentCoachIds.has(row.coach_id))
        .map((row) => row.id);

      if (obsoleteRowIds.length > 0) {
        await supabase
          .from('monthly_closures')
          .delete()
          .in('id', obsoleteRowIds);
      }

      const rowsToUpsert = coachesData.map((item) => {
        const coachId = item.coach?.id || item.coach_id;
        const totalRevenue = Number((item.gross_revenue ?? item.total_revenue ?? 0).toFixed(2));
        const coachCost = Number((item.coach_cost ?? 0).toFixed(2));
        const netProfit = Number((item.net_margin ?? item.net_profit ?? 0).toFixed(2));

        return {
          id: existingByCoach[coachId] || generateUUID(),
          admin_id: adminId,
          month_year: monthYear,
          coach_id: coachId,
          total_revenue: totalRevenue,
          coach_cost: coachCost,
          net_profit: netProfit,
        };
      });

      const { data, error: upsertErr } = await supabase
        .from('monthly_closures')
        .upsert(rowsToUpsert, { onConflict: 'id' })
        .select();

      if (upsertErr) throw upsertErr;

      // Limpiar posibles entradas vacías/redundantes de monthly_registry de este mes para evitar corrupción de importes
      try {
        await supabase
          .from('monthly_registry')
          .delete()
          .eq('admin_id', adminId)
          .eq('month_year', monthYear)
          .eq('status', 'pagado')
          .or('amount_expected.is.null,amount_expected.eq.0');
      } catch (cleanErr) {
        console.warn('Advertencia limpiando registry de mes cerrado:', cleanErr);
      }

      await fetchClosures();
      if (triggerRefresh) triggerRefresh();
      return data;
    } catch (err) {
      console.error('Error closing month:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Reabrir mes (elimina el cierre congelado de monthly_closures)
  const reopenMonth = async (monthYear) => {
    if (!adminId) throw new Error('Usuario no autenticado');
    if (!monthYear) throw new Error('Mes no especificado');

    try {
      setLoading(true);
      setError(null);
      const { error: delErr } = await supabase
        .from('monthly_closures')
        .delete()
        .eq('admin_id', adminId)
        .eq('month_year', monthYear);

      if (delErr) throw delErr;

      await fetchClosures();
      if (triggerRefresh) triggerRefresh();
      return true;
    } catch (err) {
      console.error('Error reopening month:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    closures,
    loading,
    error,
    isMonthClosed,
    getClosuresForMonth,
    closeMonth,
    reopenMonth,
    refreshClosures: fetchClosures,
  };
};
