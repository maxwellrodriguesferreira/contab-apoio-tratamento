import { LocalDatabase } from '../storage/localDatabase';
import { UserProfile, UserRole } from '../../types';
import { AuditService } from '../audit/auditService';
import { APP_CONFIG } from '../../config';
import { isCloudConfigured, dataClient } from '../api/amplifyClient';
import { signIn, signOut, confirmSignIn, getCurrentUser as getCognitoUser, fetchUserAttributes } from 'aws-amplify/auth';

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

    // Buscar registro do usuário no banco DynamoDB (UserProfile)
    const { data: profiles } = await dataClient.models.UserProfile.list({
      filter: { email: { eq: cleanEmail } },
    });

    let userProfile: UserProfile;

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
      const now = new Date().toISOString();
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
      // Usuário autenticado no Cognito mas sem registro prévio na tabela UserProfile
      const userAttrs = attributes as Record<string, string | undefined>;
      const userName = userAttrs.name || userAttrs.email || cleanEmail.split('@')[0];
      const now = new Date().toISOString();
      
      const newDbUser = await dataClient.models.UserProfile.create({
        authUserId: cognitoUser.userId,
        name: userName,
        email: cleanEmail,
        role: 'ADMIN',
        active: true,
        lastLoginAt: now,
      });

      userProfile = {
        id: newDbUser.data?.id || `usr-${Date.now()}`,
        authUserId: cognitoUser.userId,
        name: userName,
        email: cleanEmail,
        role: 'ADMIN',
        active: true,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      };
    }

    this.setCurrentUser(userProfile);

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
  static async completeNewPassword(newPassword: string, email: string): Promise<UserProfile> {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const result = await confirmSignIn({
        challengeResponse: newPassword,
      });

      if (!result.isSignedIn && result.nextStep.signInStep !== 'DONE') {
        throw new Error(`Etapa pendente após definir senha: ${result.nextStep.signInStep}`);
      }

      return await this.syncUserProfileFromCognito(cleanEmail);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao redefinir a nova senha.';
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
        const msg = err instanceof Error ? err.message : 'E-mail ou senha inválidos.';
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
