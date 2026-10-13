import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import { RestrictionBuilder } from './RestrictionBuilder';
import { useSchool } from '../../context/SchoolContext';
import { useTariffs } from '../../hooks/useTariffs';

export const StudentFormModal = ({
  isOpen,
  onClose,
  studentToEdit = null,
  onSave,
}) => {
  const { sport } = useSchool();
  const { filteredTariffs } = useTariffs();

  // ONLY full_name is mandatory!
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [studentSport, setStudentSport] = useState('tenis');
  const [categoryName, setCategoryName] = useState('Adultos');
  const [tariffId, setTariffId] = useState('');
  const [isMember, setIsMember] = useState(false);
  const [weeklyHours, setWeeklyHours] = useState('');
  const [status, setStatus] = useState('activo');
  const [restrictionsText, setRestrictionsText] = useState('');
  const [restrictionsJson, setRestrictionsJson] = useState(null);
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (studentToEdit) {
      setFullName(studentToEdit.full_name || '');
      setPhone(studentToEdit.phone || '');
      setStudentSport(studentToEdit.sport || sport || 'tenis');
      setCategoryName(studentToEdit.category_name || 'Adultos');
      setTariffId(studentToEdit.tariff_id || '');
      setIsMember(Boolean(studentToEdit.is_member));
      setWeeklyHours(
        studentToEdit.weekly_hours_contracted
          ? String(studentToEdit.weekly_hours_contracted)
          : ''
      );
      setStatus(studentToEdit.status || 'activo');
      setRestrictionsText(studentToEdit.restrictions_text || '');
      setRestrictionsJson(studentToEdit.restrictions_json || null);
      setNotes(studentToEdit.notes || '');
    } else {
      setFullName('');
      setPhone('');
      setStudentSport(sport || 'tenis');
      setCategoryName('Adultos');
      setTariffId('');
      setIsMember(false);
      setWeeklyHours('');
      setStatus('activo');
      setRestrictionsText('');
      setRestrictionsJson(null);
      setNotes('');
    }
    setError('');
  }, [studentToEdit, sport, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('El nombre completo es el único campo obligatorio.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const selectedTariff = filteredTariffs.find((t) => t.id === tariffId);

      await onSave({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        sport: studentSport,
        category_name: categoryName || null,
        tariff_id: tariffId || null,
        tariff_code: selectedTariff?.code || null,
        is_member: isMember,
        weekly_hours_contracted: weeklyHours ? Number(weeklyHours) : null,
        status: status,
        restrictions_text: restrictionsText.trim() || null,
        restrictions_json: restrictionsJson,
        notes: notes.trim() || null,
      });

      onClose();
    } catch (err) {
      setError(err.message || 'Error guardando alumno');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={studentToEdit ? 'Editar Alumno' : 'Nuevo Alumno'}
      subtitle="Creación rápida: solo el nombre completo es obligatorio."
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* ÚNICO CAMPO OBLIGATORIO: full_name */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Nombre Completo * <span className="text-[11px] font-normal text-slate-400">(Obligatorio)</span>
          </label>
          <input
            type="text"
            required
            autoFocus
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ej. Carlos Alcaraz, María Pérez..."
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30 focus:border-[#0055A5]"
          />
        </div>

        {/* TODOS LOS SIGUIENTES CAMPOS SON 100% OPCIONALES */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Teléfono / WhatsApp <span className="text-[10px] font-normal text-slate-400">(Opcional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="600 000 000"
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Deporte
            </label>
            <select
              value={studentSport}
              onChange={(e) => setStudentSport(e.target.value)}
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30 cursor-pointer"
            >
              <option value="tenis">Tenis</option>
              <option value="padel">Pádel</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tarifa / Nivel <span className="text-[10px] font-normal text-slate-400">(Opcional)</span>
            </label>
            <select
              value={tariffId}
              onChange={(e) => setTariffId(e.target.value)}
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30 cursor-pointer"
            >
              <option value="">Sin tarifa seleccionada</option>
              {filteredTariffs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code} - {t.category_name} ({t.price_non_member}€)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Horas Contratadas/Semana <span className="text-[10px] font-normal text-slate-400">(Opcional)</span>
            </label>
            <input
              type="number"
              step="0.5"
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(e.target.value)}
              placeholder="1, 1.5, 2, 3..."
              className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30"
            />
          </div>
        </div>

        {/* Member toggle */}
        <div className="pt-1">
          <Switch
            checked={isMember}
            onChange={setIsMember}
            label="¿Es abonado de OpenArena?"
            description="Aplica precios reducidos de abonado en recibos"
            size="sm"
          />
        </div>

        {/* Restricciones Builder (Opcional) */}
        <RestrictionBuilder
          restrictionsText={restrictionsText}
          restrictionsJson={restrictionsJson}
          onChange={({ restrictions_text, restrictions_json }) => {
            setRestrictionsText(restrictions_text);
            setRestrictionsJson(restrictions_json);
          }}
        />

        {/* Notas (Opcional) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Notas u Observaciones <span className="text-[10px] font-normal text-slate-400">(Opcional)</span>
          </label>
          <textarea
            rows="2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Alergias, disponibilidad, historial..."
            className="w-full px-3 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {studentToEdit ? 'Guardar Alumno' : 'Crear Alumno'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
