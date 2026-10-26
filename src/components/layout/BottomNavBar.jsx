import React, { useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import { useStudents } from '../../hooks/useStudents';
import {
  Calendar,
  Users,
  CreditCard,
  Layers,
  MoreHorizontal,
  X,
  Zap,
  LogOut,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Switch } from '../ui/Switch';
import { Button } from '../ui/Button';
import { format, parse, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

export const BottomNavBar = () => {
  const { user, signOut } = useAuth();
  const {
    activeView,
    setActiveView,
    sport,
    setSport,
    selectedMonth,
    setSelectedMonth,
    showProfitability,
    toggleProfitability,
    seedSchoolData,
    isSeeding,
  } = useSchool();
  const { filteredStudents } = useStudents();

  const [menuOpen, setMenuOpen] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  // Month navigation
  const currentDate = parse(selectedMonth, 'yyyy-MM', new Date(2026, 0, 1));
  const formattedMonthLabel = format(currentDate, 'MMMM yyyy', { locale: es });

  const handlePrevMonth = () => {
    const prev = subMonths(currentDate, 1);
    setSelectedMonth(format(prev, 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    const next = addMonths(currentDate, 1);
    setSelectedMonth(format(next, 'yyyy-MM'));
  };

  const handleSeed = async () => {
    try {
      setSeedSuccess(false);
      await seedSchoolData();
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 3500);
    } catch (err) {
      alert('Error inicializando datos: ' + (err.message || 'Error desconocido'));
    }
  };

  return (
    <>
      {/* Mobile Bottom Navigation Bar (Visible only on < md) */}
      <nav
        aria-label="Navegación móvil"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg pb-safe"
      >
        <div className="grid grid-cols-4 h-15 items-center px-2">
          {/* Cuadrante */}
          <button
            type="button"
            onClick={() => {
              setActiveView('cuadrante');
              setMenuOpen(false);
            }}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
              activeView === 'cuadrante' && !menuOpen
                ? 'text-[#0055A5] font-bold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <div
              className={`p-1 rounded-lg transition-colors ${
                activeView === 'cuadrante' && !menuOpen
                  ? 'bg-blue-50 text-[#0055A5]'
                  : ''
              }`}
            >
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Cuadrante</span>
          </button>

          {/* Directorio Alumnos */}
          <button
            type="button"
            onClick={() => {
              setActiveView('alumnos');
              setMenuOpen(false);
            }}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all relative ${
              activeView === 'alumnos' && !menuOpen
                ? 'text-[#0055A5] font-bold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <div
              className={`p-1 rounded-lg transition-colors relative ${
                activeView === 'alumnos' && !menuOpen
                  ? 'bg-blue-50 text-[#0055A5]'
                  : ''
              }`}
            >
              <Users className="w-5 h-5" />
              {filteredStudents.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#0055A5] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                  {filteredStudents.length > 99 ? '99+' : filteredStudents.length}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Alumnos</span>
          </button>

          {/* Facturación */}
          <button
            type="button"
            onClick={() => {
              setActiveView('facturacion');
              setMenuOpen(false);
            }}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
              activeView === 'facturacion' && !menuOpen
                ? 'text-[#0055A5] font-bold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <div
              className={`p-1 rounded-lg transition-colors ${
                activeView === 'facturacion' && !menuOpen
                  ? 'bg-blue-50 text-[#0055A5]'
                  : ''
              }`}
            >
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Facturación</span>
          </button>

          {/* Más / Ajustes */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
              menuOpen || activeView === 'tarifas'
                ? 'text-[#0055A5] font-bold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <div
              className={`p-1 rounded-lg transition-colors ${
                menuOpen || activeView === 'tarifas' ? 'bg-blue-50 text-[#0055A5]' : ''
              }`}
            >
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">
              {activeView === 'tarifas' ? 'Tarifas' : 'Más'}
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile Options Sheet */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMenuOpen(false)}
          />

          {/* Sheet Container */}
          <div className="relative bg-white rounded-t-3xl border-t border-slate-200 shadow-2xl p-5 pb-safe z-10 max-h-[85dvh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            {/* Grab handle */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <img
                  src="/logoOpenArena.png"
                  alt="OpenArena"
                  className="h-8 w-auto object-contain"
                />
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Opciones y Ajustes
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Deporte Seleccionado */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Deporte en Gestión
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setSport('tenis');
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    sport === 'tenis'
                      ? 'bg-white text-[#0055A5] shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  <span className="text-base">🎾</span>
                  <span>Escuela de Tenis</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSport('padel');
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    sport === 'padel'
                      ? 'bg-white text-[#0055A5] shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  <span className="text-base">🏸</span>
                  <span>Escuela de Pádel</span>
                </button>
              </div>
            </div>

            {/* Acceso a Clases & Tarifas */}
            <div className="mb-4">
              <button
                type="button"
                onClick={() => {
                  setActiveView('tarifas');
                  setMenuOpen(false);
                }}
                className={`w-full p-3.5 rounded-2xl flex items-center justify-between border transition-all cursor-pointer ${
                  activeView === 'tarifas'
                    ? 'bg-blue-50 border-[#0055A5] text-[#0055A5]'
                    : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100/80 flex items-center justify-center text-[#0055A5]">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold block">
                      Gestionar Clases & Tarifas
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Editar precios, nombres y añadir opciones de 3h o 4h
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Mes de Trabajo */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Mes de Trabajo
              </label>
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-1.5 shadow-2xs">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-2 text-slate-600 hover:bg-white rounded-xl shadow-2xs"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-black text-slate-900 capitalize">
                  {formattedMonthLabel}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-2 text-slate-600 hover:bg-white rounded-xl shadow-2xs"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Vista Rentabilidad */}
            <div className="mb-5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    showProfitability ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {showProfitability ? <TrendingUp className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Vista Rentabilidad
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {showProfitability ? 'Márgenes y finanzas visibles' : 'Protegido con contraseña'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  toggleProfitability();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                  showProfitability
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-[#0055A5] text-white hover:bg-blue-700'
                }`}
              >
                {showProfitability ? 'Desactivar' : 'Activar'}
              </button>
            </div>

            {/* Inicializar datos */}
            <div className="mb-5">
              <Button
                variant="outline"
                size="md"
                loading={isSeeding}
                onClick={handleSeed}
                className={`w-full py-3 justify-center border-amber-300 text-amber-900 bg-amber-50 font-bold rounded-2xl ${
                  seedSuccess ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : ''
                }`}
                icon={seedSuccess ? CheckCircle2 : Zap}
              >
                {seedSuccess ? '¡Datos Inicializados!' : '⚡ Inicializar Datos Escuela'}
              </Button>
            </div>

            {/* Usuario y Cerrar sesión */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-800 truncate max-w-[180px]">
                  {user?.email || 'Administrador'}
                </span>
                <span className="text-[10px] text-slate-400">Sesión activa</span>
              </div>
              <Button
                variant="dangerOutline"
                size="sm"
                onClick={() => {
                  setMenuOpen(false);
                  signOut();
                }}
                icon={LogOut}
                className="font-bold rounded-xl"
              >
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
