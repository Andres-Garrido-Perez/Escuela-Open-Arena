import React, { useState, useRef, useEffect } from 'react';
import { PlusCircle } from 'lucide-react';

const TWIN_DAY_LABELS = {
  1: 'Añadir también el Miércoles a esta hora',
  2: 'Añadir también el Jueves a esta hora',
  3: 'Añadir también el Lunes a esta hora',
  4: 'Añadir también el Martes a esta hora',
};

export const QuickEnrollInput = ({
  classSlot,
  availableStudents = [],
  alreadyEnrolledIds = [],
  onEnrollExisting,
  onCreateAndEnroll,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Twin day double enrollment checkbox - checked by default!
  const hasTwinDay = Boolean(TWIN_DAY_LABELS[classSlot.day_of_week]);
  const [alsoAddPairDay, setAlsoAddPairDay] = useState(true);

  const wrapperRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter students who are not already in this class and match search term
  const query = searchTerm.trim().toLowerCase();
  const eligibleStudents = availableStudents.filter(
    (s) => !alreadyEnrolledIds.includes(s.id)
  );

  const filtered = query
    ? eligibleStudents.filter((s) => s.full_name.toLowerCase().includes(query))
    : eligibleStudents.slice(0, 8); // Show top 8 if empty search

  const exactMatchExists = eligibleStudents.some(
    (s) => s.full_name.toLowerCase() === query
  );

  const handleSelectStudent = async (student) => {
    try {
      setIsSubmitting(true);
      await onEnrollExisting(student.id, alsoAddPairDay);
      setSearchTerm('');
      setIsOpen(false);
    } catch (err) {
      alert('Error al inscribir: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAndEnroll = async () => {
    if (!query) return;
    try {
      setIsSubmitting(true);
      await onCreateAndEnroll(searchTerm.trim(), alsoAddPairDay);
      setSearchTerm('');
      setIsOpen(false);
    } catch (err) {
      alert('Error creando e inscribiendo alumno: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative mt-2 pt-2 border-t border-slate-100">
      {/* Search Input Bar */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="+ Inscribir alumno..."
            className="w-full px-2.5 py-1 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0055A5] focus:border-[#0055A5] transition-all"
          />
        </div>
      </div>

      {/* Twin Day Checkbox (L+X / M+J) */}
      {hasTwinDay && (
        <div className="mt-1 flex items-center gap-1.5 px-0.5">
          <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={alsoAddPairDay}
              onChange={(e) => setAlsoAddPairDay(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-[#0055A5] focus:ring-[#0055A5] border-slate-300"
            />
            <span className="font-medium text-slate-700">
              {TWIN_DAY_LABELS[classSlot.day_of_week]}
            </span>
          </label>
        </div>
      )}

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto p-1 text-xs divide-y divide-slate-50">
          {filtered.length > 0 ? (
            filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSelectStudent(s)}
                className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 rounded-lg flex items-center justify-between text-slate-800 transition-colors cursor-pointer"
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold truncate">{s.full_name}</span>
                  {s.phone && (
                    <span className="text-[10px] text-slate-400">{s.phone}</span>
                  )}
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium shrink-0">
                  Inscribir
                </span>
              </button>
            ))
          ) : !query ? (
            <div className="p-2 text-center text-slate-400 text-[11px]">
              No hay más alumnos disponibles
            </div>
          ) : null}

          {/* Quick Create on the Fly option */}
          {query && !exactMatchExists && (
            <div className="p-1">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCreateAndEnroll}
                className="w-full text-left px-2.5 py-2 bg-blue-50/70 hover:bg-blue-100/80 rounded-lg flex items-center gap-2 text-[#0055A5] font-bold transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  Crear alumno <strong>"{searchTerm.trim()}"</strong> e inscribir aquí
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
