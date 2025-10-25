import {
  APP_INITIALIZER,
  ApplicationConfig, inject, provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  providePlatformInitializer,
  provideZoneChangeDetection
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import {
  HTTP_INTERCEPTORS,
  HttpClient,
  provideHttpClient,
  withFetch,
  withInterceptorsFromDi
} from '@angular/common/http';
import {AuthConfig, provideOAuthClient} from 'angular-oauth2-oidc';
import {AuthService} from './auth/auth.service';
import {authCodeFlowConfig} from './auth/auth-config';

const intializeAuth = () => {
  const authStateService = inject(AuthService);
  console.log("Initializing authentication state");
  return authStateService.initAuth();
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    provideOAuthClient(),
    provideAppInitializer(intializeAuth)
  ]
};
