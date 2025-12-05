import dotenv from 'dotenv';
dotenv.config();

// Avoid TypeScript errors if fetch type isn't in lib
declare const fetch: any;

export interface LLMRequest {
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  model?: string;
}

export interface LLMResponse {
  provider: 'anthropic';
  model: string;
  text: string;
  raw: any;
}

class AnthropicService {
  private apiKey: string | undefined;
  private defaultModel: string;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    // Default can be changed via env: ANTHROPIC_MODEL
    this.defaultModel = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620';
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  getModel(): string {
    return this.defaultModel;
  }

  async call(req: LLMRequest): Promise<LLMResponse> {
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }

    const model = req.model || this.defaultModel;
    const temperature = req.temperature ?? 0.2;

    const body: any = {
      model,
      max_tokens: 1024,
      temperature,
      messages: [
        {
          role: 'user',
          content: req.userPrompt,
        },
      ],
    };

    if (req.systemPrompt) {
      body.system = req.systemPrompt;
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Anthropic API error: ${res.status} - ${text}`);
    }

    const json: any = await res.json();
    const text: string =
      (json && json.content && json.content[0] && json.content[0].text) || '';

    return {
      provider: 'anthropic',
      model,
      text,
      raw: json,
    };
  }
}

const anthropicService = new AnthropicService();
export default anthropicService;
