import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AttendantService } from '../../services/attendants/attendantService';
import { Attendant } from '../../types';
import { formatDateTimeBR } from '../../utils/calculations';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { useToast } from '../../contexts/ToastContext';

export const AtendentesPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal de Criação / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAttendant, setEditingAttendant] = useState<Attendant | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [active, setActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadAttendants = useCallback(() => {
    setAttendants(AttendantService.getAll());
  }, []);

  useEffect(() => {
    loadAttendants();
  }, [loadAttendants]);

  const handleOpenCreate = () => {
    setEditingAttendant(null);
    setName('');
    // Sugere próximo código automático
    const nextCode = String(attendants.length + 1).padStart(3, '0');
    setCode(nextCode);
    setActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (attendant: Attendant) => {
    setEditingAttendant(attendant);
    setName(attendant.name);
    setCode(attendant.code);
    setActive(attendant.active);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin) return;

    setIsSaving(true);
    try {
      if (editingAttendant) {
        AttendantService.update(user, editingAttendant.id, {
          name,
          code,
          active,
        });
        showToast('Atendente atualizado com sucesso.', 'success');
      } else {
        AttendantService.create(user, {
          name,
          code,
          active,
        });
        showToast('Atendente cadastrado com sucesso.', 'success');
      }
      setIsModalOpen(false);
      loadAttendants();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar atendente.';
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = (attendant: Attendant) => {
    if (!user || !isAdmin) return;
    try {
      AttendantService.toggleStatus(user, attendant.id);
      showToast(
        `Atendente ${attendant.name} foi ${attendant.active ? 'desativado' : 'reativado'}.`,
        'info'
      );
      loadAttendants();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao alterar status.';
      showToast(msg, 'error');
    }
  };

  const filteredAttendants = attendants.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 flex items-center justify-center text-error mb-4">
          <span className="material-symbols-outlined text-[32px]">lock</span>
        </div>
        <h2 className="text-xl font-bold text-on-surface mb-2">Acesso Restrito ao Administrador</h2>
        <p className="text-sm text-on-surface-variant max-w-md">
          A gestão e cadastro de atendentes é restrita aos administradores.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Atendentes Farmacêuticos</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Gestão dos profissionais elegíveis para atribuição de Apoios ao Tratamento
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleOpenCreate} icon="person_add">
          Novo Atendente
        </Button>
      </div>

      {/* Tabela de Atendentes */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-subtle overflow-hidden">
        <div className="p-4 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-low/40">
          <div className="max-w-xs w-full">
            <Input
              placeholder="Buscar atendente por nome ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon="search"
            />
          </div>
          <span className="text-xs text-outline font-semibold">
            {filteredAttendants.length} atendente(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low text-on-surface-variant uppercase font-bold text-[11px] border-b border-outline-variant/30">
              <tr>
                <th className="px-5 py-3">Código</th>
                <th className="px-5 py-3">Nome Completo</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Cadastrado Em</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-on-surface font-medium">
              {filteredAttendants.map((a) => (
                <tr key={a.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="px-5 py-3 font-mono font-bold text-primary">{a.code}</td>
                  <td className="px-5 py-3 font-bold text-sm text-on-surface">{a.name}</td>
                  <td className="px-5 py-3">
                    {a.active ? (
                      <Badge variant="success" icon="check">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="neutral" icon="block">
                        Inativo
                      </Badge>
                    )}
                  </td>
                  <td className="px-5 py-3 text-outline text-[11px]">
                    {formatDateTimeBR(a.createdAt)}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(a)}
                        icon="edit"
                      >
                        Editar
                      </Button>
                      <Button
                        variant={a.active ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={() => handleToggleStatus(a)}
                      >
                        {a.active ? 'Desativar' : 'Ativar'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar / Editar Atendente */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingAttendant ? 'Editar Atendente' : 'Novo Atendente'}
          subtitle="Atendentes ativos aparecem na lista de seleção para novos lançamentos de apoio."
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
                Salvar Atendente
              </Button>
            </>
          }
        >
          <form onSubmit={handleSave} className="flex flex-col gap-4 text-xs">
            <Input
              label="Nome do Atendente"
              placeholder="Ex.: João Silva"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              icon="person"
            />

            <Input
              label="Código Identificador"
              placeholder="Ex.: 001"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              icon="pin"
            />

            <div className="flex items-center gap-2 p-3 bg-surface-container-low rounded-lg border border-outline-variant/30 mt-1">
              <input
                type="checkbox"
                id="activeCheckbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="activeCheckbox" className="text-xs font-semibold text-on-surface cursor-pointer">
                Atendente Ativo para Novos Lançamentos
              </label>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
