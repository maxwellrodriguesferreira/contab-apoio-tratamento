import { LocalDatabase } from '../storage/localDatabase';
import { UserProfile, UserRole } from '../../types';
import { AuditService } from '../audit/auditService';
import { APP_CONFIG } from '../../config';
import { isCloudConfigured, dataClient } from '../api/amplifyClient';
import { signIn, signOut, confirmSignIn, getCurrentUser as getCognitoUser, fetchUserAttributes } from 'aws-amplify/auth';
import { CloudSyncService } from '../api/cloudSyncService';

function formatCognitoErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return 'Erro desconhecido ao autenticar.';
  const msg = err.message || '';
  if (msg.includes('Incorrect username or password')) {
    return 'E-mail ou senha incorretos.';
  }
  if (msg.includes('User does not exist')) {
    return 'Usuário não cadastrado no sistema.';
  }
  if (msg.includes('Password does not conform') || msg.includes('password policy')) {
    return 'A senha deve possuir no mínimo 8 caracteres, com letras maiúsculas, minúsculas e números.';
  }
  if (msg.includes('User is not confirmed')) {
    return 'Usuário ainda não confirmado no Amazon Cognito.';
  }
  if (msg.includes('Attempt limit exceeded')) {
    return 'Limite de tentativas excedido. Aguarde alguns instantes antes de tentar novamente.';
  }
  return msg || 'E-mail ou senha inválidos.';
}

export class AuthChallengeError extends Error {
  step: string;
  constructor(step: string, message: string) {
    super(message);
    this.name = 'AuthChallengeError';
    this.step = step;
  }
}

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
    if (isCloudConfigured()) {
      signOut().catch((e) => console.warn('Aviso ao efetuar signOut no Cognito:', e));
    }
    localStorage.removeItem(APP_CONFIG.storageKeys.authSession);
  }

  /**
   * Sincroniza e recupera/cria o perfil no DynamoDB após autenticação no Cognito
   */
  private static async syncUserProfileFromCognito(cleanEmail: string): Promise<UserProfile> {
    const cognitoUser = await getCognitoUser();
    const attributes = await fetchUserAttributes().catch(() => ({}));
    const userAttrs = attributes as Record<string, string | undefined>;
    const userName = userAttrs.name || userAttrs.email || cleanEmail.split('@')[0];
    const now = new Date().toISOString();

    let userProfile: UserProfile = {
      id: `usr-${cognitoUser.userId || Date.now()}`,
      authUserId: cognitoUser.userId,
      name: userName,
      email: cleanEmail,
      role: 'ADMIN',
      active: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };

    try {
      // Buscar registro do usuário no banco DynamoDB (UserProfile)
      const { data: profiles } = await dataClient.models.UserProfile.list({
        filter: { email: { eq: cleanEmail } },
      });

      if (profiles && profiles.length > 0) {
        const dbUser = profiles[0];
        if (!dbUser.active) {
          await signOut().catch(() => {});
          AuditService.logSystemAction(
            dbUser.id,
            dbUser.name,
            (dbUser.role as UserRole) || 'ATENDENTE',
            'LOGIN_FAILED',
            'AUTH',
            dbUser.id,
            { reason: 'Usuário desativado no banco AWS' }
          );
          throw new Error('Usuário desativado. Entre em contato com o administrador.');
        }

        // Atualizar último login
        await dataClient.models.UserProfile.update({
          id: dbUser.id,
          lastLoginAt: now,
        }).catch(() => {});

        userProfile = {
          id: dbUser.id,
          authUserId: cognitoUser.userId,
          name: dbUser.name,
          email: dbUser.email,
          role: (dbUser.role as UserRole) || 'ADMIN',
          active: dbUser.active,
          attendantId: dbUser.attendantId || undefined,
          createdAt: dbUser.createdAt,
          updatedAt: dbUser.updatedAt,
          lastLoginAt: now,
        };
      } else {
        // Criar registro na tabela UserProfile
        const newDbUser = await dataClient.models.UserProfile.create({
          authUserId: cognitoUser.userId,
          name: userName,
          email: cleanEmail,
          role: 'ADMIN',
          active: true,
          lastLoginAt: now,
        }).catch((e) => {
          console.warn('Aviso ao sincronizar UserProfile no DynamoDB:', e);
          return null;
        });

        if (newDbUser?.data) {
          userProfile.id = newDbUser.data.id;
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('Usuário desativado')) {
        throw err;
      }
      console.warn('Operando com perfil autenticado do Cognito:', err);
    }

    this.setCurrentUser(userProfile);
    CloudSyncService.syncAllFromCloud();

    AuditService.logSystemAction(
      userProfile.id,
      userProfile.name,
      userProfile.role,
      'LOGIN',
      'AUTH',
      userProfile.id,
      { email: userProfile.email, provider: 'AWS_COGNITO_DYNAMODB' }
    );

    return userProfile;
  }

  /**
   * Conclui a definição de nova senha no Cognito (primeiro acesso)
   */
  static async completeNewPassword(newPassword: string, email: string, fullName?: string): Promise<UserProfile> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (fullName && fullName.trim().length > 0) ? fullName.trim() : cleanEmail.split('@')[0];

    try {
      const result = await confirmSignIn({
        challengeResponse: newPassword,
        options: {
          userAttributes: {
            name: cleanName,
          },
        },
      });

      if (!result.isSignedIn && result.nextStep.signInStep !== 'DONE') {
        throw new Error(`Etapa pendente após definir senha: ${result.nextStep.signInStep}`);
      }

      return await this.syncUserProfileFromCognito(cleanEmail);
    } catch (err: unknown) {
      const msg = formatCognitoErrorMessage(err);
      throw new Error(msg);
    }
  }

  /**
   * Autenticação via e-mail e senha (AWS Amplify Cognito / DynamoDB com fallback local)
   */
  static async login(email: string, _password: string): Promise<UserProfile> {
    const cleanEmail = email.trim().toLowerCase();

    // Se estiver conectado à nuvem AWS Amplify
    if (isCloudConfigured()) {
      try {
        const signInResult = await signIn({
          username: cleanEmail,
          password: _password,
        });

        if (signInResult.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
          throw new AuthChallengeError(
            'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED',
            'É necessário cadastrar uma nova senha definitiva no primeiro acesso.'
          );
        }

        if (!signInResult.isSignedIn && signInResult.nextStep.signInStep !== 'DONE') {
          throw new Error(`Etapa de login pendente no Cognito: ${signInResult.nextStep.signInStep}`);
        }

        return await this.syncUserProfileFromCognito(cleanEmail);
      } catch (err: unknown) {
        if (err instanceof AuthChallengeError) {
          throw err;
        }

        AuditService.logSystemAction(
          'anonymous',
          'Tentativa de Login AWS',
          'ATENDENTE',
          'LOGIN_FAILED',
          'AUTH',
          undefined,
          { email: cleanEmail, error: err instanceof Error ? err.message : 'Falha ao autenticar no Cognito' }
        );
        const msg = formatCognitoErrorMessage(err);
        throw new Error(msg);
      }
    }

    // Modo de banco local (fallback para desenvolvimento/testes locais)
    await new Promise((r) => setTimeout(r, 400));

    const users = LocalDatabase.getUserProfiles();
    const user = users.find((u) => u.email.toLowerCase() === cleanEmail);

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
    CloudSyncService.syncUser(newUser);

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
    CloudSyncService.syncUser(user);

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

    // Se o usuário editado for o usuário da sessão ativa, atualiza a sessão imediatamente
    const currentSession = this.getCurrentUser();
    if (currentSession && (currentSession.id === user.id || currentSession.email.toLowerCase() === user.email.toLowerCase())) {
      this.setCurrentUser(user);
    }

    CloudSyncService.syncUser(user);

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

  static deleteUser(currentUser: UserProfile, userId: string): UserProfile {
    if (currentUser.role !== 'ADMIN') {
      throw new Error('Acesso negado: Somente administradores podem excluir usuários.');
    }

    if (currentUser.id === userId) {
      throw new Error('Você não pode excluir o seu próprio usuário logado.');
    }

    const users = LocalDatabase.getUserProfiles();
    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) {
      throw new Error('Usuário não encontrado.');
    }

    const [removedUser] = users.splice(index, 1);
    LocalDatabase.saveUserProfiles(users);
    CloudSyncService.deleteUser(removedUser.id);

    AuditService.logSystemAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'USER_DELETED',
      'USER',
      removedUser.id,
      {
        deletedUserName: removedUser.name,
        deletedUserEmail: removedUser.email,
        role: removedUser.role,
      }
    );

    return removedUser;
  }

  static resetUserPassword(
    currentUser: UserProfile,
    userId: string,
    options?: { newPassword?: string }
  ): { success: boolean; message: string } {
    if (currentUser.role !== 'ADMIN') {
      throw new Error('Acesso negado: Somente administradores podem redefinir a senha de usuários.');
    }

    const users = LocalDatabase.getUserProfiles();
    const user = users.find((u) => u.id === userId);
    if (!user) {
      throw new Error('Usuário não encontrado.');
    }

    if (options?.newPassword) {
      if (options.newPassword.length < 8) {
        throw new Error('A nova senha deve ter no mínimo 8 caracteres.');
      }
    }

    user.updatedAt = new Date().toISOString();
    LocalDatabase.saveUserProfiles(users);
    CloudSyncService.syncUser(user);

    AuditService.logSystemAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'PASSWORD_RESET',
      'USER',
      user.id,
      {
        targetEmail: user.email,
        targetName: user.name,
        resetByAdmin: true,
        customPasswordSet: !!options?.newPassword,
        timestamp: new Date().toISOString(),
      }
    );

    return {
      success: true,
      message: options?.newPassword
        ? `Nova senha definida com sucesso para ${user.name}.`
        : `Instruções de redefinição de acesso enviadas para o e-mail ${user.email}.`,
    };
  }
}
