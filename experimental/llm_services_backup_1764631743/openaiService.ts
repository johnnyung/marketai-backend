import OpenAI from "openai";

export class OpenAILLM {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async chat(prompt: string): Promise<string> {
    const r = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    });

    return r.choices[0].message?.content || "";
  }
}
