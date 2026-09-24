import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { geminiHandler } from './functions/gemini-handler/resource';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

/**
 * Backend central do AWS Amplify (Gen 2)
 * Integra Cognito, Data GraphQL/DynamoDB, Lambda e IAM Policies
 */
export const backend = defineBackend({
  auth,
  data,
  geminiHandler,
});

// Atribuição de permissão IAM de menor privilégio para acesso ao Secrets Manager pelo Lambda
const geminiLambda = backend.geminiHandler.resources.lambda;

geminiLambda.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [
      'secretsmanager:GetSecretValue',
      'secretsmanager:PutSecretValue',
      'secretsmanager:DeleteSecretValue',
    ],
    resources: [
      `arn:aws:secretsmanager:*:*:secret:apoio-tratamento/gemini-*`,
    ],
  })
);
