import { dataClient, isCloudConfigured } from './amplifyClient';
import { LocalDatabase } from '../storage/localDatabase';
import { Attendant, Goal, TreatmentSupport, TreatmentSupportAudit, UserProfile, AuditLog } from '../../types';

type DataChangeListener = () => void;

export class CloudSyncService {
  private static isSyncing = false;
  private static listeners = new Set<DataChangeListener>();

  /**
   * Registra um listener que é executado sempre que os dados são atualizados da nuvem
   */
  static subscribe(listener: DataChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notifica todas as telas para recarregarem os dados
   */
  static notifyDataChanged(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Erro ao notificar listener de dados:', err);
      }
    });
  }

  /**
   * Sincroniza todos os dados da nuvem AWS (DynamoDB) para o banco local da aplicação
   */
  static async syncAllFromCloud(): Promise<void> {
    if (!isCloudConfigured() || this.isSyncing) {
      return;
    }

    this.isSyncing = true;
    try {
      console.info('🔄 Sincronizando dados com o banco AWS Amplify...');

      // 1. Sincronizar Atendentes
      const { data: cloudAttendants } = await dataClient.models.Attendant.list({ limit: 1000 });
      if (cloudAttendants && cloudAttendants.length > 0) {
        const mappedAttendants: Attendant[] = cloudAttendants.map((a) => ({
          id: a.id,
          name: a.name,
          code: a.code,
          active: a.active,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
        }));
        LocalDatabase.saveAttendants(mappedAttendants);
      }

      // 2. Sincronizar Apoios ao Tratamento
      const { data: cloudSupports } = await dataClient.models.TreatmentSupport.list({ limit: 5000 });
      if (cloudSupports && cloudSupports.length > 0) {
        const mappedSupports: TreatmentSupport[] = cloudSupports.map((s) => ({
          id: s.id,
          date: s.date,
          attendantId: s.attendantId,
          quantity: s.quantity,
          observation: s.observation || undefined,
          createdBy: s.createdBy,
          updatedBy: s.updatedBy || undefined,
          deletedAt: s.deletedAt || null,
          deletedBy: s.deletedBy || null,
          version: s.version,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        }));
        LocalDatabase.saveSupports(mappedSupports);
      }

      // 3. Sincronizar Metas
      const { data: cloudGoals } = await dataClient.models.Goal.list({ limit: 1000 });
      if (cloudGoals && cloudGoals.length > 0) {
        const mappedGoals: Goal[] = cloudGoals.map((g) => ({
          id: g.id,
          type: g.type as Goal['type'],
          attendantId: g.attendantId || undefined,
          targetValue: g.targetValue,
          startDate: g.startDate,
          endDate: g.endDate || undefined,
          active: g.active,
          createdAt: g.createdAt,
          updatedAt: g.updatedAt,
        }));
        LocalDatabase.saveGoals(mappedGoals);
      }

      // 4. Sincronizar Usuários
      const { data: cloudUsers } = await dataClient.models.UserProfile.list({ limit: 1000 });
      if (cloudUsers && cloudUsers.length > 0) {
        const mappedUsers: UserProfile[] = cloudUsers.map((u) => ({
          id: u.id,
          authUserId: u.authUserId,
          name: u.name,
          email: u.email,
          role: (u.role as UserProfile['role']) || 'ADMIN',
          active: u.active,
          attendantId: u.attendantId || undefined,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
          lastLoginAt: u.lastLoginAt || undefined,
        }));
        LocalDatabase.saveUserProfiles(mappedUsers);
      }

      // 5. Sincronizar Auditoria de Apoios
      const { data: cloudSupportAudits } = await dataClient.models.TreatmentSupportAudit.list({ limit: 1000 });
      if (cloudSupportAudits && cloudSupportAudits.length > 0) {
        const mappedSupportAudits: TreatmentSupportAudit[] = cloudSupportAudits.map((a) => ({
          id: a.id,
          treatmentSupportId: a.treatmentSupportId,
          userId: a.userId,
          userName: a.userName,
          action: a.action as TreatmentSupportAudit['action'],
          oldValue: a.oldValue as unknown as Partial<TreatmentSupport> | null,
          newValue: a.newValue as unknown as Partial<TreatmentSupport> | null,
          createdAt: a.createdAt,
        }));
        LocalDatabase.saveSupportAudits(mappedSupportAudits);
      }

      // 6. Sincronizar Logs Globais de Auditoria
      const { data: cloudAuditLogs } = await dataClient.models.AuditLog.list({ limit: 1000 });
      if (cloudAuditLogs && cloudAuditLogs.length > 0) {
        const mappedAuditLogs: AuditLog[] = cloudAuditLogs.map((l) => ({
          id: l.id,
          userId: l.userId,
          userName: l.userName,
          userRole: l.userRole as AuditLog['userRole'],
          action: l.action as AuditLog['action'],
          entityType: l.entityType,
          entityId: l.entityId || undefined,
          metadata: l.metadata as Record<string, unknown> | undefined,
          createdAt: l.createdAt,
          ipAddress: l.ipAddress || undefined,
        }));
        LocalDatabase.saveAuditLogs(mappedAuditLogs);
      }

      console.info('✓ Sincronização com o banco AWS concluída com sucesso.');
      this.notifyDataChanged();
    } catch (e) {
      console.warn('Falha na sincronização com a nuvem AWS (operando com dados locais):', e);
    } finally {
      this.isSyncing = false;
    }
  }

  // --- Mutations Assíncronas para a Nuvem ---

  static async syncAttendant(attendant: Attendant): Promise<void> {
    if (!isCloudConfigured()) return;
    try {
      await dataClient.models.Attendant.create({
        id: attendant.id,
        name: attendant.name,
        code: attendant.code,
        active: attendant.active,
      }).catch(async () => {
        await dataClient.models.Attendant.update({
          id: attendant.id,
          name: attendant.name,
          code: attendant.code,
          active: attendant.active,
        });
      });
    } catch (e) {
      console.warn('Erro ao sincronizar atendente na nuvem:', e);
    }
  }

  static async deleteAttendant(id: string): Promise<void> {
    if (!isCloudConfigured()) return;
    try {
      await dataClient.models.Attendant.delete({ id });
    } catch (e) {
      console.warn('Erro ao excluir atendente na nuvem:', e);
    }
  }

  static async syncSupport(support: TreatmentSupport): Promise<void> {
    if (!isCloudConfigured()) return;
    try {
      await dataClient.models.TreatmentSupport.create({
        id: support.id,
        date: support.date,
        attendantId: support.attendantId,
        quantity: support.quantity,
        observation: support.observation,
        createdBy: support.createdBy,
        updatedBy: support.updatedBy,
        deletedAt: support.deletedAt,
        deletedBy: support.deletedBy,
        version: support.version,
      }).catch(async () => {
        await dataClient.models.TreatmentSupport.update({
          id: support.id,
          date: support.date,
          attendantId: support.attendantId,
          quantity: support.quantity,
          observation: support.observation,
          createdBy: support.createdBy,
          updatedBy: support.updatedBy,
          deletedAt: support.deletedAt,
          deletedBy: support.deletedBy,
          version: support.version,
        });
      });
    } catch (e) {
      console.warn('Erro ao sincronizar apoio na nuvem:', e);
    }
  }

  static async syncGoal(goal: Goal): Promise<void> {
    if (!isCloudConfigured()) return;
    try {
      await dataClient.models.Goal.create({
        id: goal.id,
        type: goal.type,
        attendantId: goal.attendantId,
        targetValue: goal.targetValue,
        startDate: goal.startDate,
        endDate: goal.endDate,
        active: goal.active,
      }).catch(async () => {
        await dataClient.models.Goal.update({
          id: goal.id,
          type: goal.type,
          attendantId: goal.attendantId,
          targetValue: goal.targetValue,
          startDate: goal.startDate,
          endDate: goal.endDate,
          active: goal.active,
        });
      });
    } catch (e) {
      console.warn('Erro ao sincronizar meta na nuvem:', e);
    }
  }

  static async deleteGoal(id: string): Promise<void> {
    if (!isCloudConfigured()) return;
    try {
      await dataClient.models.Goal.delete({ id });
    } catch (e) {
      console.warn('Erro ao excluir meta na nuvem:', e);
    }
  }

  static async syncUser(user: UserProfile): Promise<void> {
    if (!isCloudConfigured()) return;
    try {
      await dataClient.models.UserProfile.create({
        id: user.id,
        authUserId: user.authUserId,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        attendantId: user.attendantId,
        lastLoginAt: user.lastLoginAt,
      }).catch(async () => {
        await dataClient.models.UserProfile.update({
          id: user.id,
          name: user.name,
          role: user.role,
          active: user.active,
          attendantId: user.attendantId,
          lastLoginAt: user.lastLoginAt,
        });
      });
    } catch (e) {
      console.warn('Erro ao sincronizar usuário na nuvem:', e);
    }
  }

  static async syncAuditLog(log: AuditLog): Promise<void> {
    if (!isCloudConfigured()) return;
    try {
      await dataClient.models.AuditLog.create({
        id: log.id,
        userId: log.userId,
        userName: log.userName,
        userRole: log.userRole,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata: JSON.stringify(log.metadata || {}),
      });
    } catch (e) {
      console.warn('Erro ao sincronizar log de auditoria na nuvem:', e);
    }
  }

  static async syncSupportAudit(audit: TreatmentSupportAudit): Promise<void> {
    if (!isCloudConfigured()) return;
    try {
      await dataClient.models.TreatmentSupportAudit.create({
        id: audit.id,
        treatmentSupportId: audit.treatmentSupportId,
        userId: audit.userId,
        userName: audit.userName,
        action: audit.action,
        oldValue: JSON.stringify(audit.oldValue || {}),
        newValue: JSON.stringify(audit.newValue || {}),
      });
    } catch (e) {
      console.warn('Erro ao sincronizar auditoria de apoio na nuvem:', e);
    }
  }
}
