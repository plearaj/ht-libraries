import { InjectionToken } from '@angular/core';
import { AiModelAdapter } from './ai-model-adapter.interface';

export type AiProviderConfig =
  | { provider: 'gemini'; apiKey: string }
  | { provider: 'claude'; apiKey: string }
  | { provider: 'custom'; adapter: AiModelAdapter };

export const HT_AI_PROVIDER = new InjectionToken<AiProviderConfig>('HT_AI_PROVIDER');
