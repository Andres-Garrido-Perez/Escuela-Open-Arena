import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import {
  Calendar,
  CreditCard,
  Zap,
  LogOut,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { format, parse, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

export const TopNavbar = () => {
  const { user, signOut } = useAuth();
  const {
    sport,
    setSport,
    selectedMonth,
    setSelectedMonth,
    activeView,
    setActiveView,
    showProfitability,
    setShowProfitability,
    seedSchoolData,
    isSeeding,
  } = useSchool();


  const [seedSuccess, setSeedSuccess] = useState(false);

  // Parse current month (e.g., '2026-10')
  const currentDate = useMemo(() => {
    return parse(selectedMonth, 'yyyy-MM', new Date(2026, 0, 1));
  }, [selectedMonth]);

  const handlePrevMonth = () => {
    const prev = subMonths(currentDate, 1);
    setSelectedMonth(format(prev, 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    const next = addMonths(currentDate, 1);
    setSelectedMonth(format(next, 'yyyy-MM'));
  };

  const formattedMonthLabel = useMemo(() => {
    return format(currentDate, 'MMMM yyyy', { locale: es });
  }, [currentDate]);


  const handleSeed = async () => {
    try {
      setSeedSuccess(false);
      await seedSchoolData();
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 4000);
    } catch (err) {
      alert('Error inicializando datos: ' + (err.message || 'Error desconocido'));
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs">
      <div className="max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand & Sport Switcher */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/logoOpenArena.png"
              alt="OpenArena"
              className="h-9 sm:h-12 w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
            />
            <div className="hidden lg:block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Escuelas Deportivas
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          {/* Sport Switcher (Tenis / Pádel) */}
          <div className="inline-flex p-0.5 sm:p-1 bg-slate-100 rounded-xl border border-slate-200/70">
            <button
              type="button"
              onClick={() => setSport('tenis')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                sport === 'tenis'
                  ? 'bg-white text-[#0055A5] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🎾Tenis</span>
              <span className="hidden xs:inline">Tenis</span>
            </button>
            <button
              type="button"
              onClick={() => setSport('padel')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                sport === 'padel'
                  ? 'bg-white text-[#0055A5] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🏸Padel</span>
              <span className="hidden xs:inline">Pádel</span>
            </button>
          </div>
        </div>

        {/* Center: View Tabs & Month Selector (Desktop) / Month Selector (Mobile) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Main View Switcher (Desktop md+) */}
          <div className="hidden md:inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200/70">
            <button
              type="button"
              onClick={() => setActiveView('cuadrante')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeView === 'cuadrante' || activeView === 'alumnos'
                  ? 'bg-white text-[#0055A5] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Cuadrante</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('facturacion')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeView === 'facturacion'
                  ? 'bg-white text-[#0055A5] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Facturación & Alumnos</span>
            </button>
          </div>

          {/* Month Selector (Responsive) */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-1 sm:px-1.5 py-0.5 sm:py-1 shadow-xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
              title="Mes anterior"
            >
              <ChevronLeft className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </button>
            <span className="px-1.5 sm:px-2.5 text-[11px] sm:text-xs font-bold text-slate-800 capitalize min-w-[84px] sm:min-w-[110px] text-center select-none truncate">
              {formattedMonthLabel}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
              title="Mes siguiente"
            >
              <ChevronRight className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </button>
          </div>

          {/* Switch Vista Rentabilidad (Desktop) */}
          {(activeView === 'cuadrante' || activeView === 'alumnos') && (
            <div className="hidden lg:flex items-center bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs">
              <Switch
                checked={showProfitability}
                onChange={setShowProfitability}
                label="📊 Vista Rentabilidad"
                size="sm"
              />
            </div>
          )}
        </div>

        {/* Right: Seed Button & User / Logout (Desktop md+) */}
        <div className="hidden md:flex items-center gap-3">
          {/* Seed Button (CRÍTICO) */}
          <Button
            variant="outline"
            size="sm"
            loading={isSeeding}
            onClick={handleSeed}
            className={`border-amber-300 text-amber-900 bg-amber-50/70 hover:bg-amber-100/90 font-bold ${
              seedSuccess ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : ''
            }`}
            icon={seedSuccess ? CheckCircle2 : Zap}
          >
            {seedSuccess ? '¡Datos Poblados!' : '⚡ Inicializar Datos'}
          </Button>

          {/* User & Sign Out */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="hidden xl:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800 truncate max-w-[130px]">
                {user?.email?.split('@')[0]}
              </span>
              <span className="text-[10px] text-slate-400">Admin</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              title="Cerrar sesión"
              className="text-slate-500 hover:text-rose-600 hover:bg-rose-50"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
