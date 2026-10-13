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
  Activity,
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
      <div className="max-w-[1920px] mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand & Sport Switcher */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0055A5] to-[#0284C7] flex items-center justify-center text-white shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900 leading-none block">
                OPEN<span className="text-[#0055A5]">ARENA</span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block -mt-0.5">
                Escuelas Deportivas
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          {/* Sport Switcher (Tenis / Pádel) */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/70">
            <button
              type="button"
              onClick={() => setSport('tenis')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                sport === 'tenis'
                  ? 'bg-white text-[#0055A5] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🎾</span>
              <span>Tenis</span>
            </button>
            <button
              type="button"
              onClick={() => setSport('padel')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                sport === 'padel'
                  ? 'bg-white text-[#0055A5] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🏸</span>
              <span>Pádel</span>
            </button>
          </div>
        </div>

        {/* Center: View Tabs & Month Selector */}
        <div className="flex items-center gap-3">
          {/* Main View Switcher */}
          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200/70">
            <button
              type="button"
              onClick={() => setActiveView('cuadrante')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeView === 'cuadrante'
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
              <span>Facturación & Bajas</span>
            </button>
          </div>

          {/* Month Selector */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-1.5 py-1 shadow-xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5 text-xs font-bold text-slate-800 capitalize min-w-[110px] text-center select-none">
              {formattedMonthLabel}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Switch Vista Rentabilidad (Obligatorio) */}
          {activeView === 'cuadrante' && (
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs">
              <Switch
                checked={showProfitability}
                onChange={setShowProfitability}
                label="📊 Vista Rentabilidad"
                size="sm"
              />
            </div>
          )}
        </div>


        {/* Right: Seed Button & User / Logout */}
        <div className="flex items-center gap-3">
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
            {seedSuccess ? '¡Datos Poblados!' : '⚡ Inicializar Datos Escuela'}
          </Button>

          {/* User & Sign Out */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="hidden xl:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800 truncate max-w-[140px]">
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
