import React from 'react';
import { useSchool } from '../../context/SchoolContext';
import { CoachTabsBar } from '../coaches/CoachTabsBar';
import { WeeklyGrid } from '../schedule/WeeklyGrid';
import { StudentsSidebar } from '../students/StudentsSidebar';
import { MonthlyBillingTable } from '../billing/MonthlyBillingTable';

export const MainWorkspace = () => {
  const { activeView } = useSchool();

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-100/50">
      {/* Coach Tabs Bar (Solo visible en el cuadrante) */}
      {activeView === 'cuadrante' && <CoachTabsBar />}

      {/* Main Workspace Body */}

      {activeView === 'cuadrante' ? (
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* 70% Cuadrante a la izquierda */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <WeeklyGrid />
          </div>

          {/* 30% Directorio Alumnos a la derecha */}
          <StudentsSidebar />
        </div>
      ) : (
        /* Vista de Facturación y Recibos Mensuales */
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <MonthlyBillingTable />
        </div>
      )}
    </div>
  );
};
