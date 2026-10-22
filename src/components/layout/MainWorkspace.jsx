import React from 'react';
import { useSchool } from '../../context/SchoolContext';
import { CoachTabsBar } from '../coaches/CoachTabsBar';
import { WeeklyGrid } from '../schedule/WeeklyGrid';
import { StudentsSidebar } from '../students/StudentsSidebar';
import { MonthlyBillingTable } from '../billing/MonthlyBillingTable';
import { Users } from 'lucide-react';

export const MainWorkspace = () => {
  const { activeView, isStudentsSidebarOpen, setIsStudentsSidebarOpen } = useSchool();

  const isScheduleOrStudents =
    activeView === 'cuadrante' || activeView === 'alumnos';

  return (
    <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-100/50 pb-15 md:pb-0 relative">
      {/* Coach Tabs Bar: visible in Cuadrante (and on desktop also in Alumnos) */}
      {(activeView === 'cuadrante' || (isScheduleOrStudents && typeof window !== 'undefined' && window.innerWidth >= 768)) && (
        <CoachTabsBar />
      )}

      {/* Main Workspace Body */}
      {isScheduleOrStudents ? (
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Cuadrante Semanal: visible on mobile if activeView === 'cuadrante', always visible on desktop */}
          <div
            className={`flex-1 flex flex-col min-h-0 overflow-hidden ${
              activeView === 'alumnos' ? 'hidden md:flex' : 'flex'
            }`}
          >
            <WeeklyGrid />
          </div>

          {/* Directorio de Alumnos: visible on mobile if activeView === 'alumnos', on desktop visible when isStudentsSidebarOpen is true */}
          {(activeView === 'alumnos' || isStudentsSidebarOpen) && (
            <div
              className={`h-full min-h-0 ${
                activeView === 'cuadrante' ? 'hidden md:flex' : 'flex flex-1 md:flex-initial'
              }`}
            >
              <StudentsSidebar />
            </div>
          )}

          {/* Botón flotante en el lateral derecho para reabrir directorio si está cerrado */}
          {!isStudentsSidebarOpen && activeView === 'cuadrante' && (
            <button
              type="button"
              onClick={() => setIsStudentsSidebarOpen(true)}
              className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 bg-[#0055A5] hover:bg-[#004385] text-white py-3.5 px-2 rounded-l-2xl shadow-xl flex-col items-center gap-1.5 z-30 transition-all cursor-pointer group hover:pr-3"
              title="Abrir directorio de alumnos"
            >
              <Users className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase [writing-mode:vertical-rl] tracking-widest">
                Alumnos
              </span>
            </button>
          )}
        </div>
      ) : (
        /* Vista de Facturación y Recibos Mensuales */
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <MonthlyBillingTable />
        </div>
      )}
    </main>
  );
};

