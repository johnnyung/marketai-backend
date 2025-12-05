import { AnthropicLLM } from "./anthropicService.js";
import { GeminiLLM } from "./geminiService.js";
import { OpenAILLM } from "./openaiService.js";

const providers = {
  anthropic: null,
  gemini: null,
  openai: null,
};

export function initLLMRouter(env: NodeJS.ProcessEnv) {
  if (env.ANTHROPIC_API_KEY) {
    providers.anthropic = new AnthropicLLM(env.ANTHROPIC_API_KEY);
  }
  if (env.GEMINI_API_KEY) {
    providers.gemini = new GeminiLLM(env.GEMINI_API_KEY);
  }
  if (env.OPENAI_API_KEY) {
    providers.openai = new OpenAILLM(env.OPENAI_API_KEY);
  }
}

export async function llmChat(prompt: string): Promise<string> {
  if (providers.anthropic) return providers.anthropic.chat(prompt);
  if (providers.gemini) return providers.gemini.chat(prompt);
  if (providers.openai) return providers.openai.chat(prompt);
  throw new Error("No LLM providers configured.");
}

export const llmStatus = () => ({
  providers: {
    anthropic: !!providers.anthropic,
    gemini: !!providers.gemini,
    openai: !!providers.openai,
  }
});
