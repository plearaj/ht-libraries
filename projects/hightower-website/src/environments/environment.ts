import { Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  useEmulator: true,
  firebase: {
    apiKey: 'demo-api-key',
    authDomain: 'demo-hightower.firebaseapp.com',
    projectId: 'demo-hightower',
    appId: '1:000000000000:web:demo',
  },
  recaptchaSiteKey: '',
};
