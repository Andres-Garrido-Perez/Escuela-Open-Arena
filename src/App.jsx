import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SchoolProvider, useSchool } from './context/SchoolContext';
import { LoginView } from './components/auth/LoginView';
import { TopNavbar } from './components/layout/TopNavbar';
import { MainWorkspace } from './components/layout/MainWorkspace';
import { SportSelectorView } from './components/sport-selector/SportSelectorView';

import { BottomNavBar } from './components/layout/BottomNavBar';
import { ProfitabilityPasswordModal } from './components/profitability/ProfitabilityPasswordModal';

const AppContent = () => {
  const { session, loading } = useAuth();
  const { sport, setSport } = useSchool();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen min-h-dvh bg-slate-900 flex flex-col items-center justify-center text-white px-4">
        <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mb-4 shadow-xl p-3 animate-pulse">
          <img src="/favicon.png" alt="OpenArena" className="w-10 h-10 object-contain" />
        </div>
        <p className="text-sm font-bold tracking-widest uppercase text-sky-300 text-center">
          Cargando OpenArena...
        </p>
      </div>
    );
  }

  // REGLA CRÍTICA 1: Login Obligatorio si no hay sesión iniciada
  if (!session) {
    return <LoginView />;
  }

  // If no sport chosen, show SportSelectorView
  if (!sport) {
    return <SportSelectorView onSelect={(chosen) => setSport(chosen)} />;
  }

  // Authenticated App Workspace
  return (
    <div className="min-h-screen min-h-dvh h-screen h-dvh flex flex-col bg-[#F8FAFC] text-[#0F172A] overflow-hidden">
      <TopNavbar />
      <MainWorkspace />
      <BottomNavBar />
      <ProfitabilityPasswordModal />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SchoolProvider>
        <AppContent />
      </SchoolProvider>
    </AuthProvider>
  );
}
