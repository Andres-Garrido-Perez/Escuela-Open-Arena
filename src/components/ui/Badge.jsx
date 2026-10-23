import React from 'react';

export const Badge = ({
  children,
  variant = 'blue',
  size = 'sm',
  className = '',
  icon: Icon,
  onClick,
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full transition-colors';

  const variants = {
    // Capacity traffic light colors
    capacityEmpty: 'bg-blue-100 text-[#0055A5] border border-blue-200',
    capacityAvailable: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    capacityAlmostFull: 'bg-amber-100 text-amber-800 border border-amber-300',
    capacityFull: 'bg-rose-100 text-rose-800 border border-rose-300',

    // General badges
    blue: 'bg-blue-50 text-[#0055A5] border border-blue-200/60',
    sky: 'bg-sky-50 text-sky-700 border border-sky-200',
    green: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    amber: 'bg-amber-50 text-amber-800 border border-amber-300/80',
    red: 'bg-rose-50 text-rose-700 border border-rose-200',
    gray: 'bg-slate-100 text-slate-600 border border-slate-200',
    dark: 'bg-slate-800 text-slate-200 border border-slate-700',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200',
    baja: 'bg-rose-50 text-rose-700 border border-rose-200 font-bold',
  };

  const sizes = {
    xs: 'px-1.5 py-0.5 text-[10px] gap-1',
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs font-semibold gap-1.5',
  };

  return (
    <span
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.blue} ${sizes[size] || sizes.sm} ${onClick ? 'cursor-pointer hover:opacity-80' : ''} ${className}`}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      <span>{children}</span>
    </span>
  );
};
