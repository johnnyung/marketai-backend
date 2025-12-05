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
  provider: 'gemini';
  model: string;
  text: string;
  raw: any;
}

class GeminiService {
  private apiKey: string | undefined;
  private defaultModel: string;

  constructor() {
    // Support either GOOGLE_GEMINI_API_KEY or GEMINI_API_KEY
    this.apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    // You can set GEMINI_MODEL=gemini-3.0-pro in Railway if available
    this.defaultModel = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  getModel(): string {
    return this.defaultModel;
  }

  async call(req: LLMRequest): Promise<LLMResponse> {
    if (!this.apiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY (or GEMINI_API_KEY) is not set');
    }

    const model = req.model || this.defaultModel;
    const temperature = req.temperature ?? 0.2;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    const mergedPrompt =
      (req.systemPrompt ? req.systemPrompt + '\n\n' : '') + req.userPrompt;

    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: mergedPrompt }],
        },
      ],
      generationConfig: {
        temperature,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gemini API error: ${res.status} - ${text}`);
    }

    const json: any = await res.json();
    const textParts =
      json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '') || [];
    const text = textParts.join(' ').trim();

    return {
      provider: 'gemini',
      model,
      text,
      raw: json,
    };
  }
}

const geminiService = new GeminiService();
export default geminiService;
