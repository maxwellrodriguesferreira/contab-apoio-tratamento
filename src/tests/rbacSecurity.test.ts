import { describe, it, expect, beforeEach } from 'vitest';
import { SupportService } from '../services/supports/supportService';
import { AttendantService } from '../services/attendants/attendantService';
import { LocalDatabase } from '../services/storage/localDatabase';
import { UserProfile } from '../types';

describe('Segurança RBAC e Autorização Estrita (Regras 1, 2, 10, 92)', () => {
  const attendantUser: UserProfile = {
    id: 'usr-atendente-test',
    authUserId: 'sub-atendente',
    name: 'João Silva',
    email: 'joao@drogaria.com.br',
    role: 'ATENDENTE',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

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
  });

  it('ATENDENTE: Deve receber 403 Forbidden ao tentar registrar apoio (POST)', () => {
    expect(() => {
      SupportService.create(attendantUser, {
        date: '2026-09-24',
        attendantId: 'att-1',
        quantity: 5,
      });
    }).toThrow(/403 Forbidden/);
  });

  it('ATENDENTE: Deve receber 403 Forbidden ao tentar editar apoio (PUT)', () => {
    const created = SupportService.create(adminUser, {
      date: '2026-09-24',
      attendantId: 'att-1',
      quantity: 5,
    });

    expect(() => {
      SupportService.update(attendantUser, created.id, {
        date: '2026-09-24',
        attendantId: 'att-1',
        quantity: 10,
      });
    }).toThrow(/403 Forbidden/);
  });

  it('ATENDENTE: Deve receber 403 Forbidden ao tentar excluir apoio (DELETE)', () => {
    const created = SupportService.create(adminUser, {
      date: '2026-09-24',
      attendantId: 'att-1',
      quantity: 5,
    });

    expect(() => {
      SupportService.delete(attendantUser, created.id);
    }).toThrow(/403 Forbidden/);
  });

  it('ATENDENTE: Deve receber 403 Forbidden ao tentar restaurar apoio (RESTORE)', () => {
    const created = SupportService.create(adminUser, {
      date: '2026-09-24',
      attendantId: 'att-1',
      quantity: 5,
    });
    SupportService.delete(adminUser, created.id);

    expect(() => {
      SupportService.restore(attendantUser, created.id);
    }).toThrow(/403 Forbidden/);
  });

  it('ATENDENTE: Não pode cadastrar atendente', () => {
    expect(() => {
      AttendantService.create(attendantUser, {
        name: 'Novo Atendente',
        code: '999',
      });
    }).toThrow(/Acesso negado/);
  });
});
