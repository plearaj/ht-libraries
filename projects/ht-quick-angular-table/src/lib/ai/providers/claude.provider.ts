import Anthropic from '@anthropic-ai/sdk';
import { AiModelAdapter } from '../ai-model-adapter.interface';

export class ClaudeAdapter implements AiModelAdapter {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  }

  async generate(prompt: string): Promise<string> {
    const message = await this.client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    });
    const content = message.content[0];
    if (content.type === 'text') {
      return content.text;
    }
    return '';
  }
}
