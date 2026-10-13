import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SchoolProvider, useSchool } from './context/SchoolContext';
import { LoginView } from './components/auth/LoginView';
import { TopNavbar } from './components/layout/TopNavbar';
import { MainWorkspace } from './components/layout/MainWorkspace';
import { SportSelectorView } from './components/sport-selector/SportSelectorView';
import { Activity } from 'lucide-react';

const AppContent = () => {
  const { session, loading } = useAuth();
  const { sport, setSport } = useSchool();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-14 h-14 rounded-2xl bg-[#0055A5] flex items-center justify-center mb-4 shadow-xl animate-pulse">
          <Activity className="w-8 h-8 text-white" />
        </div>
        <p className="text-sm font-bold tracking-widest uppercase text-sky-300">
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
    <div className="min-h-screen h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] overflow-hidden">
      <TopNavbar />
      <MainWorkspace />
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
