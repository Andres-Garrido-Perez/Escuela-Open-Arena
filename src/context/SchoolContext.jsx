import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '../config/supabaseClient';
import { useAuth } from './AuthContext';

const SchoolContext = createContext(null);

export const SchoolProvider = ({ children }) => {
  const { adminId } = useAuth();

  // Active Sport: 'tenis' | 'padel' (null can trigger initial selection view)
  const [sport, setSport] = useState('tenis');

  // Active Coach ID in tabs (or 'all' for overview)
  const [activeCoachId, setActiveCoachId] = useState(null);

  // Selected Month for billing and temporary leaves (format: 'YYYY-MM', e.g. '2026-10')
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));

  // Main view tab: 'cuadrante' | 'facturacion'
  const [activeView, setActiveView] = useState('cuadrante');

  // Saturday visible in grid (ahora siempre visible por defecto)
  const [showSaturday, setShowSaturday] = useState(true);

  // Visibilidad del directorio de alumnos (abrir / cerrar para ver sábados)
  const [isStudentsSidebarOpen, setIsStudentsSidebarOpen] = useState(true);

  // Modo Reorganizar Clases (Arrastrar y soltar clases de un día u hora a otra)
  const [isReorganizing, setIsReorganizing] = useState(false);

  // Profitability overlay in schedule cards
  const [showProfitability, setShowProfitability] = useState(false);

  // Trigger for refreshing all queries
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSeeding, setIsSeeding] = useState(false);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  // Supabase Realtime: Sincronización instantánea en vivo en toda la web sin necesidad de recargar la página
  useEffect(() => {
    if (!adminId) return;

    const channel = supabase
      .channel('school_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'students' },
        () => triggerRefresh()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'class_slots' },
        () => triggerRefresh()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'class_enrollments' },
        () => triggerRefresh()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'coaches' },
        () => triggerRefresh()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tariffs' },
        () => triggerRefresh()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'monthly_registry' },
        () => triggerRefresh()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'monthly_closures' },
        () => triggerRefresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminId, triggerRefresh]);

  const seedSchoolData = useCallback(async () => {
    try {
      setIsSeeding(true);
      const { data, error } = await supabase.rpc('seed_openarena_initial_data');
      if (error) {
        console.error('Error executing seed_openarena_initial_data:', error);
        throw error;
      }
      triggerRefresh();
      return { success: true, data };
    } catch (err) {
      console.error('Seed RPC failed:', err);
      throw err;
    } finally {
      setIsSeeding(false);
    }
  }, [triggerRefresh]);

  return (
    <SchoolContext.Provider
      value={{
        sport,
        setSport,
        activeCoachId,
        setActiveCoachId,
        selectedMonth,
        setSelectedMonth,
        activeView,
        setActiveView,
        showSaturday,
        setShowSaturday,
        isStudentsSidebarOpen,
        setIsStudentsSidebarOpen,
        isReorganizing,
        setIsReorganizing,
        showProfitability,
        setShowProfitability,
        refreshKey,
        triggerRefresh,
        seedSchoolData,
        isSeeding,
      }}
    >
      {children}
    </SchoolContext.Provider>
  );

};

export const useSchool = () => {
  const context = useContext(SchoolContext);
  if (!context) {
    throw new Error('useSchool debe ser utilizado dentro de un SchoolProvider');
  }
  return context;
};
