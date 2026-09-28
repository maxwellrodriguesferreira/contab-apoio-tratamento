import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import outputs from '../../../amplify_outputs.json';

let isAmplifyConfigured = false;

try {
  if (outputs && outputs.auth && outputs.auth.user_pool_id) {
    Amplify.configure(outputs as Record<string, unknown>);
    isAmplifyConfigured = true;
    console.info('✓ AWS Amplify (Cognito, DynamoDB, AppSync) conectado e ativo.');
  }
} catch (e) {
  console.warn('AWS Amplify não configurado com backend ativo, operando com persistência local.', e);
  isAmplifyConfigured = false;
}

export const dataClient = generateClient<Schema>();

export function isCloudConfigured(): boolean {
  return isAmplifyConfigured;
}
