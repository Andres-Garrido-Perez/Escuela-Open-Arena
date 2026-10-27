import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../config/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useSchool } from '../context/SchoolContext';
import { OFFICIAL_OPENARENA_TARIFFS } from '../data/openarenaTariffs';
import { sanitizeTariffCode } from '../utils/tariffUtils';

const getStorageKey = (adminId) => `openarena_tariffs_${adminId || 'global'}`;

// Cargar tarifas guardadas localmente como respaldo
const loadLocalTariffs = (adminId) => {
  try {
    const raw = localStorage.getItem(getStorageKey(adminId));
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(sanitizeTariffCode) : null;
    }
  } catch (e) {
    console.warn('Error leyendo tarifas locales:', e);
  }
  return null;
};

// Guardar tarifas en localStorage
const saveLocalTariffs = (adminId, list) => {
  try {
    localStorage.setItem(getStorageKey(adminId), JSON.stringify(list));
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
      const local = loadLocalTariffs('global') || OFFICIAL_OPENARENA_TARIFFS;
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
        // Enriquecer cada fila con level_label si no viene de base de datos
        const enrichedFromDb = data.map((t) => ({
          ...t,
          level_label: t.level_label || t.category_name || t.code,
        }));

        // Combinar con cualquier tarifa creada localmente que aún no esté en DB
        const localItems = loadLocalTariffs(adminId) || [];
        const dbIds = new Set(enrichedFromDb.map((t) => String(t.id)));
        const dbCodes = new Set(enrichedFromDb.map((t) => `${t.sport}_${t.code}`.toLowerCase()));

        const pendingLocal = localItems.filter(
          (lt) => !dbIds.has(String(lt.id)) && !dbCodes.has(`${lt.sport}_${lt.code}`.toLowerCase())
        );

        const merged = [...enrichedFromDb, ...pendingLocal].map(sanitizeTariffCode);
        setTariffs(merged);
        saveLocalTariffs(adminId, merged);
      } else {
        // Si aún no se han insertado en Supabase, auto-poblamos con las tarifas oficiales (quitando level_label que no es columna de tabla)
        try {
          const toInsert = OFFICIAL_OPENARENA_TARIFFS.map(({ level_label, ...rest }) => ({
            ...rest,
            admin_id: adminId,
          }));

          const { data: inserted, error: insErr } = await supabase
            .from('tariffs')
            .insert(toInsert)
            .select();

          if (!insErr && inserted?.length > 0) {
            const enriched = inserted.map((t) => ({
              ...t,
              level_label: t.category_name,
            }));
            setTariffs(enriched);
            saveLocalTariffs(adminId, enriched);
          } else {
            const fallback = OFFICIAL_OPENARENA_TARIFFS.map((t, i) => ({
              ...t,
              id: `tariff-${t.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${i}`,
              admin_id: adminId,
            }));
            setTariffs(fallback);
            saveLocalTariffs(adminId, fallback);
          }
        } catch {
          const fallback = OFFICIAL_OPENARENA_TARIFFS.map((t, i) => ({
            ...t,
            id: `tariff-${t.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${i}`,
            admin_id: adminId,
          }));
          setTariffs(fallback);
          saveLocalTariffs(adminId, fallback);
        }
      }
    } catch (err) {
      console.error('Error fetching tariffs:', err);
      // Usar respaldo local o tarifas oficiales
      const local = loadLocalTariffs(adminId);
      if (local && local.length > 0) {
        setTariffs(local);
      } else {
        const fallback = OFFICIAL_OPENARENA_TARIFFS.map((t, i) => ({
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

    // Actualización inmediata en estado local y almacenamiento persistente
    setTariffs((prev) => {
      const next = [...prev, fullTariff];
      saveLocalTariffs(adminId, next);
      return next;
    });

    try {
      if (adminId) {
        // Enviar a Supabase ÚNICAMENTE las columnas existentes en la tabla (sin level_label ni id temporal)
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
          // Reemplazar el id temporal por el id real asignado por Supabase
          const realTariff = { ...fullTariff, ...data, level_label: fullTariff.level_label };
          setTariffs((prev) => {
            const next = prev.map((t) => (t.id === tempId ? realTariff : t));
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

  // Actualizar una tarifa existente (precio, nombre, horas, aforo, etc.)
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

    // Actualización inmediata en estado local y almacenamiento persistente
    setTariffs((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...cleanPatch } : t));
      saveLocalTariffs(adminId, next);
      return next;
    });

    try {
      // Filtrar columnas para la tabla Supabase (sin level_label)
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
    // Actualización inmediata en estado local y almacenamiento persistente
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
