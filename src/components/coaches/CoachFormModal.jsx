import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useSchool } from '../../context/SchoolContext';

const COLOR_OPTIONS = [
  { label: 'Azul Real', value: '#0055A5' },
  { label: 'Celeste OpenArena', value: '#0284C7' },
  { label: 'Esmeralda', value: '#10B981' },
  { label: 'Ámbar', value: '#F59E0B' },
  { label: 'Púrpura', value: '#8B5CF6' },
  { label: 'Rosa Deportivo', value: '#EC4899' },
  { label: 'Gris Grafito', value: '#475569' },
];

export const CoachFormModal = ({
  isOpen,
  onClose,
  coachToEdit = null,
  onSave,
}) => {
  const { sport } = useSchool();
  const [name, setName] = useState('');
  const [coachSport, setCoachSport] = useState('tenis');
  const [phone, setPhone] = useState('');
  const [hourlyCost, setHourlyCost] = useState('');
  const [colorTheme, setColorTheme] = useState('#0055A5');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (coachToEdit) {
      setName(coachToEdit.name || '');
      setCoachSport(coachToEdit.sport || sport || 'tenis');
      setPhone(coachToEdit.phone || '');
      setHourlyCost(coachToEdit.hourly_cost ? String(coachToEdit.hourly_cost) : '');
      setColorTheme(coachToEdit.color_theme || '#0055A5');
      setNotes(coachToEdit.notes || '');
    } else {
      setName('');
      setCoachSport(sport || 'tenis');
      setPhone('');
      setHourlyCost('');
      setColorTheme('#0055A5');
      setNotes('');
    }
    setError('');
  }, [coachToEdit, sport, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre del monitor es obligatorio');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onSave({
        name: name.trim(),
        sport: coachSport,
        phone: phone.trim() || null,
        hourly_cost: hourlyCost ? Number(hourlyCost) : null,
        color_theme: colorTheme,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Error guardando monitor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={coachToEdit ? 'Editar Monitor' : 'Nuevo Monitor'}
      subtitle="Datos del entrenador y configuración de color en el cuadrante"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Nombre del Monitor *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Harold, Camacho, Juan, Loren..."
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30 focus:border-[#0055A5]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Deporte
            </label>
            <select
              value={coachSport}
              onChange={(e) => setCoachSport(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30"
            >
              <option value="tenis">Tenis</option>
              <option value="padel">Pádel</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Teléfono (Opcional)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="600 000 000"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Color Identificativo en Cuadrante
          </label>
          <div className="flex items-center gap-2 mt-1">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColorTheme(c.value)}
                style={{ backgroundColor: c.value }}
                className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                  colorTheme === c.value
                    ? 'ring-2 ring-offset-2 ring-slate-800 scale-110 shadow-xs'
                    : 'opacity-70 hover:opacity-100 hover:scale-105'
                }`}
                title={c.label}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Coste por Hora (€) (Opcional)
          </label>
          <input
            type="number"
            step="0.5"
            value={hourlyCost}
            onChange={(e) => setHourlyCost(e.target.value)}
            placeholder="Ej. 18.00"
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Notas / Disponibilidad (Opcional)
          </label>
          <textarea
            rows="2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Horarios preferidos, pistas asignadas..."
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {coachToEdit ? 'Guardar Cambios' : 'Crear Monitor'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
