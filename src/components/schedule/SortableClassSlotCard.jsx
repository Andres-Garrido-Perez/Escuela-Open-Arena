import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ClassSlotCard } from './ClassSlotCard';

export const SortableClassSlotCard = ({
  slot,
  isReorganizing,
  ...props
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: slot.id,
    disabled: !isReorganizing,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isReorganizing ? attributes : {})}
      {...(isReorganizing ? listeners : {})}
      className={`${
        isReorganizing
          ? 'touch-none cursor-grab active:cursor-grabbing select-none'
          : 'touch-pan-y'
      } ${isDragging ? 'opacity-30 scale-[0.98]' : 'opacity-100'}`}
    >
      <ClassSlotCard
        slot={slot}
        isReorganizing={isReorganizing}
        isDragging={isDragging}
        {...props}
      />
    </div>
  );
};
