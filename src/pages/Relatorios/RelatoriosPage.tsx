import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { SupportService } from '../../services/supports/supportService';
import { AttendantService } from '../../services/attendants/attendantService';
import { GoalService } from '../../services/goals/goalService';
import { TreatmentSupport, Attendant, Goal } from '../../types';
import {
  calculateDashboardMetrics,
  calculateAttendantsPerformance,
  formatDateBR,
  getTodayISODate,
} from '../../utils/calculations';
import { exportSupportsToExcel, exportSupportsToCSV } from '../../utils/export';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export const RelatoriosPage: React.FC = () => {
  const { isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'diario' | 'mensal' | 'atendente'>('diario');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayISODate());

  const [supports, setSupports] = useState<TreatmentSupport[]>([]);
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  const loadData = useCallback(() => {
    setSupports(SupportService.getAll(false));
    setAttendants(AttendantService.getAll());
    setGoals(GoalService.getAll());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const metrics = useMemo(
    () => calculateDashboardMetrics(supports, attendants, goals, selectedDate),
    [supports, attendants, goals, selectedDate]
  );

  const attendantsPerformance = useMemo(
    () => calculateAttendantsPerformance(supports, attendants, selectedDate),
    [supports, attendants, selectedDate]
  );

  const attendantsMap = useMemo(() => {
    const map = new Map<string, Attendant>();
    attendants.forEach((a) => map.set(a.id, a));
    return map;
  }, [attendants]);

  // Dados diários no mês
  const dailyData = useMemo(() => {
    const targetMonth = selectedDate.substring(0, 7);
    const parts = selectedDate.split('-');
    const currentDay = parseInt(parts[2], 10) || 24;

    const list = [];
    for (let day = 1; day <= currentDay; day++) {
      const dayStr = String(day).padStart(2, '0');
      const dateKey = `${targetMonth}-${dayStr}`;
      const daySupports = supports.filter((s) => !s.deletedAt && s.date === dateKey);
      const dayTotal = daySupports.reduce((acc, curr) => acc + curr.quantity, 0);

      list.push({
        data: `${dayStr}/${targetMonth.substring(5, 7)}`,
        dataCompleta: dateKey,
        total: dayTotal,
        meta: metrics.todayGoal,
        atendentesComApoio: new Set(daySupports.map((s) => s.attendantId)).size,
      });
    }
    return list;
  }, [supports, selectedDate, metrics.todayGoal]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 flex items-center justify-center text-error mb-4">
          <span className="material-symbols-outlined text-[32px]">lock</span>
        </div>
        <h2 className="text-xl font-bold text-on-surface mb-2">Acesso Restrito ao Administrador</h2>
        <p className="text-sm text-on-surface-variant max-w-md">
          Relatórios executivos e comparativos de desempenho são restritos a administradores.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Relatórios & Comparativos</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Análises analíticas e volumetria de Apoios ao Tratamento para governança operacional
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportSupportsToCSV(supports, attendantsMap)}
            icon="description"
          >
            Exportar CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportSupportsToExcel(supports, attendantsMap)}
            icon="table_view"
          >
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Seletor de Abas e Data */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-2 bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-subtle">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('diario')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'diario'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">today</span>
            <span>Relatório Diário</span>
          </button>
          <button
            onClick={() => setActiveTab('mensal')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'mensal'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">calendar_view_month</span>
            <span>Relatório Mensal</span>
          </button>
          <button
            onClick={() => setActiveTab('atendente')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'atendente'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">group</span>
            <span>Por Atendente</span>
          </button>
        </div>

        <div className="max-w-xs w-full">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            label="Data de Referência"
          />
        </div>
      </div>

      {/* Conteúdo da Aba 1: Relatório Diário */}
      {activeTab === 'diario' && (
        <div className="flex flex-col gap-6 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-subtle">
              <span className="text-xs text-outline font-semibold">Total de Hoje</span>
              <p className="text-2xl font-extrabold text-on-surface mt-1">{metrics.todayTotal} apoios</p>
              <span className="text-xs text-primary font-bold">{metrics.todayPercentage}% da meta</span>
            </div>
            <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-subtle">
              <span className="text-xs text-outline font-semibold">Meta Diária Fixada</span>
              <p className="text-2xl font-extrabold text-on-surface mt-1">{metrics.todayGoal} apoios</p>
              <span className="text-xs text-outline">Vigência ativa</span>
            </div>
            <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-subtle">
              <span className="text-xs text-outline font-semibold">Diferença para Meta</span>
              <p
                className={`text-2xl font-extrabold mt-1 ${
                  metrics.todayDifference >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {metrics.todayDifference >= 0 ? `+${metrics.todayDifference}` : `${metrics.todayDifference}`}
              </p>
              <span className="text-xs text-outline">em relação ao alvo</span>
            </div>
            <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-subtle">
              <span className="text-xs text-outline font-semibold">Atendentes Ativos / Com Registro</span>
              <p className="text-2xl font-extrabold text-on-surface mt-1">
                {metrics.attendantsWithSupportCount} de {metrics.activeAttendantsCount}
              </p>
              <span className="text-xs text-outline">Média: {metrics.todayAveragePerAttendant} por atendente</span>
            </div>
          </div>

          {/* Gráfico Diário */}
          <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-subtle">
            <h3 className="font-bold text-sm text-on-surface mb-3">Evolução dos Dias no Ciclo de Setembro</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="data" stroke="#757682" fontSize={11} />
                  <YAxis stroke="#757682" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      borderColor: '#cbd5e1',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="total" name="Apoios Realizados" stroke="#00236f" strokeWidth={3} />
                  <Line type="monotone" dataKey="meta" name="Meta Diária" stroke="#d97706" strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba 2: Relatório Mensal */}
      {activeTab === 'mensal' && (
        <div className="flex flex-col gap-6 animate-in fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-subtle">
              <span className="text-xs text-outline font-semibold">Acumulado no Mês</span>
              <p className="text-2xl font-extrabold text-on-surface mt-1">{metrics.monthTotal} apoios</p>
              <span className="text-xs text-secondary font-bold">{metrics.monthPercentage}% da meta</span>
            </div>
            <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-subtle">
              <span className="text-xs text-outline font-semibold">Meta Mensal</span>
              <p className="text-2xl font-extrabold text-on-surface mt-1">{metrics.monthGoal} apoios</p>
              <span className="text-xs text-outline">Faltam {metrics.monthRemainingValue} apoios</span>
            </div>
            <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-subtle">
              <span className="text-xs text-outline font-semibold">Média Diária Observada</span>
              <p className="text-2xl font-extrabold text-on-surface mt-1">{metrics.monthDailyAverage}</p>
              <span className="text-xs text-outline">apoios/dia</span>
            </div>
            <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-subtle">
              <span className="text-xs text-outline font-semibold">Projeção Final / Ritmo Necessário</span>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">{metrics.monthProjection}</p>
              <span className="text-xs text-outline">Necessário: {metrics.monthRequiredPace}/dia</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/30 shadow-subtle">
            <h3 className="font-bold text-sm text-on-surface mb-3">Ritmo de Acumulação Mensal</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="data" stroke="#757682" fontSize={11} />
                  <YAxis stroke="#757682" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      borderColor: '#cbd5e1',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="total" name="Apoios por Dia" fill="#006398" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba 3: Relatório por Atendente */}
      {activeTab === 'atendente' && (
        <div className="flex flex-col gap-6 animate-in fade-in">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-subtle overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant/30 bg-surface-container-low/40">
              <h3 className="font-bold text-sm text-on-surface">Consolidado por Atendente</h3>
              <p className="text-xs text-on-surface-variant">
                Distribuição de registros, médias diárias e participação percentual
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-low text-on-surface-variant uppercase font-bold text-[11px] border-b border-outline-variant/30">
                  <tr>
                    <th className="px-5 py-3">Código</th>
                    <th className="px-5 py-3">Atendente</th>
                    <th className="px-5 py-3 text-right">Apoios Hoje</th>
                    <th className="px-5 py-3 text-right">Acumulado Mês</th>
                    <th className="px-5 py-3 text-right">Média Diária</th>
                    <th className="px-5 py-3 text-right">Participação %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 text-on-surface font-medium">
                  {attendantsPerformance.map((item) => {
                    const days = parseInt(selectedDate.split('-')[2], 10) || 1;
                    const dailyAvg = (item.monthQuantity / days).toFixed(1);

                    return (
                      <tr key={item.attendantId} className="hover:bg-surface-container-low/50">
                        <td className="px-5 py-3 font-mono text-outline">{item.attendantCode}</td>
                        <td className="px-5 py-3 font-bold text-on-surface">{item.attendantName}</td>
                        <td className="px-5 py-3 text-right font-bold text-primary">{item.todayQuantity}</td>
                        <td className="px-5 py-3 text-right font-extrabold text-sm">{item.monthQuantity}</td>
                        <td className="px-5 py-3 text-right text-outline">{dailyAvg}/dia</td>
                        <td className="px-5 py-3 text-right">
                          <span className="px-2 py-0.5 rounded bg-surface-container font-bold text-on-surface">
                            {item.percentageOfMonth}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Nota de Governança Clínica (Regra 44) */}
      <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30 flex items-start gap-3 text-xs text-on-surface-variant">
        <span className="material-symbols-outlined text-[20px] text-primary shrink-0">verified_user</span>
        <div>
          <p className="font-semibold text-on-surface">Diretriz Clínica &amp; Governança de Indicadores</p>
          <p className="mt-0.5 leading-relaxed">
            A contagem de Apoios ao Tratamento reflete a demanda operacional e adesão informada aos protocolos farmacêuticos. Este indicador não deve ser interpretado como avaliação de qualidade clínica ou técnica do atendimento.
          </p>
        </div>
      </div>
    </div>
  );
};
