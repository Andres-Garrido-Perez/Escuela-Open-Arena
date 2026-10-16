import React from 'react';
import { useSchool } from '../../context/SchoolContext';
import { CoachTabsBar } from '../coaches/CoachTabsBar';
import { WeeklyGrid } from '../schedule/WeeklyGrid';
import { StudentsSidebar } from '../students/StudentsSidebar';
import { MonthlyBillingTable } from '../billing/MonthlyBillingTable';

export const MainWorkspace = () => {
  const { activeView } = useSchool();

  const isScheduleOrStudents =
    activeView === 'cuadrante' || activeView === 'alumnos';

  return (
    <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-100/50 pb-15 md:pb-0">
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

          {/* Directorio de Alumnos: visible on mobile if activeView === 'alumnos', always visible on desktop */}
          <div
            className={`h-full min-h-0 ${
              activeView === 'cuadrante' ? 'hidden md:flex' : 'flex flex-1 md:flex-initial'
            }`}
          >
            <StudentsSidebar />
          </div>
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

