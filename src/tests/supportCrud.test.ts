import { describe, it, expect, beforeEach } from 'vitest';
import { SupportService } from '../services/supports/supportService';
import { LocalDatabase } from '../services/storage/localDatabase';
import { UserProfile } from '../types';
import { calculateDashboardMetrics } from '../utils/calculations';

describe('Validação Rigorosa do Ciclo CRUD de Apoios', () => {
  const adminUser: UserProfile = {
    id: 'usr-admin-test',
    authUserId: 'sub-admin',
    name: 'Carlos Eduardo',
    email: 'carlos@drogaria.com.br',
    role: 'ADMIN',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    LocalDatabase.saveSupports([]);
    LocalDatabase.saveSupportAudits([]);
  });

  it('REGRA 8: Ao criar com 10 e editar para 15, o total deve ser 15 (e nunca 25)', () => {
    // 1. Criar apoio com quantidade = 10
    const created = SupportService.create(adminUser, {
      date: '2026-09-24',
      attendantId: 'att-1',
      quantity: 10,
      observation: 'Teste inicial',
    });

    let activeList = SupportService.getAll(false);
    expect(activeList.length).toBe(1);
    expect(activeList[0].quantity).toBe(10);

    let metrics = calculateDashboardMetrics(
      activeList,
      LocalDatabase.getAttendants(),
      LocalDatabase.getGoals(),
      '2026-09-24'
    );
    expect(metrics.todayTotal).toBe(10);

    // 2. Editar apoio de 10 para 15
    const updated = SupportService.update(adminUser, created.id, {
      date: '2026-09-24',
      attendantId: 'att-1',
      quantity: 15,
      observation: 'Edição de teste',
      expectedVersion: created.version,
    });

    expect(updated.quantity).toBe(15);
    expect(updated.version).toBe(2);

    activeList = SupportService.getAll(false);
    expect(activeList.length).toBe(1);
    expect(activeList[0].quantity).toBe(15);

    metrics = calculateDashboardMetrics(
      activeList,
      LocalDatabase.getAttendants(),
      LocalDatabase.getGoals(),
      '2026-09-24'
    );
    expect(metrics.todayTotal).toBe(15); // Deve ser 15, nunca 25!
  });

  it('REGRA 9 & 10: Excluir remove dos indicadores (Soft Delete) e Restaurar recupera o total', () => {
    // 1. Criar apoio com quantidade = 8
    const created = SupportService.create(adminUser, {
      date: '2026-09-24',
      attendantId: 'att-1',
      quantity: 8,
    });

    let activeList = SupportService.getAll(false);
    let metrics = calculateDashboardMetrics(
      activeList,
      LocalDatabase.getAttendants(),
      LocalDatabase.getGoals(),
      '2026-09-24'
    );
    expect(metrics.todayTotal).toBe(8);

    // 2. Excluir apoio (Soft Delete)
    const deleted = SupportService.delete(adminUser, created.id);
    expect(deleted.deletedAt).toBeTruthy();

    activeList = SupportService.getAll(false);
    expect(activeList.length).toBe(0);

    metrics = calculateDashboardMetrics(
      activeList,
      LocalDatabase.getAttendants(),
      LocalDatabase.getGoals(),
      '2026-09-24'
    );
    expect(metrics.todayTotal).toBe(0); // Total zerado após exclusão

    // 3. Restaurar apoio
    const restored = SupportService.restore(adminUser, created.id);
    expect(restored.deletedAt).toBeNull();

    activeList = SupportService.getAll(false);
    expect(activeList.length).toBe(1);

    metrics = calculateDashboardMetrics(
      activeList,
      LocalDatabase.getAttendants(),
      LocalDatabase.getGoals(),
      '2026-09-24'
    );
    expect(metrics.todayTotal).toBe(8); // Total recuperado com sucesso
  });

  it('REGRA 30: Deve acusar erro de conflito caso outro usuário tenha editado a versão do registro', () => {
    const created = SupportService.create(adminUser, {
      date: '2026-09-24',
      attendantId: 'att-1',
      quantity: 5,
    });

    // Tenta atualizar passando versão desatualizada
    expect(() => {
      SupportService.update(adminUser, created.id, {
        date: '2026-09-24',
        attendantId: 'att-1',
        quantity: 12,
        expectedVersion: 99,
      });
    }).toThrow(/Este registro foi alterado por outro usuário/);
  });
});
