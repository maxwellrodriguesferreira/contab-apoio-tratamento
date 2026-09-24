# Apoio ao Tratamento — Gestão, Acompanhamento Clínico & Inteligência Operacional

Sistema web corporativo completo de ponta a ponta projetado para drogarias e redes farmacêuticas para registro, acompanhamento, auditoria, cálculo de metas e análise preditiva por Inteligência Artificial (Google Gemini) de **Apoios ao Tratamento**.

---

## 1. Visão Geral e Conceito

Um **Apoio ao Tratamento** representa a situação em que um cliente/paciente de drogaria é orientado e cadastrado para que um farmacêutico faça contato posterior de acompanhamento terapêutico (ex: antibioticoterapia, hipertensão, diabetes, pediatria).

### Princípio Fundamental de Separação de Papéis:
```text
ADMIN (Carlos)
     │
     │ registra apoio
     ▼
Apoio ao Tratamento = 10
     │
     │ atribuído a
     ▼
Atendente (João Silva)
```
* **USUÁRIO DO SISTEMA ≠ ATENDENTE**: O atendente não lança apoios. Quem registra, edita, exclui ou restaura é o perfil **ADMIN**. O **ATENDENTE** possui acesso somente leitura aos seus indicadores e aos dados consolidados no Dashboard.

---

## 2. Arquitetura e Stack Tecnológica

```text
                     USUÁRIO (Navegador)
                            │
                            ▼
              ┌───────────────────────────┐
              │    FRONTEND (React + TS)   │
              │  Vite • Tailwind • Recharts│
              └─────────────┬─────────────┘
                            │
                            ▼
              ┌───────────────────────────┐
              │      AWS AMPLIFY (Gen 2)   │
              └─────────────┬─────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
      Amazon Cognito   Amplify Data    Amplify Hosting
       (Auth & RBAC)   (DynamoDB / API)
                            │
                    ┌───────┴───────┐
                    │               │
                    ▼               ▼
              AWS Lambda      Secrets Manager (KMS)
           (Gemini Handler)   (apoio-tratamento/gemini)
                    │               │
                    └───────┬───────┘
                            │
                            ▼
                    Google Gemini API
                  (gemini-3.6-flash)
```

### Tecnologias:
* **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide Icons, Material Symbols, Zod, XLSX.
* **Infraestrutura AWS (Amplify Gen 2 / CDK)**:
  * **Amazon Cognito**: Autenticação, User Pools, grupos `ADMIN` e `ATENDENTE`, expiração de sessão e fluxo de primeiro acesso.
  * **Amplify Data**: Modelagem GraphQL/DynamoDB com RBAC rigoroso no backend.
  * **AWS Lambda**: Processamento serverless com IAM Least Privilege.
  * **AWS Secrets Manager**: Persistência criptografada da Google Gemini API Key.
* **Inteligência Artificial**: Google Gemini (`gemini-3.6-flash`), com prompt corporativo em PT-BR, cache por hash determinístico e invalidação automática em mutações.

---

## 3. Regras de Negócio e Segurança Mandatórias

1. **Regra Matemática da Edição (Regra 8)**: Editar um apoio de 10 para 15 resulta em **15**, e **NUNCA** em 25. Todos os totais e projeções são calculados deterministicamente a partir dos registros ativos válidos.
2. **Soft Delete & Restore (Regras 9 e 10)**: Ao excluir, os campos `deletedAt` e `deletedBy` são preenchidos e o registro é subtraído dos indicadores. Ao restaurar por um ADMIN, o total é recuperado e registrado na auditoria.
3. **Concorrência Otimista (Regra 30)**: Controle de versão (`version`). Se dois administradores editarem simultaneamente, o sistema avisa para atualizar antes de sobrescrever.
4. **Proteção Estrita de Mutações (403 Forbidden)**: Se um usuário com perfil `ATENDENTE` tentar qualquer mutação (`POST`, `PUT`, `DELETE`, `RESTORE`), recebe `403 Forbidden` no frontend, rotas e backend.
5. **Segurança de Secrets**: A API Key do Gemini **NUNCA** é exposta no frontend, logs, Git ou respostas JSON.

---

## 4. Estrutura do Projeto

```text
contab-apoio-tratamento/
├── amplify/                  # Infraestrutura AWS Amplify Gen 2 (CDK)
│   ├── auth/                 # Amazon Cognito (User Pool & Groups)
│   ├── data/                 # Amplify Data Schema & RBAC
│   ├── functions/            # Lambda Functions (Gemini & Secrets Manager)
│   └── backend.ts            # Backend central e políticas IAM
├── src/
│   ├── components/           # Componentes reutilizáveis e layouts
│   │   ├── common/           # Button, Input, Select, Badge, Card, StatCard, Modal, etc.
│   │   └── layout/           # Sidebar, Header, AppLayout
│   ├── contexts/             # AuthContext (RBAC), ToastContext, ThemeContext
│   ├── pages/                # Telas completas da aplicação
│   │   ├── Login/            # Login Cognito e recuperação de senha
│   │   ├── Dashboard/        # 6 StatCards, gráficos, análises IA Gemini
│   │   ├── RegistrarApoio/   # Registro rápido anti-duplicidade
│   │   ├── Lancamentos/      # CRUD, Soft Delete, Restore, Filtros, Excel/CSV
│   │   ├── Atendentes/       # Gestão de atendentes farmacêuticos
│   │   ├── Metas/            # Versionamento temporal de metas
│   │   ├── Relatorios/       # Relatório Diário, Mensal e por Atendente
│   │   ├── Usuarios/         # Gestão de usuários Cognito e perfis
│   │   ├── Auditoria/        # Trilha de auditoria detalhada
│   │   ├── Configuracoes/    # Secrets Manager, Gemini, timezone
│   │   └── Perfil/           # Dados de sessão e troca de senha
│   ├── services/             # Camada de serviços e persistência
│   ├── utils/                # Cálculos matemáticos, datas e exportações
│   ├── validators/           # Schemas Zod compartilhados
│   └── tests/                # Suíte de testes unitários e de integração
```

---

## 5. Instalação e Execução Local

### Pré-requisitos:
* Node.js v20+ ou v24+
* npm v10+

### Passo a passo:
```bash
# 1. Clonar o repositório
git clone https://github.com/maxwellrodriguesferreira/contab-apoio-tratamento.git
cd contab-apoio-tratamento

# 2. Instalar dependências
npm install

# 3. Executar em modo desenvolvimento
npm run dev

# 4. Executar os testes automatizados
npm run test
```
A aplicação estará disponível em `http://localhost:3000`.

---

## 6. Credenciais Iniciais de Homologação

Para testar todos os fluxos e o controle de acesso RBAC:

* **Administrador Geral (ADMIN)**:
  * **E-mail**: `carlos.admin@drogaria.com.br`
  * **Senha**: `SenhaForte@2026`
  * **Permissões**: Acesso irrestrito a todas as áreas, registros, metas, IA e configurações.

* **Atendente Farmacêutico (ATENDENTE)**:
  * **E-mail**: `joao.silva@drogaria.com.br`
  * **Senha**: `SenhaForte@2026`
  * **Permissões**: Acesso exclusivo em modo somente leitura ao Dashboard e Meu Perfil.

*Você também pode alternar entre os perfis instantaneamente pelo botão "Simular" no cabeçalho superior.*

---

## 7. Deploy na AWS

### Deploy via AWS Amplify Hosting & Gen 2:
```bash
# Executar deploy do backend e frontend
npx ampx pipeline-deploy --branch main --app-id <YOUR_APP_ID>
```

### Configuração do Secrets Manager na AWS:
1. No console AWS, acesse o **AWS Secrets Manager**.
2. Crie um segredo com o nome `apoio-tratamento/gemini`.
3. Defina a chave `GEMINI_API_KEY` com sua chave do Google AI Studio.
4. O backend Lambda possui permissão IAM associada automaticamente via CDK (`amplify/backend.ts`).

---

## 8. Licença
Propriedade de Drogaria Central & Clínica Farmacoterapêutica. Todos os direitos reservados.
