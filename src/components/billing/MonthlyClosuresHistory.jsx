import React, { useState, useMemo } from 'react';
import { useMonthlyClosures } from '../../hooks/useMonthlyClosures';
import { useCoaches } from '../../hooks/useCoaches';
import { Badge } from '../ui/Badge';
import {
  Lock,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Calendar,
  Briefcase,
  History,
  ShieldCheck,
} from 'lucide-react';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';

export const MonthlyClosuresHistory = () => {
  const { closures, loading } = useMonthlyClosures();
  const { coaches } = useCoaches();
  const [expandedMonths, setExpandedMonths] = useState({});

  const coachesById = useMemo(() => {
    return coaches.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});
  }, [coaches]);

  // Group closures by month_year
  const closuresByMonth = useMemo(() => {
    const grouped = {};
    closures.forEach((item) => {
      const m = item.month_year;
      if (!grouped[m]) grouped[m] = [];
      grouped[m].push(item);
    });

    // Sort months descending
    const sortedMonths = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    return sortedMonths.map((m) => {
      const items = grouped[m];
      const totalRevenue = items.reduce((sum, i) => sum + (Number(i.total_revenue) || 0), 0);
      const totalCost = items.reduce((sum, i) => sum + (Number(i.coach_cost) || 0), 0);
      const totalProfit = items.reduce((sum, i) => sum + (Number(i.net_profit) || 0), 0);

      let formattedLabel = m;
      try {
        const parsed = parse(m, 'yyyy-MM', new Date(2026, 0, 1));
        formattedLabel = format(parsed, 'MMMM yyyy', { locale: es });
      } catch {
        formattedLabel = m;
      }

      return {
        monthYear: m,
        formattedLabel,
        items,
        totalRevenue,
        totalCost,
        totalProfit,
      };
    });
  }, [closures]);

  const toggleMonth = (m) => {
    setExpandedMonths((prev) => ({
      ...prev,
      [m]: !prev[m],
    }));
  };

  if (loading && closures.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-400 text-xs shadow-xs">
        Cargando histórico de beneficios...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 mb-6">
      {/* Title */}
      <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight m-0 flex items-center gap-2">
            <History className="w-4 h-4 text-[#0055A5]" />
            <span>Histórico de Beneficios y Cierres Mensuales</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Registro inmutable de los márgenes y beneficios congelados al finalizar cada mes.
          </p>
        </div>
        <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>{closuresByMonth.length} Meses cerrados</span>
        </span>
      </div>

      {/* List of Closed Months */}
      {closuresByMonth.length === 0 ? (
        <div className="py-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200 px-4">
          <Lock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-600 m-0">
            Aún no se ha cerrado ningún mes.
          </p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
            Utiliza el botón <span className="font-bold text-slate-700">"🔒 Cerrar Mes y Guardar Histórico"</span> situado arriba para congelar los datos del mes seleccionado.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {closuresByMonth.map((monthGroup) => {
            const isExpanded = expandedMonths[monthGroup.monthYear];
            const isProfitPositive = monthGroup.totalProfit >= 0;

            return (
              <div
                key={monthGroup.monthYear}
                className="border border-slate-200 rounded-xl overflow-hidden transition-all bg-white hover:border-slate-300"
              >
                {/* Month Summary Header Bar */}
                <div
                  onClick={() => toggleMonth(monthGroup.monthYear)}
                  className="p-3.5 sm:p-4 bg-slate-50/80 hover:bg-slate-100/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#0055A5]/10 text-[#0055A5] flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm capitalize">
                          {monthGroup.formattedLabel}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                          {monthGroup.monthYear}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {monthGroup.items.length} monitores registrados en el cierre
                      </span>
                    </div>
                  </div>

                  {/* Metrics Pills */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <div className="text-right px-2.5 py-1 bg-white rounded-lg border border-slate-150">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">
                        Facturado
                      </span>
                      <span className="text-xs font-black text-slate-800">
                        {monthGroup.totalRevenue.toFixed(2)} €
                      </span>
                    </div>

                    <div className="text-right px-2.5 py-1 bg-white rounded-lg border border-slate-150">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">
                        Coste Monitores
                      </span>
                      <span className="text-xs font-black text-slate-700">
                        -{monthGroup.totalCost.toFixed(2)} €
                      </span>
                    </div>

                    <div
                      className={`text-right px-3 py-1 rounded-lg border ${
                        isProfitPositive
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}
                    >
                      <span className="text-[9px] uppercase font-bold block opacity-80">
                        Margen Congelado
                      </span>
                      <span className="text-xs font-black">
                        {isProfitPositive ? '+' : ''}
                        {monthGroup.totalProfit.toFixed(2)} €
                      </span>
                    </div>

                    <div className="p-1 text-slate-400 hover:text-slate-600 rounded">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details: Breakdown per coach */}
                {isExpanded && (
                  <div className="p-4 bg-white border-t border-slate-150">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-[#0055A5]" />
                      <span>Desglose por Monitor en este cierre:</span>
                    </h3>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-400 uppercase font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">Monitor</th>
                            <th className="py-2 px-3 text-right">Facturación Generada</th>
                            <th className="py-2 px-3 text-right">Coste Nómina</th>
                            <th className="py-2 px-3 text-right">Margen Neto Escuela</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {monthGroup.items.map((item) => {
                            const coach = coachesById[item.coach_id];
                            const coachName = coach?.name || 'Monitor Desconocido';
                            const colorDot = coach?.color_theme || '#0055A5';
                            const netProfit = Number(item.net_profit) || 0;
                            const isPositive = netProfit >= 0;

                            return (
                              <tr key={item.id} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-3 font-bold text-slate-800">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full shrink-0"
                                      style={{ backgroundColor: colorDot }}
                                    />
                                    <span>{coachName}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                                  {Number(item.total_revenue || 0).toFixed(2)} €
                                </td>
                                <td className="py-2.5 px-3 text-right font-medium text-slate-600">
                                  -{Number(item.coach_cost || 0).toFixed(2)} €
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <span
                                    className={`font-black ${
                                      isPositive ? 'text-emerald-700' : 'text-rose-600'
                                    }`}
                                  >
                                    {isPositive ? '+' : ''}
                                    {netProfit.toFixed(2)} €
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
