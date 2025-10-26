import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { AppConfigService } from '@core/app-config.service';
import { provideAuth } from 'angular-auth-oidc-client';

import { routes } from './app.routes';
import { authConfig } from './auth/auth.config';

const initializeApp = () => {
  const appConfigService = inject(AppConfigService);
  console.log('Initializing application');
  return appConfigService.load();
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAppInitializer(initializeApp),
    provideHttpClient(withInterceptorsFromDi()),
    provideRouter(routes),
    provideAuth(authConfig),
  ],
};
