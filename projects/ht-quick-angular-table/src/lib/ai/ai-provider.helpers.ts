import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { HT_AI_PROVIDER, AiProviderConfig } from './ai-provider.token';

export function provideHtAi(config: AiProviderConfig): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: HT_AI_PROVIDER, useValue: config }]);
}
