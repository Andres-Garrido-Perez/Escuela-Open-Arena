import React from 'react';
import { useSchool } from '../../context/SchoolContext';
import { ArrowRight, Users, Calendar, Award } from 'lucide-react';

export const SportSelectorView = ({ onSelect }) => {
  const { setSport } = useSchool();

  const handleChoose = (chosenSport) => {
    setSport(chosenSport);
    if (onSelect) onSelect(chosenSport);
  };

  return (
    <div className="min-h-screen min-h-dvh bg-slate-900 flex items-center justify-center p-3 sm:p-6 py-6 sm:py-8 relative overflow-y-auto">
      {/* Corner Logo (Visible on sm+) */}
      <div className="hidden sm:flex absolute top-4 left-4 sm:top-6 sm:left-6 z-20 items-center bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-white/30 hover:scale-105 transition-transform duration-200">
        <img
          src="/logoOpenArena.png"
          alt="OpenArena Logo"
          className="h-9 sm:h-10 w-auto object-contain"
        />
      </div>

      {/* Decorative Glows */}
      <div className="absolute top-1/4 left-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-[#0055A5]/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-[#38BDF8]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl w-full relative z-10 text-center my-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-10 flex flex-col items-center">
          {/* Central Logo */}
          <div className="inline-flex items-center justify-center p-3 sm:p-3.5 rounded-3xl bg-white shadow-2xl mb-3 sm:mb-4 border border-white/20">
            <img src="/logoOpenArena.png" alt="OpenArena" className="h-12 sm:h-16 w-auto object-contain" />
          </div>
          <p className="text-slate-300 text-xs sm:text-sm max-w-md mx-auto px-2">
            Plataforma Integral de Gestión de Escuelas Deportivas. Selecciona el deporte a gestionar:
          </p>
        </div>

        {/* Sports Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto">
          {/* Card Tenis */}
          <div
            onClick={() => handleChoose('tenis')}
            className="group relative bg-white/95 backdrop-blur-sm rounded-3xl p-5 sm:p-8 text-left border border-white/20 shadow-2xl hover:scale-[1.01] sm:hover:scale-[1.02] hover:shadow-[#0055A5]/40 transition-all duration-300 cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl group-hover:bg-amber-400/20 transition-all" />
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <span className="text-4xl sm:text-5xl">🎾</span>
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-amber-100 text-amber-800 rounded-full">
                Tierra & Resina
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-1.5 sm:mb-2">
              Escuela de Tenis
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Gestión de niveles iniciación, perfeccionamiento y competición con Harold, Juan y equipo.
            </p>

            <div className="mb-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
              <span>📊 Cálculo de Margen Neto e IVA (21%)</span>
            </div>

            <div className="grid grid-cols-3 gap-2 py-3 px-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6 text-center">

              <div>
                <Calendar className="w-4 h-4 text-[#0055A5] mx-auto mb-1" />
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Cuadrante</span>
                <span className="text-xs font-bold text-slate-700">L - V</span>
              </div>
              <div>
                <Users className="w-4 h-4 text-[#0055A5] mx-auto mb-1" />
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Plazas</span>
                <span className="text-xs font-bold text-slate-700">Semáforos</span>
              </div>
              <div>
                <Award className="w-4 h-4 text-[#0055A5] mx-auto mb-1" />
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Tarifas</span>
                <span className="text-xs font-bold text-slate-700">1h y 1.5h</span>
              </div>
            </div>

            <div className="flex items-center justify-between font-bold text-sm text-[#0055A5] group-hover:translate-x-1 transition-transform">
              <span>Acceder a Escuela de Tenis</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Card Pádel */}
          <div
            onClick={() => handleChoose('padel')}
            className="group relative bg-white/95 backdrop-blur-sm rounded-3xl p-8 text-left border border-white/20 shadow-2xl hover:scale-[1.02] hover:shadow-[#0284C7]/40 transition-all duration-300 cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-400/10 rounded-full blur-2xl group-hover:bg-sky-400/20 transition-all" />
            <div className="flex items-center justify-between mb-6">
              <span className="text-5xl">🏸</span>
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-sky-100 text-sky-800 rounded-full">
                Cristal Panorámico
              </span>
            </div>

            <h3 className="text-2xl font-black text-slate-900 mb-2">
              Escuela de Pádel
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Organización de grupos reducidos de pádel, menores, adultos y preparación táctica.
            </p>

            <div className="mb-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
              <span>📊 Cálculo de Margen Neto e IVA (21%)</span>
            </div>

            <div className="grid grid-cols-3 gap-2 py-3 px-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6 text-center">

              <div>
                <Calendar className="w-4 h-4 text-[#0284C7] mx-auto mb-1" />
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Cuadrante</span>
                <span className="text-xs font-bold text-slate-700">L - V</span>
              </div>
              <div>
                <Users className="w-4 h-4 text-[#0284C7] mx-auto mb-1" />
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Plazas</span>
                <span className="text-xs font-bold text-slate-700">Capacidad 4</span>
              </div>
              <div>
                <Award className="w-4 h-4 text-[#0284C7] mx-auto mb-1" />
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Tarifas</span>
                <span className="text-xs font-bold text-slate-700">Abonados/No</span>
              </div>
            </div>

            <div className="flex items-center justify-between font-bold text-sm text-[#0284C7] group-hover:translate-x-1 transition-transform">
              <span>Acceder a Escuela de Pádel</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
