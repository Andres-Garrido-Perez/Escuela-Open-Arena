import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Layers, Sparkles, AlertCircle, Check } from 'lucide-react';
import { formatTariffCode } from '../../utils/tariffUtils';

const COMMON_CATEGORIES = {
  tenis: [
    { cat: 'Pre-Tenis (4-6 años)', level: 'Pre-Tenis', max: 8, prefix: 'PT' },
    { cat: 'Iniciación y Avanzada (6-18 años)', level: 'Iniciación y Avanzada', max: 8, prefix: 'INI-AV' },
    { cat: 'Promoción (8-18 años)', level: 'Promoción', max: 6, prefix: 'PR' },
    { cat: 'Adultos (4)', level: 'Adultos (4)', max: 4, prefix: 'AD-1h(4)' },
    { cat: 'Adultos (6)', level: 'Adultos (6)', max: 6, prefix: 'AD-1h(6)' },
    { cat: 'Competición', level: 'Competición', max: 4, prefix: 'C' },
  ],
  padel: [
    { cat: 'Pádel', level: 'Pádel', max: 4, prefix: 'P4-1' },
    { cat: 'Pre-Pádel (4-6 años)', level: 'Pre-Pádel', max: 6, prefix: 'P6-1' },
    { cat: 'Pádel Juvenil (16:00-19:00)', level: 'Pádel Juvenil', max: 6, prefix: 'P4-1 VALLE' },
  ],
};

export const TariffModal = ({
  isOpen,
  onClose,
  tariffToEdit = null,
  onSave,
  defaultSport = 'tenis',
}) => {
  const [sport, setSport] = useState('tenis');
  const [categoryName, setCategoryName] = useState('');
  const [levelLabel, setLevelLabel] = useState('');
  const [hoursPerWeek, setHoursPerWeek] = useState(1);
  const [priceMember, setPriceMember] = useState('');
  const [priceNonMember, setPriceNonMember] = useState('');
  const [maxStudents, setMaxStudents] = useState(4);
  const [code, setCode] = useState('');
  const [active, setActive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (tariffToEdit) {
      setSport(tariffToEdit.sport || 'tenis');
      setCategoryName(tariffToEdit.category_name || '');
      setLevelLabel(tariffToEdit.level_label || '');
      setHoursPerWeek(Number(tariffToEdit.hours_per_week) || 1);
      setPriceMember(
        tariffToEdit.price_member !== null && tariffToEdit.price_member !== undefined
          ? String(tariffToEdit.price_member)
          : ''
      );
      setPriceNonMember(
        tariffToEdit.price_non_member !== null && tariffToEdit.price_non_member !== undefined
          ? String(tariffToEdit.price_non_member)
          : ''
      );
      setMaxStudents(Number(tariffToEdit.max_students) || 4);
      setCode(tariffToEdit.code || '');
      setActive(tariffToEdit.active !== false);
    } else {
      setSport(defaultSport || 'tenis');
      setCategoryName('');
      setLevelLabel('');
      setHoursPerWeek(1);
      setPriceMember('');
      setPriceNonMember('');
      setMaxStudents(4);
      setCode('');
      setActive(true);
    }
    setError('');
  }, [isOpen, tariffToEdit]);

  // Autogenerar código intuitivo
  const handleGenerateCode = (cat, h, sp) => {
    const s = sp || sport;
    const hours = h || hoursPerWeek;
    const category = cat || categoryName;

    // Si ya hay un código previo, formatearlo limpiamente
    if (code) {
      return formatTariffCode(code, hours);
    }

    // Buscar coincidencia en sugerencias
    const match = (COMMON_CATEGORIES[s] || []).find((c) => c.cat.toLowerCase() === category.toLowerCase());
    if (match) {
      return formatTariffCode(match.prefix, hours);
    }

    // Abreviatura basada en palabras
    const words = category
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);
    const abbrev = words.slice(0, 3).map((w) => w.slice(0, 3).toUpperCase()).join('-');
    return abbrev ? formatTariffCode(abbrev, hours) : `CLS-${hours}H`;
  };

  const handleSelectTemplate = (item) => {
    setCategoryName(item.cat);
    setLevelLabel(item.level);
    setMaxStudents(item.max);
    setCode(formatTariffCode(item.prefix, hoursPerWeek));
  };

  const handleHoursChange = (h) => {
    const val = Number(h);
    setHoursPerWeek(val);
    if (code) {
      setCode(formatTariffCode(code, val));
    } else {
      setCode(handleGenerateCode(categoryName, val, sport));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      setError('Por favor indica el nombre de la clase o categoría.');
      return;
    }

    const pNonMember = parseFloat(priceNonMember);
    if (isNaN(pNonMember) || pNonMember < 0) {
      setError('El precio para no abonados debe ser un importe válido (0 o superior).');
      return;
    }

    const pMember = priceMember !== '' ? parseFloat(priceMember) : pNonMember;
    if (isNaN(pMember) || pMember < 0) {
      setError('El precio para abonados debe ser un importe válido.');
      return;
    }

    const finalCode = code.trim() || handleGenerateCode(categoryName, hoursPerWeek, sport);

    try {
      setLoading(true);
      setError('');

      await onSave({
        code: finalCode,
        sport,
        category_name: categoryName.trim(),
        level_label: (levelLabel.trim() || categoryName.trim()),
        hours_per_week: Number(hoursPerWeek) || 1,
        price_member: pMember,
        price_non_member: pNonMember,
        max_students: Number(maxStudents) || 4,
        billing_period: 'mensual',
        active,
      });

      onClose();
    } catch (err) {
      console.error('Error guardando tarifa:', err);
      setError('No se pudo guardar la tarifa. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const categoryTemplates = COMMON_CATEGORIES[sport] || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tariffToEdit ? 'Editar Clase / Tarifa' : 'Nueva Clase / Tarifa'}
      subtitle={
        tariffToEdit
          ? 'Modifica el nombre, precios de abonado y no abonado, aforo y horas semanales.'
          : 'Define una nueva opción de horas semanales (ej. 3h o 4h) o un nuevo grupo.'
      }
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Deporte Seleccionado */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
            Deporte
          </label>
          <div className="flex items-center gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-xl">{sport === 'padel' ? '🏸' : '🎾'}</span>
            <div>
              <span className="text-xs font-black text-slate-900 block">
                {sport === 'padel' ? 'Escuela de Pádel' : 'Escuela de Tenis'}
              </span>
              <span className="text-[10px] text-slate-500">
                Se guarda en la escuela activa seleccionada en la barra superior
              </span>
            </div>
          </div>
        </div>

        {/* Plantillas / Categorías sugeridas */}
        {!tariffToEdit && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#0055A5]" />
                <span>Sugerencias rápidas de categoría</span>
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {categoryTemplates.map((item) => (
                <button
                  key={item.cat}
                  type="button"
                  onClick={() => handleSelectTemplate(item)}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    categoryName === item.cat
                      ? 'bg-blue-50 text-[#0055A5] border-blue-200 font-bold'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  {item.cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Nombre de la Categoría y Nivel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nombre de la Clase / Categoría <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={categoryName}
              onChange={(e) => {
                setCategoryName(e.target.value);
                if (!levelLabel) setLevelLabel(e.target.value);
              }}
              placeholder="Ej: Iniciación y Avanzada (6-18 años)"
              className="w-full px-3 py-2 text-xs md:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30 focus:border-[#0055A5]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nivel / Etiqueta Corta <span className="text-slate-400 font-normal">(Cuadrante)</span>
            </label>
            <input
              type="text"
              value={levelLabel}
              onChange={(e) => setLevelLabel(e.target.value)}
              placeholder="Ej: Iniciación y Avanzada"
              className="w-full px-3 py-2 text-xs md:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30 focus:border-[#0055A5]"
            />
          </div>
        </div>

        {/* Horas Semanales (Clave para permitir 3h o 4h o más) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Horas Semanales Contratadas <span className="text-rose-500">*</span>
            </label>
            <span className="text-[10px] text-slate-500 font-medium">
              Permite a los alumnos dar 3h, 4h o más a la semana
            </span>
          </div>

          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => handleHoursChange(h)}
                className={`flex-1 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                  hoursPerWeek === h
                    ? 'bg-[#0055A5] text-white border-[#0055A5] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {h}h / sem
              </button>
            ))}
            <div className="w-20">
              <input
                type="number"
                min="1"
                max="12"
                value={hoursPerWeek}
                onChange={(e) => handleHoursChange(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs text-center font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30"
                placeholder="Otra..."
              />
            </div>
          </div>
        </div>

        {/* Precios: Abonado y No Abonado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-blue-50/50 p-3 rounded-2xl border border-blue-100/80">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
              <span>Precio Abonado (€/mes)</span>
              <span className="text-[10px] text-[#0055A5] bg-white px-1.5 py-0.2 rounded border border-blue-200 font-bold">
                Tarifa Abonado
              </span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="0"
                required
                value={priceMember}
                onChange={(e) => setPriceMember(e.target.value)}
                placeholder="Ej: 44.00"
                className="w-full pl-3 pr-8 py-2 text-xs md:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30 focus:border-[#0055A5] font-bold text-slate-900"
              />
              <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                €
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
              <span>Precio No Abonado (€/mes)</span>
              <span className="text-[10px] text-slate-600 bg-white px-1.5 py-0.2 rounded border border-slate-200 font-bold">
                No Abonado
              </span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="0"
                required
                value={priceNonMember}
                onChange={(e) => setPriceNonMember(e.target.value)}
                placeholder="Ej: 50.00"
                className="w-full pl-3 pr-8 py-2 text-xs md:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30 focus:border-[#0055A5] font-bold text-slate-900"
              />
              <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                €
              </span>
            </div>
          </div>
        </div>

        {/* Plazas / Aforo Máximo y Código */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Aforo Máximo de Alumnos por Pista
            </label>
            <div className="flex items-center gap-2">
              {[4, 6, 8].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setMaxStudents(num)}
                  className={`flex-1 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    maxStudents === num
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {num} al.
                </button>
              ))}
              <div className="w-16">
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={maxStudents}
                  onChange={(e) => setMaxStudents(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-xs text-center font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Código de Tarifa
              </label>
              <button
                type="button"
                onClick={() => setCode(handleGenerateCode(categoryName, hoursPerWeek, sport))}
                className="text-[10px] text-[#0055A5] hover:underline font-bold cursor-pointer"
              >
                Autogenerar
              </button>
            </div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ej: INI-AV-3H"
              className="w-full px-3 py-2 text-xs md:text-sm bg-white border border-slate-200 rounded-xl uppercase font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0055A5]/30"
            />
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <Button variant="secondary" size="md" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" size="md" type="submit" loading={loading} icon={Check}>
            {tariffToEdit ? 'Guardar Cambios' : 'Crear Clase / Tarifa'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
