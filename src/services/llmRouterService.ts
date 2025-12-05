import dotenv from 'dotenv';
dotenv.config();

import anthropicService from './anthropicService.js';
import geminiService from './geminiService.js';
import openaiService from './openaiService.js';

export interface LLMRequest {
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  model?: string;
  providerHint?: 'anthropic' | 'gemini' | 'openai' | 'auto';
}

export interface LLMRouterResponse {
  provider: string;
  model: string;
  text: string;
  raw: any;
}

class LLMRouterService {
  isAnthropicConfigured(): boolean {
    return anthropicService.isConfigured();
  }

  isGeminiConfigured(): boolean {
    return geminiService.isConfigured();
  }

  isOpenAIConfigured(): boolean {
    return openaiService.isConfigured();
  }

  getStatus() {
    return {
      primary: this.isAnthropicConfigured() ? 'anthropic' : (this.isGeminiConfigured() ? 'gemini' : (this.isOpenAIConfigured() ? 'openai' : 'none')),
      providers: {
        anthropic: {
          configured: this.isAnthropicConfigured(),
          model: this.isAnthropicConfigured() ? anthropicService.getModel() : null
        },
        gemini: {
          configured: this.isGeminiConfigured(),
          model: this.isGeminiConfigured() ? geminiService.getModel() : null
        },
        openai: {
          configured: this.isOpenAIConfigured(),
          model: this.isOpenAIConfigured() ? openaiService.getModel() : null
        }
      }
    };
  }

  /**
   * Core router:
   *  - If providerHint is set, try that first.
   *  - Otherwise priority = Anthropic -> Gemini -> OpenAI
   */
  async call(req: LLMRequest): Promise<LLMRouterResponse> {
    const hint = req.providerHint || 'auto';

    const tryOrder: Array<'anthropic' | 'gemini' | 'openai'> = [];

    if (hint !== 'auto') {
      tryOrder.push(hint);
    }

    // Default priority: Anthropic -> Gemini -> OpenAI
    for (const p of ['anthropic', 'gemini', 'openai'] as const) {
      if (!tryOrder.includes(p)) {
        tryOrder.push(p);
      }
    }

    for (const provider of tryOrder) {
      try {
        if (provider === 'anthropic' && this.isAnthropicConfigured()) {
          const r = await anthropicService.call(req as any);
          return r;
        }
        if (provider === 'gemini' && this.isGeminiConfigured()) {
          const r = await geminiService.call(req as any);
          return r;
        }
        if (provider === 'openai' && this.isOpenAIConfigured()) {
          const r = await openaiService.call(req as any);
          return r;
        }
      } catch (err) {
        console.error(`[LLM Router] Provider ${provider} failed:`, err);
        // Continue to next provider
      }
    }

    throw new Error('No LLM provider succeeded or is configured.');
  }
}

const llmRouterService = new LLMRouterService();
export default llmRouterService;
