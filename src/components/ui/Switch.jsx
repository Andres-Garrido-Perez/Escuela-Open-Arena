import React from 'react';

export const Switch = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className = '',
  size = 'md',
}) => {
  const isSmall = size === 'sm';

  return (
    <label
      className={`inline-flex items-center gap-2.5 cursor-pointer select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      <div className="relative inline-block shrink-0">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
        />
        <div
          className={`block rounded-full transition-colors ${
            isSmall ? 'w-8 h-4.5' : 'w-10 h-5.5'
          } ${checked ? 'bg-[#0055A5]' : 'bg-slate-300'}`}
        />
        <div
          className={`absolute left-0.5 top-0.5 bg-white rounded-full transition-transform transform shadow-xs ${
            isSmall ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5'
          } ${
            checked
              ? isSmall
                ? 'translate-x-3.5'
                : 'translate-x-4.5'
              : 'translate-x-0'
          }`}
        />
      </div>
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-xs md:text-sm font-medium text-slate-700">
              {label}
            </span>
          )}
          {description && (
            <span className="text-[11px] text-slate-500">{description}</span>
          )}
        </div>
      )}
    </label>
  );
};
