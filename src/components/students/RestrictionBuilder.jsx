import React from 'react';

const DAYS_SHORT = [
  { day: 1, label: 'Lun' },
  { day: 2, label: 'Mar' },
  { day: 3, label: 'Mié' },
  { day: 4, label: 'Jue' },
  { day: 5, label: 'Vie' },
  { day: 6, label: 'Sáb' },
];

export const RestrictionBuilder = ({
  restrictionsText = '',
  restrictionsJson = null,
  onChange,
}) => {
  // Parse blocked days from restrictionsJson if present
  let blockedDays = [];
  try {
    if (restrictionsJson) {
      const parsed = typeof restrictionsJson === 'string'
        ? JSON.parse(restrictionsJson)
        : restrictionsJson;
      if (Array.isArray(parsed?.blocked_days)) {
        blockedDays = parsed.blocked_days;
      }
    }
  } catch {
    blockedDays = [];
  }

  const toggleDay = (day) => {
    let nextBlocked;
    if (blockedDays.includes(day)) {
      nextBlocked = blockedDays.filter((d) => d !== day);
    } else {
      nextBlocked = [...blockedDays, day];
    }

    // Auto-compose text helper if text is empty or mirrors days
    const dayNames = {
      1: 'Lunes',
      2: 'Martes',
      3: 'Miércoles',
      4: 'Jueves',
      5: 'Viernes',
      6: 'Sábado',
    };
    const autoDaysText = nextBlocked.length > 0
      ? `No puede ${nextBlocked.map((d) => dayNames[d]).join(', ')}`
      : '';

    onChange({
      restrictions_json: JSON.stringify({ blocked_days: nextBlocked }),
      restrictions_text: restrictionsText || autoDaysText,
    });
  };

  const handleTextChange = (text) => {
    onChange({
      restrictions_json: restrictionsJson,
      restrictions_text: text,
    });
  };

  return (
    <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
      <span className="block text-xs font-bold text-slate-700">
        Restricciones de Días y Horarios (Opcional)
      </span>

      {/* Quick Day Toggle Buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] text-slate-500 mr-1">Días bloqueados:</span>
        {DAYS_SHORT.map((d) => {
          const isBlocked = blockedDays.includes(d.day);
          return (
            <button
              key={d.day}
              type="button"
              onClick={() => toggleDay(d.day)}
              className={`px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                isBlocked
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {d.label}
            </button>
          );
        })}
      </div>

      {/* Free Text Note */}
      <input
        type="text"
        value={restrictionsText}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder="Ej. 'no martes', 'solo tardes a partir de las 18:00'..."
        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30 focus:border-[#0055A5]"
      />
    </div>
  );
};
