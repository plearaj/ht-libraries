import { AiModelAdapter } from './ai-model-adapter.interface';
import { AiProviderConfig } from './ai-provider.token';
import { GeminiAdapter } from './providers/gemini.provider';
import { ClaudeAdapter } from './providers/claude.provider';

export function createAiAdapter(config: AiProviderConfig): AiModelAdapter {
  switch (config.provider) {
    case 'gemini':
      return new GeminiAdapter(config.apiKey);
    case 'claude':
      return new ClaudeAdapter(config.apiKey);
    case 'custom':
      return config.adapter;
  }
}
