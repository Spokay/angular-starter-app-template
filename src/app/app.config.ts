import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection
} from '@angular/core';
import {provideRouter} from '@angular/router';

import {routes} from './app.routes';
import {provideHttpClient, withFetch} from '@angular/common/http';
import {provideOAuthClient} from 'angular-oauth2-oidc';
import {AuthService} from './auth/auth.service';

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
