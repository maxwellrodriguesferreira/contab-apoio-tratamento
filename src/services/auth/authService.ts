import { LocalDatabase } from '../storage/localDatabase';
import { UserProfile, UserRole } from '../../types';
import { AuditService } from '../audit/auditService';
import { APP_CONFIG } from '../../config';

export class AuthService {
  /**
   * Obtém a sessão ativa
   */
  static getCurrentUser(): UserProfile | null {
    try {
      const stored = localStorage.getItem(APP_CONFIG.storageKeys.authSession);
      if (!stored) {
        return null;
      }
      return JSON.parse(stored) as UserProfile;
    } catch {
      return null;
    }
  }

  static setCurrentUser(user: UserProfile): void {
    localStorage.setItem(APP_CONFIG.storageKeys.authSession, JSON.stringify(user));
  }

  static clearSession(): void {
    const user = this.getCurrentUser();
    if (user) {
      AuditService.logSystemAction(
        user.id,
        user.name,
        user.role,
        'LOGOUT',
        'AUTH',
        user.id,
        { email: user.email }
      );
    }
    localStorage.removeItem(APP_CONFIG.storageKeys.authSession);
  }

  /**
   * Verifica se o sistema possui algum usuário cadastrado.
   * Se for zero, permite a inicialização segura do Primeiro ADMIN (Bootstrap).
   */
  static isInitialSetupNeeded(): boolean {
    const users = LocalDatabase.getUserProfiles();
    return users.length === 0;
  }

  /**
   * Bootstrap seguro do Primeiro Administrador da Drogaria
   */
  static setupFirstAdmin(name: string, email: string): UserProfile {
    const users = LocalDatabase.getUserProfiles();
    if (users.length > 0) {
      throw new Error('O primeiro administrador já foi cadastrado no sistema.');
    }

    const firstAdmin: UserProfile = {
      id: `usr-admin-root`,
      authUserId: `cognito-sub-root-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: 'ADMIN',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    users.push(firstAdmin);
    LocalDatabase.saveUserProfiles(users);

    this.setCurrentUser(firstAdmin);

    AuditService.logSystemAction(
      firstAdmin.id,
      firstAdmin.name,
      firstAdmin.role,
      'USER_CREATED',
      'USER',
      firstAdmin.id,
      { type: 'INITIAL_BOOTSTRAP_ADMIN', email: firstAdmin.email }
    );

    return firstAdmin;
  }

  /**
   * Autenticação via e-mail e senha
   */
  static async login(email: string, _password: string): Promise<UserProfile> {
    await new Promise((r) => setTimeout(r, 400));

    const users = LocalDatabase.getUserProfiles();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());

    if (!user) {
      AuditService.logSystemAction(
        'anonymous',
        'Tentativa Não Autenticada',
        'ATENDENTE',
        'LOGIN_FAILED',
        'AUTH',
        undefined,
        { reason: 'Credenciais inválidas' }
      );
      throw new Error('E-mail ou senha inválidos.');
    }

    if (!user.active) {
      AuditService.logSystemAction(
        user.id,
        user.name,
        user.role,
        'LOGIN_FAILED',
        'AUTH',
        user.id,
        { reason: 'Usuário desativado' }
      );
      throw new Error('Usuário desativado. Entre em contato com o administrador.');
    }

    user.lastLoginAt = new Date().toISOString();
    LocalDatabase.saveUserProfiles(users);
    this.setCurrentUser(user);

    AuditService.logSystemAction(
      user.id,
      user.name,
      user.role,
      'LOGIN',
      'AUTH',
      user.id,
      { email: user.email }
    );

    return user;
  }

  /**
   * Gestão de usuários pelo ADMIN
   */
  static getAllUsers(): UserProfile[] {
    return LocalDatabase.getUserProfiles();
  }

  static createUser(
    currentUser: UserProfile,
    data: { name: string; email: string; role: UserRole; active?: boolean; attendantId?: string }
  ): UserProfile {
    if (currentUser.role !== 'ADMIN') {
      throw new Error('Acesso negado: Somente administradores podem criar usuários.');
    }

    const users = LocalDatabase.getUserProfiles();
    const emailExists = users.some((u) => u.email.toLowerCase() === data.email.toLowerCase().trim());
    if (emailExists) {
      throw new Error('Já existe um usuário cadastrado com este e-mail.');
    }

    const newUser: UserProfile = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      authUserId: `cognito-sub-${Date.now()}`,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      role: data.role,
      active: data.active ?? true,
      attendantId: data.role === 'ATENDENTE' ? data.attendantId : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    users.push(newUser);
    LocalDatabase.saveUserProfiles(users);

    AuditService.logSystemAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'USER_CREATED',
      'USER',
      newUser.id,
      { createdEmail: newUser.email, role: newUser.role }
    );

    return newUser;
  }

  static toggleUserStatus(currentUser: UserProfile, userId: string): UserProfile {
    if (currentUser.role !== 'ADMIN') {
      throw new Error('Acesso negado: Somente administradores podem alterar o status de usuários.');
    }

    const users = LocalDatabase.getUserProfiles();
    const user = users.find((u) => u.id === userId);
    if (!user) {
      throw new Error('Usuário não encontrado.');
    }

    if (user.id === currentUser.id) {
      throw new Error('Você não pode desativar o seu próprio usuário logado.');
    }

    user.active = !user.active;
    user.updatedAt = new Date().toISOString();
    LocalDatabase.saveUserProfiles(users);

    AuditService.logSystemAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      user.active ? 'USER_UPDATED' : 'USER_DISABLED',
      'USER',
      user.id,
      { active: user.active }
    );

    return user;
  }

  static updateUser(
    currentUser: UserProfile,
    userId: string,
    data: { name: string; role: UserRole; attendantId?: string }
  ): UserProfile {
    if (currentUser.role !== 'ADMIN') {
      throw new Error('Acesso negado: Somente administradores podem editar usuários.');
    }

    const users = LocalDatabase.getUserProfiles();
    const user = users.find((u) => u.id === userId);
    if (!user) {
      throw new Error('Usuário não encontrado.');
    }

    user.name = data.name.trim();
    user.role = data.role;
    user.attendantId = data.role === 'ATENDENTE' ? data.attendantId : undefined;
    user.updatedAt = new Date().toISOString();

    LocalDatabase.saveUserProfiles(users);

    AuditService.logSystemAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'USER_UPDATED',
      'USER',
      user.id,
      { updatedName: user.name, role: user.role }
    );

    return user;
  }
}
