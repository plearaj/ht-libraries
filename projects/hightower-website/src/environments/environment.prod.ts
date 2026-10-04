import { Environment } from './environment.model';

export const environment: Environment = {
  production: true,
  useEmulator: false,
  firebase: {
    apiKey: 'REPLACE_WITH_WEB_API_KEY',
    authDomain: 'REPLACE_WITH_PROJECT_ID.firebaseapp.com',
    projectId: 'REPLACE_WITH_PROJECT_ID',
    appId: 'REPLACE_WITH_WEB_APP_ID',
  },
  recaptchaSiteKey: 'REPLACE_WITH_RECAPTCHA_V3_SITE_KEY',
};
