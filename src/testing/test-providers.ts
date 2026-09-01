import { provideHttpClient } from '@angular/common/http';
import { EnvironmentProviders, Provider } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AppConfig, AppConfigService } from '@core/app-config.service';
import { provideAuth } from 'angular-auth-oidc-client';

/**
 * Stands in for the file `AppConfigService` fetches at startup. Specs never run the app
 * initializer, so the real service's `value` is undefined — and any component reaching a
 * service that reads it would fail on a property of undefined rather than on its own logic.
 */
const testAppConfig: AppConfig = {
  oidc: {
    authority: 'http://localhost:9999/realms/test',
    clientId: 'test-client',
    redirectUrl: 'http://localhost/',
    secureRoutes: ['/api'],
  },
  resourceServer: { baseUrl: '/api' },
};

/**
 * Providers every component spec needs.
 *
 * `OidcSecurityService` is injected by the header, home and login components and pulls in
 * `HttpClient` transitively, so a bare `TestBed` fails with
 * `NG0201: No provider found for _HttpClient`. A static OIDC config is used here so specs
 * never fetch `assets/app-config.json`, and `AppConfigService` is stubbed for the services
 * that read it.
 */
export function provideTestingEnvironment(): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(),
    provideRouter([]),
    { provide: AppConfigService, useValue: { value: testAppConfig } },
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
