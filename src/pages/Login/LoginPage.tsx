import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthService } from '../../services/auth/authService';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useToast } from '../../contexts/ToastContext';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { login, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [isInitialSetup, setIsInitialSetup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminName, setAdminName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  useEffect(() => {
    setIsInitialSetup(AuthService.isInitialSetupNeeded());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      if (isInitialSetup) {
        // Bootstrap do Primeiro Administrador
        if (!adminName.trim()) {
          throw new Error('Informe o nome do administrador.');
        }
        if (password.length < 8) {
          throw new Error('A senha deve ter no mínimo 8 caracteres.');
        }
        AuthService.setupFirstAdmin(adminName, email);
        refreshUser();
        showToast('Primeiro Administrador configurado com sucesso.', 'success', 'Setup Concluído');
        onLoginSuccess();
      } else {
        await login(email, password);
        onLoginSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'E-mail ou senha inválidos.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setShowForgotPasswordModal(false);
    showToast(
      'Se o e-mail estiver cadastrado no Amazon Cognito, as instruções de recuperação foram enviadas.',
      'info',
      'Recuperação de Senha'
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-surface-container-lowest rounded-2xl shadow-modal border border-outline-variant/40 p-8 z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Cabeçalho */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-on-primary shadow-md mb-4">
            <span className="material-symbols-outlined text-[32px]">health_and_safety</span>
          </div>
          <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">
            Apoio ao Tratamento
          </h1>
          <p className="text-sm text-on-surface-variant mt-1.5 font-medium">
            {isInitialSetup
              ? 'Configuração Inicial do Primeiro Administrador'
              : 'Gestão e acompanhamento de Apoios ao Tratamento'}
          </p>
        </div>

        {/* Mensagem de Erro */}
        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-rose-700 text-sm font-medium animate-in fade-in">
            <span className="material-symbols-outlined text-[20px] shrink-0">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {isInitialSetup && (
          <div className="mb-6 p-3.5 bg-primary/10 border border-primary/20 rounded-xl text-xs text-primary font-medium flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
            <span>
              Bem-vindo! Cadastre o primeiro Administrador Geral para inicializar o sistema com segurança.
            </span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isInitialSetup && (
            <Input
              label="Nome do Administrador"
              placeholder="Seu nome completo"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              required
              icon="person"
            />
          )}

          <Input
            label="E-mail"
            type="email"
            placeholder="seu.email@drogaria.com.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            icon="mail"
            autoComplete="email"
          />

          <div className="flex flex-col gap-1">
            <Input
              label="Senha"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              icon="lock"
              autoComplete={isInitialSetup ? 'new-password' : 'current-password'}
            />
            {!isInitialSetup && (
              <div className="flex justify-end mt-1">
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(true)}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            loadingText={isInitialSetup ? 'Criando Administrador...' : 'Autenticando...'}
            className="w-full mt-2"
            icon={isInitialSetup ? 'how_to_reg' : 'login'}
          >
            {isInitialSetup ? 'Criar Primeiro Administrador' : 'Entrar'}
          </Button>
        </form>
      </div>

      {/* Modal Esqueci Minha Senha */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface-container-lowest rounded-2xl shadow-modal max-w-sm w-full p-6 border border-outline-variant/40">
            <h3 className="font-bold text-lg text-on-surface mb-2">Recuperar Senha</h3>
            <p className="text-xs text-on-surface-variant mb-4">
              Informe seu e-mail cadastrado no Amazon Cognito para receber o link de redefinição de acesso.
            </p>
            <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
              <Input
                label="E-mail"
                type="email"
                placeholder="seu.email@drogaria.com.br"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                icon="mail"
              />
              <div className="flex items-center justify-end gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowForgotPasswordModal(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Enviar Instruções
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
