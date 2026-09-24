import { defineAuth } from '@aws-amplify/backend';

/**
 * Definição da Autenticação via Amazon Cognito (Amplify Gen 2)
 * Suporta Login por e-mail, recuperação segura e grupos ADMIN / ATENDENTE
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    email: {
      required: true,
      mutable: false,
    },
    fullname: {
      required: true,
      mutable: true,
    },
  },
  groups: ['ADMIN', 'ATENDENTE'],
});
