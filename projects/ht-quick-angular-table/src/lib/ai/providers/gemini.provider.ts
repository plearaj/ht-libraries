import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiModelAdapter } from '../ai-model-adapter.interface';

export class GeminiAdapter implements AiModelAdapter {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async generate(prompt: string): Promise<string> {
    const model = this.client.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}
