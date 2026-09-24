import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  // 1. Perfis de Usuário
  UserProfile: a
    .model({
      authUserId: a.string().required(),
      name: a.string().required(),
      email: a.string().required(),
      role: a.enum(['ADMIN', 'ATENDENTE']),
      active: a.boolean().required(),
      attendantId: a.string(),
      lastLoginAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.group('ADMIN'),
      allow.authenticated().to(['read']),
    ]),

  // 2. Atendentes
  Attendant: a
    .model({
      name: a.string().required(),
      code: a.string().required(),
      active: a.boolean().required(),
    })
    .authorization((allow) => [
      allow.group('ADMIN'),
      allow.authenticated().to(['read']),
    ]),

  // 3. Apoios ao Tratamento
  TreatmentSupport: a
    .model({
      date: a.date().required(),
      attendantId: a.string().required(),
      quantity: a.integer().required(),
      observation: a.string(),
      createdBy: a.string().required(),
      updatedBy: a.string(),
      deletedAt: a.datetime(),
      deletedBy: a.string(),
      version: a.integer().required(),
    })
    .authorization((allow) => [
      allow.group('ADMIN'),
      allow.authenticated().to(['read']),
    ]),

  // 4. Auditoria de Apoios
  TreatmentSupportAudit: a
    .model({
      treatmentSupportId: a.string().required(),
      userId: a.string().required(),
      userName: a.string().required(),
      action: a.enum(['CREATE', 'UPDATE', 'DELETE', 'RESTORE']),
      oldValue: a.json(),
      newValue: a.json(),
    })
    .authorization((allow) => [
      allow.group('ADMIN').to(['read', 'create']),
    ]),

  // 5. Metas Operacionais
  Goal: a
    .model({
      type: a.enum(['DAILY_STORE', 'MONTHLY_STORE', 'DAILY_ATTENDANT', 'MONTHLY_ATTENDANT']),
      attendantId: a.string(),
      targetValue: a.integer().required(),
      startDate: a.date().required(),
      endDate: a.date(),
      active: a.boolean().required(),
    })
    .authorization((allow) => [
      allow.group('ADMIN'),
      allow.authenticated().to(['read']),
    ]),

  // 6. Análises de IA
  AIAnalysis: a
    .model({
      analysisType: a.enum(['DAILY', 'MONTHLY']),
      referenceDate: a.string().required(),
      referencePeriod: a.string().required(),
      inputHash: a.string().required(),
      analysisText: a.string().required(),
      model: a.string().required(),
    })
    .authorization((allow) => [
      allow.group('ADMIN'),
      allow.authenticated().to(['read']),
    ]),

  // 7. Logs de Auditoria Global
  AuditLog: a
    .model({
      userId: a.string().required(),
      userName: a.string().required(),
      userRole: a.string().required(),
      action: a.string().required(),
      entityType: a.string().required(),
      entityId: a.string(),
      metadata: a.json(),
      ipAddress: a.string(),
    })
    .authorization((allow) => [
      allow.group('ADMIN').to(['read', 'create']),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
