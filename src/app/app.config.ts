import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { AppConfigService } from '@core/app-config.service';
import { errorHandlingInterceptor } from '@core/error-handling.interceptor';
import { provideAuth, authInterceptor } from 'angular-auth-oidc-client';

import { routes } from './app.routes';
import { authConfig } from './auth/auth.config';


const initializeApp = () => {
  const appConfigService = inject(AppConfigService);

  console.log('Initializing application');

  return (async () => {
    await appConfigService.load();
    console.log('Config loaded');

    await appConfigService.initializeAuth();
  })();
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAppInitializer(initializeApp),
    provideHttpClient(withInterceptors([authInterceptor(), errorHandlingInterceptor])),
    provideRouter(routes),
    provideAuth(authConfig),
  ],
};
