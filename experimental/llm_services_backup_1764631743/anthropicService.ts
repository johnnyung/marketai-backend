import Anthropic from "@anthropic-ai/sdk";

export class AnthropicLLM {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async chat(prompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }]
    });

    return response?.content?.[0]?.text || "";
  }
}
