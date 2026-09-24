import { format, getDaysInMonth, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Attendant, Goal, TreatmentSupport, DashboardMetrics, AttendantPerformance } from '../types';

/**
 * Formata data ISO (YYYY-MM-DD) para padrão brasileiro DD/MM/YYYY
 */
export function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    }
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, 'dd/MM/yyyy', { locale: ptBR }) : dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * Formata data/hora ISO para DD/MM/YYYY HH:mm:ss
 */
export function formatDateTimeBR(isoString?: string | null): string {
  if (!isoString) return '-';
  try {
    const d = parseISO(isoString);
    return isValid(d) ? format(d, 'dd/MM/yyyy HH:mm', { locale: ptBR }) : isoString;
  } catch {
    return isoString;
  }
}

/**
 * Retorna a data de hoje no formato YYYY-MM-DD respeitando o fuso local
 */
export function getTodayISODate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retorna o mês atual no formato YYYY-MM
 */
export function getCurrentISOMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Calcula o percentual realizado vs meta com proteção contra divisão por zero
 */
export function calculatePercentage(realized: number, target: number): number {
  if (!target || target <= 0) {
    return 0;
  }
  const result = (realized / target) * 100;
  return Number(result.toFixed(1));
}

/**
 * Obtém a meta vigente para um determinado tipo, data e atendente opcional
 */
export function getActiveGoal(
  goals: Goal[],
  type: Goal['type'],
  referenceDate: string,
  attendantId?: string
): number {
  const matchingGoals = goals.filter((g) => {
    if (!g.active || g.type !== type) return false;
    if (attendantId && g.attendantId !== attendantId) return false;
    if (!attendantId && g.attendantId) return false;

    const starts = g.startDate <= referenceDate;
    const ends = !g.endDate || g.endDate >= referenceDate;
    return starts && ends;
  });

  if (matchingGoals.length === 0) {
    // Valores padrão saudáveis de fallback caso não cadastrado
    if (type === 'DAILY_STORE') return 60;
    if (type === 'MONTHLY_STORE') return 1200;
    if (type === 'DAILY_ATTENDANT') return 10;
    if (type === 'MONTHLY_ATTENDANT') return 200;
    return 0;
  }

  // Pega a meta mais recente criada
  matchingGoals.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return matchingGoals[0].targetValue;
}

/**
 * Calcula todas as métricas consolidadas do Dashboard respeitando regras matemáticas:
 * - Filtra registros excluídos (soft deleted)
 * - Edições refletem a nova quantidade, nunca acumulando
 */
export function calculateDashboardMetrics(
  supports: TreatmentSupport[],
  attendants: Attendant[],
  goals: Goal[],
  targetDate: string = getTodayISODate()
): DashboardMetrics {
  const activeSupports = supports.filter((s) => !s.deletedAt);
  const targetMonth = targetDate.substring(0, 7); // YYYY-MM
  const parts = targetDate.split('-');
  const currentDay = parseInt(parts[2], 10) || 1;
  const year = parseInt(parts[0], 10) || new Date().getFullYear();
  const month = parseInt(parts[1], 10) || (new Date().getMonth() + 1);
  const totalDaysInMonth = getDaysInMonth(new Date(year, month - 1));

  // 1. Apoios Hoje
  const todaySupports = activeSupports.filter((s) => s.date === targetDate);
  const todayTotal = todaySupports.reduce((acc, curr) => acc + curr.quantity, 0);
  const todayGoal = getActiveGoal(goals, 'DAILY_STORE', targetDate);
  const todayPercentage = calculatePercentage(todayTotal, todayGoal);
  const todayDifference = todayTotal - todayGoal;

  // Atendentes ativos e participantes
  const activeAttendants = attendants.filter((a) => a.active);
  const activeAttendantsCount = activeAttendants.length;
  const attendantsWithSupportSet = new Set(todaySupports.map((s) => s.attendantId));
  const attendantsWithSupportCount = attendantsWithSupportSet.size;
  const todayAveragePerAttendant =
    activeAttendantsCount > 0 ? Number((todayTotal / activeAttendantsCount).toFixed(1)) : 0;

  // 2. Apoios no Mês
  const monthSupports = activeSupports.filter((s) => s.date.startsWith(targetMonth));
  const monthTotal = monthSupports.reduce((acc, curr) => acc + curr.quantity, 0);
  const monthGoal = getActiveGoal(goals, 'MONTHLY_STORE', targetDate);
  const monthPercentage = calculatePercentage(monthTotal, monthGoal);
  const monthRemainingValue = Math.max(0, monthGoal - monthTotal);

  // Dias considerados para média (até o dia atual do mês)
  const daysConsidered = Math.max(1, currentDay);
  const monthDailyAverage = Number((monthTotal / daysConsidered).toFixed(1));
  const monthProjection = Math.round(monthDailyAverage * totalDaysInMonth);

  const monthRemainingDays = Math.max(0, totalDaysInMonth - currentDay);
  const monthRequiredPace =
    monthRemainingDays > 0 ? Number((monthRemainingValue / monthRemainingDays).toFixed(1)) : 0;

  return {
    todayTotal,
    todayGoal,
    todayPercentage,
    todayDifference,
    activeAttendantsCount,
    attendantsWithSupportCount,
    todayAveragePerAttendant,
    monthTotal,
    monthGoal,
    monthPercentage,
    monthRemainingValue,
    monthDailyAverage,
    monthProjection,
    monthRemainingDays,
    monthRequiredPace,
    referenceDate: targetDate,
    referenceMonth: targetMonth,
  };
}

/**
 * Calcula o desempenho individual por atendente
 */
export function calculateAttendantsPerformance(
  supports: TreatmentSupport[],
  attendants: Attendant[],
  targetDate: string = getTodayISODate()
): AttendantPerformance[] {
  const activeSupports = supports.filter((s) => !s.deletedAt);
  const targetMonth = targetDate.substring(0, 7);
  const monthSupports = activeSupports.filter((s) => s.date.startsWith(targetMonth));
  const totalMonthAll = monthSupports.reduce((acc, curr) => acc + curr.quantity, 0);

  return attendants.map((attendant) => {
    const todayQty = activeSupports
      .filter((s) => s.attendantId === attendant.id && s.date === targetDate)
      .reduce((acc, curr) => acc + curr.quantity, 0);

    const monthQty = monthSupports
      .filter((s) => s.attendantId === attendant.id)
      .reduce((acc, curr) => acc + curr.quantity, 0);

    const percentageOfMonth = calculatePercentage(monthQty, totalMonthAll);

    return {
      attendantId: attendant.id,
      attendantName: attendant.name,
      attendantCode: attendant.code,
      todayQuantity: todayQty,
      monthQuantity: monthQty,
      active: attendant.active,
      percentageOfMonth,
    };
  }).sort((a, b) => b.monthQuantity - a.monthQuantity);
}

/**
 * Gera hash determinístico dos dados para verificação de cache da IA
 */
export function generateDataHash(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
