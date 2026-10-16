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

  // Mobile view states
  const todayDayIndex = (() => {
    const day = new Date().getDay();
    return day === 0 ? 1 : Math.min(6, day);
  })();

  const [mobileDay, setMobileDay] = useState(todayDayIndex);
  const [mobileViewMode, setMobileViewMode] = useState('single'); // 'single' | 'full'

  const daysToRender = showSaturday ? ALL_DAYS : ALL_DAYS.slice(0, 5);

  const handleOpenCreate = (day) => {
    setSlotToEdit(null);
    setTargetDay(day || mobileDay || 1);
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

  const currentMobileDayObj =
    daysToRender.find((d) => d.day === mobileDay) || daysToRender[0];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-100/50">
      {/* Subheader Toolbar */}
      <div className="bg-white border-b border-slate-200/80 px-3 sm:px-4 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2 sm:gap-4 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar className="w-4 h-4 text-[#0055A5] shrink-0" />
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Cuadrante
            </span>
            <span>•</span>
            <span className="font-medium">{slots.length} clases</span>
          </div>
        </div>

        {/* Controls: Mode toggle, Saturday Toggle & Quick Add Class */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile view mode toggle (Día / Semana) */}
          <div className="flex md:hidden bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px]">
            <button
              type="button"
              onClick={() => setMobileViewMode('single')}
              className={`px-2 py-1 rounded-md font-bold transition-all ${
                mobileViewMode === 'single'
                  ? 'bg-white text-[#0055A5] shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Día
            </button>
            <button
              type="button"
              onClick={() => setMobileViewMode('full')}
              className={`px-2 py-1 rounded-md font-bold transition-all ${
                mobileViewMode === 'full'
                  ? 'bg-white text-[#0055A5] shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Semana
            </button>
          </div>

          <div className="hidden sm:block">
            <Switch
              checked={showSaturday}
              onChange={setShowSaturday}
              label="Sábados"
              size="sm"
            />
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenCreate(mobileDay)}
            icon={Plus}
            className="text-xs font-bold"
          >
            <span className="hidden xs:inline">Nueva Clase</span>
            <span className="xs:hidden">Clase</span>
          </Button>
        </div>
      </div>

      {/* MOBILE DAY SELECTOR TABS (Visible only on < md when mobileViewMode === 'single') */}
      <div className="md:hidden bg-white border-b border-slate-200/90 px-2 py-2 shrink-0">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${daysToRender.length}, minmax(0, 1fr))` }}>
          {daysToRender.map((d) => {
            const isSelected = mobileDay === d.day;
            const count = slots.filter((s) => Number(s.day_of_week) === d.day).length;

            return (
              <button
                key={d.day}
                type="button"
                onClick={() => setMobileDay(d.day)}
                className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#0055A5] text-white border-[#0055A5] shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="text-[10px] font-black tracking-tight uppercase">
                  {d.short}
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full mt-0.5 ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-white text-slate-500 border border-slate-200'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MOBILE SINGLE DAY VIEW (Full width, easy touch) */}
      <div
        className={`flex-1 overflow-y-auto p-3 sm:p-4 min-h-0 ${
          mobileViewMode === 'single' ? 'md:hidden' : 'hidden'
        }`}
      >
        <div className="max-w-xl mx-auto space-y-2.5">
          {/* Day header banner */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-900 uppercase">
                {currentMobileDayObj?.name}
              </span>
              <span className="text-xs font-bold text-[#0055A5] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                {slots.filter((s) => Number(s.day_of_week) === mobileDay).length} clases
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleOpenCreate(mobileDay)}
              className="inline-flex items-center gap-1 text-xs text-[#0055A5] font-bold bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir Clase</span>
            </button>
          </div>

          {/* Slots list for current day */}
          {slots
            .filter((s) => Number(s.day_of_week) === mobileDay)
            .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
            .map((slot) => (
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

          {slots.filter((s) => Number(s.day_of_week) === mobileDay).length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl text-center p-6 bg-white">
              <Calendar className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500 font-semibold">
                Sin clases para el {currentMobileDayObj?.name}
              </p>
              <button
                type="button"
                onClick={() => handleOpenCreate(mobileDay)}
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-white bg-[#0055A5] hover:bg-[#004385] px-3.5 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crear clase el {currentMobileDayObj?.name}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MULTI-COLUMN WEEKLY GRID (Visible on Desktop OR when mobileViewMode === 'full') */}
      <div
        className={`flex-1 overflow-auto min-h-0 bg-slate-100/50 ${
          mobileViewMode === 'single' ? 'hidden md:block' : 'block'
        }`}
      >
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
