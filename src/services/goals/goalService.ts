import { LocalDatabase } from '../storage/localDatabase';
import { Goal, GoalType, UserProfile } from '../../types';
import { goalSchema } from '../../validators/schemas';
import { AuditService } from '../audit/auditService';

export class GoalService {
  static getAll(): Goal[] {
    return LocalDatabase.getGoals().sort((a, b) => b.startDate.localeCompare(a.startDate));
  }

  static getActiveGoals(): Goal[] {
    return LocalDatabase.getGoals().filter((g) => g.active);
  }

  /**
   * Salva ou atualiza uma meta criando histórico temporal
   */
  static setGoal(
    currentUser: UserProfile,
    data: {
      type: GoalType;
      targetValue: number;
      startDate: string;
      endDate?: string | null;
      attendantId?: string;
    }
  ): Goal {
    if (currentUser.role !== 'ADMIN') {
      throw new Error('Acesso negado: Somente administradores podem definir metas.');
    }

    const validated = goalSchema.parse({
      ...data,
      active: true,
    });

    const goals = LocalDatabase.getGoals();

    // Encerra a meta anterior do mesmo tipo e atendente (se houver) colocando endDate
    goals.forEach((g) => {
      if (
        g.active &&
        g.type === validated.type &&
        (validated.attendantId ? g.attendantId === validated.attendantId : !g.attendantId)
      ) {
        g.active = false;
        if (!g.endDate) {
          g.endDate = validated.startDate;
        }
        g.updatedAt = new Date().toISOString();
      }
    });

    const newGoal: Goal = {
      id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: validated.type,
      attendantId: validated.attendantId,
      targetValue: validated.targetValue,
      startDate: validated.startDate,
      endDate: validated.endDate || null,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    goals.push(newGoal);
    LocalDatabase.saveGoals(goals);

    AuditService.logSystemAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'GOAL_CREATED',
      'GOAL',
      newGoal.id,
      { type: newGoal.type, targetValue: newGoal.targetValue, startDate: newGoal.startDate }
    );

    return newGoal;
  }
}
