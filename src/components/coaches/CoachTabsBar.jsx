import React, { useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useCoaches } from '../../hooks/useCoaches';
import { CoachFormModal } from './CoachFormModal';
import { CoachSalaryModal } from './CoachSalaryModal';
import { Button } from '../ui/Button';
import { Plus, Edit2, Users, Euro } from 'lucide-react';

export const CoachTabsBar = () => {
  const { activeCoachId, setActiveCoachId, sport } = useSchool();
  const { filteredCoaches, addCoach, updateCoach } = useCoaches();

  const [modalOpen, setModalOpen] = useState(false);
  const [coachToEdit, setCoachToEdit] = useState(null);
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [coachForSalary, setCoachForSalary] = useState(null);

  const handleOpenCreate = () => {
    setCoachToEdit(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (coach, e) => {
    e.stopPropagation();
    setCoachToEdit(coach);
    setModalOpen(true);
  };

  const handleOpenSalary = (coach, e) => {
    e.stopPropagation();
    setCoachForSalary(coach);
    setSalaryModalOpen(true);
  };

  const handleSaveSalary = async (coachId, hourlyCost) => {
    await updateCoach(coachId, { hourly_cost: hourlyCost });
  };

  const handleSaveCoach = async (coachData) => {
    if (coachToEdit) {
      await updateCoach(coachToEdit.id, coachData);
    } else {
      const created = await addCoach(coachData);
      // Auto-select newly created coach
      if (created?.id) {
        setActiveCoachId(created.id);
      }
    }
  };

  return (
    <div className="bg-white border-b border-slate-200 px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-3 overflow-x-auto no-scrollbar shrink-0">
      {/* Coach Tabs */}
      <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
          <Users className="w-3.5 h-3.5 text-[#0055A5]" />
          <span className="hidden xs:inline">Monitores:</span>
        </span>

        {/* Tab "Todos" */}
        <button
          type="button"
          onClick={() => setActiveCoachId(null)}
          className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
            !activeCoachId
              ? 'bg-[#0055A5] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Todos
        </button>

        {/* Individual Coach Tabs */}
        {filteredCoaches.map((coach) => {
          const isSelected = activeCoachId === coach.id;
          const colorDot = coach.color_theme || '#0055A5';
          const hasSalary = coach.hourly_cost !== null && coach.hourly_cost !== undefined;

          return (
            <div
              key={coach.id}
              onClick={() => setActiveCoachId(coach.id)}
              className={`group flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border select-none shrink-0 ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {/* Color indicator dot */}
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/50"
                style={{ backgroundColor: colorDot }}
              />
              <span className="whitespace-nowrap">{coach.name}</span>

              {/* Sueldo / Coste por hora badge button */}
              <button
                type="button"
                onClick={(e) => handleOpenSalary(coach, e)}
                title={`Coste: ${hasSalary ? `${Number(coach.hourly_cost).toFixed(2)}€/h` : 'Sin asignar'}. Haz clic para editar sueldo.`}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-0.5 ${
                  isSelected
                    ? 'bg-white/20 text-white hover:bg-white/30 hover:scale-105'
                    : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200/80 hover:scale-105'
                }`}
              >
                <Euro className="w-2.5 h-2.5" />
                <span>
                  {hasSalary ? `${Number(coach.hourly_cost).toFixed(2)}€/h` : 'Sueldo'}
                </span>
              </button>

              {/* Edit button */}
              <button
                type="button"
                onClick={(e) => handleOpenEdit(coach, e)}
                className={`p-1 rounded hover:bg-white/20 transition-opacity ${
                  isSelected
                    ? 'opacity-90 hover:opacity-100 text-white'
                    : 'opacity-50 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-slate-400 hover:text-slate-800'
                }`}
                title="Editar monitor completo"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {filteredCoaches.length === 0 && (
          <span className="text-xs text-slate-400 italic shrink-0">
            Sin monitores aún en {sport === 'tenis' ? 'Tenis' : 'Pádel'}.
          </span>
        )}
      </div>

      {/* Action to add coach */}
      <div className="shrink-0 pl-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenCreate}
          icon={Plus}
          className="text-xs font-bold border-slate-200 hover:border-[#0055A5] hover:text-[#0055A5]"
        >
          <span className="hidden sm:inline">Añadir Monitor</span>
          <span className="sm:hidden">Monitor</span>
        </Button>
      </div>

      {/* Modal Edición Completa Monitor */}
      <CoachFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        coachToEdit={coachToEdit}
        onSave={handleSaveCoach}
      />

      {/* Modal Rápido Sueldo / Coste por hora */}
      <CoachSalaryModal
        isOpen={salaryModalOpen}
        onClose={() => setSalaryModalOpen(false)}
        coach={coachForSalary}
        onSaveSalary={handleSaveSalary}
      />
    </div>
  );
};
