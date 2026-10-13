import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useStudents } from '../../hooks/useStudents';
import { useTariffs } from '../../hooks/useTariffs';
import { useMonthlyRegistry } from '../../hooks/useMonthlyRegistry';
import { Badge } from '../ui/Badge';
import { SearchInput } from '../ui/SearchInput';
import {
  CheckCircle2,
  Clock,
  UserX,
  TrendingUp,
} from 'lucide-react';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';

export const MonthlyBillingTable = () => {
  const { selectedMonth, sport } = useSchool();
  const { filteredStudents } = useStudents();
  const { tariffs } = useTariffs();
  const {
    registryMap,
    setStudentStatus,
  } = useMonthlyRegistry();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Month title formatted
  const formattedMonth = useMemo(() => {
    const parsedMonth = parse(selectedMonth, 'yyyy-MM', new Date(2026, 0, 1));
    return format(parsedMonth, 'MMMM yyyy', { locale: es });
  }, [selectedMonth]);

  const tariffsById = useMemo(() => {
    return tariffs.reduce((acc, t) => {
      acc[t.id] = t;
      return acc;
    }, {});
  }, [tariffs]);

  // Compute rows and totals with useMemo
  const { rows, totalRecaudado, totalPendiente, totalBajas } = useMemo(() => {
    let recaudado = 0;
    let pendiente = 0;
    let bajas = 0;

    const computedRows = filteredStudents.map((student) => {
      const registry = registryMap[student.id];
      const status = registry?.status || 'pendiente';
      const tariff = tariffsById[student.tariff_id];

      let price = 0;
      if (registry?.amount_expected !== null && registry?.amount_expected !== undefined) {
        price = Number(registry.amount_expected);
      } else if (tariff) {
        price = student.is_member
          ? Number(tariff.price_member || tariff.price_non_member)
          : Number(tariff.price_non_member);
      }

      if (status === 'pagado') {
        recaudado += price;
      } else if (status === 'pendiente') {
        pendiente += price;
      } else if (status === 'baja_temporal') {
        bajas += 1;
      }

      return {
        student,
        tariff,
        status,
        price,
        notes: registry?.notes || '',
      };
    });

    return {
      rows: computedRows,
      totalRecaudado: recaudado,
      totalPendiente: pendiente,
      totalBajas: bajas,
    };
  }, [filteredStudents, registryMap, tariffsById]);


  const query = search.trim().toLowerCase();
  const filteredRows = rows.filter(({ student, status }) => {
    const matchesSearch =
      !query ||
      student.full_name.toLowerCase().includes(query) ||
      (student.phone && student.phone.includes(query));

    if (!matchesSearch) return false;
    if (statusFilter !== 'todos' && status !== statusFilter) return false;

    return true;
  });

  const handleStatusChange = async (studentId, newStatus, currentPrice) => {
    try {
      await setStudentStatus(studentId, newStatus, currentPrice);
    } catch (err) {
      alert('Error actualizando estado del recibo: ' + err.message);
    }
  };

  return (
    <div className="flex-1 p-4 lg:p-6 bg-slate-50 overflow-y-auto">
      {/* Top Header & Metrics */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight capitalize m-0">
              Gestión de Recibos y Bajas — {formattedMonth}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Control mensual de alumnos en {sport === 'tenis' ? 'Tenis' : 'Pádel'}, cuotas y bajas temporales.
            </p>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Total Alumnos */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Alumnos Totales
              </span>
              <TrendingUp className="w-4 h-4 text-[#0055A5]" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {filteredStudents.length}
            </div>
            <span className="text-[11px] text-slate-400">
              En escuela de {sport}
            </span>
          </div>

          {/* Cobrado */}
          <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-xs">
            <div className="flex items-center justify-between text-emerald-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">
                Recaudado
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700">
              {totalRecaudado.toFixed(2)} €
            </div>
            <span className="text-[11px] text-emerald-600 font-medium">
              Recibos liquidados
            </span>
          </div>

          {/* Pendiente */}
          <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs">
            <div className="flex items-center justify-between text-amber-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">
                Pendiente de Cobro
              </span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-800">
              {totalPendiente.toFixed(2)} €
            </div>
            <span className="text-[11px] text-amber-700 font-medium">
              Por cobrar este mes
            </span>
          </div>

          {/* Bajas Temporales */}
          <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-xs">
            <div className="flex items-center justify-between text-slate-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">
                Bajas Temporales
              </span>
              <UserX className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-2xl font-black text-slate-800">
              {totalBajas}
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Plazas libres en cuadrante
            </span>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-72">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar alumno..."
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs w-full sm:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('todos')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'todos'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Todos ({rows.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pagado')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'pagado'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Pagados
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pendiente')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'pendiente'
                  ? 'bg-white text-amber-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Pendientes
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('baja_temporal')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'baja_temporal'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Bajas Temporales ({totalBajas})
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Alumno</th>
                <th className="py-3 px-4">Teléfono</th>
                <th className="py-3 px-4">Socio</th>
                <th className="py-3 px-4">Tarifa / Plan</th>
                <th className="py-3 px-4">Importe Mensual</th>
                <th className="py-3 px-4">Estado del Recibo</th>
                <th className="py-3 px-4 text-right">Acción Rápida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map(({ student, tariff, status, price }) => {
                const isBaja = status === 'baja_temporal';
                const isPagado = status === 'pagado';
                const isPendiente = status === 'pendiente';

                return (
                  <tr
                    key={student.id}
                    className={`hover:bg-slate-50/60 transition-colors ${
                      isBaja ? 'bg-slate-50/40 text-slate-400' : ''
                    }`}
                  >
                    {/* Alumno */}
                    <td className="py-3 px-4 font-bold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span className={isBaja ? 'line-through text-slate-400' : ''}>
                          {student.full_name}
                        </span>
                        {isBaja && (
                          <Badge variant="baja" size="xs">
                            [BAJA]
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* Teléfono */}
                    <td className="py-3 px-4 text-slate-500">
                      {student.phone || '—'}
                    </td>

                    {/* Socio */}
                    <td className="py-3 px-4">
                      {student.is_member ? (
                        <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                          Socio
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">No</span>
                      )}
                    </td>

                    {/* Tarifa */}
                    <td className="py-3 px-4">
                      {tariff ? (
                        <span className="font-semibold text-slate-700">
                          {tariff.code} - {tariff.category_name}
                        </span>
                      ) : student.category_name ? (
                        <span className="text-slate-500">
                          {student.category_name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Estándar</span>
                      )}
                    </td>

                    {/* Importe */}
                    <td className="py-3 px-4 font-black text-slate-900">
                      {isBaja ? '0.00 € (Baja)' : `${price.toFixed(2)} €`}
                    </td>

                    {/* Estado Badge */}
                    <td className="py-3 px-4">
                      {isPagado && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Pagado</span>
                        </span>
                      )}
                      {isPendiente && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <Clock className="w-3.5 h-3.5 text-amber-700" />
                          <span>Pendiente</span>
                        </span>
                      )}
                      {isBaja && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700 border border-slate-300">
                          <UserX className="w-3.5 h-3.5 text-slate-600" />
                          <span>Baja Temporal</span>
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange(
                              student.id,
                              isPagado ? 'pendiente' : 'pagado',
                              price
                            )
                          }
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isPagado
                              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          {isPagado ? 'Marcar Pendiente' : 'Cobrar'}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange(
                              student.id,
                              isBaja ? 'pendiente' : 'baja_temporal',
                              price
                            )
                          }
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isBaja
                              ? 'bg-slate-900 text-white hover:bg-slate-800'
                              : 'bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-900'
                          }`}
                          title="Alternar baja temporal para este mes"
                        >
                          {isBaja ? 'Reactivar' : 'Baja'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    No se encontraron registros de cobro para los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
