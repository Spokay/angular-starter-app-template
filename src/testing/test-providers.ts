import { provideHttpClient } from '@angular/common/http';
import { EnvironmentProviders, Provider } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAuth } from 'angular-auth-oidc-client';

/**
 * Providers every component spec needs.
 *
 * `OidcSecurityService` is injected by the header, home and login components and pulls in
 * `HttpClient` transitively, so a bare `TestBed` fails with
 * `NG0201: No provider found for _HttpClient`. A static OIDC config is used here so specs
 * never touch `AppConfigService` or fetch `assets/app-config.json`.
 */
export function provideTestingEnvironment(): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(),
    provideRouter([]),
    provideAuth({
      config: {
        authority: 'http://localhost:9999/realms/test',
        clientId: 'test-client',
        redirectUrl: 'http://localhost/',
        postLogoutRedirectUri: 'http://localhost/',
        scope: 'openid profile email',
        responseType: 'code',
      },
    }),
  ];
}
