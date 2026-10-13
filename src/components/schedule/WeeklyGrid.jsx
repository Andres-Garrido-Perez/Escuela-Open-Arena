import React, { useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useSchedule } from '../../hooks/useSchedule';
import { useStudents } from '../../hooks/useStudents';
import { useCoaches } from '../../hooks/useCoaches';
import { useTariffs } from '../../hooks/useTariffs';
import { ClassSlotCard } from './ClassSlotCard';
import { ClassSlotModal } from './ClassSlotModal';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import { Plus, Calendar } from 'lucide-react';

const ALL_DAYS = [
  { day: 1, name: 'Lunes', short: 'LUN' },
  { day: 2, name: 'Martes', short: 'MAR' },
  { day: 3, name: 'Miércoles', short: 'MIÉ' },
  { day: 4, name: 'Jueves', short: 'JUE' },
  { day: 5, name: 'Viernes', short: 'VIE' },
  { day: 6, name: 'Sábado', short: 'SÁB' },
];

export const WeeklyGrid = () => {
  const { showSaturday, setShowSaturday, sport } = useSchool();

  const {
    slots,
    enrollmentsBySlotId,
    addClassSlot,
    updateClassSlot,
    deleteClassSlot,
    enrollStudent,
    unenrollStudent,
  } = useSchedule();

  const { filteredStudents, addStudent } = useStudents();
  const { filteredCoaches } = useCoaches();
  const { filteredTariffs } = useTariffs();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [slotToEdit, setSlotToEdit] = useState(null);
  const [targetDay, setTargetDay] = useState(1);

  const daysToRender = showSaturday ? ALL_DAYS : ALL_DAYS.slice(0, 5);

  const handleOpenCreate = (day) => {
    setSlotToEdit(null);
    setTargetDay(day);
    setModalOpen(true);
  };

  const handleOpenEdit = (slot) => {
    setSlotToEdit(slot);
    setTargetDay(Number(slot.day_of_week) || 1);
    setModalOpen(true);
  };

  const handleSaveSlot = async (slotData) => {
    if (slotToEdit) {
      await updateClassSlot(slotToEdit.id, slotData);
    } else {
      await addClassSlot(slotData);
    }
  };

  const handleCreateAndEnroll = async ({
    classSlotId,
    fullName,
    alsoAddPairDay,
  }) => {
    // Rule #3: Create student on the fly without modal
    const createdStudent = await addStudent({
      full_name: fullName,
      sport: sport,
    });

    if (createdStudent?.id) {
      await enrollStudent({
        classSlotId,
        studentId: createdStudent.id,
        alsoAddPairDay,
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-100/50">
      {/* Subheader Toolbar */}
      <div className="bg-white border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar className="w-4 h-4 text-[#0055A5]" />
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Cuadrante Semanal
            </span>
            <span>•</span>
            <span>{slots.length} clases programadas</span>
          </div>
        </div>

        {/* Saturday Toggle & Quick Add Class */}
        <div className="flex items-center gap-4">
          <Switch
            checked={showSaturday}
            onChange={setShowSaturday}
            label="Incluir Sábados"
            size="sm"
          />

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenCreate(1)}
            icon={Plus}
            className="text-xs font-bold"
          >
            Nueva Clase
          </Button>
        </div>
      </div>

      {/* Grid Columns Container with single scroll block */}
      <div className="flex-1 overflow-auto min-h-0 bg-slate-100/50">
        <div className="min-w-[900px]">
          {/* Sticky Day Headers Row (sin hueco arriba, perfectamente pegado a la barra superior) */}
          <div className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200/90 px-3 lg:px-4 py-2.5 shadow-2xs">
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${daysToRender.length}, minmax(260px, 1fr))`,
              }}
            >
              {daysToRender.map((d) => {
                const daySlotsCount = slots.filter(
                  (s) => Number(s.day_of_week) === d.day
                ).length;

                return (
                  <div
                    key={d.day}
                    className="flex items-center justify-between px-3 py-1.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-tight">
                        {d.name}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                        {daySlotsCount}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenCreate(d.day)}
                      className="p-1 text-slate-400 hover:text-[#0055A5] hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                      title={`Añadir clase el ${d.name}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid Columns Content */}
          <div className="p-3 lg:p-4 pt-3 pb-8">
            <div
              className="grid gap-3 min-h-[500px]"
              style={{
                gridTemplateColumns: `repeat(${daysToRender.length}, minmax(260px, 1fr))`,
              }}
            >
              {daysToRender.map((d) => {
                const daySlots = slots
                  .filter((s) => Number(s.day_of_week) === d.day)
                  .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

                return (
                  <div
                    key={d.day}
                    className="flex flex-col bg-slate-50/70 rounded-2xl border border-slate-200/80 p-2.5 min-h-[500px]"
                  >
                    {/* Day Slots List */}
                    <div className="flex-1 space-y-2.5">
                      {daySlots.map((slot) => (
                        <ClassSlotCard
                          key={slot.id}
                          slot={slot}
                          enrollments={enrollmentsBySlotId[slot.id] || []}
                          allStudents={filteredStudents}
                          onEnrollExisting={enrollStudent}
                          onCreateAndEnroll={handleCreateAndEnroll}
                          onUnenroll={unenrollStudent}
                          onEditSlot={handleOpenEdit}
                          onDeleteSlot={deleteClassSlot}
                        />
                      ))}

                      {daySlots.length === 0 && (
                        <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-center p-4">
                          <p className="text-xs text-slate-400 font-medium">
                            Sin clases programadas
                          </p>
                          <button
                            type="button"
                            onClick={() => handleOpenCreate(d.day)}
                            className="mt-2 text-xs text-[#0055A5] font-bold hover:underline cursor-pointer"
                          >
                            + Crear clase el {d.name}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <ClassSlotModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        slotToEdit={slotToEdit}
        initialDay={targetDay}
        coaches={filteredCoaches}
        tariffs={filteredTariffs}
        onSave={handleSaveSlot}
      />
    </div>
  );
};
