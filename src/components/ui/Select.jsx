import React from 'react';

export const Select = ({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Selecciona una opción',
  className = '',
  disabled = false,
  error,
  ...props
}) => {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-slate-700">
          {label}
        </label>
      )}
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full px-3 py-2 text-xs md:text-sm bg-white border rounded-lg text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30 focus:border-[#0055A5] cursor-pointer ${
          error ? 'border-rose-400' : 'border-slate-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-[11px] text-rose-500">{error}</span>}
    </div>
  );
};
