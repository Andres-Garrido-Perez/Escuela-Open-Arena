import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../config/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useSchool } from '../context/SchoolContext';
import { OFFICIAL_OPENARENA_TARIFFS } from '../data/openarenaTariffs';
import { sanitizeTariffCode } from '../utils/tariffUtils';

const getStorageKey = (adminId) => `openarena_tariffs_${adminId || 'global'}`;

/**
 * Normaliza nombres, elimina clases no deseadas (como particulares) y previene duplicados.
 */
export function cleanAndDeduplicateTariffs(list = []) {
  if (!Array.isArray(list)) return [];

  // 1. Filtrar clases particulares (no forman parte de las escuelas)
  const nonParticular = list.filter((t) => {
    if (!t) return false;
    const cat = (t.category_name || '').toLowerCase();
    const code = (t.code || '').toLowerCase();
    const lvl = (t.level_label || '').toLowerCase();
    return (
      !cat.includes('particular') &&
      !code.includes('part') &&
      !lvl.includes('particular')
    );
  });

  // 2. Normalizar nombres a los oficiales de la hoja
  const normalized = nonParticular.map((t) => {
    let cat = (t.category_name || '').trim();
    let lvl = (t.level_label || '').trim();
    let code = (t.code || '').trim();
    let max = Number(t.max_students) || 4;

    // Normalizar Adultos 4
    if (
      cat.includes('G4') ||
      cat.includes('Adultos (+18 años) - G4') ||
      lvl.includes('Grupos de 4') ||
      (cat.toLowerCase().includes('adult') && (cat.includes('(4)') || max === 4))
    ) {
      cat = 'Adultos (4)';
      lvl = 'Adultos (4)';
      max = 4;
      code = code.replace(/G4/i, '4');
    }

    // Normalizar Adultos 6
    if (
      cat.includes('G6') ||
      cat.includes('Adultos (+18 años) - G6') ||
      lvl.includes('Grupos de 6') ||
      (cat.toLowerCase().includes('adult') && (cat.includes('(6)') || max === 6))
    ) {
      cat = 'Adultos (6)';
      lvl = 'Adultos (6)';
      max = 6;
      code = code.replace(/G6/i, '6');
    }

    // Normalizar Competición
    if (cat.startsWith('Competición (')) {
      cat = 'Competición';
      lvl = 'Competición';
    }

    return {
      ...t,
      category_name: cat,
      level_label: lvl || cat,
      code,
      max_students: max,
    };
  });

  // 3. Deduplicar estrictamente por deporte + código y deporte + categoría + horas
  const seenKeys = new Set();
  const deduped = [];

  for (const item of normalized) {
    const sp = (item.sport || 'tenis').toLowerCase();
    const cd = (item.code || '').toLowerCase();
    const cat = (item.category_name || '').toLowerCase();
    const h = Number(item.hours_per_week) || 1;

    const key1 = `${sp}_code_${cd}`;
    const key2 = `${sp}_cat_${cat}_${h}`;

    if (cd && seenKeys.has(key1)) continue;
    if (seenKeys.has(key2)) continue;

    if (cd) seenKeys.add(key1);
    seenKeys.add(key2);
    deduped.push(sanitizeTariffCode(item));
  }

  return deduped;
}

// Cargar tarifas guardadas localmente como respaldo
const loadLocalTariffs = (adminId) => {
  try {
    const raw = localStorage.getItem(getStorageKey(adminId));
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? cleanAndDeduplicateTariffs(parsed) : null;
    }
  } catch (e) {
    console.warn('Error leyendo tarifas locales:', e);
  }
  return null;
};

// Guardar tarifas en localStorage
const saveLocalTariffs = (adminId, list) => {
  try {
    const cleanList = cleanAndDeduplicateTariffs(list);
    localStorage.setItem(getStorageKey(adminId), JSON.stringify(cleanList));
  } catch (e) {
    console.warn('Error guardando tarifas locales:', e);
  }
};

export const useTariffs = () => {
  const { adminId } = useAuth();
  const { refreshKey, sport, triggerRefresh } = useSchool();
  const [tariffs, setTariffs] = useState(() => {
    const local = loadLocalTariffs(adminId);
    if (local && local.length > 0) return local;
    return OFFICIAL_OPENARENA_TARIFFS.map((t, i) => ({
      ...t,
      id: `tariff-${t.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${i}`,
      admin_id: adminId,
    }));
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTariffs = useCallback(async () => {
    if (!adminId) {
      const local = loadLocalTariffs('global') || cleanAndDeduplicateTariffs(OFFICIAL_OPENARENA_TARIFFS);
      setTariffs(local);
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
        .order('hours_per_week', { ascending: true });

      if (err) throw err;

      if (data && data.length > 0) {
        const enrichedFromDb = data.map((t) => ({
          ...t,
          level_label: t.level_label || t.category_name || t.code,
        }));

        const cleaned = cleanAndDeduplicateTariffs(enrichedFromDb);
        setTariffs(cleaned);
        saveLocalTariffs(adminId, cleaned);
      } else {
        const fallback = cleanAndDeduplicateTariffs(OFFICIAL_OPENARENA_TARIFFS).map((t, i) => ({
          ...t,
          id: `tariff-${t.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${i}`,
          admin_id: adminId,
        }));
        setTariffs(fallback);
        saveLocalTariffs(adminId, fallback);
      }
    } catch (err) {
      console.error('Error fetching tariffs:', err);
      const local = loadLocalTariffs(adminId);
      if (local && local.length > 0) {
        setTariffs(local);
      } else {
        const fallback = cleanAndDeduplicateTariffs(OFFICIAL_OPENARENA_TARIFFS).map((t, i) => ({
          ...t,
          id: `tariff-${t.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${i}`,
          admin_id: adminId,
        }));
        setTariffs(fallback);
      }
    } finally {
      setLoading(false);
    }
  }, [adminId]);

  useEffect(() => {
    fetchTariffs();
  }, [fetchTariffs, refreshKey]);

  // Añadir una nueva tarifa / clase
  const addTariff = async (tariffData) => {
    const tempId = `tariff-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const fullTariff = {
      admin_id: adminId,
      code: tariffData.code ? tariffData.code.trim().toUpperCase() : `TAR-${Date.now().toString().slice(-4)}`,
      sport: tariffData.sport || sport || 'tenis',
      category_name: tariffData.category_name?.trim() || 'General',
      level_label: tariffData.level_label?.trim() || tariffData.category_name?.trim() || 'General',
      hours_per_week: Number(tariffData.hours_per_week) || 1,
      price_member: Number(tariffData.price_member) || 0,
      price_non_member: Number(tariffData.price_non_member) || 0,
      max_students: Number(tariffData.max_students) || 4,
      billing_period: tariffData.billing_period || 'mensual',
      active: tariffData.active !== undefined ? Boolean(tariffData.active) : true,
      id: tempId,
    };

    setTariffs((prev) => {
      const next = cleanAndDeduplicateTariffs([...prev, fullTariff]);
      saveLocalTariffs(adminId, next);
      return next;
    });

    try {
      if (adminId) {
        const dbPayload = {
          admin_id: adminId,
          code: fullTariff.code,
          sport: fullTariff.sport,
          category_name: fullTariff.category_name,
          hours_per_week: fullTariff.hours_per_week,
          price_member: fullTariff.price_member,
          price_non_member: fullTariff.price_non_member,
          max_students: fullTariff.max_students,
          billing_period: fullTariff.billing_period,
          active: fullTariff.active,
        };

        const { data, error: insErr } = await supabase
          .from('tariffs')
          .insert(dbPayload)
          .select()
          .single();

        if (insErr) {
          console.warn('Aviso Supabase insert tarifa:', insErr);
        } else if (data) {
          const realTariff = { ...fullTariff, ...data, level_label: fullTariff.level_label };
          setTariffs((prev) => {
            const next = cleanAndDeduplicateTariffs(prev.map((t) => (t.id === tempId ? realTariff : t)));
            saveLocalTariffs(adminId, next);
            return next;
          });
        }
      }
    } catch (err) {
      console.error('Error insertando tarifa:', err);
    }

    if (triggerRefresh) triggerRefresh();
    return fullTariff;
  };

  // Actualizar una tarifa existente
  const updateTariff = async (id, patch) => {
    const cleanPatch = { ...patch };
    if ('hours_per_week' in cleanPatch) cleanPatch.hours_per_week = Number(cleanPatch.hours_per_week);
    if ('price_member' in cleanPatch) cleanPatch.price_member = Number(cleanPatch.price_member);
    if ('price_non_member' in cleanPatch) cleanPatch.price_non_member = Number(cleanPatch.price_non_member);
    if ('max_students' in cleanPatch) cleanPatch.max_students = Number(cleanPatch.max_students);
    if ('active' in cleanPatch) cleanPatch.active = Boolean(cleanPatch.active);
    if (cleanPatch.code) cleanPatch.code = cleanPatch.code.trim().toUpperCase();
    if (cleanPatch.category_name) cleanPatch.category_name = cleanPatch.category_name.trim();
    if (cleanPatch.level_label) cleanPatch.level_label = cleanPatch.level_label.trim();

    setTariffs((prev) => {
      const next = cleanAndDeduplicateTariffs(prev.map((t) => (t.id === id ? { ...t, ...cleanPatch } : t)));
      saveLocalTariffs(adminId, next);
      return next;
    });

    try {
      const { level_label, ...dbPatch } = cleanPatch;
      if (Object.keys(dbPatch).length > 0) {
        const { error: updErr } = await supabase
          .from('tariffs')
          .update(dbPatch)
          .eq('id', id);

        if (updErr) {
          console.warn('Aviso Supabase update tarifa:', updErr);
        }
      }
    } catch (err) {
      console.error('Error actualizando tarifa:', err);
    }

    if (triggerRefresh) triggerRefresh();
  };

  // Eliminar una tarifa
  const deleteTariff = async (id) => {
    setTariffs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveLocalTariffs(adminId, next);
      return next;
    });

    try {
      const { error: delErr } = await supabase
        .from('tariffs')
        .delete()
        .eq('id', id);

      if (delErr) {
        console.warn('Aviso Supabase delete tarifa:', delErr);
      }
    } catch (err) {
      console.error('Error eliminando tarifa:', err);
    }

    if (triggerRefresh) triggerRefresh();
  };

  const filteredTariffs = useMemo(
    () =>
      tariffs.filter(
        (t) => !t.sport || !sport || t.sport.toLowerCase() === sport.toLowerCase()
      ),
    [tariffs, sport]
  );

  return {
    tariffs,
    filteredTariffs,
    loading,
    error,
    addTariff,
    updateTariff,
    deleteTariff,
    refreshTariffs: fetchTariffs,
  };
};
