import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSchool } from '../../context/SchoolContext';
import { useSchedule } from '../../hooks/useSchedule';
import { useStudents } from '../../hooks/useStudents';
import { useCoaches } from '../../hooks/useCoaches';
import { useTariffs } from '../../hooks/useTariffs';
import { DayScheduleColumn } from './DayScheduleColumn';
import { SortableClassSlotCard } from './SortableClassSlotCard';
import { ClassSlotCard } from './ClassSlotCard';
import { ClassSlotModal } from './ClassSlotModal';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import { Plus, Calendar, Users } from 'lucide-react';

const ALL_DAYS = [
  { day: 1, name: 'Lunes', short: 'LUN' },
  { day: 2, name: 'Martes', short: 'MAR' },
  { day: 3, name: 'Miércoles', short: 'MIÉ' },
  { day: 4, name: 'Jueves', short: 'JUE' },
  { day: 5, name: 'Viernes', short: 'VIE' },
  { day: 6, name: 'Sábado', short: 'SÁB' },
];

const timeToMinutes = (t) => {
  if (!t) return 960; // 16:00
  const [h, m] = t.slice(0, 5).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const minutesToTime = (min) => {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
};

// Organiza la lista plana de slots en un mapa por día [1..6]
const groupSlotsByDay = (allSlots) => {
  const map = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  (allSlots || []).forEach((slot) => {
    const d = Number(slot.day_of_week) || 1;
    if (!map[d]) map[d] = [];
    map[d].push(slot);
  });
  Object.keys(map).forEach((d) => {
    map[d].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  });
  return map;
};

export const WeeklyGrid = () => {
  const {
    isStudentsSidebarOpen,
    setIsStudentsSidebarOpen,
    isReorganizing,
    setIsReorganizing,
    sport,
  } = useSchool();

  const {
    slots,
    enrollmentsBySlotId,
    addClassSlot,
    updateClassSlot,
    batchUpdateClassSlots,
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

  // Local state for interactive live reordering
  const [daySlotsMap, setDaySlotsMap] = useState(() => groupSlotsByDay(slots));
  const [activeSlotId, setActiveSlotId] = useState(null);

  // Sincronizar daySlotsMap cuando cambian los slots desde el backend
  useEffect(() => {
    if (!activeSlotId) {
      setDaySlotsMap(groupSlotsByDay(slots));
    }
  }, [slots, activeSlotId]);

  // Mobile view states
  const todayDayIndex = (() => {
    const day = new Date().getDay();
    return day === 0 ? 1 : Math.min(6, day);
  })();

  const [mobileDay, setMobileDay] = useState(todayDayIndex);
  const [mobileViewMode, setMobileViewMode] = useState('single'); // 'single' | 'full'

  // Sábado siempre forma parte de los días de la semana
  const daysToRender = ALL_DAYS;

  // Configuración de sensores para @dnd-kit: arrastre ultrasensible al pulsar en la tarjeta
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Solo 3px de movimiento para activar el arrastre
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findContainer = (id) => {
    if (!id) return null;
    if (typeof id === 'string' && id.startsWith('day-')) {
      return Number(id.replace('day-', ''));
    }
    for (const d of [1, 2, 3, 4, 5, 6]) {
      if (daySlotsMap[d]?.some((item) => item.id === id)) {
        return d;
      }
    }
    return null;
  };

  const handleDragStart = ({ active }) => {
    setActiveSlotId(active.id);
  };

  const handleDragOver = ({ active, over }) => {
    if (!over) return;

    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    // Mover la tarjeta entre días en vivo en el estado local
    setDaySlotsMap((prev) => {
      const activeItems = prev[activeContainer] || [];
      const overItems = prev[overContainer] || [];

      const activeIndex = activeItems.findIndex((i) => i.id === active.id);
      if (activeIndex < 0) return prev;

      const activeItem = activeItems[activeIndex];

      let overIndex;
      if (over.id.toString().startsWith('day-')) {
        overIndex = overItems.length;
      } else {
        overIndex = overItems.findIndex((i) => i.id === over.id);
        if (overIndex < 0) overIndex = overItems.length;
      }

      const updatedActiveItem = {
        ...activeItem,
        day_of_week: overContainer,
      };

      return {
        ...prev,
        [activeContainer]: activeItems.filter((i) => i.id !== active.id),
        [overContainer]: [
          ...overItems.slice(0, overIndex),
          updatedActiveItem,
          ...overItems.slice(overIndex),
        ],
      };
    });
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveSlotId(null);

    if (!over) {
      setDaySlotsMap(groupSlotsByDay(slots));
      return;
    }

    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);

    if (!activeContainer || !overContainer) {
      setDaySlotsMap(groupSlotsByDay(slots));
      return;
    }

    let updatedMap = { ...daySlotsMap };

    // Si se reordenó dentro del mismo día
    if (activeContainer === overContainer) {
      const items = updatedMap[activeContainer] || [];
      const activeIndex = items.findIndex((i) => i.id === active.id);
      const overIndex = items.findIndex((i) => i.id === over.id);

      if (activeIndex !== overIndex && activeIndex >= 0 && overIndex >= 0) {
        updatedMap[activeContainer] = arrayMove(items, activeIndex, overIndex);
        setDaySlotsMap(updatedMap);
      }
    }

    // Calcular y guardar los nuevos horarios y días en la base de datos
    await commitDaySlotPositions(updatedMap, activeContainer, overContainer);
  };

  // Calcula las nuevas horas e intercambia/desplaza los horarios en vivo
  const commitDaySlotPositions = async (currentMap, sourceDay, targetDay) => {
    try {
      const affectedDays = Array.from(new Set([sourceDay, targetDay]));
      const updates = [];

      affectedDays.forEach((dayNum) => {
        const orderedDaySlots = currentMap[dayNum] || [];
        const originalDaySlots = slots.filter((s) => Number(s.day_of_week) === dayNum);

        // Si la cantidad de clases en el día se mantiene (ej. reordenación interna dentro del mismo día)
        if (orderedDaySlots.length === originalDaySlots.length && originalDaySlots.length > 0) {
          // Ventanas horarias originales ordenadas
          const origWindows = originalDaySlots
            .map((s) => ({ start: s.start_time, end: s.end_time }))
            .sort((a, b) => (a.start || '').localeCompare(b.start || ''));

          orderedDaySlots.forEach((slot, index) => {
            const assignedWindow = origWindows[index] || {
              start: slot.start_time,
              end: slot.end_time,
            };
            updates.push({
              id: slot.id,
              day_of_week: dayNum,
              start_time: assignedWindow.start,
              end_time: assignedWindow.end,
            });
          });
        } else if (orderedDaySlots.length > 0) {
          // Si cambió la cantidad de clases (ej. una clase se movió a otro día)
          // Asigna franjas correlativas manteniendo la duración de cada clase
          let startMinutes = Math.min(
            ...orderedDaySlots.map((s) => timeToMinutes(s.start_time))
          );
          if (startMinutes === Infinity || startMinutes < 480) startMinutes = 960; // 16:00

          orderedDaySlots.forEach((slot) => {
            const origStartMin = timeToMinutes(slot.start_time);
            const origEndMin = timeToMinutes(slot.end_time);
            let duration = origEndMin - origStartMin;
            if (duration <= 0) duration = 60;

            const newStart = minutesToTime(startMinutes);
            const newEnd = minutesToTime(startMinutes + duration);
            startMinutes += duration;

            updates.push({
              id: slot.id,
              day_of_week: dayNum,
              start_time: newStart,
              end_time: newEnd,
            });
          });
        }
      });

      if (updates.length > 0 && batchUpdateClassSlots) {
        await batchUpdateClassSlots(updates);
      }
    } catch (err) {
      console.error('Error al persistir la reordenación de clases:', err);
      setDaySlotsMap(groupSlotsByDay(slots));
    }
  };

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

  const activeSlot = activeSlotId ? slots.find((s) => s.id === activeSlotId) : null;
  const currentMobileDayObj =
    daysToRender.find((d) => d.day === mobileDay) || daysToRender[0];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
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

          {/* Controls: Mode toggle, Mover Clases switch, Reopen Sidebar & Quick Add Class */}
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

            {/* Botón para volver a abrir el directorio de alumnos si se había cerrado */}
            {!isStudentsSidebarOpen && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsStudentsSidebarOpen(true)}
                icon={Users}
                className="text-xs font-bold hidden md:inline-flex bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-2xs"
              >
                Ver Alumnos
              </Button>
            )}

            {/* Switch para activar Mover Clases (Drag & Drop en tiempo real) */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
              <Switch
                checked={isReorganizing}
                onChange={setIsReorganizing}
                label="Mover Clases"
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

        {/* Banner Informativo cuando Mover Clases está Activo */}
        {isReorganizing && (
          <div className="bg-gradient-to-r from-[#0055A5] to-indigo-700 text-white px-3 sm:px-4 py-2 flex items-center justify-between text-xs font-medium shadow-xs shrink-0 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="font-black uppercase tracking-wider text-[10px] bg-white/20 px-1.5 py-0.5 rounded shrink-0">
                Modo Mover Clases Activo
              </span>
              <span className="text-blue-100 truncate text-[11px] sm:text-xs">
                Haz clic en cualquier parte de una clase y arrástrala. Al moverla hacia arriba, abajo o hacia otro día, las demás clases se reubican en vivo.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsReorganizing(false)}
              className="ml-2 text-[11px] font-bold bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              Finalizar
            </button>
          </div>
        )}

        {/* MOBILE DAY SELECTOR TABS (Visible only on < md when mobileViewMode === 'single') */}
        <div className="md:hidden bg-white border-b border-slate-200/90 px-2 py-2 shrink-0">
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${daysToRender.length}, minmax(0, 1fr))`,
            }}
          >
            {daysToRender.map((d) => {
              const isSelected = mobileDay === d.day;
              const count = (daySlotsMap[d.day] || []).length;

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

        {/* MOBILE SINGLE DAY VIEW */}
        <div
          className={`flex-1 overflow-y-auto p-3 sm:p-4 min-h-0 ${
            mobileViewMode === 'single' ? 'md:hidden' : 'hidden'
          }`}
        >
          <div className="max-w-xl mx-auto space-y-2.5">
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900 uppercase">
                  {currentMobileDayObj?.name}
                </span>
                <span className="text-xs font-bold text-[#0055A5] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                  {(daySlotsMap[mobileDay] || []).length} clases
                </span>
              </div>
              {!isReorganizing && (
                <button
                  type="button"
                  onClick={() => handleOpenCreate(mobileDay)}
                  className="inline-flex items-center gap-1 text-xs text-[#0055A5] font-bold bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-xl transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Clase</span>
                </button>
              )}
            </div>

            <SortableContext
              id={`day-${mobileDay}`}
              items={(daySlotsMap[mobileDay] || []).map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2.5">
                {(daySlotsMap[mobileDay] || []).map((slot) => (
                  <SortableClassSlotCard
                    key={slot.id}
                    slot={slot}
                    isReorganizing={isReorganizing}
                    enrollments={enrollmentsBySlotId[slot.id] || []}
                    allStudents={filteredStudents}
                    onEnrollExisting={enrollStudent}
                    onCreateAndEnroll={handleCreateAndEnroll}
                    onUnenroll={unenrollStudent}
                    onEditSlot={handleOpenEdit}
                    onDeleteSlot={deleteClassSlot}
                  />
                ))}

                {(daySlotsMap[mobileDay] || []).length === 0 && (
                  <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl text-center p-6 bg-white">
                    <Calendar className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500 font-semibold">
                      Sin clases para el {currentMobileDayObj?.name}
                    </p>
                    {!isReorganizing && (
                      <button
                        type="button"
                        onClick={() => handleOpenCreate(mobileDay)}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-white bg-[#0055A5] hover:bg-[#004385] px-3.5 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Crear clase el {currentMobileDayObj?.name}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </SortableContext>
          </div>
        </div>

        {/* MULTI-COLUMN WEEKLY GRID (Desktop / Full view) */}
        <div
          className={`flex-1 overflow-auto min-h-0 bg-slate-100/50 ${
            mobileViewMode === 'single' ? 'hidden md:block' : 'block'
          }`}
        >
          <div className="min-w-0 w-full">
            {/* Sticky Day Headers Row */}
            <div className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200/90 px-3 lg:px-4 py-2.5 shadow-2xs">
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(${daysToRender.length}, minmax(190px, 1fr))`,
                }}
              >
                {daysToRender.map((d) => {
                  const daySlotsCount = (daySlotsMap[d.day] || []).length;

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
                  gridTemplateColumns: `repeat(${daysToRender.length}, minmax(190px, 1fr))`,
                }}
              >
                {daysToRender.map((d) => (
                  <DayScheduleColumn
                    key={d.day}
                    day={d}
                    slots={daySlotsMap[d.day] || []}
                    isReorganizing={isReorganizing}
                    enrollmentsBySlotId={enrollmentsBySlotId}
                    filteredStudents={filteredStudents}
                    handleOpenCreate={handleOpenCreate}
                    handleOpenEdit={handleOpenEdit}
                    deleteClassSlot={deleteClassSlot}
                    enrollStudent={enrollStudent}
                    handleCreateAndEnroll={handleCreateAndEnroll}
                    unenrollStudent={unenrollStudent}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Drag Overlay: tarjeta flotante que se mueve fluidamente bajo el ratón */}
        <DragOverlay dropAnimation={null}>
          {activeSlot ? (
            <div className="rotate-1 scale-[1.03] shadow-2xl ring-2 ring-[#0055A5] rounded-xl bg-white cursor-grabbing">
              <ClassSlotCard
                slot={activeSlot}
                enrollments={enrollmentsBySlotId[activeSlot.id] || []}
                allStudents={filteredStudents}
                isReorganizing={true}
              />
            </div>
          ) : null}
        </DragOverlay>

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
    </DndContext>
  );
};
