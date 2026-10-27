import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '../config/supabaseClient';
import { useAuth } from './AuthContext';
import { verifyProfitabilityPin } from '../utils/profitabilitySecurity';

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

  // Profitability overlay in schedule cards & financial views
  const [showProfitability, setShowProfitability] = useState(false);
  const [isProfitabilityModalOpen, setIsProfitabilityModalOpen] = useState(false);
  const [profitabilityCallback, setProfitabilityCallback] = useState(null);

  const openProfitabilityModal = useCallback((callback = null) => {
    setProfitabilityCallback(() => (typeof callback === 'function' ? callback : null));
    setIsProfitabilityModalOpen(true);
  }, []);

  const closeProfitabilityModal = useCallback(() => {
    setIsProfitabilityModalOpen(false);
    setProfitabilityCallback(null);
  }, []);

  const lockProfitability = useCallback(() => {
    setShowProfitability(false);
  }, []);

  const toggleProfitability = useCallback(() => {
    if (showProfitability) {
      setShowProfitability(false);
    } else {
      setIsProfitabilityModalOpen(true);
    }
  }, [showProfitability]);

  const unlockProfitability = useCallback(async (enteredPin) => {
    const isValid = await verifyProfitabilityPin(enteredPin);
    if (isValid) {
      setShowProfitability(true);
      setIsProfitabilityModalOpen(false);
      if (profitabilityCallback) {
        profitabilityCallback();
        setProfitabilityCallback(null);
      }
      return { success: true };
    }
    return { success: false, error: 'Contraseña incorrecta' };
  }, [profitabilityCallback]);

  // Trigger for refreshing all queries
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSeeding, setIsSeeding] = useState(false);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  // Closed months tracking (from monthly_closures)
  const [closedMonths, setClosedMonths] = useState(new Set());

  const fetchClosedMonths = useCallback(async () => {
    if (!adminId) {
      setClosedMonths(new Set());
      return;
    }
    try {
      const { data, error } = await supabase
        .from('monthly_closures')
        .select('month_year')
        .eq('admin_id', adminId);

      if (!error && data) {
        const set = new Set(data.map((r) => r.month_year).filter(Boolean));
        setClosedMonths(set);
      }
    } catch (err) {
      console.error('Error fetching closed months:', err);
    }
  }, [adminId]);

  useEffect(() => {
    fetchClosedMonths();
  }, [fetchClosedMonths, refreshKey]);

  const isMonthClosed = useCallback(
    (monthYear) => closedMonths.has(monthYear),
    [closedMonths]
  );

  const isCurrentMonthClosed = closedMonths.has(selectedMonth);

  // Set of months that are closed in DB, but currently unlocked for editing in this session
  const [unlockedMonths, setUnlockedMonths] = useState(new Set());

  const unlockMonthForEditing = useCallback((monthYear) => {
    setUnlockedMonths((prev) => new Set([...prev, monthYear]));
  }, []);

  const lockMonthEditing = useCallback((monthYear) => {
    setUnlockedMonths((prev) => {
      const next = new Set(prev);
      next.delete(monthYear);
      return next;
    });
  }, []);

  const isCurrentMonthUnlocked = unlockedMonths.has(selectedMonth);

  // Closed month action guard modal
  const [closedMonthModal, setClosedMonthModal] = useState({
    isOpen: false,
    actionName: '',
    onConfirm: null,
  });

  const closeClosedMonthModal = useCallback(() => {
    setClosedMonthModal((prev) => ({ ...prev, isOpen: false, onConfirm: null }));
  }, []);

  const checkClosedMonthAction = useCallback(
    (actionFn, actionName = 'modificar este mes') => {
      return new Promise((resolve, reject) => {
        // 1. Si el mes no está cerrado, proceder directamente
        if (!closedMonths.has(selectedMonth) || unlockedMonths.has(selectedMonth)) {
          try {
            const res = actionFn();
            return resolve(res);
          } catch (err) {
            return reject(err);
          }
        }

        // 2. Si está cerrado y no desbloqueado, solicitar confirmación
        setClosedMonthModal({
          isOpen: true,
          actionName,
          onConfirm: async () => {
            try {
              // Desbloquear este mes para que los cambios siguientes en este mes no vuelvan a preguntar hasta cerrarlo
              setUnlockedMonths((prev) => new Set([...prev, selectedMonth]));
              setClosedMonthModal((prev) => ({ ...prev, isOpen: false, onConfirm: null }));
              const res = await actionFn();
              resolve(res);
            } catch (err) {
              reject(err);
            }
          },
        });
      });
    },
    [closedMonths, selectedMonth, unlockedMonths]
  );

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
        isProfitabilityModalOpen,
        openProfitabilityModal,
        closeProfitabilityModal,
        lockProfitability,
        toggleProfitability,
        unlockProfitability,
        refreshKey,
        triggerRefresh,
        seedSchoolData,
        isSeeding,
        closedMonths,
        isMonthClosed,
        isCurrentMonthClosed,
        unlockedMonths,
        unlockMonthForEditing,
        lockMonthEditing,
        isCurrentMonthUnlocked,
        closedMonthModal,
        closeClosedMonthModal,
        checkClosedMonthAction,
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
