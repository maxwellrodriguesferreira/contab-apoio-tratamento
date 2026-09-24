import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthService } from '../../services/auth/authService';
import { AttendantService } from '../../services/attendants/attendantService';
import { UserProfile, UserRole, Attendant } from '../../types';
import { formatDateTimeBR } from '../../utils/calculations';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { useToast } from '../../contexts/ToastContext';

export const UsuariosPage: React.FC = () => {
  const { user: currentUser, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Criar / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('ATENDENTE');
  const [attendantId, setAttendantId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(() => {
    setUsers(AuthService.getAllUsers());
    setAttendants(AttendantService.getAll());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setRole('ATENDENTE');
    setAttendantId('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: UserProfile) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setAttendantId(user.attendantId || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !isAdmin) return;

    setIsSaving(true);
    try {
      if (editingUser) {
        AuthService.updateUser(currentUser, editingUser.id, {
          name,
          role,
          attendantId: role === 'ATENDENTE' ? attendantId || undefined : undefined,
        });
        showToast('Usuário atualizado com sucesso.', 'success');
      } else {
        AuthService.createUser(currentUser, {
          name,
          email,
          role,
          attendantId: role === 'ATENDENTE' ? attendantId || undefined : undefined,
        });
        showToast('Convite Cognito enviado com sucesso.', 'success', 'Usuário Criado');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar usuário.';
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = (targetUser: UserProfile) => {
    if (!currentUser || !isAdmin) return;
    try {
      AuthService.toggleUserStatus(currentUser, targetUser.id);
      showToast(
        `Usuário ${targetUser.name} foi ${targetUser.active ? 'desativado' : 'reativado'}.`,
        'info'
      );
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao alterar status.';
      showToast(msg, 'error');
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 flex items-center justify-center text-error mb-4">
          <span className="material-symbols-outlined text-[32px]">lock</span>
        </div>
        <h2 className="text-xl font-bold text-on-surface mb-2">Acesso Restrito ao Administrador</h2>
        <p className="text-sm text-on-surface-variant max-w-md">
          A gestão de usuários e permissões do Amazon Cognito é restrita a administradores.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Usuários do Sistema</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Gestão de identidades via Amazon Cognito, concessão de permissões RBAC e vinculações
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleOpenCreate} icon="person_add">
          Novo Usuário
        </Button>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-subtle overflow-hidden">
        <div className="p-4 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-low/40">
          <div className="max-w-xs w-full">
            <Input
              placeholder="Buscar por nome, e-mail ou perfil..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon="search"
            />
          </div>
          <span className="text-xs text-outline font-semibold">
            {filteredUsers.length} usuário(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low text-on-surface-variant uppercase font-bold text-[11px] border-b border-outline-variant/30">
              <tr>
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">E-mail</th>
                <th className="px-5 py-3">Perfil RBAC</th>
                <th className="px-5 py-3">Vínculo Atendente</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Último Acesso</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-on-surface font-medium">
              {filteredUsers.map((u) => {
                const isCurrentLogged = currentUser?.id === u.id;
                const linkedAttendant = attendants.find((a) => a.id === u.attendantId);

                return (
                  <tr key={u.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-on-surface">{u.name}</span>
                        {isCurrentLogged && (
                          <span className="px-1.5 py-0.2 rounded bg-primary-fixed text-primary text-[10px] font-bold">
                            Você
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-on-surface-variant">{u.email}</td>
                    <td className="px-5 py-3">
                      {u.role === 'ADMIN' ? (
                        <Badge variant="primary" icon="shield_person">
                          ADMIN
                        </Badge>
                      ) : (
                        <Badge variant="secondary" icon="person">
                          ATENDENTE
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-outline">
                      {linkedAttendant ? `${linkedAttendant.name} (${linkedAttendant.code})` : '-'}
                    </td>
                    <td className="px-5 py-3">
                      {u.active ? (
                        <Badge variant="success" icon="check">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="neutral" icon="block">
                          Desativado
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-outline text-[11px]">
                      {u.lastLoginAt ? formatDateTimeBR(u.lastLoginAt) : 'Nunca acessou'}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(u)}
                          icon="edit"
                        >
                          Editar
                        </Button>
                        <Button
                          variant={u.active ? 'destructive' : 'outline'}
                          size="sm"
                          disabled={isCurrentLogged}
                          onClick={() => handleToggleStatus(u)}
                        >
                          {u.active ? 'Desativar' : 'Ativar'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar / Editar Usuário */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingUser ? 'Editar Usuário' : 'Novo Usuário (Convite Cognito)'}
          subtitle="O usuário receberá as credenciais e definirá sua senha no primeiro acesso seguro."
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                isLoading={isSaving}
                loadingText="Salvando..."
              >
                {editingUser ? 'Salvar Alterações' : 'Criar e Convidar'}
              </Button>
            </>
          }
        >
          <form onSubmit={handleSave} className="flex flex-col gap-4 text-xs">
            <Input
              label="Nome Completo"
              placeholder="Ex.: Carlos Eduardo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              icon="person"
            />

            <Input
              label="E-mail Corporativo"
              type="email"
              placeholder="nome@drogaria.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!editingUser}
              required
              icon="mail"
              helperText={editingUser ? 'O e-mail principal do Cognito não pode ser alterado.' : undefined}
            />

            <Select
              label="Perfil de Acesso (RBAC)"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              options={[
                { value: 'ATENDENTE', label: 'ATENDENTE (Acesso somente leitura ao Dashboard)' },
                { value: 'ADMIN', label: 'ADMIN (Acesso total, gestão e lançamentos)' },
              ]}
              required
            />

            {role === 'ATENDENTE' && (
              <Select
                label="Vincular ao Cadastro de Atendente"
                value={attendantId}
                onChange={(e) => setAttendantId(e.target.value)}
                options={[
                  { value: '', label: 'Sem vínculo específico (Apenas atendente geral)' },
                  ...attendants.map((a) => ({
                    value: a.id,
                    label: `${a.name} (Cód. ${a.code})`,
                  })),
                ]}
                helperText="Permite que o atendente visualize seus próprios indicadores caso a opção esteja habilitada."
              />
            )}
          </form>
        </Modal>
      )}
    </div>
  );
};
