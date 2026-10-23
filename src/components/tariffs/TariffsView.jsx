import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useTariffs } from '../../hooks/useTariffs';
import { useStudents } from '../../hooks/useStudents';
import { TariffModal } from './TariffModal';
import { Button } from '../ui/Button';
import { SearchInput } from '../ui/SearchInput';
import { formatTariffCode } from '../../utils/tariffUtils';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Users,
  AlertCircle,
} from 'lucide-react';

export const TariffsView = () => {
  const { sport } = useSchool();
  const { tariffs, addTariff, updateTariff, deleteTariff, loading } = useTariffs();
  const { filteredStudents, students } = useStudents();
  const allStudentsList = students || filteredStudents || [];

  const [search, setSearch] = useState('');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [tariffToEdit, setTariffToEdit] = useState(null);
  const [deleteConfirmTariff, setDeleteConfirmTariff] = useState(null);

  const activeSport = (sport || 'tenis').toLowerCase();
  const isTenis = activeSport === 'tenis';

  // Mapear cuántos alumnos tienen asignada cada tarifa
  const studentCountByTariff = useMemo(() => {
    const map = {};
    (allStudentsList || []).forEach((st) => {
      if (st.tariff_id) {
        map[st.tariff_id] = (map[st.tariff_id] || 0) + 1;
      }
    });
    return map;
  }, [allStudentsList]);

  // Filtrado de tarifas estrictamente por el deporte activo en el top navbar
  const filteredTariffs = useMemo(() => {
    let list = (tariffs || []).filter(
      (t) => (t.sport || 'tenis').toLowerCase() === activeSport
    );

    // Filtro por texto
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          (t.category_name || '').toLowerCase().includes(q) ||
          (t.level_label || '').toLowerCase().includes(q) ||
          (t.code || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [tariffs, activeSport, search]);

  // Agrupar tarifas por Categoría
  const groupedByCategory = useMemo(() => {
    const groups = {};
    filteredTariffs.forEach((t) => {
      const cat = t.category_name || t.level_label || 'Otras Clases';
      if (!groups[cat]) {
        groups[cat] = {
          categoryName: cat,
          sport: t.sport || activeSport,
          levelLabel: t.level_label,
          items: [],
        };
      }
      groups[cat].items.push(t);
    });

    // Ordenar los items de cada grupo por horas_per_week ascendente
    Object.values(groups).forEach((g) => {
      g.items.sort((a, b) => Number(a.hours_per_week) - Number(b.hours_per_week));
    });

    return Object.values(groups).sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  }, [filteredTariffs, activeSport]);

  // Abrir modal de creación limpia
  const handleOpenCreate = () => {
    setTariffToEdit(null);
    setModalOpen(true);
  };

  // Abrir modal de edición
  const handleOpenEdit = (tariff) => {
    setTariffToEdit(tariff);
    setModalOpen(true);
  };

  // Botón "Añadir": abre el modal preconfigurado para añadir más horas a esa categoría
  const handleAddMoreHoursToCategory = (lastTariffInCategory) => {
    const nextHours = (Number(lastTariffInCategory.hours_per_week) || 2) + 1;
    const ratio = nextHours / (Number(lastTariffInCategory.hours_per_week) || 1);
    const suggestedPriceNonMember = Math.round((lastTariffInCategory.price_non_member || 30) * ratio);
    const suggestedPriceMember = Math.round((lastTariffInCategory.price_member || 25) * ratio);

    const cleanCode = formatTariffCode(lastTariffInCategory.code, nextHours);

    setTariffToEdit({
      ...lastTariffInCategory,
      id: null,
      code: cleanCode,
      hours_per_week: nextHours,
      price_non_member: suggestedPriceNonMember,
      price_member: suggestedPriceMember,
    });
    setModalOpen(true);
  };

  // Guardar (crear o actualizar)
  const handleSaveTariff = async (tariffData) => {
    if (tariffToEdit && tariffToEdit.id) {
      await updateTariff(tariffToEdit.id, tariffData);
    } else {
      await addTariff({
        ...tariffData,
        sport: activeSport,
      });
    }
  };

  // Confirmar eliminación
  const handleConfirmDelete = async () => {
    if (!deleteConfirmTariff) return;
    await deleteTariff(deleteConfirmTariff.id);
    setDeleteConfirmTariff(null);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50/70 overflow-y-auto">
      {/* Header View */}
      <div className="bg-white border-b border-slate-200/90 px-4 sm:px-6 lg:px-8 py-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-50 text-[#0055A5] rounded-2xl border border-blue-100/80 shadow-2xs text-xl sm:text-2xl flex items-center justify-center">
                <span>{isTenis ? '🎾' : '🏸'}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {isTenis ? 'Clases & Tarifas de Tenis' : 'Clases & Tarifas de Pádel'}
                  </h1>
                  <span className="text-xs font-bold text-[#0055A5] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                    {filteredTariffs.length} clases
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  {isTenis
                    ? 'Gestiona grupos, horas semanales (1h, 2h, 3h, 4h...) y precios de la Escuela de Tenis.'
                    : 'Gestiona grupos, horas semanales (1h, 2h, 3h, 4h...) y precios de la Escuela de Pádel.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="w-full sm:w-64">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Buscar clase o código..."
                size="sm"
              />
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleOpenCreate}
              icon={Plus}
              className="text-xs sm:text-sm font-bold shadow-xs whitespace-nowrap"
            >
              Nueva Clase / Tarifa
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        {loading && tariffs.length === 0 ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#0055A5] border-t-transparent" />
            <p className="mt-3 text-sm text-slate-500 font-medium">Cargando clases y tarifas...</p>
          </div>
        ) : groupedByCategory.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center shadow-xs">
            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">
              No se encontraron clases para {isTenis ? 'Tenis' : 'Pádel'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Prueba a cambiar la búsqueda o pulsa en Nueva Clase para crear una.
            </p>
            <div className="mt-5">
              <Button variant="primary" size="sm" onClick={handleOpenCreate} icon={Plus}>
                Crear Primera Clase
              </Button>
            </div>
          </div>
        ) : (
          groupedByCategory.map((group) => {
            const lastItem = group.items[group.items.length - 1];

            return (
              <div
                key={group.categoryName}
                className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all hover:border-slate-300"
              >
                {/* Cabecera del Grupo / Categoría */}
                <div className="px-5 py-3.5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{isTenis ? '🎾' : '🏸'}</span>
                    <div>
                      <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                        {group.categoryName}
                      </h2>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="uppercase font-bold tracking-wider text-[10px] text-slate-400">
                          {isTenis ? 'Tenis' : 'Pádel'}
                        </span>
                        <span>•</span>
                        <span>
                          {group.items.length} {group.items.length === 1 ? 'opción de horas' : 'opciones de horas'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botón rápido "Añadir" */}
                  <button
                    type="button"
                    onClick={() => handleAddMoreHoursToCategory(lastItem)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0055A5] bg-blue-50 hover:bg-blue-100 border border-blue-200/70 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                    title={`Añadir opción de horas a ${group.categoryName}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir</span>
                  </button>
                </div>

                {/* Grid de Tarjetas de cada Tarifa / Horas */}
                <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {group.items.map((tariff) => {
                    const studentCount = studentCountByTariff[tariff.id] || 0;
                    const hours = Number(tariff.hours_per_week) || 1;

                    return (
                      <div
                        key={tariff.id}
                        className="bg-white rounded-2xl border border-slate-200/90 p-4 flex flex-col justify-between hover:shadow-md hover:border-blue-200 transition-all group"
                      >
                        <div>
                          {/* Top Tag & Code */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="inline-flex items-center gap-1 bg-[#0055A5] text-white text-xs font-black px-2.5 py-0.5 rounded-lg shadow-2xs">
                              <Clock className="w-3 h-3" />
                              <span>{hours}h / semana</span>
                            </span>

                            <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              {tariff.code || 'TAR'}
                            </span>
                          </div>

                          {/* Level Label */}
                          <h4 className="text-sm font-black text-slate-800 line-clamp-1 mb-2">
                            {tariff.level_label || tariff.category_name}
                          </h4>

                          {/* Prices Box */}
                          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-1.5 mb-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500 font-medium">Abonado:</span>
                              <span className="font-black text-[#0055A5] text-sm">
                                {Number(tariff.price_member || 0).toFixed(2)} €
                                <span className="text-[10px] text-slate-400 font-normal">/mes</span>
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs border-t border-slate-200/50 pt-1">
                              <span className="text-slate-500 font-medium">No Abonado:</span>
                              <span className="font-bold text-slate-800 text-xs">
                                {Number(tariff.price_non_member || 0).toFixed(2)} €
                                <span className="text-[10px] text-slate-400 font-normal">/mes</span>
                              </span>
                            </div>
                          </div>

                          {/* Metadata: Aforo & Alumnos inscritos */}
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-3 px-0.5">
                            <div className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              <span>Máx {tariff.max_students || 4} al.</span>
                            </div>
                            <span
                              className={`font-bold px-1.5 py-0.2 rounded-md ${
                                studentCount > 0
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'text-slate-400'
                              }`}
                            >
                              {studentCount} {studentCount === 1 ? 'alumno' : 'alumnos'}
                            </span>
                          </div>
                        </div>

                        {/* Actions Row (Solo Editar y Eliminar, sin botón redundante a la izquierda) */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(tariff)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-[#0055A5] bg-slate-100 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer border border-slate-200/80"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteConfirmTariff(tariff)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar clase"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Crear / Editar Tarifa */}
      <TariffModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        tariffToEdit={tariffToEdit}
        onSave={handleSaveTariff}
        defaultSport={activeSport}
      />

      {/* Modal de confirmación de eliminación */}
      {deleteConfirmTariff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">¿Eliminar esta clase?</h3>
                <p className="text-xs text-slate-500 font-mono">
                  [{deleteConfirmTariff.code}] {deleteConfirmTariff.category_name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Esta acción eliminará la tarifa de {deleteConfirmTariff.hours_per_week}h/semana (
              {deleteConfirmTariff.price_non_member}€/mes).
              {studentCountByTariff[deleteConfirmTariff.id] > 0 && (
                <strong className="block text-rose-700 mt-1">
                  ⚠️ Atención: Hay {studentCountByTariff[deleteConfirmTariff.id]} alumnos inscritos que usan esta tarifa.
                </strong>
              )}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeleteConfirmTariff(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                icon={Trash2}
              >
                Sí, Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
