import dotenv from 'dotenv';
dotenv.config();

declare const fetch: any;

export interface LLMRequest {
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  model?: string;
}

export interface LLMResponse {
  provider: 'openai';
  model: string;
  text: string;
  raw: any;
}

class OpenAIService {
  private apiKey: string | undefined;
  private defaultModel: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    // Good default for UI polish & short reasoning
    this.defaultModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  getModel(): string {
    return this.defaultModel;
  }

  async call(req: LLMRequest): Promise<LLMResponse> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const model = req.model || this.defaultModel;
    const temperature = req.temperature ?? 0.3;

    const messages: any[] = [];
    if (req.systemPrompt) {
      messages.push({ role: 'system', content: req.systemPrompt });
    }
    messages.push({ role: 'user', content: req.userPrompt });

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI API error: ${res.status} - ${text}`);
    }

    const json: any = await res.json();
    const text: string =
      json?.choices?.[0]?.message?.content?.toString() || '';

    return {
      provider: 'openai',
      model,
      text,
      raw: json,
    };
  }
}

const openaiService = new OpenAIService();
export default openaiService;
