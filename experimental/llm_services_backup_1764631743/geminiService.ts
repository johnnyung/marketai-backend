import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiLLM {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async chat(prompt: string): Promise<string> {
    const model = this.client.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent(prompt);
    return result.response.text() || "";
  }
}
