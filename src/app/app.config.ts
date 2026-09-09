import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { AppConfigService } from '@core/app-config.service';
import { errorHandlingInterceptor } from '@core/error-handling.interceptor';
import { GlobalErrorHandler } from '@core/global-error-handler';
import { LoggerService } from '@shared/logger.service';
import { provideAuth, authInterceptor } from 'angular-auth-oidc-client';

import { routes } from './app.routes';
import { authConfig } from './auth/auth.config';

const initializeApp = () => {
  const appConfigService = inject(AppConfigService);
  const logger = inject(LoggerService);

  logger.info('Initializing application');

  return (async () => {
    await appConfigService.load();
    // Logged at debug because it says nothing an operator needs on a healthy start-up; the
    // level it is filtered by comes from the config that has just been read.
    logger.debug('Runtime configuration loaded');

    const isAuthenticated = await appConfigService.initializeAuth();
    logger.info('Authentication initialized', { isAuthenticated });
  })();
};

export const appConfig: ApplicationConfig = {
  providers: [
    // Routes window.onerror and unhandled rejections into the ErrorHandler below, so those
    // reach the logger too rather than only the console.
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAppInitializer(initializeApp),
    provideHttpClient(withInterceptors([authInterceptor(), errorHandlingInterceptor])),
    provideRouter(routes),
    provideAuth(authConfig),
  ],
};
