import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableClassSlotCard } from './SortableClassSlotCard';

export const DayScheduleColumn = ({
  day,
  slots = [],
  isReorganizing,
  enrollmentsBySlotId,
  filteredStudents,
  handleOpenCreate,
  handleOpenEdit,
  deleteClassSlot,
  enrollStudent,
  handleCreateAndEnroll,
  unenrollStudent,
}) => {
  const containerId = `day-${day.day}`;
  const { setNodeRef, isOver } = useDroppable({
    id: containerId,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl border p-2.5 min-h-[520px] transition-all duration-150 ${
        isOver && isReorganizing
          ? 'bg-blue-50/80 border-[#0055A5] ring-2 ring-blue-400/60 shadow-xs'
          : 'bg-slate-50/70 border-slate-200/80'
      }`}
    >
      <SortableContext
        id={containerId}
        items={slots.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 space-y-2.5 min-h-[100px]">
          {slots.map((slot) => (
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

          {slots.length === 0 && (
            <div
              className={`h-44 flex flex-col items-center justify-center border-2 border-dashed rounded-xl text-center p-4 transition-all ${
                isOver && isReorganizing
                  ? 'border-[#0055A5] bg-blue-100/60 text-[#0055A5]'
                  : 'border-slate-200 bg-white/50 text-slate-400'
              }`}
            >
              <p className="text-xs font-semibold">
                {isReorganizing
                  ? `Suelta una clase aquí para el ${day.name}`
                  : 'Sin clases programadas'}
              </p>
              {!isReorganizing && (
                <button
                  type="button"
                  onClick={() => handleOpenCreate(day.day)}
                  className="mt-2 text-xs text-[#0055A5] font-bold hover:underline cursor-pointer"
                >
                  + Crear clase el {day.name}
                </button>
              )}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
};
