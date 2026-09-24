import { defineFunction } from '@aws-amplify/backend';

export const geminiHandler = defineFunction({
  name: 'gemini-handler',
  entry: './handler.ts',
  environment: {
    GEMINI_SECRET_ID: 'apoio-tratamento/gemini',
    GEMINI_DEFAULT_MODEL: 'gemini-3.6-flash',
  },
  timeoutSeconds: 30,
});
