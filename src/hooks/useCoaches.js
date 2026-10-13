import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useSchool } from '../context/SchoolContext';

export const useCoaches = () => {
  const { adminId } = useAuth();
  const { refreshKey, sport } = useSchool();
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCoaches = useCallback(async () => {
    if (!adminId) {
      setCoaches([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('coaches')
        .select('*')
        .eq('admin_id', adminId)
        .order('order_index', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });

      if (err) throw err;
      setCoaches(data || []);
    } catch (err) {
      console.error('Error fetching coaches:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [adminId]);

  useEffect(() => {
    fetchCoaches();
  }, [fetchCoaches, refreshKey]);

  // Coaches filtered by current active sport if coach has sport assigned, or show all if sport is null
  const filteredCoaches = coaches.filter(
    (c) => !c.sport || !sport || c.sport.toLowerCase() === sport.toLowerCase()
  );

  const addCoach = async (coachData) => {
    if (!adminId) throw new Error('Usuario no autenticado');

    // Optimistic temp ID
    const tempId = `temp-${Date.now()}`;
    const optimisticCoach = {
      ...coachData,
      id: tempId,
      admin_id: adminId,
      active: true,
      order_index: coaches.length + 1,
    };

    setCoaches((prev) => [...prev, optimisticCoach]);

    try {
      const { data, error: err } = await supabase
        .from('coaches')
        .insert({
          ...coachData,
          admin_id: adminId,
          active: coachData.active ?? true,
          order_index: coachData.order_index ?? coaches.length + 1,
        })
        .select()
        .single();

      if (err) throw err;

      // Replace optimistic coach with actual DB row
      setCoaches((prev) => prev.map((c) => (c.id === tempId ? data : c)));
      return data;
    } catch (err) {
      // Rollback
      setCoaches((prev) => prev.filter((c) => c.id !== tempId));
      throw err;
    }
  };

  const updateCoach = async (id, patch) => {
    // Optimistic update
    const previousCoaches = [...coaches];
    setCoaches((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );

    try {
      const { data, error: err } = await supabase
        .from('coaches')
        .update(patch)
        .eq('id', id)
        .eq('admin_id', adminId)
        .select()
        .single();

      if (err) throw err;
      setCoaches((prev) => prev.map((c) => (c.id === id ? data : c)));
      return data;
    } catch (err) {
      setCoaches(previousCoaches);
      throw err;
    }
  };

  const deleteCoach = async (id) => {
    const previousCoaches = [...coaches];
    setCoaches((prev) => prev.filter((c) => c.id !== id));

    try {
      const { error: err } = await supabase
        .from('coaches')
        .delete()
        .eq('id', id)
        .eq('admin_id', adminId);

      if (err) throw err;
    } catch (err) {
      setCoaches(previousCoaches);
      throw err;
    }
  };

  return {
    coaches,
    filteredCoaches,
    loading,
    error,
    addCoach,
    updateCoach,
    deleteCoach,
    refreshCoaches: fetchCoaches,
  };
};
