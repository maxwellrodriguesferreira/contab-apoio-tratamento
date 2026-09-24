import { describe, it, expect } from 'vitest';
import {
  calculatePercentage,
  calculateDashboardMetrics,
  getActiveGoal,
  generateDataHash,
} from '../utils/calculations';
import { TreatmentSupport, Attendant, Goal } from '../types';

describe('Cálculos Matemáticos e Regras de Negócio', () => {
  it('deve calcular o percentual corretamente (Exemplo: 45 de 60 = 75%)', () => {
    expect(calculatePercentage(45, 60)).toBe(75);
    expect(calculatePercentage(60, 60)).toBe(100);
    expect(calculatePercentage(75, 60)).toBe(125);
  });

  it('deve proteger contra divisão por zero e metas nulas', () => {
    expect(calculatePercentage(45, 0)).toBe(0);
    expect(calculatePercentage(0, 0)).toBe(0);
  });

  it('deve retornar a meta correta por período e tipo', () => {
    const mockGoals: Goal[] = [
      {
        id: 'g1',
        type: 'DAILY_STORE',
        targetValue: 60,
        startDate: '2026-09-01',
        endDate: null,
        active: true,
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-09-01T08:00:00.000Z',
      },
    ];

    expect(getActiveGoal(mockGoals, 'DAILY_STORE', '2026-09-24')).toBe(60);
  });

  it('deve consolidar as métricas diárias e mensais do Dashboard', () => {
    const mockSupports: TreatmentSupport[] = [
      {
        id: 's1',
        date: '2026-09-24',
        attendantId: 'att-1',
        quantity: 15,
        createdBy: 'Carlos Eduardo',
        createdAt: '2026-09-24T08:00:00.000Z',
        updatedAt: '2026-09-24T08:00:00.000Z',
        deletedAt: null,
        deletedBy: null,
        version: 1,
      },
      {
        id: 's2',
        date: '2026-09-24',
        attendantId: 'att-2',
        quantity: 30,
        createdBy: 'Carlos Eduardo',
        createdAt: '2026-09-24T09:00:00.000Z',
        updatedAt: '2026-09-24T09:00:00.000Z',
        deletedAt: null,
        deletedBy: null,
        version: 1,
      },
    ];

    const mockAttendants: Attendant[] = [
      { id: 'att-1', name: 'João Silva', code: '001', active: true, createdAt: '', updatedAt: '' },
      { id: 'att-2', name: 'Maria Santos', code: '002', active: true, createdAt: '', updatedAt: '' },
    ];

    const mockGoals: Goal[] = [
      {
        id: 'g1',
        type: 'DAILY_STORE',
        targetValue: 60,
        startDate: '2026-09-01',
        endDate: null,
        active: true,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'g2',
        type: 'MONTHLY_STORE',
        targetValue: 1200,
        startDate: '2026-09-01',
        endDate: null,
        active: true,
        createdAt: '',
        updatedAt: '',
      },
    ];

    const metrics = calculateDashboardMetrics(mockSupports, mockAttendants, mockGoals, '2026-09-24');

    expect(metrics.todayTotal).toBe(45);
    expect(metrics.todayGoal).toBe(60);
    expect(metrics.todayPercentage).toBe(75);
    expect(metrics.todayDifference).toBe(-15);
    expect(metrics.activeAttendantsCount).toBe(2);
    expect(metrics.attendantsWithSupportCount).toBe(2);
  });

  it('deve gerar hash determinístico para cache de IA', () => {
    const dataA = { total: 100, meta: 120 };
    const dataB = { total: 100, meta: 120 };
    const dataC = { total: 101, meta: 120 };

    expect(generateDataHash(dataA)).toBe(generateDataHash(dataB));
    expect(generateDataHash(dataA)).not.toBe(generateDataHash(dataC));
  });
});
