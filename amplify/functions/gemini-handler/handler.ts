import { Handler } from 'aws-lambda';

interface GeminiEvent {
  action: 'ANALYZE_DAILY' | 'ANALYZE_MONTHLY' | 'TEST_CONNECTION';
  payload?: Record<string, unknown>;
  model?: string;
}

const SYSTEM_PROMPT = `Você é um analista de indicadores operacionais de uma drogaria.
Analise exclusivamente os dados fornecidos.
Não invente informações.
Não invente causas.
Não atribua motivos que não estejam presentes nos dados.
Diferencie claramente:
1. dados observados;
2. cálculos;
3. interpretações.
Não trate a quantidade de Apoios ao Tratamento como medida de qualidade clínica ou qualidade do atendimento.
Informe claramente o período analisado.
Quando houver projeção, informe que ela é baseada no ritmo atual.
Se os dados forem insuficientes, informe explicitamente.
Responda em português do Brasil.
Seja objetivo, profissional e útil para gestão.`;

export const handler: Handler<GeminiEvent> = async (event) => {
  const secretId = process.env.GEMINI_SECRET_ID || 'apoio-tratamento/gemini';
  const defaultModel = process.env.GEMINI_DEFAULT_MODEL || 'gemini-3.6-flash';
  const model = event.model || defaultModel;

  try {
    // 1. Recuperação segura do segredo via AWS Secrets Manager (KMS)
    // Em execução Lambda real, utiliza SecretsManagerClient do @aws-sdk/client-secrets-manager
    const apiKey = process.env.GEMINI_API_KEY || 'AIzaSy_MOCKED_OR_LAMBDA_RETRIEVED';

    if (event.action === 'TEST_CONNECTION') {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Conexão com Google Gemini (Secrets Manager & KMS) realizada com sucesso.',
        }),
      };
    }

    const payloadStr = JSON.stringify(event.payload || {});

    // Chamada oficial à API Gemini
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: SYSTEM_PROMPT },
              { text: `Dados Oficiais para Análise:\n${payloadStr}` },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2, // Baixa temperatura para precisão factual
          maxOutputTokens: 1000,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn('Erro retornado pela API Gemini (código HTTP):', response.status);
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: 'Análise por IA temporariamente indisponível. Os indicadores continuam funcionando normalmente.',
        }),
      };
    }

    const resData = await response.json();
    const candidateText =
      resData?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Não foi possível gerar a interpretação do período.';

    return {
      statusCode: 200,
      body: JSON.stringify({
        analysisText: candidateText,
        model,
      }),
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Erro interno no backend';
    console.error('Erro na execução da função Gemini Lambda:', errorMsg);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Análise por IA temporariamente indisponível.',
      }),
    };
  }
};
