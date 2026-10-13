import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useSchool } from '../context/SchoolContext';
import { OFFICIAL_OPENARENA_TARIFFS } from '../data/openarenaTariffs';

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

      if (data && data.length > 0) {
        setTariffs(data);
      } else {
        // Si aún no se han insertado en Supabase, auto-poblamos con las tarifas oficiales de OpenArena
        try {
          const toInsert = OFFICIAL_OPENARENA_TARIFFS.map((t) => ({
            ...t,
            admin_id: adminId,
          }));
          const { data: inserted, error: insErr } = await supabase
            .from('tariffs')
            .insert(toInsert)
            .select();

          if (!insErr && inserted?.length > 0) {
            setTariffs(inserted);
          } else {
            setTariffs(
              OFFICIAL_OPENARENA_TARIFFS.map((t, i) => ({
                ...t,
                id: `tariff-${t.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${i}`,
                admin_id: adminId,
              }))
            );
          }
        } catch {
          setTariffs(
            OFFICIAL_OPENARENA_TARIFFS.map((t, i) => ({
              ...t,
              id: `tariff-${t.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${i}`,
              admin_id: adminId,
            }))
          );
        }
      }
    } catch (err) {
      console.error('Error fetching tariffs:', err);
      // Siempre garantizar que las tarifas oficiales estén disponibles
      setTariffs(
        OFFICIAL_OPENARENA_TARIFFS.map((t, i) => ({
          ...t,
          id: `tariff-${t.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${i}`,
          admin_id: adminId,
        }))
      );
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
