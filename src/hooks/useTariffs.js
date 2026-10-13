import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useSchool } from '../context/SchoolContext';

export const useTariffs = () => {
  const { adminId } = useAuth();
  const { refreshKey, sport } = useSchool();
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTariffs = useCallback(async () => {
    if (!adminId) {
      setTariffs([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('tariffs')
        .select('*')
        .eq('admin_id', adminId)
        .order('category_name', { ascending: true })
        .order('price_non_member', { ascending: true });

      if (err) throw err;
      setTariffs(data || []);
    } catch (err) {
      console.error('Error fetching tariffs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [adminId]);

  useEffect(() => {
    fetchTariffs();
  }, [fetchTariffs, refreshKey]);

  const filteredTariffs = tariffs.filter(
    (t) => !t.sport || !sport || t.sport.toLowerCase() === sport.toLowerCase()
  );

  return {
    tariffs,
    filteredTariffs,
    loading,
    error,
    refreshTariffs: fetchTariffs,
  };
};
