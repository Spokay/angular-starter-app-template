import { Injectable, Injector, inject } from '@angular/core';
import type { LogLevel } from '@shared/logger.service';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';

export interface AppConfig {
  oidc: {
    authority: string;
    clientId: string;
    redirectUrl: string;
    postLogoutRedirectUri?: string;
    scope?: string;
    responseType?: string;
    secureRoutes?: string[];
    audience?: string;
  };
  resourceServer: {
    /**
     * Where the app calls the API — not the server's origin. `/api` behind the dev proxy,
     * and the server's URL including its context path without it. Services read this; it is
     * also what `secureRoutes` covers, which is how the access token gets attached.
     */
    baseUrl: string;
  };
  /**
   * Optional so a hand-edited config that predates it still loads; `LoggerService` falls back
   * to `debug` in development and `warn` in production when it is absent.
   *
   * The type is imported for its type only — `LoggerService` reads this interface at runtime,
   * and a value import in both directions would be a module cycle.
   */
  logging?: {
    level?: LogLevel;
  };
}

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private injector = inject(Injector);

  private config!: AppConfig;

  get value(): AppConfig {
    return this.config;
  }

  async load(): Promise<void> {
    const configPath = environment.configPath;
    const res = await fetch(configPath, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Failed to load config from ${configPath}: ${res.status} ${res.statusText}`);
    }
    this.config = await res.json();
  }

  /**
   * Returns whether the session was restored rather than logging it: this service is what
   * `LoggerService` reads its level from, so it deliberately depends on nothing that depends
   * back on it. The app initializer in `app.config.ts` does the logging.
   */
  async initializeAuth(): Promise<boolean> {
    const oidcSecurityService = this.injector.get(OidcSecurityService);
    const { isAuthenticated } = await firstValueFrom(oidcSecurityService.checkAuth());
    return isAuthenticated;
  }
}
